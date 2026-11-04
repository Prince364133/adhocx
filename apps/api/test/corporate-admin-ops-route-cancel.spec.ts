/**
 * admin-ops: ADMIN route cancel (POST /corporate/trips/routes/:id/cancel).
 *  - only routes that have not started (PLANNED / DISPATCHING / ASSIGNED); IN_TRANSIT / COMPLETED -> 409
 *  - mandatory reason (400)
 *  - conditional update under the dispatch lock (one of two concurrent cancels wins)
 *  - live offer withdrawn with the shared dispatch helper
 *  - unpaid earnings VOIDED (never deleted); batched / paid earnings refuse the cancel
 *  - open stops + their transport requests CANCELLED
 *  - driver and employees notified, audit entry written
 *  - a cancelled route is never dispatched again
 *
 * All instants are explicit UTC ISO strings, so the suite is TZ-independent (run under IST and UTC).
 */
import 'reflect-metadata';
import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { UserRole } from '@adhocx/contracts';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
} from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateOperationsService } from '../src/domains/corporate/operations/corporate-operations.service';
import { CorporateRouteCancellationController } from '../src/domains/corporate/operations/corporate-operations.controller';
import { CorporateRiderNotifier, RIDER_WS_EVENTS } from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { FakeDb, FakeRedisService, makeAudit, makeNotifications } from './helpers/corporate-ws-d-fakes';

const iso = (s: string) => new Date(s);
const PICKUP = iso('2026-11-10T03:00:00.000Z');

function seed(db: FakeDb) {
  db.insert('corporateTenant', { id: 't1', code: 'ACME', name: 'Acme', status: 'ACTIVE' });
  db.insert('corporateOffice', { id: 'o1', tenantId: 't1', code: 'HYD', name: 'HITEC', latitude: 17.44, longitude: 78.38 });
  db.insert('driver', {
    id: 'drv-1', userId: 'u-drv-1', fullName: 'Ravi Kumar', phone: '+910000000001',
    verificationStatus: 'VERIFIED', availabilityStatus: 'AVAILABLE', vehicleType: 'SEDAN',
  });
  db.insert('driver', {
    id: 'drv-offer', userId: 'u-drv-offer', fullName: 'Offer Holder', phone: '+910000000002',
    verificationStatus: 'VERIFIED', availabilityStatus: 'AVAILABLE', vehicleType: 'SEDAN',
  });
  for (const e of ['e1', 'e2']) {
    db.insert('corporateEmployee', { id: e, tenantId: 't1', officeId: 'o1', employeeCode: e.toUpperCase(), fullName: `Emp ${e}`, userId: `u-${e}` });
  }
}

function addRoute(db: FakeDb, id: string, over: Record<string, any> = {}) {
  db.insert('corporateRoute', {
    id,
    tenantId: 't1',
    officeId: 'o1',
    shiftDate: iso('2026-11-10T00:00:00.000Z'),
    shiftTime: '09:00',
    direction: 'LOGIN',
    vehicleCategory: 'SEDAN',
    maxCapacity: 4,
    assignedPassengerCount: 2,
    targetPickup1Time: PICKUP,
    targetOfficeArrivalTime: new Date(PICKUP.getTime() + 60 * 60_000),
    estDistanceMeters: 18000,
    estDurationSeconds: 3600,
    status: 'PLANNED',
    driverId: null,
    vehicleId: null,
    atRisk: false,
    ...over,
  });
  ['e1', 'e2'].forEach((emp, i) => {
    db.insert('corporateTransportRequest', { id: `${id}-req-${emp}`, tenantId: 't1', employeeId: emp, status: 'ASSIGNED' });
    db.insert('corporateRouteStop', {
      id: `${id}-s${i + 1}`, routeId: id, stopSequence: i + 1, stopType: 'PICKUP', employeeId: emp,
      transportRequestId: `${id}-req-${emp}`, latitude: 17.45, longitude: 78.39,
      plannedEta: new Date(PICKUP.getTime() + i * 10 * 60_000), boardingOtp: '1234', status: 'PENDING',
    });
  });
  db.insert('corporateRouteStop', {
    id: `${id}-office`, routeId: id, stopSequence: 3, stopType: 'DROPOFF', employeeId: null,
    latitude: 17.44, longitude: 78.38, plannedEta: new Date(PICKUP.getTime() + 60 * 60_000), boardingOtp: '0000', status: 'PENDING',
  });
  return id;
}

