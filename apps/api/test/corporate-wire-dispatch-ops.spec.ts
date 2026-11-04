/**
 * wire/dispatch-ops: code that existed but was never called is now wired in.
 *  A. Scheduler tick runs ALLOC-05 at-risk escalation once per tick (tick lock), flagged routes never re-alert.
 *  B. Driver offers are priced from the versioned CorporateDriverRateCard (effective-date selection),
 *     the legacy constants are only a logged fallback.
 *  C. `offerRouteToDriver`: directed single-driver offers with full eligibility, same Redis contract.
 *  D. Reassign voids (never deletes) the old earning; VOIDED is excluded from payouts and totals.
 *  E. GET my-offer and GET driver-offers read through the same service method.
 *
 * All instants are explicit UTC ISO strings, so the suite is TZ-independent (run under IST and UTC).
 */
import 'reflect-metadata';
import { ConflictException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
} from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { CorporateDispatchController } from '../src/domains/corporate/dispatch/corporate-dispatch.controller';
import { CorporateOperationsService } from '../src/domains/corporate/operations/corporate-operations.service';
import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { RateCardService } from '../src/domains/corporate/billing/rate-card.service';
import { FakeDb, FakeRedisService, makeAudit, makeNotifications, tickYield } from './helpers/corporate-ws-d-fakes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const iso = (s: string) => new Date(s);

/** In-memory CorporateDriverRateCard delegate honouring the lookup the service sends. */
function attachRateCards(db: FakeDb, cards: any[]) {
  const rows = cards.map((c, i) => ({
    id: c.id ?? `drc-${i + 1}`,
    vehicleCategory: 'SEDAN',
    baseDistanceMeters: 10000,
    isActive: true,
    effectiveTo: null,
    ...c,
  }));
  const findFirst = jest.fn(async ({ where }: any) => {
    await tickYield();
    const at: number = where.effectiveFrom.lte.getTime();
    const cat = String(where.vehicleCategory.equals).toUpperCase();
    const hits = rows
      .filter(
        (r) =>
          r.vehicleCategory.toUpperCase() === cat &&
          r.isActive === where.isActive &&
          r.effectiveFrom.getTime() <= at &&
          (r.effectiveTo === null || r.effectiveTo.getTime() > at),
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
    return hits[0] ?? null;
  });
  (db as any).corporateDriverRateCard = { findFirst };
  return { rows, findFirst };
}

/** In-memory CorporateDriverOffer delegate (count / upsert / updateMany / findFirst with route include). */
function attachDriverOffers(db: FakeDb) {
  const rows: any[] = [];
  const match = (r: any, w: any = {}) =>
    Object.entries(w).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !(v instanceof Date) && 'gt' in v) return r[k].getTime() > v.gt.getTime();
      return r[k] === v;
    });
  (db as any).corporateDriverOffer = {
    rows,
    count: jest.fn(async ({ where }: any) => rows.filter((r) => match(r, where)).length),
    upsert: jest.fn(async ({ where, create }: any) => {
      const k = where.routeId_driverId_attempt;
      const existing = rows.find((r) => r.routeId === k.routeId && r.driverId === k.driverId && r.attempt === k.attempt);
      if (existing) return existing;
      const row = { id: `offer-${rows.length + 1}`, createdAt: new Date(Date.now() + rows.length), ...create };
      rows.push(row);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const hit = rows.filter((r) => match(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    }),
    findFirst: jest.fn(async ({ where, include }: any) => {
      const hit = rows.filter((r) => match(r, where)).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!hit) return null;
      if (!include?.route) return hit;
      const route = db.tables.corporateRoute.get(hit.routeId)!;
      return {
        ...hit,
        route: {
          ...route,
          tenant: db.tables.corporateTenant.get(route.tenantId),
          stops: db.all('corporateRouteStop').filter((s) => s.routeId === route.id),
        },
      };
    }),
  };
  return rows;
}

