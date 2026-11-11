import * as crypto from 'crypto';
import { ForbiddenException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { AuthService } from '../src/modules/auth/auth.service';

/**
 * Auth hardening:
 *  - startup never promotes an existing user to ADMIN and never uses a default password
 *  - PBKDF2 210k iterations, legacy 10k hashes still verify and are upgraded on login
 *  - login OTPs are single-use for sign-in (reset-only afterwards); OTP, reset and password logins
 *    are attempt-limited
 */

/** Redis double with a real fixed-window rate limiter and key/value store. */
function fakeRedis() {
  const kv = new Map<string, string>();
  const counters = new Map<string, number>();
  return {
    kv,
    get: jest.fn(async (k: string) => kv.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      kv.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      kv.delete(k);
    }),
    checkRateLimit: jest.fn(async (k: string, limit: number) => {
      const n = (counters.get(k) ?? 0) + 1;
      counters.set(k, n);
      return { allowed: n <= limit, remaining: Math.max(0, limit - n), resetAfter: 600 };
    }),
    blacklistToken: jest.fn(async (t: string) => {
      kv.set(`blacklist:${t}`, '1');
    }),
    isTokenBlacklisted: jest.fn(async (t: string) => kv.has(`blacklist:${t}`)),
    revokeUserSessions: jest.fn(async (id: string) => {
      kv.set(`user_revoked:${id}`, '1');
    }),
    unrevokeUser: jest.fn(async (id: string) => {
      kv.delete(`user_revoked:${id}`);
    }),
    isUserRevoked: jest.fn(async (id: string) => kv.get(`user_revoked:${id}`) === '1'),
    invalidateTokensBefore: jest.fn(async (id: string, sec: number) => {
      kv.set(`user_min_iat:${id}`, String(sec));
    }),
    getMinTokenIssuedAt: jest.fn(async (id: string) => {
      const v = kv.get(`user_min_iat:${id}`);
      return v ? Number(v) : null;
    }),
  };
}

function build(dbOverrides: any = {}) {
  const db: any = {
    user: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: 'new-user', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'u1', ...data })),
    },
    ...dbOverrides,
  };
  const redis = fakeRedis();
  const config = { get: jest.fn((k: string) => (k === 'app.nodeEnv' ? 'development' : k === 'auth.otpTtlSeconds' ? 300 : null)) };
  const jwt = { signAsync: jest.fn(async () => 'token'), verifyAsync: jest.fn() };
  const svc = new AuthService(db, jwt as any, config as any, redis as any, { sendOtp: jest.fn() } as any);
  return { svc, db, redis };
}

const legacyHash = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')}`;
};

