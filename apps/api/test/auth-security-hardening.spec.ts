import * as crypto from 'crypto';
import { HttpStatus, UnauthorizedException } from '@nestjs/common';
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
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn(async () => false),
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