function seed(db: FakeDb) {
  db.insert('corporateTenant', { id: 't1', code: 'ACME', name: 'Acme', status: 'ACTIVE' });
  db.insert('corporateOffice', { id: 'o1', tenantId: 't1', code: 'HYD', name: 'HITEC', latitude: 17.44, longitude: 78.38 });
  for (const [id, status, vehicleType] of [
    ['drv-old', 'VERIFIED', 'SEDAN'],
    ['drv-new', 'VERIFIED', 'SEDAN'],
    ['drv-c', 'VERIFIED', 'SEDAN'],
    ['drv-unv', 'PENDING', 'SEDAN'],
  ]) {
    db.insert('driver', {
      id,
      userId: `u-${id}`,
      fullName: `Driver ${id}`,
      phone: '+910000000000',
      verificationStatus: status,
      availabilityStatus: 'AVAILABLE',
      vehicleType,
    });
  }
  db.insert('vehicle', { id: 'veh-new', driverId: 'drv-new', registrationNumber: 'TS09NEW', verificationStatus: 'VERIFIED' });
}

let seq = 0;
function addRoute(db: FakeDb, pickup: Date, over: Record<string, any> = {}) {
  const id = over.id ?? `route-${++seq}`;
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
    targetPickup1Time: pickup,
    targetOfficeArrivalTime: new Date(pickup.getTime() + 60 * 60_000),
    estDistanceMeters: 18000,
    estDurationSeconds: 3600,
    status: 'PLANNED',
    driverId: null,
    vehicleId: null,
    atRisk: false,
    ...over,
  });
  db.insert('corporateRouteStop', {
    id: `${id}-s1`, routeId: id, stopSequence: 1, stopType: 'PICKUP', employeeId: null,
    latitude: 17.45, longitude: 78.39, plannedEta: pickup, boardingOtp: '1234', status: 'PENDING',
  });
  return id;
}

function addAssigned(db: FakeDb, pickup: Date, id = 'r-asg') {
  addRoute(db, pickup, { id, status: 'ASSIGNED', driverId: 'drv-old' });
  db.insert('corporateDriverEarning', {
    id: `earn-${id}`, driverId: 'drv-old', routeId: id, routeFarePaise: BigInt(66000),
    totalEarnedPaise: BigInt(66000), payoutStatus: 'UNPAID', payoutBatchId: null, createdAt: iso('2026-11-01T00:00:00.000Z'),
  });
  return id;
}

function build(opts: { nearby?: string[] } = {}) {
  const db = new FakeDb();
  seed(db);
  const redis = new FakeRedisService();
  // RedisService.ttl contract used by the driver offer read path.
  (redis.client as any).ttl = async (key: string) => {
    const e = redis.client.kv.get(key);
    if (!e) return -2;
    return e.expiresAt === undefined ? -1 : Math.ceil((e.expiresAt - Date.now()) / 1000);
  };
  const notifications = makeNotifications();
  const audit = makeAudit();
  const locations = { findNearbyDrivers: jest.fn(async () => (opts.nearby ?? []).map((driverId) => ({ driverId }))) };
  const dispatch = new CorporateDispatchService(db as any, redis as any, notifications as any, audit as any, locations as any);
  const ops = new CorporateOperationsService(db as any, redis as any, notifications as any, audit as any, dispatch);
  return { db, redis, client: redis.client, notifications, audit, dispatch, ops };
}

const atRiskAlerts = (n: ReturnType<typeof makeNotifications>) =>
  n.events.filter((e) => e.channel === 'admin:operations' && e.event === 'CORPORATE_ROUTE_AT_RISK');

let warnSpy: jest.SpyInstance;
beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------
// A. Scheduler -> escalation
// ---------------------------------------------------------------------------