const ENV = ['ADMIN_EMAIL', 'ADMIN_PHONE', 'ADMIN_PASSWORD'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => ENV.forEach((k) => ((saved[k] = process.env[k]), delete process.env[k])));
afterEach(() => ENV.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

describe('first-admin bootstrap', () => {
  const ensure = (svc: AuthService) => (svc as any).ensureAdminExists();

  it('never promotes an existing non-admin user who holds the admin phone/email', async () => {
    process.env.ADMIN_EMAIL = 'ops@adhocx.com';
    process.env.ADMIN_PHONE = '+919876543210';
    process.env.ADMIN_PASSWORD = 'a-long-unique-passphrase';
    const { svc, db } = build();
    db.user.findFirst
      .mockResolvedValueOnce(null) // no ADMIN exists
      .mockResolvedValueOnce({ id: 'driver-7', role: 'DRIVER' }); // a driver registered that phone
    await ensure(svc);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('does nothing when an ADMIN already exists', async () => {
    process.env.ADMIN_EMAIL = 'ops@adhocx.com';
    process.env.ADMIN_PASSWORD = 'a-long-unique-passphrase';
    const { svc, db } = build();
    db.user.findFirst.mockResolvedValueOnce({ id: 'admin-1' });
    await ensure(svc);
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('refuses to create an admin without ADMIN_PASSWORD (no built-in default) or with a short one', async () => {
    process.env.ADMIN_EMAIL = 'ops@adhocx.com';
    const { svc, db } = build();
    await ensure(svc);
    process.env.ADMIN_PASSWORD = 'short';
    await ensure(svc);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('creates the first admin from env with a strong hash', async () => {
    process.env.ADMIN_EMAIL = 'ops@adhocx.com';
    process.env.ADMIN_PASSWORD = 'a-long-unique-passphrase';
    const { svc, db } = build();
    await ensure(svc);
    const data = db.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'ops@adhocx.com', role: 'ADMIN' });
    expect(data.passwordHash.split(':')[2]).toBe('210000');
  });
});

describe('password hashing', () => {
  it('new hashes carry 210k iterations; both new and legacy hashes verify; wrong password fails', async () => {
    const { svc } = build();
    const fresh: string = await (svc as any).hashPassword('correct horse');
    expect(fresh.split(':')).toHaveLength(3);
    await expect((svc as any).verifyPassword('correct horse', fresh)).resolves.toBe(true);
    await expect((svc as any).verifyPassword('wrong', fresh)).resolves.toBe(false);
    await expect((svc as any).verifyPassword('correct horse', legacyHash('correct horse'))).resolves.toBe(true);
    await expect((svc as any).verifyPassword('x', 'garbage')).resolves.toBe(false);
  });

  it('a successful login upgrades a legacy hash', async () => {
    const { svc, db } = build();
    db.user.findFirst.mockResolvedValue({ id: 'u1', phone: '+919000000001', role: 'DRIVER', status: 'ACTIVE', passwordHash: legacyHash('pw-123456') });
    await svc.login({ identifier: '+919000000001', password: 'pw-123456' } as any).catch(() => undefined);
    const upgrade = db.user.update.mock.calls.find((c: any[]) => c[0]?.data?.passwordHash);
    expect(upgrade?.[0].data.passwordHash.split(':')[2]).toBe('210000');
  });
});

describe('attempt limits', () => {
  it('password login: the 11th attempt in 15 minutes is refused with 429', async () => {
    const { svc, db } = build();
    db.user.findFirst.mockResolvedValue({ id: 'u1', role: 'DRIVER', status: 'ACTIVE', passwordHash: legacyHash('right-pass') });
    for (let i = 0; i < 10; i++) {
      await expect(svc.login({ identifier: 'a@b.com', password: 'nope' } as any)).rejects.toThrow(UnauthorizedException);
    }
    await expect(svc.login({ identifier: 'a@b.com', password: 'right-pass' } as any)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('admin login: the 6th attempt is refused with 429', async () => {
    const { svc } = build();
    for (let i = 0; i < 5; i++) await svc.adminLogin({ identifier: 'x@y.com', password: 'p' } as any).catch(() => undefined);
    await expect(svc.adminLogin({ identifier: 'x@y.com', password: 'p' } as any)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('OTP: after 5 wrong codes the code is voided and further tries get 429', async () => {
    const { svc, redis } = build();
    redis.kv.set('otp_direct:a@b.com', '123456');
    for (let i = 0; i < 5; i++) {
      await expect(svc.verifyOtp({ email: 'a@b.com', otp: '000000' } as any)).rejects.toThrow(UnauthorizedException);
    }
    await expect(svc.verifyOtp({ email: 'a@b.com', otp: '123456' } as any)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(redis.kv.has('otp_direct:a@b.com')).toBe(false);
  });
});

describe('OTP single use', () => {
  it('a code used to sign in cannot sign in again, but still works once for reset-password', async () => {
    const { svc, redis, db } = build();
    redis.kv.set('otp_direct:a@b.com', '123456');
    db.user.findFirst.mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'DRIVER', status: 'ACTIVE', driver: {} });

    await svc.verifyOtp({ email: 'a@b.com', otp: '123456', role: 'DRIVER' } as any).catch(() => undefined);
    expect(redis.kv.has('otp_direct:a@b.com')).toBe(false);
    expect(redis.kv.get('otp_reset:a@b.com')).toBe('123456');

    await expect(svc.verifyOtp({ email: 'a@b.com', otp: '123456' } as any)).rejects.toThrow(/Invalid or expired OTP/);

    await svc.resetPassword({ identifier: 'a@b.com', otp: '123456', password: 'new-pass-123' } as any);
    expect(redis.kv.has('otp_reset:a@b.com')).toBe(false);
    await expect(
      svc.resetPassword({ identifier: 'a@b.com', otp: '123456', password: 'another-pass' } as any),
    ).rejects.toThrow(/Invalid or expired OTP/);
  });
});

describe('password setup & reset session handling', () => {
  it('initial sign-up setPassword preserves the active OTP session and returns fresh tokens with hasPassword=true', async () => {
    const { svc, redis, db } = build();
    db.user.findUnique.mockResolvedValue({ id: 'u-signup', passwordHash: null, status: 'ACTIVE' });
    db.user.update.mockResolvedValue({
      id: 'u-signup',
      phone: '+919999999999',
      role: 'DRIVER',
      passwordHash: 'hashed-pw',
      driver: { id: 'd1', verificationStatus: 'PENDING' },
    });

    const res = await svc.setPassword('u-signup', { password: 'strong-password-1' });
    expect(res.success).toBe(true);
    expect(res.accessToken).toBeTruthy();
    expect(res.user.hasPassword).toBe(true);

    // Crucial regression guard: must NEVER mark account suspended (`user_revoked`) or evict caller
    expect(redis.kv.has('user_revoked:u-signup')).toBe(false);
    expect(redis.kv.has('user_min_iat:u-signup')).toBe(false);
    expect(redis.revokeUserSessions).not.toHaveBeenCalled();

    // Existing OTP token issued 5s ago remains accepted by JwtAuthGuard for GET /auth/me
    const guard = new JwtAuthGuard(
      { verifyAsync: jest.fn(async () => ({ id: 'u-signup', iat: Math.floor(Date.now() / 1000) - 5 })) } as any,
      { get: () => 'secret' } as any,
      redis as any,
    );
    const req: any = { headers: { authorization: 'Bearer otp-token' } };
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any)).resolves.toBe(true);
  });

  it('updating an existing password invalidates only older tokens without locking out the user account', async () => {
    const { svc, redis, db } = build();
    db.user.findUnique.mockResolvedValue({ id: 'u-existing', passwordHash: 'old-hash', status: 'ACTIVE' });
    db.user.update.mockResolvedValue({
      id: 'u-existing',
      phone: '+919999999999',
      role: 'DRIVER',
      passwordHash: 'new-hash',
      driver: { id: 'd1', verificationStatus: 'VERIFIED' },
    });

    const res = await svc.setPassword('u-existing', { password: 'new-strong-password' });
    expect(res.success).toBe(true);
    expect(res.accessToken).toBeTruthy();

    expect(redis.kv.has('user_revoked:u-existing')).toBe(false);
    const minIat = Number(redis.kv.get('user_min_iat:u-existing'));
    expect(minIat).toBeGreaterThan(0);

    // Old token (iat < minIat) is rejected; fresh token (iat >= minIat) is accepted
    const jwt = { verifyAsync: jest.fn() };
    const guard = new JwtAuthGuard(jwt as any, { get: () => 'secret' } as any, redis as any);

    jwt.verifyAsync.mockResolvedValueOnce({ id: 'u-existing', iat: minIat - 10 });
    await expect(
      guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer old-tok' } }) }) } as any),
    ).rejects.toThrow(UnauthorizedException);

    jwt.verifyAsync.mockResolvedValueOnce({ id: 'u-existing', iat: minIat });
    await expect(
      guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer new-tok' } }) }) } as any),
    ).resolves.toBe(true);
  });

  it('resetPassword uses epoch invalidation instead of 24h user suspension lock', async () => {
    const { svc, redis, db } = build();
    redis.kv.set('otp_direct:a@b.com', '654321');
    db.user.findFirst.mockResolvedValue({
      id: 'u-reset',
      email: 'a@b.com',
      role: 'DRIVER',
      status: 'ACTIVE',
      driver: { verificationStatus: 'PENDING' },
    });

    await svc.resetPassword({ identifier: 'a@b.com', otp: '654321', password: 'reset-password-123' } as any);
    expect(redis.kv.has('user_revoked:u-reset')).toBe(false);
    expect(Number(redis.kv.get('user_min_iat:u-reset'))).toBeGreaterThan(0);
  });

  it('logout transitions an AVAILABLE driver to OFFLINE, clears spatial index & cancels SENT offers', async () => {
    const locations = { removeDriverFromAvailable: jest.fn(async () => undefined) };
    const driverFindUnique = jest.fn(async () => ({ id: 'drv-online-1', availabilityStatus: 'AVAILABLE' }));
    const driverUpdate = jest.fn(async () => ({ id: 'drv-online-1', availabilityStatus: 'OFFLINE' }));
    const offerUpdateMany = jest.fn(async () => ({ count: 2 }));

    const db: any = {
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      driver: { findUnique: driverFindUnique, update: driverUpdate },
      offer: { updateMany: offerUpdateMany },
      trip: { findFirst: jest.fn(async () => null) },
    };
    const redis = fakeRedis();
    const svc = new AuthService(
      db,
      { signAsync: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn(() => ({ sub: 'u-drv-1' })) } as any,
      { get: jest.fn() } as any,
      redis as any,
      { sendOtp: jest.fn() } as any,
      locations as any,
    );

    await svc.logout('jwt-access-1', 'u-drv-1');

    expect(redis.blacklistToken).toHaveBeenCalledWith('jwt-access-1', 3600);
    expect(driverUpdate).toHaveBeenCalledWith({
      where: { id: 'drv-online-1' },
      data: { availabilityStatus: 'OFFLINE' },
    });
    expect(locations.removeDriverFromAvailable).toHaveBeenCalledWith('drv-online-1');
    expect(offerUpdateMany).toHaveBeenCalledWith({
      where: { driverId: 'drv-online-1', status: 'SENT' },
      data: { status: 'CANCELLED' },
    });
  });

  it('logout preserves BUSY status only while an active trip exists', async () => {
    const locations = { removeDriverFromAvailable: jest.fn(async () => undefined) };
    const driverUpdate = jest.fn(async () => ({}));
    const db: any = {
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      driver: { findUnique: jest.fn(async () => ({ id: 'drv-busy-1', availabilityStatus: 'BUSY' })), update: driverUpdate },
      offer: { updateMany: jest.fn(async () => ({ count: 0 })) },
      trip: { findFirst: jest.fn(async () => ({ id: 'trip-active-1' })) },
    };
    const redis = fakeRedis();
    const svc = new AuthService(
      db,
      { signAsync: jest.fn(), verifyAsync: jest.fn() } as any,
      { get: jest.fn() } as any,
      redis as any,
      { sendOtp: jest.fn() } as any,
      locations as any,
    );

    await svc.logout('jwt-busy-1', 'u-busy-1');
    expect(driverUpdate).not.toHaveBeenCalled();
    expect(locations.removeDriverFromAvailable).not.toHaveBeenCalled();
  });
});

describe('rejected KYC & same-second re-login session continuity', () => {
  function makeRealJwtSetup(dbOverrides: any = {}) {
    const kv = new Map<string, string>();
    const redis: any = {
      ...fakeRedis(),
      kv,
      blacklistToken: jest.fn(async (t: string) => {
        kv.set(`blacklist:${t}`, '1');
      }),
      isTokenBlacklisted: jest.fn(async (t: string) => kv.has(`blacklist:${t}`)),
      revokeUserSessions: jest.fn(async (id: string) => {
        kv.set(`user_revoked:${id}`, '1');
      }),
      unrevokeUser: jest.fn(async (id: string) => {
        kv.delete(`user_revoked:${id}`);
      }),
      isUserRevoked: jest.fn(async (id: string) => kv.get(`user_revoked:${id}`) === '1'),
    };
    const db: any = {
      user: {
        findFirst: jest.fn(async () => null),
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'new-user', ...data })),
        update: jest.fn(async ({ data }: any) => ({ id: 'u1', ...data })),
      },
      ...dbOverrides,
    };
    const config: any = {
      get: jest.fn((k: string) => {
        if (k === 'auth.jwtAccessSecret') return 'test-access-secret-32-bytes-minimum!';
        if (k === 'auth.jwtRefreshSecret') return 'test-refresh-secret-32-bytes-minimum!';
        if (k === 'auth.jwtAccessExpiresIn') return '7d';
        if (k === 'auth.jwtRefreshExpiresIn') return '90d';
        if (k === 'app.nodeEnv') return 'test';
        return null;
      }),
    };
    const jwt = new JwtService({});
    const svc = new AuthService(db, jwt, config, redis, { sendOtp: jest.fn() } as any);
    const guard = new JwtAuthGuard(jwt, config, redis);
    return { svc, guard, db, redis, jwt };
  }

  function mockCtx(token: string): any {
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => (() => undefined),
      getClass: () => class DummyController {},
    };
  }

  it('KYC-rejected driver/vendor clears stale user_revoked lock on login and passes JwtAuthGuard', async () => {
    const { svc, guard, db, redis } = makeRealJwtSetup();
    const pwHash = await (svc as any).hashPassword('secret-123');
    const rejectedDriver = {
      id: 'u-rej-1',
      phone: '+919000000010',
      role: 'DRIVER',
      status: 'ACTIVE',
      passwordHash: pwHash,
      driver: { id: 'drv-rej-1', verificationStatus: 'REJECTED' },
    };
    db.user.findFirst.mockResolvedValue(rejectedDriver);
    await redis.revokeUserSessions('u-rej-1');

    const res = await svc.login({ identifier: '+919000000010', password: 'secret-123' } as any);
    expect(res.accessToken).toBeTruthy();
    expect(redis.unrevokeUser).toHaveBeenCalledWith('u-rej-1');
    await expect(redis.isUserRevoked('u-rej-1')).resolves.toBe(false);
    await expect(guard.canActivate(mockCtx(res.accessToken))).resolves.toBe(true);

    // Suspended users must still be blocked
    db.user.findFirst.mockResolvedValue({
      ...rejectedDriver,
      id: 'u-susp-1',
      driver: { id: 'drv-susp-1', verificationStatus: 'SUSPENDED' },
    });
    await expect(svc.login({ identifier: '+919000000010', password: 'secret-123' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('same-second logout then login issues distinct jti JWTs so the new token is never blacklisted', async () => {
    const { svc, guard, db, jwt } = makeRealJwtSetup();
    const pwHash = await (svc as any).hashPassword('secret-123');
    db.user.findFirst.mockResolvedValue({
      id: 'u-relog-1',
      phone: '+919000000020',
      role: 'DRIVER',
      status: 'ACTIVE',
      passwordHash: pwHash,
      driver: { id: 'drv-relog-1', verificationStatus: 'VERIFIED' },
    });

    const first = await svc.login({ identifier: '+919000000020', password: 'secret-123' } as any);
    await svc.logout(first.accessToken, 'u-relog-1');
    const second = await svc.login({ identifier: '+919000000020', password: 'secret-123' } as any);

    const decoded1 = jwt.decode(first.accessToken) as any;
    const decoded2 = jwt.decode(second.accessToken) as any;
    expect(decoded1?.jti).toBeTruthy();
    expect(decoded2?.jti).toBeTruthy();
    expect(decoded2.jti).not.toBe(decoded1.jti);
    expect(second.accessToken).not.toBe(first.accessToken);

    await expect(guard.canActivate(mockCtx(first.accessToken))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockCtx(second.accessToken))).resolves.toBe(true);
  });
});
