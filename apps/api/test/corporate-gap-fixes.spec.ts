import {
  CorporateDispatchKeys,
  CorporateDispatchService,
  CORPORATE_DRIVER_TURNAROUND_MINUTES,
  corporateRouteBusyWindow,
  withdrawCorporateRouteOffer,
} from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { heuristicTrafficDelay } from '../src/domains/corporate/dispatch/traffic/heuristic-traffic';
import { GoogleTravelTimeMatrixAdapter } from '../src/domains/corporate/routing/google-travel-time-matrix.adapter';
import {
  CorporateRiderNotifier,
  formatIstClock,
} from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { isValidShiftDate } from '../src/domains/corporate/replanning/cutoff-policy';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { attachSortedSets } from './helpers/fake-sorted-sets';

/**
 * Regression tests for the Nov 2026 audit gaps:
 *  - cancelled route's live offer is withdrawn and the driver's hold released
 *  - drivers already committed to an overlapping corporate route are not offered another
 *  - offer acceptance (route ASSIGNED + earning row) is one all-or-nothing transaction
 *  - employees are told when a traffic forecast moves their pickup earlier
 *  - shift/peak-hour logic uses IST, not the server timezone
 */

const MIN = 60_000;

// ---------------------------------------------------------------------------
// Minimal Redis client fake (strings with TTL ignored, sets)
// ---------------------------------------------------------------------------
class FakeRedisClient {
  kv = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  constructor() {
    attachSortedSets(this);
  }
  async get(k: string) {
    return this.kv.get(k) ?? null;
  }
  async set(k: string, v: string, ...args: any[]) {
    if (args.includes('NX') && this.kv.has(k)) return null;
    this.kv.set(k, v);
    return 'OK';
  }
  async del(k: string) {
    const had = this.kv.delete(k) || this.sets.delete(k);
    return had ? 1 : 0;
  }
  async sadd(k: string, m: string) {
    if (!this.sets.has(k)) this.sets.set(k, new Set());
    this.sets.get(k)!.add(m);
    return 1;
  }
  async srem(k: string, m: string) {
    return this.sets.get(k)?.delete(m) ? 1 : 0;
  }
  async smembers(k: string) {
    return [...(this.sets.get(k) ?? [])];
  }
  async expire() {
    return 1;
  }
}

function fakeRedisService(client: FakeRedisClient) {
  const locks = new Map<string, string>();
  const svc: any = {};
  attachSortedSets(client, svc);
  return {
    ...svc,
    getClient: () => client,
    acquireLockToken: jest.fn(async (k: string) => {
      if (locks.has(k)) return null;
      const t = `${k}:${Math.random()}`;
      locks.set(k, t);
      return t;
    }),
    releaseLockToken: jest.fn(async (k: string, t: string) => {
      if (locks.get(k) === t) locks.delete(k);
    }),
  };
}

