import { HttpStatus } from '@nestjs/common';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';

/**
 * The boarding OTP is 4 digits (10,000 codes). Without an attempt limit a driver could try them all
 * inside the 5-minute wait and mark an absent employee BOARDED. After 5 wrong codes the stop locks.
 */
function build(withRedis: boolean) {
  const kv = new Map<string, string>();
  const client = {
    get: jest.fn(async (k: string) => kv.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      kv.set(k, v);
      return 'OK';
    }),
    del: jest.fn(async (k: string) => (kv.delete(k) ? 1 : 0)),
    incr: jest.fn(async (k: string) => {
      const n = Number(kv.get(k) ?? 0) + 1;
      kv.set(k, String(n));
      return n;
    }),
    expire: jest.fn(async () => 1),
  };
  const stop = {
    id: 'stop-1',
    routeId: 'route-1',
    status: 'ARRIVED',
    boardingOtp: '7412',
    latitude: 17.44,
    longitude: 78.37,
    actualArrivalTime: new Date(),
    transportRequestId: 'req-1',
    employeeId: 'emp-1',
    route: { id: 'route-1', driverId: 'drv-1', tenantId: 't1' },
  };
  const db: any = {
    corporateRouteStop: {
      findUnique: jest.fn(async () => ({ ...stop })),
      update: jest.fn(async () => ({ ...stop, status: 'BOARDED' })),
      updateMany: jest.fn(),
    },
    corporateRoute: { findUnique: jest.fn(async () => ({ ...stop.route, stops: [] })), update: jest.fn() },
    corporateTransportRequest: { update: jest.fn(async () => ({ id: 'req-1' })), findUnique: jest.fn() },
    corporateEmployee: { findUnique: jest.fn() },
  };
  const notifications = { emitEvent: jest.fn() };
  const audit = { log: jest.fn(async () => undefined) };
  const svc = new CorporateTripExecutionService(
    db,
    { getClient: () => (withRedis ? client : null) } as any,
    notifications as any,
    audit as any,
  );
  const otp = (code: string) => svc.verifyBoardingOtp('route-1', 'stop-1', { otpCode: code });
  return { svc, otp, notifications, audit, kv };
}

describe.each([
  ['with Redis', true],
  ['without Redis (per-process fallback)', false],
])('boarding OTP attempt limit %s', (_label, withRedis) => {
  it('locks the stop after 5 wrong codes; even the right code is then refused with 429', async () => {
    const { otp, notifications } = build(withRedis);
    for (let i = 1; i <= 5; i++) {
      await expect(otp('0000')).rejects.toThrow(new RegExp(`${5 - i} attempts left`));
    }
    await expect(otp('7412')).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'admin:operations',
      'CORPORATE_BOARDING_OTP_LOCKED',
      expect.objectContaining({ stopId: 'stop-1', attempts: 5 }),
    );
  });

  it('a correct code after a couple of typos boards the employee and resets the counter', async () => {
    const { otp } = build(withRedis);
    await expect(otp('1111')).rejects.toThrow(/4 attempts left/);
    await expect(otp('2222')).rejects.toThrow(/3 attempts left/);
    await expect(otp('7412')).resolves.toMatchObject({ status: 'BOARDED' });
    await expect(otp('3333')).rejects.toThrow(/4 attempts left/);
  });
});

describe('ops unlock', () => {
  it('clears the lock (audited); the employee code is still required afterwards', async () => {
    const { svc, otp, audit } = build(true);
    for (let i = 0; i < 5; i++) await expect(otp('0000')).rejects.toThrow();
    await expect(otp('7412')).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });

    await expect(svc.unlockBoardingOtp('route-1', 'stop-1', 'admin-1', 'employee mistyped, verified by phone')).resolves.toMatchObject({
      unlocked: true,
      failedAttemptsCleared: 5,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CORPORATE_BOARDING_OTP_UNLOCKED', userId: 'admin-1', entityId: 'stop-1' }),
    );
    await expect(otp('0000')).rejects.toThrow(/4 attempts left/);
    await expect(otp('7412')).resolves.toMatchObject({ status: 'BOARDED' });
  });
});

describe('rider app fallback QR', () => {
  it('produces a token the driver-side verifier accepts (no hardcoded signing key)', async () => {
    const { CorporateRiderService } = jest.requireActual('../src/domains/corporate/rider/corporate-rider.service');
    const token: string = CorporateRiderService.prototype['generateFallbackQrToken'].call({}, 'route-1', 'stop-1', '7412');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    expect(decoded).toMatchObject({ routeId: 'route-1', stopId: 'stop-1', otp: '7412' });
    expect(decoded.expiresAtMs).toBeGreaterThan(Date.now());

    const { svc } = build(true);
    await expect(
      svc.verifyBoardingQr('route-1', 'stop-1', { qrPayload: token, driverLatitude: 17.44, driverLongitude: 78.37 } as any),
    ).resolves.toMatchObject({ status: 'BOARDED' });
  });
});