describe('A. scheduler tick runs at-risk escalation', () => {
  const NOW = iso('2026-11-10T02:00:00.000Z').getTime();

  function schedulerWith(dispatchService: any, redis: FakeRedisService, db: FakeDb) {
    return new CorporateDispatchSchedulerService(db as any, dispatchService, makeNotifications() as any, makeAudit() as any, redis as any);
  }

  it('calls checkAndEscalateAtRiskRoutes exactly once per tick, with the tick clock', async () => {
    const db = new FakeDb();
    const redis = new FakeRedisService();
    const svc = { checkAndEscalateAtRiskRoutes: jest.fn(async () => ['r1']) };
    const scheduler = schedulerWith(svc, redis, db);

    const first = await scheduler.tick(NOW);
    expect(svc.checkAndEscalateAtRiskRoutes).toHaveBeenCalledTimes(1);
    expect(svc.checkAndEscalateAtRiskRoutes).toHaveBeenCalledWith(NOW);
    expect(first.escalatedRoutes).toEqual(['r1']);

    await scheduler.tick(NOW + 30_000);
    expect(svc.checkAndEscalateAtRiskRoutes).toHaveBeenCalledTimes(2);
  });

  it('runs once across instances: only the tick-lock holder escalates', async () => {
    const db = new FakeDb();
    const redis = new FakeRedisService(); // shared by all instances
    const svc = { checkAndEscalateAtRiskRoutes: jest.fn(async () => []) };
    const instances = [1, 2, 3].map(() => schedulerWith(svc, redis, db));

    const results = await Promise.all(instances.map((s) => s.tick(NOW)));
    expect(results.filter((r) => !r.skipped)).toHaveLength(1);
    expect(svc.checkAndEscalateAtRiskRoutes).toHaveBeenCalledTimes(1);
  });

  it('an escalation failure is logged and does not fail the tick', async () => {
    const db = new FakeDb();
    const svc = { checkAndEscalateAtRiskRoutes: jest.fn(async () => Promise.reject(new Error('db down'))) };
    const res = await schedulerWith(svc, new FakeRedisService(), db).tick(NOW);
    expect(res.skipped).toBe(false);
    expect(res.escalatedRoutes).toEqual([]);
  });

  it('end to end: a flagged route does not re-alert on later ticks', async () => {
    const { db, redis, dispatch, notifications, audit } = build();
    const id = addRoute(db, new Date(NOW + 20 * 60_000), { status: 'DISPATCHING' });
    const scheduler = new CorporateDispatchSchedulerService(db as any, dispatch, notifications as any, audit as any, redis as any);

    const t1 = await scheduler.tick(NOW);
    const t2 = await scheduler.tick(NOW + 30_000);
    const t3 = await scheduler.tick(NOW + 60_000);

    expect(t1.escalatedRoutes).toEqual([id]);
    expect(t2.escalatedRoutes).toEqual([]);
    expect(t3.escalatedRoutes).toEqual([]);
    expect(db.tables.corporateRoute.get(id)!.atRisk).toBe(true);
    expect(atRiskAlerts(notifications)).toHaveLength(1);
    expect(atRiskAlerts(notifications)[0].payload).toMatchObject({ routeId: id, tenantId: 't1', minutesToPickup: 20 });
    expect(audit.logs.filter((l) => l.action === 'CORPORATE_ROUTE_AT_RISK_ESCALATED')).toHaveLength(1);
  });

  it('concurrent escalation passes (tick lock expired mid-tick) still alert once per route', async () => {
    const { db, dispatch, notifications } = build();
    const a = addRoute(db, new Date(NOW + 10 * 60_000));
    const b = addRoute(db, new Date(NOW + 25 * 60_000), { status: 'DISPATCHING' });

    const [x, y] = await Promise.all([dispatch.checkAndEscalateAtRiskRoutes(NOW), dispatch.checkAndEscalateAtRiskRoutes(NOW)]);
    expect([...x, ...y].sort()).toEqual([a, b].sort());
    expect(atRiskAlerts(notifications).map((e) => e.payload.routeId).sort()).toEqual([a, b].sort());
  });

  it('ignores assigned routes, routes beyond the lead and long-past pickups', async () => {
    const { db, dispatch, notifications } = build();
    addRoute(db, new Date(NOW + 45 * 60_000)); // outside the 30 min lead
    addRoute(db, new Date(NOW + 10 * 60_000), { status: 'ASSIGNED', driverId: 'drv-c' });
    addRoute(db, new Date(NOW - 3 * 60 * 60_000)); // pickup 3 h ago: stale, not actionable
    expect(await dispatch.checkAndEscalateAtRiskRoutes(NOW)).toEqual([]);
    expect(atRiskAlerts(notifications)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// B. Rate-card pricing
// ---------------------------------------------------------------------------

describe('B. driver offer pricing from CorporateDriverRateCard', () => {
  const CARDS = [
    // v1: ₹320 first 10 km + ₹22/km, until 2026-11-15
    { id: 'drc-v1', basePayoutPaise: 32000n, perKmPaise: 2200n, effectiveFrom: iso('2026-10-01T00:00:00.000Z'), effectiveTo: iso('2026-11-15T00:00:00.000Z') },
    // v2: ₹350 first 10 km + ₹25/km, from 2026-11-15
    { id: 'drc-v2', basePayoutPaise: 35000n, perKmPaise: 2500n, effectiveFrom: iso('2026-11-15T00:00:00.000Z') },
    // a newer but inactive card and an SUV card must never be picked for SEDAN
    { id: 'drc-off', basePayoutPaise: 99900n, perKmPaise: 9900n, effectiveFrom: iso('2026-11-01T00:00:00.000Z'), isActive: false },
    { id: 'drc-suv', vehicleCategory: 'SUV', basePayoutPaise: 45000n, perKmPaise: 3000n, effectiveFrom: iso('2026-10-01T00:00:00.000Z') },
  ];

  it('selects the card version in force at the route pickup time', async () => {
    const { db, dispatch } = build();
    attachRateCards(db, CARDS);
    // 18 km = 10 km base + 8 extra km
    const before = await dispatch.priceOffer({ id: 'r', vehicleCategory: 'SEDAN', estDistanceMeters: 18000, targetPickup1Time: iso('2026-11-14T23:59:00.000Z') });
    const after = await dispatch.priceOffer({ id: 'r', vehicleCategory: 'sedan', estDistanceMeters: 18000, targetPickup1Time: iso('2026-11-15T00:00:00.000Z') });
    expect(before).toEqual({ farePaise: 32000 + 8 * 2200, rateCardId: 'drc-v1', source: 'RATE_CARD' });
    expect(after).toEqual({ farePaise: 35000 + 8 * 2500, rateCardId: 'drc-v2', source: 'RATE_CARD' });
    const suv = await dispatch.priceOffer({ id: 'r', vehicleCategory: 'SUV', estDistanceMeters: 10500, targetPickup1Time: iso('2026-11-10T00:00:00.000Z') });
    expect(suv).toEqual({ farePaise: 45000 + 3000, rateCardId: 'drc-suv', source: 'RATE_CARD' });
  });

  it('falls back to the legacy constants with a warning when no card is in force', async () => {
    const { db, dispatch } = build();
    attachRateCards(db, [{ id: 'future', basePayoutPaise: 1n, perKmPaise: 1n, effectiveFrom: iso('2027-01-01T00:00:00.000Z') }]);
    const res = await dispatch.priceOffer({ id: 'r-fb', vehicleCategory: 'SEDAN', estDistanceMeters: 18000, targetPickup1Time: iso('2026-11-10T00:00:00.000Z') });
    expect(res).toEqual({ farePaise: 30000 + 18 * 2000, source: 'FALLBACK' });
    expect(warnSpy.mock.calls.some(([m]) => String(m).includes('[PRICING]') && String(m).includes('r-fb'))).toBe(true);
  });

  it('autonomous dispatchRoute offers the rate-card fare and audits the card used', async () => {
    const { db, dispatch, client, audit } = build({ nearby: ['drv-c'] });
    attachRateCards(db, CARDS);
    const offers = attachDriverOffers(db);
    const id = addRoute(db, iso('2026-11-16T03:00:00.000Z'));

    const res = await dispatch.dispatchRoute(id);
    expect(res).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'drv-c' });
    const offer = JSON.parse((await client.get(CorporateDispatchKeys.offer(id)))!);
    expect(offer.farePaise).toBe(35000 + 8 * 2500);
    expect(offers).toHaveLength(1);
    expect(offers[0].payoutPaise).toBe(BigInt(55000));
    const entry = audit.logs.find((l) => l.action === 'CORPORATE_DISPATCH_TRIGGERED');
    expect(entry.metadata).toMatchObject({ farePaise: 55000, rateCardId: 'drc-v2', pricingSource: 'RATE_CARD' });
    expect(warnSpy.mock.calls.some(([m]) => String(m).includes('[PRICING]'))).toBe(false);
  });

  it('billing resolveDriverPayout delegates to RateCardService (same effective-date rule, billing defaults kept)', async () => {
    const db = new FakeDb();
    const { findFirst } = attachRateCards(db, CARDS);
    const billing = new CorporateBillingService(db as any, makeNotifications() as any, makeAudit() as any, new RateCardService(db as any));
    const v1 = await billing.resolveDriverPayout('SEDAN', 18000, iso('2026-11-01T00:00:00.000Z'));
    expect(v1).toEqual({ basePayoutPaise: 32000n, distancePaise: 8n * 2200n, totalPayoutPaise: 32000n + 17600n, rateCardId: 'drc-v1' });
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ isActive: true, effectiveFrom: { lte: iso('2026-11-01T00:00:00.000Z') } });

    const none = await billing.resolveDriverPayout('HATCHBACK', 15000, iso('2026-11-01T00:00:00.000Z'));
    expect(none).toEqual({ basePayoutPaise: 30000n, distancePaise: 5n * 1800n, totalPayoutPaise: 39000n, rateCardId: undefined });
  });
});

// ---------------------------------------------------------------------------
// C. Directed offers
// ---------------------------------------------------------------------------

describe('C. offerRouteToDriver (directed single-driver offer)', () => {
  const PICKUP = iso('2026-11-10T03:00:00.000Z');
  const reasonOf = (err: any) => (err instanceof HttpException ? (err.getResponse() as any).reason : undefined);

  async function expect409(p: Promise<unknown>, reason: string) {
    const err = await p.then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(ConflictException);
    expect(reasonOf(err)).toBe(reason);
    return err;
  }

  it('rejects an unverified driver with 409 DRIVER_NOT_VERIFIED and issues nothing', async () => {
    const { db, dispatch, client } = build();
    const offers = attachDriverOffers(db);
    const id = addRoute(db, PICKUP, { status: 'DISPATCHING' });
    await expect409(dispatch.offerRouteToDriver(id, 'drv-unv'), 'DRIVER_NOT_VERIFIED');
    expect(await client.get(CorporateDispatchKeys.offer(id))).toBeNull();
    expect(await client.get(CorporateDispatchKeys.driverHold('drv-unv'))).toBeNull();
    expect(offers).toHaveLength(0);
  });

  it('rejects overlap, seat/category mismatch and a driver busy with another offer; unknown driver is 404', async () => {
    const { db, dispatch, client } = build();
    const id = addRoute(db, PICKUP, { status: 'DISPATCHING' });
    const clash = addRoute(db, new Date(PICKUP.getTime() + 20 * 60_000), { status: 'ASSIGNED', driverId: 'drv-new' });
    const err = await expect409(dispatch.offerRouteToDriver(id, 'drv-new'), 'ROUTE_TIME_OVERLAP');
    expect((err.getResponse() as any).conflictingRouteId).toBe(clash);
    expect(err.message).toContain(clash);

    const suv = addRoute(db, iso('2026-11-12T03:00:00.000Z'), { status: 'DISPATCHING', vehicleCategory: 'SUV', maxCapacity: 6 });
    await expect409(dispatch.offerRouteToDriver(suv, 'drv-c'), 'VEHICLE_CATEGORY_MISMATCH');

    await client.set(CorporateDispatchKeys.driverHold('drv-c'), 'some-other-route');
    await expect409(dispatch.offerRouteToDriver(id, 'drv-c'), 'DRIVER_HOLDS_LIVE_OFFER');

    await expect(dispatch.offerRouteToDriver(id, 'drv-missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('eligible driver: persists the offer row and writes the dispatch Redis keys with the 60 s TTL', async () => {
    const { db, dispatch, client, notifications, audit } = build();
    attachRateCards(db, [{ id: 'drc', basePayoutPaise: 30000n, perKmPaise: 2000n, effectiveFrom: iso('2026-01-01T00:00:00.000Z') }]);
    const offers = attachDriverOffers(db);
    const id = addRoute(db, PICKUP); // PLANNED: moved to DISPATCHING by the offer
    const before = Date.now();

    const res = await dispatch.offerRouteToDriver(id, 'drv-c', { actorUserId: 'u-admin', reason: 'manual allocation' });
    expect(res).toMatchObject({ routeId: id, status: 'OFFERED', offeredToDriverId: 'drv-c' });
    expect(db.tables.corporateRoute.get(id)!.status).toBe('DISPATCHING');

    const offerKey = client.kv.get(CorporateDispatchKeys.offer(id))!;
    expect(JSON.parse(offerKey.value)).toMatchObject({ routeId: id, driverId: 'drv-c', farePaise: 30000 + 8 * 2000 });
    expect(Math.round((offerKey.expiresAt! - before) / 1000)).toBe(60);
    expect(await client.smembers(CorporateDispatchKeys.ACTIVE_OFFERS_SET)).toContain(id);
    expect(await (client as any).zscore(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, id)).not.toBeNull();
    expect(await client.get(CorporateDispatchKeys.offerDriver(id))).toBe('drv-c');
    expect(await client.get(CorporateDispatchKeys.driverHold('drv-c'))).toBe(id);

    expect(offers).toEqual([expect.objectContaining({ routeId: id, driverId: 'drv-c', attempt: 1, status: 'SENT', payoutPaise: BigInt(46000), tenantId: 't1' })]);
    expect(notifications.events.some((e) => e.channel === 'driver:drv-c' && e.event === 'CORPORATE_ROUTE_OFFER' && e.payload.directedByOps)).toBe(true);
    expect(audit.logs.find((l) => l.action === 'CORPORATE_DISPATCH_DIRECT_OFFER').metadata).toMatchObject({ offeredToDriverId: 'drv-c', pricingSource: 'RATE_CARD', rateCardId: 'drc' });

    // The driver accepts through the normal accept path.
    await dispatch.acceptRouteOffer(id, 'drv-c');
    expect(db.tables.corporateRoute.get(id)).toMatchObject({ status: 'ASSIGNED', driverId: 'drv-c' });
    expect(offers[0].status).toBe('ACCEPTED');
  });

  it('replaces a live offer to another driver (withdrawn) and is idempotent for the same driver', async () => {
    const { db, dispatch, client } = build({ nearby: ['drv-old'] });
    const offers = attachDriverOffers(db);
    const id = addRoute(db, PICKUP);
    await dispatch.dispatchRoute(id); // autonomous offer to drv-old
    expect(offers.map((o) => [o.driverId, o.status])).toEqual([['drv-old', 'SENT']]);

    const first = await dispatch.offerRouteToDriver(id, 'drv-c', { farePaise: 70000 });
    const again = await dispatch.offerRouteToDriver(id, 'drv-c', { farePaise: 70000 });
    expect(again.offerExpiresAt!.getTime()).toBe(first.offerExpiresAt!.getTime());
    expect(offers.map((o) => [o.driverId, o.status])).toEqual([['drv-old', 'WITHDRAWN'], ['drv-c', 'SENT']]);
    expect(await client.get(CorporateDispatchKeys.driverHold('drv-old'))).toBeNull();
    expect(JSON.parse((await client.get(CorporateDispatchKeys.offer(id)))!)).toMatchObject({ driverId: 'drv-c', farePaise: 70000 });
  });

  it('ops directed reassign goes through offerRouteToDriver; an ineligible driver is 409 before anything changes', async () => {
    const { db, ops, dispatch } = build();
    const id = addAssigned(db, PICKUP);
    const spy = jest.spyOn(dispatch, 'offerRouteToDriver');

    await expect409(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-unv' }), 'DRIVER_NOT_VERIFIED');
    expect(db.tables.corporateRoute.get(id)).toMatchObject({ status: 'ASSIGNED', driverId: 'drv-old' });
    expect(db.tables.corporateDriverEarning.get(`earn-${id}`)!.payoutStatus).toBe('UNPAID');
    expect(spy).not.toHaveBeenCalled();

    const res: any = await ops.reassignRoute(id, { reason: 'customer escalation', newDriverId: 'drv-new' }, { id: 'u-admin' });
    expect(spy).toHaveBeenCalledWith(id, 'drv-new', expect.objectContaining({ farePaise: 66000, actorUserId: 'u-admin', directedByOps: true }));
    expect(res.dispatch).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'drv-new', offerExpiresAt: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// D. Void, never delete
// ---------------------------------------------------------------------------

describe('D. reassign voids the old earning', () => {
  const PICKUP = iso('2026-11-10T03:00:00.000Z');

  it('marks the earning VOIDED with voidedAt / voidReason and never deletes it', async () => {
    const { db, ops } = build();
    const id = addAssigned(db, PICKUP);
    const res: any = await ops.reassignRoute(id, { reason: 'vehicle breakdown' }, { id: 'u-admin' });

    expect((db as any).corporateDriverEarning.deleteMany).not.toHaveBeenCalled();
    const e = db.tables.corporateDriverEarning.get(`earn-${id}`)!;
    expect(e).toMatchObject({ payoutStatus: 'VOIDED', payoutBatchId: null, totalEarnedPaise: BigInt(66000) });
    expect(e.voidedAt).toBeInstanceOf(Date);
    expect(e.voidReason).toBe(`REASSIGNED ${res.reassignmentId}: vehicle breakdown`);
    expect(db.tables.corporateRoute.get(id)).toMatchObject({ status: 'DISPATCHING', driverId: null, atRisk: false });
  });

  it('VOIDED earnings are excluded from payout batches and earnings totals', async () => {
    // Same scenario twice: createPayoutBatch claims the UNPAID earnings it batches (they move to
    // PROCESSING), so the legacy prepare path is checked on its own identical copy.
    const scenario = async () => {
      const { db, ops, dispatch } = build();
      const id = addAssigned(db, PICKUP);
      await ops.reassignRoute(id, { reason: 'swap driver', newDriverId: 'drv-new' });
      await dispatch.acceptRouteOffer(id, 'drv-new');
      // An unrelated, untouched earning of the old driver on another route.
      db.insert('corporateDriverEarning', {
        id: 'earn-other', driverId: 'drv-old', routeId: 'route-x', routeFarePaise: BigInt(40000),
        totalEarnedPaise: BigInt(40000), payoutStatus: 'UNPAID', payoutBatchId: null, createdAt: iso('2026-11-02T00:00:00.000Z'),
      });
      return { db, id, billing: new CorporateBillingService(db as any, makeNotifications() as any, makeAudit() as any) };
    };
    const { db, id, billing } = await scenario();

    const summary = await billing.getDriverEarningsSummary('drv-old');
    expect(summary).toMatchObject({ totalRoutesCount: 1, totalEarnedPaise: '40000', unpaidPaise: '40000' });

    const batch: any = await billing.createPayoutBatch({} as any, 'u-maker', 'idem-1');
    expect(batch).toMatchObject({ totalRoutes: 2, grossPaise: 66000n + 40000n });
    // The voided row is untouched by the batch.
    expect(db.tables.corporateDriverEarning.get(`earn-${id}`)).toMatchObject({ payoutStatus: 'VOIDED', payoutBatchId: null });

    const legacy = await scenario();
    const prepared = await legacy.billing.prepareDriverPayoutBatch();
    expect(prepared.disbursements.map((d: any) => [d.driverId, d.grossPaise]).sort()).toEqual([
      ['drv-new', '66000'],
      ['drv-old', '40000'],
    ]);
    // The voided row is untouched by payouts.
    expect(legacy.db.tables.corporateDriverEarning.get(`earn-${legacy.id}`)).toMatchObject({ payoutStatus: 'VOIDED', payoutBatchId: null });
  });

  it('a second reassign does not re-void or count the already voided earning', async () => {
    const { db, ops, dispatch } = build();
    const id = addAssigned(db, PICKUP);
    await ops.reassignRoute(id, { reason: 'first swap', newDriverId: 'drv-c' });
    await dispatch.acceptRouteOffer(id, 'drv-c');
    const res: any = await ops.reassignRoute(id, { reason: 'second swap', newDriverId: 'drv-new' }, { id: 'u-admin' });

    const rows = db.all('corporateDriverEarning').filter((e) => e.routeId === id);
    expect(rows.map((e) => [e.driverId, e.payoutStatus]).sort()).toEqual([['drv-c', 'VOIDED'], ['drv-old', 'VOIDED']]);
    expect(db.tables.corporateDriverEarning.get(`earn-${id}`)!.voidReason).toContain('first swap');
    expect(res.dispatch).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'drv-new' });
  });
});

// ---------------------------------------------------------------------------
// E. my-offer == driver-offers
// ---------------------------------------------------------------------------

describe('E. GET my-offer and GET driver-offers agree', () => {
  const PICKUP = iso('2026-11-10T03:00:00.000Z');

  function controllerFor(b: ReturnType<typeof build>) {
    // The controllers resolve the driver by its user id (FakeDb.findUnique only keys by id).
    const byId = (b.db as any).driver.findUnique;
    (b.db as any).driver.findUnique = jest.fn(async (args: any) =>
      args.where.userId ? (b.db.all('driver').find((d) => d.userId === args.where.userId) ?? null) : byId(args),
    );
    return new CorporateDispatchController(b.dispatch, b.redis as any, b.db as any);
  }

  it('both report the same live Redis offer (route, fare, remaining TTL); my-offer keeps its shape', async () => {
    const b = build({ nearby: ['drv-c'] });
    attachDriverOffers(b.db);
    const id = addRoute(b.db, PICKUP);
    await b.dispatch.dispatchRoute(id);
    const spy = jest.spyOn(b.dispatch, 'getDriverActiveOffer');
    const ctrl = controllerFor(b);
    const req = { user: { id: 'u-drv-c' } };

    const mine = await ctrl.getMyActiveOffer(req);
    const inbox: any = await ctrl.getDriverOffers(req);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(Object.keys(mine).sort()).toEqual(['hasOffer', 'offer', 'remainingTtlSeconds', 'routeId']);
    expect(mine).toMatchObject({ hasOffer: true, routeId: id });
    expect(inbox.hasActiveOffer).toBe(true);
    expect(inbox.offer.routeId).toBe(mine.routeId);
    expect(mine.offer.farePaise).toBe(inbox.offer.farePaise);
    // Read a few ms apart: the countdown may tick over a second boundary in between.
    expect(Math.abs(mine.remainingTtlSeconds! - inbox.offer.remainingSeconds)).toBeLessThanOrEqual(1);
    expect(mine.remainingTtlSeconds).toBeGreaterThan(55);
  });

  it('both fall back to the persisted offer when the Redis payload is gone, and both report none otherwise', async () => {
    const b = build();
    const offers = attachDriverOffers(b.db);
    const id = addRoute(b.db, PICKUP, { status: 'DISPATCHING' });
    offers.push({
      id: 'offer-db', tenantId: 't1', routeId: id, driverId: 'drv-c', attempt: 1, status: 'SENT',
      payoutPaise: BigInt(52000), expiresAt: new Date(Date.now() + 40_000), createdAt: new Date(),
    });
    const ctrl = controllerFor(b);

    const mine = await ctrl.getMyActiveOffer({ user: { id: 'u-drv-c' } });
    const inbox: any = await ctrl.getDriverOffers({ user: { id: 'u-drv-c' } });
    expect(mine).toMatchObject({ hasOffer: true, routeId: id, offer: { farePaise: 52000 } });
    expect(inbox).toMatchObject({ hasActiveOffer: true, offer: { routeId: id, farePaise: 52000 } });
    expect(Math.abs(mine.remainingTtlSeconds! - inbox.offer.remainingSeconds)).toBeLessThanOrEqual(1);

    expect(await ctrl.getMyActiveOffer({ user: { id: 'u-drv-new' } })).toEqual({ hasOffer: false });
    expect(await ctrl.getDriverOffers({ user: { id: 'u-drv-new' } })).toEqual({ hasActiveOffer: false });
  });
});