function seedOffer(client: FakeRedisClient, routeId: string, driverId: string) {
  client.kv.set(CorporateDispatchKeys.offer(routeId), JSON.stringify({ routeId, driverId, farePaise: 70000 }));
  client.kv.set(CorporateDispatchKeys.offerDriver(routeId), driverId);
  client.kv.set(CorporateDispatchKeys.driverHold(driverId), routeId);
  void client.sadd(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
}

// ---------------------------------------------------------------------------
// 1. Offer withdrawal helper
// ---------------------------------------------------------------------------
describe('withdrawCorporateRouteOffer', () => {
  it('clears offer, active-set entry, driver pointer and the driver hold; returns the driver', async () => {
    const c = new FakeRedisClient();
    seedOffer(c, 'r1', 'd1');
    c.kv.set(CorporateDispatchKeys.unserved('r1'), 'BUSY');

    await expect(withdrawCorporateRouteOffer(c, 'r1')).resolves.toBe('d1');

    expect(c.kv.has(CorporateDispatchKeys.offer('r1'))).toBe(false);
    expect(c.kv.has(CorporateDispatchKeys.offerDriver('r1'))).toBe(false);
    expect(c.kv.has(CorporateDispatchKeys.driverHold('d1'))).toBe(false);
    expect(c.kv.has(CorporateDispatchKeys.unserved('r1'))).toBe(false);
    expect(await c.smembers(CorporateDispatchKeys.ACTIVE_OFFERS_SET)).toEqual([]);
  });

  it('never releases a hold the driver now has for a different route', async () => {
    const c = new FakeRedisClient();
    seedOffer(c, 'r1', 'd1');
    c.kv.set(CorporateDispatchKeys.driverHold('d1'), 'r2'); // re-claimed by another route
    await withdrawCorporateRouteOffer(c, 'r1');
    expect(c.kv.get(CorporateDispatchKeys.driverHold('d1'))).toBe('r2');
  });

  it('falls back to the longer-lived driver pointer after the 60s offer key expired', async () => {
    const c = new FakeRedisClient();
    c.kv.set(CorporateDispatchKeys.offerDriver('r1'), 'd9');
    c.kv.set(CorporateDispatchKeys.driverHold('d9'), 'r1');
    await expect(withdrawCorporateRouteOffer(c, 'r1')).resolves.toBe('d9');
    expect(c.kv.has(CorporateDispatchKeys.driverHold('d9'))).toBe(false);
  });

  it('is a no-op without Redis or without an offer', async () => {
    await expect(withdrawCorporateRouteOffer(null, 'r1')).resolves.toBeNull();
    await expect(withdrawCorporateRouteOffer(new FakeRedisClient(), 'r1')).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Busy windows
// ---------------------------------------------------------------------------
describe('corporateRouteBusyWindow', () => {
  const t = (iso: string) => new Date(iso);

  it('LOGIN: pickup-1 until office arrival', () => {
    const w = corporateRouteBusyWindow({
      direction: 'LOGIN',
      targetPickup1Time: t('2026-11-03T01:00:00Z'),
      targetOfficeArrivalTime: t('2026-11-03T02:20:00Z'),
      estDurationSeconds: 3600,
    });
    expect(w).toEqual({ start: t('2026-11-03T01:00:00Z').getTime(), end: t('2026-11-03T02:20:00Z').getTime() });
  });

  it('LOGOUT: starts 15 min before departure (office staging) and lasts the route duration', () => {
    const w = corporateRouteBusyWindow({
      direction: 'LOGOUT',
      targetPickup1Time: t('2026-11-03T12:30:00Z'),
      estDurationSeconds: 5400,
    });
    expect(w.start).toBe(t('2026-11-03T12:15:00Z').getTime());
    expect(w.end).toBe(t('2026-11-03T14:00:00Z').getTime());
  });

  it('unknown duration assumes 2 hours rather than zero', () => {
    const w = corporateRouteBusyWindow({ direction: 'LOGOUT', targetPickup1Time: t('2026-11-03T12:30:00Z') });
    expect(w.end - t('2026-11-03T12:30:00Z').getTime()).toBe(2 * 3600_000);
  });
});

// ---------------------------------------------------------------------------
// 3. Dispatch: busy-driver filter + transactional accept
// ---------------------------------------------------------------------------
describe('CorporateDispatchService: busy drivers and atomic accept', () => {
  const PICKUP1 = new Date('2026-11-03T01:00:00Z'); // 06:30 IST
  const OFFICE_ARR = new Date('2026-11-03T02:20:00Z');

  let client: FakeRedisClient;
  let routes: Map<string, any>;
  let earnings: any[];
  let drivers: Map<string, any>;
  let nearby: string[];
  let failEarning: boolean;
  let service: CorporateDispatchService;
  let notifications: { emitEvent: jest.Mock; sendPushToUser: jest.Mock };

  const route = (id: string, extra: Record<string, any> = {}) => ({
    id,
    tenantId: 't1',
    status: 'PLANNED',
    direction: 'LOGIN',
    vehicleCategory: 'SEDAN',
    shiftDate: new Date('2026-11-03T00:00:00Z'),
    shiftTime: '08:00',
    assignedPassengerCount: 4,
    estDistanceMeters: 20000,
    estDurationSeconds: 80 * 60,
    targetPickup1Time: PICKUP1,
    targetOfficeArrivalTime: OFFICE_ARR,
    driverId: null,
    ...extra,
  });

  const makeDb = () => {
    const corporateRoute = {
      findUnique: jest.fn(async ({ where }: any) => {
        const r = routes.get(where.id);
        if (!r) return null;
        return {
          ...r,
          tenant: { name: 'Acme' },
          office: { name: 'HQ', latitude: 17.44, longitude: 78.37 },
          stops: [{ stopSequence: 1, latitude: 17.45, longitude: 78.36 }],
        };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        [...routes.values()].filter(
          (r) =>
            (!where.driverId?.in || where.driverId.in.includes(r.driverId)) &&
            (!where.status?.in || where.status.in.includes(r.status)) &&
            (!where.id?.not || r.id !== where.id.not),
        ),
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const r = routes.get(where.id);
        const okStatus =
          where.status === undefined ||
          (typeof where.status === 'string' ? r?.status === where.status : where.status.in.includes(r?.status));
        if (!r || !okStatus) throw Object.assign(new Error('not found'), { code: 'P2025' });
        Object.assign(r, data);
        return { ...r, stops: [], office: { name: 'HQ' }, tenant: { name: 'Acme' } };
      }),
    };
    const db: any = {
      corporateRoute,
      corporateDriverEarning: {
        create: jest.fn(async ({ data }: any) => {
          if (failEarning) throw new Error('earning insert failed');
          earnings.push(data);
          return data;
        }),
      },
      driver: {
        findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => drivers.get(id)).filter(Boolean)),
        findUnique: jest.fn(async ({ where }: any) => drivers.get(where.id) ?? null),
      },
      vehicle: { findFirst: jest.fn(async () => null) },
      // Interactive transaction with rollback of route rows and earnings.
      $transaction: jest.fn(async (fn: any) => {
        const snapRoutes = new Map([...routes].map(([k, v]) => [k, { ...v }]));
        const snapEarnings = [...earnings];
        try {
          return await fn(db);
        } catch (err) {
          routes = snapRoutes;
          earnings = snapEarnings;
          throw err;
        }
      }),
    };
    return db;
  };

  beforeEach(() => {
    client = new FakeRedisClient();
    routes = new Map();
    earnings = [];
    failEarning = false;
    drivers = new Map(
      ['d-near', 'd-far'].map((id) => [
        id,
        { id, userId: `u-${id}`, fullName: id, availabilityStatus: 'AVAILABLE', verificationStatus: 'VERIFIED', vehicleType: 'SEDAN' },
      ]),
    );
    nearby = ['d-near', 'd-far']; // proximity order
    notifications = { emitEvent: jest.fn(), sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    const locations = {
      findNearbyDrivers: jest.fn(async () => nearby.map((driverId, i) => ({ driverId, distanceKm: 1 + i }))),
    };
    service = new CorporateDispatchService(
      makeDb(),
      fakeRedisService(client) as any,
      notifications as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      locations as any,
    );
    for (const l of ['log', 'warn', 'error'] as const) jest.spyOn((service as any).logger, l).mockImplementation(() => undefined);
  });

  it('skips a driver already ASSIGNED to an overlapping route and offers the next nearest', async () => {
    routes.set('busy', route('busy', { status: 'ASSIGNED', driverId: 'd-near' }));
    routes.set('r1', route('r1'));
    const res = await service.dispatchRoute('r1');
    expect(res).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'd-far' });
  });

  it('IN_TRANSIT commitments count as busy too', async () => {
    routes.set('busy', route('busy', { status: 'IN_TRANSIT', driverId: 'd-near' }));
    routes.set('r1', route('r1'));
    expect((await service.dispatchRoute('r1')).offeredToDriverId).toBe('d-far');
  });

  it('a driver whose other trip ends more than the turnaround gap before pickup-1 is still eligible', async () => {
    const gap = (CORPORATE_DRIVER_TURNAROUND_MINUTES + 1) * MIN;
    routes.set(
      'earlier',
      route('earlier', {
        status: 'ASSIGNED',
        driverId: 'd-near',
        targetPickup1Time: new Date(PICKUP1.getTime() - gap - 80 * MIN),
        targetOfficeArrivalTime: new Date(PICKUP1.getTime() - gap),
      }),
    );
    routes.set('r1', route('r1'));
    expect((await service.dispatchRoute('r1')).offeredToDriverId).toBe('d-near');
  });

  it('a trip ending inside the turnaround gap makes the driver busy', async () => {
    const gap = (CORPORATE_DRIVER_TURNAROUND_MINUTES - 1) * MIN;
    routes.set(
      'earlier',
      route('earlier', {
        status: 'ASSIGNED',
        driverId: 'd-near',
        targetPickup1Time: new Date(PICKUP1.getTime() - gap - 80 * MIN),
        targetOfficeArrivalTime: new Date(PICKUP1.getTime() - gap),
      }),
    );
    routes.set('r1', route('r1'));
    expect((await service.dispatchRoute('r1')).offeredToDriverId).toBe('d-far');
  });

  it('completed or cancelled trips never block a driver', async () => {
    routes.set('done', route('done', { status: 'COMPLETED', driverId: 'd-near' }));
    routes.set('gone', route('gone', { status: 'CANCELLED', driverId: 'd-near' }));
    routes.set('r1', route('r1'));
    expect((await service.dispatchRoute('r1')).offeredToDriverId).toBe('d-near');
  });

  it('when every nearby driver is committed, the route reports no supply instead of double-booking', async () => {
    routes.set('b1', route('b1', { status: 'ASSIGNED', driverId: 'd-near' }));
    routes.set('b2', route('b2', { status: 'ASSIGNED', driverId: 'd-far' }));
    routes.set('r1', route('r1'));
    expect((await service.dispatchRoute('r1')).status).toBe('NO_DRIVERS_FOUND');
  });

  it('accept: route ASSIGNED and exactly one earning row, in one transaction', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    const updated = await service.acceptRouteOffer('r1', 'd-near');
    expect(updated.status).toBe('ASSIGNED');
    expect(routes.get('r1')).toMatchObject({ status: 'ASSIGNED', driverId: 'd-near' });
    expect(earnings).toHaveLength(1);
    expect(client.kv.has(CorporateDispatchKeys.offer('r1'))).toBe(false);
  });

  it('accept: if the earning insert fails the assignment is rolled back and the offer kept for a retry', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    failEarning = true;
    await expect(service.acceptRouteOffer('r1', 'd-near')).rejects.toThrow('earning insert failed');
    expect(routes.get('r1')).toMatchObject({ status: 'DISPATCHING', driverId: null });
    expect(earnings).toHaveLength(0);
    expect(client.kv.has(CorporateDispatchKeys.offer('r1'))).toBe(true);

    failEarning = false;
    await service.acceptRouteOffer('r1', 'd-near');
    expect(routes.get('r1').status).toBe('ASSIGNED');
    expect(earnings).toHaveLength(1);
  });

  it('a driver without the offer is refused before touching the route lock', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    const redisSvc = (service as any).redis;
    redisSvc.acquireLockToken.mockClear();
    await expect(service.acceptRouteOffer('r1', 'd-far')).rejects.toThrow(/another driver/);
    expect(redisSvc.acquireLockToken).not.toHaveBeenCalled();
  });

  it('the offered driver waits for a briefly held route lock instead of getting an instant 409', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    const redisSvc = (service as any).redis;
    const token = await redisSvc.acquireLockToken('corporate:dispatch:lock:r1', 15); // someone else holds it
    setTimeout(() => redisSvc.releaseLockToken('corporate:dispatch:lock:r1', token), 150);
    const updated = await service.acceptRouteOffer('r1', 'd-near');
    expect(updated.status).toBe('ASSIGNED');
  });

  it('gives up with 409 "retry" if the lock stays held past the wait window', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    (service as any).ACCEPT_LOCK_WAIT_MS = 100;
    await (service as any).redis.acquireLockToken('corporate:dispatch:lock:r1', 15);
    await expect(service.acceptRouteOffer('r1', 'd-near')).rejects.toThrow(/in progress, please retry/);
    expect(routes.get('r1').status).toBe('DISPATCHING');
  });

  it('accept on a route cancelled mid-offer is refused with no earning row', async () => {
    routes.set('r1', route('r1'));
    await service.dispatchRoute('r1');
    routes.get('r1').status = 'CANCELLED';
    await expect(service.acceptRouteOffer('r1', 'd-near')).rejects.toThrow(/no longer open/);
    expect(earnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Traffic advance -> employees notified
// ---------------------------------------------------------------------------
describe('DDA pickup advance notifies employees', () => {
  const at = (hhmm: string) => new Date(`2026-11-10T${hhmm}:00.000Z`);

  function loginRoute() {
    const stops = [0, 1, 2, 3].map((i) => ({
      id: `s${i + 1}`,
      stopSequence: i + 1,
      stopType: 'PICKUP',
      status: i === 3 ? 'CANCELLED' : 'PENDING',
      employeeId: `e${i + 1}`,
      latitude: 17.38 + i * 0.01,
      longitude: 78.48 - i * 0.02,
      plannedEta: new Date(at('06:10').getTime() + i * 25 * MIN),
    }));
    return {
      id: 'route-1',
      tenantId: 'tenant-1',
      direction: 'LOGIN',
      status: 'PLANNED',
      targetPickup1Time: at('06:10'),
      targetOfficeArrivalTime: at('08:00'),
      estDurationSeconds: 90 * 60 + 4 * 300,
      estDistanceMeters: 32000,
      office: { name: 'HQ', latitude: 17.4435, longitude: 78.3772 },
      stops: [
        ...stops,
        { id: 'office', stopSequence: 5, stopType: 'DROPOFF', status: 'PENDING', latitude: 17.4435, longitude: 78.3772, plannedEta: at('08:00') },
      ],
    };
  }

  function build(riderNotifier?: any) {
    const db: any = {
      corporateRoute: { findUnique: jest.fn().mockResolvedValue(loginRoute()), update: jest.fn().mockResolvedValue({}) },
      corporateRouteStop: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    const estimator = {
      estimateRouteDuration: jest.fn().mockResolvedValue({
        durationInTrafficSec: 90 * 60 + 60 * 60,
        staticDurationSec: 90 * 60,
        distanceMeters: 32000,
        source: 'GOOGLE',
      }),
    };
    const svc = new CorporateDispatchService(
      db,
      {} as any,
      { emitEvent: jest.fn() } as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      estimator as any,
      riderNotifier,
    );
    jest.spyOn((svc as any).logger, 'log').mockImplementation(() => undefined);
    return svc;
  }

  it('tells each still-pending pickup employee their new, earlier time', async () => {
    const notifier = { notifyPickupRetimed: jest.fn().mockResolvedValue([]) };
    const r = await build(notifier).assessDynamicTraffic('route-1');
    expect(r.persisted).toBe(true);

    expect(notifier.notifyPickupRetimed).toHaveBeenCalledTimes(1);
    const [routeArg, changes] = notifier.notifyPickupRetimed.mock.calls[0];
    expect(routeArg).toEqual({ id: 'route-1', tenantId: 'tenant-1' });
    expect(changes.map((c: any) => c.employeeId)).toEqual(['e1', 'e2', 'e3']); // e4's stop is cancelled
    const shift = r.adjustedPickup1Time!.getTime() - at('06:10').getTime();
    expect(shift).toBeLessThan(0);
    for (const c of changes) {
      expect(c.plannedEta.getTime() - c.previousEta.getTime()).toBe(shift);
      expect(c.reason).toMatch(/traffic/);
    }
  });

  it('works without a notifier wired (narrow modules) and still persists', async () => {
    await expect(build(undefined).assessDynamicTraffic('route-1')).resolves.toMatchObject({ persisted: true });
  });
});

// ---------------------------------------------------------------------------
// 5. Rider notifier: PICKUP_RETIMED
// ---------------------------------------------------------------------------
describe('CorporateRiderNotifier.notifyPickupRetimed', () => {
  function build() {
    const client = new FakeRedisClient();
    const notifications = { emitEvent: jest.fn(), sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    const db: any = {
      corporateEmployee: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, fullName: 'Asha Rao', userId: 'u1' })) },
      deviceToken: { count: jest.fn().mockResolvedValue(1) },
    };
    const notifier = new CorporateRiderNotifier(db, { getClient: () => client } as any, notifications as any);
    return { notifier, notifications };
  }
  const change = (iso: string) => ({
    stopId: 's1',
    stopSequence: 1,
    employeeId: 'e1',
    previousEta: new Date('2026-11-10T00:40:00Z'),
    plannedEta: new Date(iso),
    reason: 'heavy traffic expected, +60 min',
  });

  it('sends websocket + push with the new time in IST', async () => {
    const { notifier, notifications } = build();
    const [out] = await notifier.notifyPickupRetimed({ id: 'r1', tenantId: 't1' }, [change('2026-11-09T23:40:00Z')]);
    expect(out).toMatchObject({ delivered: true, push: 'SENT' });
    const [channel, event, payload] = notifications.emitEvent.mock.calls[0];
    expect(channel).toBe('employee:e1');
    expect(event).toBe('CORPORATE_PICKUP_UPDATED');
    expect(payload.message).toContain('05:10 IST');
    expect(payload.message).toContain('Asha');
    expect(notifications.sendPushToUser).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Pickup time changed' }));
  });

  it('dedupes the same new time but delivers a further change', async () => {
    const { notifier, notifications } = build();
    await notifier.notifyPickupRetimed({ id: 'r1', tenantId: 't1' }, [change('2026-11-09T23:40:00Z')]);
    const [again] = await notifier.notifyPickupRetimed({ id: 'r1', tenantId: 't1' }, [change('2026-11-09T23:40:00Z')]);
    expect(again.deduped).toBe(true);
    const [later] = await notifier.notifyPickupRetimed({ id: 'r1', tenantId: 't1' }, [change('2026-11-09T23:20:00Z')]);
    expect(later.delivered).toBe(true);
    expect(notifications.sendPushToUser).toHaveBeenCalledTimes(2);
  });

  it('formatIstClock is timezone independent', () => {
    expect(formatIstClock(new Date('2026-11-09T23:40:00Z'))).toBe('05:10');
    expect(formatIstClock(new Date('2026-11-10T18:30:00Z'))).toBe('00:00');
  });
});

// ---------------------------------------------------------------------------
// 6. IST, not server timezone
// ---------------------------------------------------------------------------
describe('IST time handling (server timezone independent)', () => {
  it('heuristic peak hours are IST: 02:00 UTC = 07:30 IST is peak, 07:30 UTC = 13:00 IST is not', () => {
    expect(heuristicTrafficDelay(10_000, new Date('2026-11-03T02:00:00Z')).delayMinutes).toBe(15);
    expect(heuristicTrafficDelay(10_000, new Date('2026-11-03T07:30:00Z')).delayMinutes).toBe(0);
    expect(heuristicTrafficDelay(40_000, new Date('2026-11-03T12:00:00Z')).delayMinutes).toBe(35); // 17:30 IST
  });

  it('travel-time cache buckets use IST weekday and time of day', () => {
    const adapter = new GoogleTravelTimeMatrixAdapter({} as any, null, undefined, { timeBucketMinutes: 30 });
    // Fri 2026-11-06 20:00 UTC = Sat 01:30 IST -> weekend bucket 0130
    expect(adapter.timeBucket(new Date('2026-11-06T20:00:00Z'))).toBe('we0130');
    // Mon 2026-11-09 02:45 UTC = 08:15 IST -> weekday bucket 0800
    expect(adapter.timeBucket(new Date('2026-11-09T02:45:00Z'))).toBe('wd0800');
  });

  it('isValidShiftDate accepts real calendar days only', () => {
    expect(isValidShiftDate('2026-11-05')).toBe(true);
    expect(isValidShiftDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-05', '05-11-2026', '', 20261105, null]) {
      expect(isValidShiftDate(bad)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Route list is bounded
// ---------------------------------------------------------------------------
describe('GET corporate/routes paging', () => {
  const build = () => {
    const db: any = { corporateRoute: { findMany: jest.fn().mockResolvedValue([]) } };
    return { db, ctrl: new CorporateRoutingController({} as any, db) };
  };
  const args = (db: any) => db.corporateRoute.findMany.mock.calls[0][0];

  it('defaults to 500 rows from offset 0 with a stable order', async () => {
    const { db, ctrl } = build();
    await ctrl.listRoutes('t1');
    expect(args(db)).toMatchObject({ take: 500, skip: 0, where: { tenantId: 't1' } });
    expect(args(db).orderBy.at(-1)).toEqual({ id: 'asc' });
  });

  it('honours limit/offset but never returns more than 1000 rows', async () => {
    const { db, ctrl } = build();
    await ctrl.listRoutes('t1', undefined, undefined, undefined, undefined, '50', '100');
    expect(args(db)).toMatchObject({ take: 50, skip: 100 });
    const b = build();
    await b.ctrl.listRoutes('t1', undefined, undefined, undefined, undefined, '999999', '-5');
    expect(args(b.db)).toMatchObject({ take: 1000, skip: 0 });
  });
});