function addEarning(db: FakeDb, routeId: string, over: Record<string, any> = {}) {
  return db.insert('corporateDriverEarning', {
    id: `earn-${routeId}`, driverId: 'drv-1', routeId, routeFarePaise: BigInt(66000), totalEarnedPaise: BigInt(66000),
    payoutStatus: 'UNPAID', payoutBatchId: null, createdAt: iso('2026-11-01T00:00:00.000Z'), ...over,
  });
}

function attachDriverOffers(db: FakeDb) {
  const rows: any[] = [];
  (db as any).corporateDriverOffer = {
    rows,
    updateMany: jest.fn(async ({ where, data }: any) => {
      const hit = rows.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    }),
  };
  return rows;
}

function build() {
  const db = new FakeDb();
  seed(db);
  const offers = attachDriverOffers(db);
  const redis = new FakeRedisService();
  const notifications = makeNotifications();
  const audit = makeAudit();
  const locations = { findNearbyDrivers: jest.fn(async () => []) };
  const dispatch = new CorporateDispatchService(db as any, redis as any, notifications as any, audit as any, locations as any);
  const rider = new CorporateRiderNotifier(db as any, redis as any, notifications as any);
  const ops = new CorporateOperationsService(db as any, redis as any, notifications as any, audit as any, dispatch, rider);
  return { db, redis, client: redis.client, notifications, audit, dispatch, ops, offers };
}

async function putLiveOffer(client: any, routeId: string, driverId: string) {
  await client.set(CorporateDispatchKeys.offer(routeId), JSON.stringify({ driverId, offerExpiresAt: new Date(Date.now() + 60_000).toISOString() }), 'EX', 60);
  await client.set(CorporateDispatchKeys.offerDriver(routeId), driverId, 'EX', 60);
  await client.sadd(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('ADMIN route cancel', () => {
  it('cancels an ASSIGNED route: voids the unpaid earning, cancels stops and requests, notifies and audits', async () => {
    const { db, ops, notifications, audit } = build();
    addRoute(db, 'r1', { status: 'ASSIGNED', driverId: 'drv-1' });
    addEarning(db, 'r1');

    const res: any = await ops.cancelRoute('r1', { reason: '  Client cancelled the shift  ' }, { id: 'u-admin', role: 'ADMIN' });

    expect(res).toMatchObject({
      routeId: 'r1',
      status: 'CANCELLED',
      previousStatus: 'ASSIGNED',
      cancelledStops: 3,
      cancelledRequests: 2,
      voidedEarnings: 1,
      notified: { driverId: 'drv-1', driver: true, employees: 2 },
    });
    expect(typeof res.cancellationId).toBe('string');

    const route = db.tables.corporateRoute.get('r1')!;
    expect(route).toMatchObject({ status: 'CANCELLED', driverId: 'drv-1', atRisk: false });

    // Voided, never deleted.
    const earning = db.tables.corporateDriverEarning.get('earn-r1')!;
    expect(earning).toBeDefined();
    expect(earning).toMatchObject({ payoutStatus: 'VOIDED', payoutBatchId: null });
    expect(earning.voidReason).toContain('ROUTE_CANCELLED');
    expect(earning.voidReason).toContain('Client cancelled the shift');
    expect(earning.voidedAt).toBeInstanceOf(Date);

    expect(db.all('corporateRouteStop').filter((s) => s.routeId === 'r1').map((s) => s.status)).toEqual(['CANCELLED', 'CANCELLED', 'CANCELLED']);
    expect(db.all('corporateTransportRequest').map((r) => r.status)).toEqual(['CANCELLED', 'CANCELLED']);

    // Driver: websocket + push.
    expect(notifications.events).toContainEqual(
      expect.objectContaining({ channel: 'driver:drv-1', event: 'CORPORATE_ROUTE_CANCELLED' }),
    );
    expect(notifications.pushes.map((p) => p.userId)).toContain('u-drv-1');
    // Employees through the rider notifier, without the internal reason.
    const empEvents = notifications.events.filter((e) => e.event === RIDER_WS_EVENTS.ROUTE_CANCELLED && e.channel.startsWith('employee:'));
    expect(empEvents.map((e) => e.channel).sort()).toEqual(['employee:e1', 'employee:e2']);
    expect(JSON.stringify(empEvents)).not.toContain('Client cancelled the shift');
    // Command centre + tenant.
    expect(notifications.events).toContainEqual(expect.objectContaining({ channel: 'admin:operations', event: 'CORPORATE_ROUTE_CANCELLED' }));
    expect(notifications.events).toContainEqual(expect.objectContaining({ channel: 'corporate:t1', event: 'ROUTE_CANCELLED' }));

    const entry = audit.logs.find((l) => l.action === 'CORPORATE_ROUTE_CANCELLED');
    expect(entry).toMatchObject({
      userId: 'u-admin',
      actorRole: 'ADMIN',
      entityType: 'CORPORATE_ROUTE',
      entityId: 'r1',
      metadata: expect.objectContaining({
        reason: 'Client cancelled the shift',
        previousStatus: 'ASSIGNED',
        earningDisposition: 'VOIDED',
        voidedEarnings: [expect.objectContaining({ id: 'earn-r1', totalEarnedPaise: '66000' })],
      }),
    });
  });

  it('cancels a DISPATCHING route and withdraws the live offer with the dispatch helper', async () => {
    const { db, ops, client, redis, notifications, offers } = build();
    addRoute(db, 'r2', { status: 'DISPATCHING' });
    await putLiveOffer(client, 'r2', 'drv-offer');
    await client.set(CorporateDispatchKeys.driverHold('drv-offer'), 'r2', 'EX', 60);
    offers.push({ id: 'o-1', routeId: 'r2', driverId: 'drv-offer', status: 'SENT' });
    await redis.zadd(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, Date.now(), 'r2');

    const res: any = await ops.cancelRoute('r2', { reason: 'No compliant supply' }, { id: 'u-admin' });

    expect(res).toMatchObject({ status: 'CANCELLED', previousStatus: 'DISPATCHING', withdrawnOfferDriverId: 'drv-offer', voidedEarnings: 0 });
    expect(await client.get(CorporateDispatchKeys.offer('r2'))).toBeNull();
    expect(await client.get(CorporateDispatchKeys.offerDriver('r2'))).toBeNull();
    expect(await client.get(CorporateDispatchKeys.driverHold('drv-offer'))).toBeNull();
    expect(await client.smembers(CorporateDispatchKeys.ACTIVE_OFFERS_SET)).not.toContain('r2');
    expect(offers[0].status).toBe('WITHDRAWN');
    // The offer holder is told the route is gone.
    expect(res.notified).toMatchObject({ driverId: 'drv-offer', driver: true });
    expect(notifications.pushes.map((p) => p.userId)).toContain('u-drv-offer');
  });

  it.each(['IN_TRANSIT', 'COMPLETED'])('refuses a %s route and changes nothing', async (status) => {
    const { db, ops, audit } = build();
    addRoute(db, 'r3', { status, driverId: 'drv-1' });
    addEarning(db, 'r3');

    await expect(ops.cancelRoute('r3', { reason: 'too late' })).rejects.toBeInstanceOf(ConflictException);
    expect(db.tables.corporateRoute.get('r3')!.status).toBe(status);
    expect(db.tables.corporateDriverEarning.get('earn-r3')!.payoutStatus).toBe('UNPAID');
    expect(db.all('corporateRouteStop').every((s) => s.status === 'PENDING')).toBe(true);
    expect(audit.logs).toHaveLength(0);
  });

  it('requires a reason', async () => {
    const { db, ops } = build();
    addRoute(db, 'r4');
    await expect(ops.cancelRoute('r4', { reason: '' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(ops.cancelRoute('r4', { reason: ' x ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(ops.cancelRoute('r4', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(ops.cancelRoute('r4', { reason: 'y'.repeat(501) })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.tables.corporateRoute.get('r4')!.status).toBe('PLANNED');
  });

  it('404 for an unknown route, 409 for an already cancelled one', async () => {
    const { db, ops } = build();
    await expect(ops.cancelRoute('missing', { reason: 'gone' })).rejects.toBeInstanceOf(NotFoundException);
    addRoute(db, 'r5');
    await ops.cancelRoute('r5', { reason: 'first' });
    await expect(ops.cancelRoute('r5', { reason: 'second' })).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['in a payout batch', { payoutStatus: 'PROCESSING', payoutBatchId: 'batch-1' }],
    ['paid', { payoutStatus: 'PAID', payoutBatchId: 'batch-1' }],
  ])('refuses when the earning is %s (money moved) and changes nothing', async (_label, over) => {
    const { db, ops } = build();
    addRoute(db, 'r6', { status: 'ASSIGNED', driverId: 'drv-1' });
    addEarning(db, 'r6', over);

    await expect(ops.cancelRoute('r6', { reason: 'client asked' })).rejects.toBeInstanceOf(ConflictException);
    expect(db.tables.corporateRoute.get('r6')!.status).toBe('ASSIGNED');
    expect(db.tables.corporateDriverEarning.get('earn-r6')).toMatchObject(over);
  });

  it('already VOIDED earnings (earlier reassign) are left as they are', async () => {
    const { db, ops } = build();
    addRoute(db, 'r7', { status: 'DISPATCHING' });
    addEarning(db, 'r7', { payoutStatus: 'VOIDED', voidReason: 'REASSIGNED x: swap' });

    const res: any = await ops.cancelRoute('r7', { reason: 'client asked' });
    expect(res.voidedEarnings).toBe(0);
    expect(db.tables.corporateDriverEarning.get('earn-r7')!.voidReason).toBe('REASSIGNED x: swap');
  });

  it('of two concurrent cancels exactly one wins', async () => {
    const { db, ops, audit } = build();
    addRoute(db, 'r8', { status: 'ASSIGNED', driverId: 'drv-1' });
    addEarning(db, 'r8');

    const results = await Promise.allSettled([
      ops.cancelRoute('r8', { reason: 'admin A' }),
      ops.cancelRoute('r8', { reason: 'admin B' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(audit.logs.filter((l) => l.action === 'CORPORATE_ROUTE_CANCELLED')).toHaveLength(1);
  });

  it('waits for an in-flight dispatch wave: a held dispatch lock is a 409, nothing changes', async () => {
    const { db, ops, redis } = build();
    addRoute(db, 'r9', { status: 'DISPATCHING' });
    await redis.acquireLockToken('corporate:dispatch:lock:r9', 30);

    await expect(ops.cancelRoute('r9', { reason: 'client asked' })).rejects.toBeInstanceOf(ConflictException);
    expect(db.tables.corporateRoute.get('r9')!.status).toBe('DISPATCHING');
  });

  it('releases the dispatch lock afterwards, and a cancelled route is never dispatched again', async () => {
    const { db, ops, redis, dispatch } = build();
    addRoute(db, 'r10', { status: 'PLANNED' });
    await ops.cancelRoute('r10', { reason: 'client asked' });

    const probe = await redis.acquireLockToken('corporate:dispatch:lock:r10', 1);
    expect(probe).not.toBeNull();
    await redis.releaseLockToken('corporate:dispatch:lock:r10', probe!);
    const res = await dispatch.dispatchRoute('r10', true, 'u-admin');
    expect(res.status).not.toBe('OFFERED');
    expect(db.tables.corporateRoute.get('r10')!.status).toBe('CANCELLED');
  });

  it('a notification failure does not undo the cancel', async () => {
    const { db, ops, notifications } = build();
    addRoute(db, 'r11', { status: 'ASSIGNED', driverId: 'drv-1' });
    notifications.sendPushToUser.mockRejectedValue(new Error('fcm down'));

    const res: any = await ops.cancelRoute('r11', { reason: 'client asked' });
    expect(res.status).toBe('CANCELLED');
    expect(res.notified.driver).toBe(false);
    expect(db.tables.corporateRoute.get('r11')!.status).toBe('CANCELLED');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('notifyRouteCancelled'));
  });

  it('is served at POST corporate/trips/routes/:id/cancel and is ADMIN-only', () => {
    expect(Reflect.getMetadata('path', CorporateRouteCancellationController)).toBe('corporate/trips');
    const handler = CorporateRouteCancellationController.prototype.cancel;
    expect(Reflect.getMetadata('path', handler)).toBe('routes/:id/cancel');
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
  });

  it('the controller passes the authenticated admin as the audit actor', async () => {
    const ops = { cancelRoute: jest.fn(async () => ({ status: 'CANCELLED' })) };
    const controller = new CorporateRouteCancellationController(ops as any);
    await controller.cancel('r1', { reason: 'client asked' }, { user: { id: 'u-admin', role: 'ADMIN' } });
    expect(ops.cancelRoute).toHaveBeenCalledWith('r1', { reason: 'client asked' }, { id: 'u-admin', role: 'ADMIN' });
  });
});
