/**
 * Multi-instance concurrency simulations for Corporate ETS autonomous dispatch.
 *
 * Every "instance" below is a real CorporateDispatchService + CorporateDispatchSchedulerService
 * pair. Instances share one in-memory Redis (real SET NX EX / TTL semantics driven by a fake
 * clock) and one in-memory Postgres stand-in (real conditional UPDATE semantics). Every fake I/O
 * call yields to the event loop, so concurrent promises genuinely interleave, the way N ECS
 * tasks would against shared Redis/Postgres.
 */
import { ConflictException, Logger } from '@nestjs/common';
import {
  CorporateDispatchSchedulerService,
  mapWithConcurrency,
} from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
} from '../src/domains/corporate/dispatch/corporate-dispatch.service';

const tickYield = () => new Promise<void>((r) => setImmediate(r));

// ---------------------------------------------------------------------------
// Shared fake infrastructure
// ---------------------------------------------------------------------------
class FakeClock {
  now = Date.now();
  advance(ms: number) {
    this.now += ms;
  }
}

class FakeRedisClient {
  kv = new Map<string, { value: string; expiresAt?: number }>();
  sets = new Map<string, Set<string>>();
  constructor(private clock: FakeClock) {}

  private live(key: string) {
    const e = this.kv.get(key);
    if (!e) return undefined;
    if (e.expiresAt !== undefined && e.expiresAt <= this.clock.now) {
      this.kv.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string) {
    await tickYield();
    return this.live(key)?.value ?? null;
  }
  async set(key: string, value: string, ...args: any[]) {
    await tickYield();
    let ttl: number | undefined;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX') ttl = Number(args[++i]);
      else if (args[i] === 'NX') nx = true;
    }
    if (nx && this.live(key)) return null;
    this.kv.set(key, {
      value,
      expiresAt: ttl !== undefined ? this.clock.now + ttl * 1000 : undefined,
    });
    return 'OK';
  }
  async del(key: string) {
    await tickYield();
    return this.kv.delete(key) ? 1 : 0;
  }
  async expire(key: string, seconds: number) {
    await tickYield();
    const e = this.live(key);
    if (e) e.expiresAt = this.clock.now + seconds * 1000;
    return e ? 1 : 0;
  }
  async sadd(key: string, member: string) {
    await tickYield();
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const s = this.sets.get(key)!;
    const had = s.has(member);
    s.add(member);
    return had ? 0 : 1;
  }
  async srem(key: string, member: string) {
    await tickYield();
    return this.sets.get(key)?.delete(member) ? 1 : 0;
  }
  async smembers(key: string) {
    await tickYield();
    return Array.from(this.sets.get(key) ?? []);
  }
  async sismember(key: string, member: string) {
    await tickYield();
    return this.sets.get(key)?.has(member) ? 1 : 0;
  }
}

/** Mirrors RedisService's owner-token lock helpers on top of the shared fake client. */
class FakeRedisService {
  constructor(public client: FakeRedisClient) {}
  getClient() {
    return this.client as any;
  }
  async acquireLockToken(key: string, ttlSeconds = 10) {
    const token = `${Math.random().toString(36).slice(2)}`;
    const ok = await this.client.set(`lock:${key}`, token, 'EX', ttlSeconds, 'NX');
    return ok === 'OK' ? token : null;
  }
  async releaseLockToken(key: string, token: string) {
    await tickYield();
    // Atomic compare-and-delete (Lua script in the real RedisService)
    const e = this.client.kv.get(`lock:${key}`);
    if (e && e.value === token) this.client.kv.delete(`lock:${key}`);
  }
}

interface FakeRoute {
  id: string;
  status: string;
  direction: 'LOGIN' | 'LOGOUT';
  targetPickup1Time: Date;
  updatedAt: Date;
  driverId?: string | null;
  vehicleId?: string | null;
}

class FakeDb {
  routes = new Map<string, FakeRoute>();
  drivers = new Map<string, any>();
  earnings: any[] = [];
  findManyCalls: any[] = [];

  constructor(private clock: FakeClock) {}

  private matchStatus(actual: string, cond: any) {
    if (cond === undefined) return true;
    if (typeof cond === 'string') return actual === cond;
    if (cond.in) return cond.in.includes(actual);
    return true;
  }

  private notFound() {
    return Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
  }

  corporateRoute = {
    findMany: async (args: any) => {
      await tickYield();
      this.findManyCalls.push(args);
      const w = args?.where ?? {};
      let list = Array.from(this.routes.values()).filter((r) => {
        if (!this.matchStatus(r.status, w.status)) return false;
        if (w.driverId?.in && !w.driverId.in.includes((r as any).driverId)) return false;
        if (w.id?.not && r.id === w.id.not) return false;
        if (w.targetPickup1Time?.gte && r.targetPickup1Time < w.targetPickup1Time.gte) return false;
        if (w.targetPickup1Time?.lte && r.targetPickup1Time > w.targetPickup1Time.lte) return false;
        if (w.updatedAt?.lt && !(r.updatedAt < w.updatedAt.lt)) return false;
        if (w.id?.gt && !(r.id > w.id.gt)) return false;
        return true;
      });
      list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      if (args?.take) list = list.slice(0, args.take);
      return list.map((r) => ({ ...r, tenant: { name: 'Acme' } }));
    },
    findUnique: async ({ where }: any) => {
      await tickYield();
      const r = this.routes.get(where.id);
      if (!r) return null;
      return {
        ...r,
        tenant: { name: 'Acme' },
        office: { name: 'HQ', latitude: 17.44, longitude: 78.37 },
        stops: [{ stopSequence: 1, latitude: 17.45, longitude: 78.36 }],
        vehicleCategory: 'SEDAN',
        assignedPassengerCount: 4,
        estDistanceMeters: 20000,
        shiftDate: new Date('2026-11-03'),
        shiftTime: '09:00',
      };
    },
    update: async ({ where, data }: any) => {
      await tickYield();
      const r = this.routes.get(where.id);
      if (!r || !this.matchStatus(r.status, where.status)) throw this.notFound();
      Object.assign(r, data, { updatedAt: new Date(this.clock.now) });
      return { ...r, stops: [], office: { name: 'HQ' }, tenant: { name: 'Acme' } };
    },
    updateMany: async ({ where, data }: any) => {
      await tickYield();
      const r = this.routes.get(where.id);
      if (!r || !this.matchStatus(r.status, where.status)) return { count: 0 };
      Object.assign(r, data, { updatedAt: new Date(this.clock.now) });
      return { count: 1 };
    },
  };

  driver = {
    findMany: async ({ where }: any) => {
      await tickYield();
      return (where.id.in as string[])
        .map((id) => this.drivers.get(id))
        .filter((d) => d && d.availabilityStatus === 'AVAILABLE' && d.verificationStatus === 'VERIFIED');
    },
    findUnique: async ({ where }: any) => {
      await tickYield();
      return this.drivers.get(where.id) ?? null;
    },
  };

  vehicle = { findFirst: async () => null };

  /** Interactive transaction: runs against this fake (single-threaded, so no isolation needed). */
  $transaction = async (fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(this));

  corporateDriverEarning = {
    create: async ({ data }: any) => {
      this.earnings.push(data);
      return data;
    },
  };
}

interface World {
  clock: FakeClock;
  redisClient: FakeRedisClient;
  db: FakeDb;
  nearby: { 5: string[]; 10: string[] };
  events: Array<{ channel: string; event: string; payload: any }>;
}

function makeWorld(): World {
  const clock = new FakeClock();
  return {
    clock,
    redisClient: new FakeRedisClient(clock),
    db: new FakeDb(clock),
    nearby: { 5: [], 10: [] },
    events: [],
  };
}

function addDrivers(world: World, ids: string[]) {
  for (const id of ids) {
    world.db.drivers.set(id, {
      id,
      userId: null,
      fullName: `Driver ${id}`,
      phone: '9999999999',
      vehicleType: 'SEDAN',
      availabilityStatus: 'AVAILABLE',
      verificationStatus: 'VERIFIED',
    });
  }
}

/** Adds routes whose (stubbed) DDA dispatch time is `dueInMs` from now (<=0 => due). */
function addRoutes(world: World, count: number, opts: { dueInMs?: number; prefix?: string } = {}) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${opts.prefix ?? 'route'}-${String(i).padStart(5, '0')}`;
    const pickup = new Date(world.clock.now + 60 * 60 * 1000 + (opts.dueInMs ?? -60_000));
    world.db.routes.set(id, {
      id,
      status: 'PLANNED',
      direction: 'LOGIN',
      targetPickup1Time: pickup,
      updatedAt: new Date(world.clock.now),
    });
    ids.push(id);
  }
  return ids;
}

interface Instance {
  redis: FakeRedisService;
  dispatch: CorporateDispatchService;
  scheduler: CorporateDispatchSchedulerService;
  dispatchSpy: jest.SpyInstance;
  rejectSpy: jest.SpyInstance;
}

function makeInstance(world: World): Instance {
  const redis = new FakeRedisService(world.redisClient);
  const notifications = {
    emitEvent: (channel: string, event: string, payload: any) =>
      world.events.push({ channel, event, payload }),
    sendPushToUser: async () => ({ success: true }),
  };
  const audit = { log: async () => undefined };
  const locations = {
    findNearbyDrivers: async (_lat: number, _lng: number, radiusKm: number) => {
      await tickYield();
      const ids = radiusKm <= 5 ? world.nearby[5] : world.nearby[10];
      return ids.map((driverId, i) => ({ driverId, distanceKm: i + 0.5 }));
    },
  };
  const dispatch = new CorporateDispatchService(
    world.db as any,
    redis as any,
    notifications as any,
    audit as any,
    locations as any,
  );
  // DDA is owned by another workstream; stub it to "dispatch at pickup - 60 min".
  jest.spyOn(dispatch, 'assessDynamicTraffic').mockImplementation(async (routeId: string) => {
    await tickYield();
    const r = world.db.routes.get(routeId)!;
    const adjusted = new Date(r.targetPickup1Time.getTime() - 60 * 60 * 1000);
    return {
      routeId,
      originalPickup1Time: r.targetPickup1Time,
      standardDispatchTime: adjusted,
      adjustedDispatchTime: adjusted,
      trafficDelayMinutes: 0,
      isAdvanced: false,
      congestionLevel: 'NORMAL',
      reason: 'stub',
    };
  });
  const dispatchSpy = jest.spyOn(dispatch, 'dispatchRoute');
  const rejectSpy = jest.spyOn(dispatch, 'rejectRouteOffer');
  const scheduler = new CorporateDispatchSchedulerService(
    world.db as any,
    dispatch,
    notifications as any,
    audit as any,
    redis as any,
  );
  return { redis, dispatch, scheduler, dispatchSpy, rejectSpy };
}

const offersFor = (world: World, routeId: string) =>
  world.events.filter((e) => e.event === 'CORPORATE_ROUTE_OFFER' && e.payload.routeId === routeId);
const eventsNamed = (world: World, name: string) => world.events.filter((e) => e.event === name);
const totalCalls = (insts: Instance[], key: 'dispatchSpy' | 'rejectSpy') =>
  insts.reduce((n, i) => n + i[key].mock.calls.length, 0);

/** Bypass the tick lock (simulates lock expiry mid-tick) by invoking the phases directly. */
const evaluatePhase = (s: CorporateDispatchSchedulerService, now: number) =>
  (s as any).evaluateAndDispatchUpcomingRoutes(now) as Promise<{ totalEvaluated: number; routes: string[] }>;
const reapPhase = (s: CorporateDispatchSchedulerService, now: number) =>
  (s as any).reapExpiredOffers(now) as Promise<string[]>;

const ENV_KEYS = [
  'CORPORATE_SCHEDULER_ENABLED',
  'CORPORATE_SCHEDULER_PAGE_SIZE',
  'CORPORATE_SCHEDULER_CONCURRENCY',
  'CORPORATE_SCHEDULER_SHUTDOWN_GRACE_MS',
];

describe('Corporate dispatch: multi-instance concurrency & scale simulations', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    Logger.overrideLogger(false);
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });
  afterAll(() => {
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('Scheduler races (N API instances)', () => {
    it('two schedulers ticking concurrently: one holds the tick lock, each route dispatched exactly once', async () => {
      const world = makeWorld();
      addDrivers(world, Array.from({ length: 30 }, (_, i) => `d${i}`));
      world.nearby[5] = Array.from({ length: 30 }, (_, i) => `d${i}`);
      const routes = addRoutes(world, 20);
      const a = makeInstance(world);
      const b = makeInstance(world);

      const [ra, rb] = await Promise.all([a.scheduler.tick(world.clock.now), b.scheduler.tick(world.clock.now)]);

      expect([ra.skipped, rb.skipped].sort()).toEqual([false, true]);
      expect(ra.dispatchedRoutes.length + rb.dispatchedRoutes.length).toBe(20);
      for (const id of routes) {
        expect(offersFor(world, id)).toHaveLength(1);
        expect(world.db.routes.get(id)!.status).toBe('DISPATCHING');
      }
      expect(totalCalls([a, b], 'dispatchSpy')).toBe(20);
    });

    it('tick lock expired mid-tick (both instances scanning): per-route DB claim still yields exactly-once dispatch', async () => {
      const world = makeWorld();
      const drivers = Array.from({ length: 40 }, (_, i) => `d${i}`);
      addDrivers(world, drivers);
      world.nearby[5] = drivers;
      const routes = addRoutes(world, 25);
      const a = makeInstance(world);
      const b = makeInstance(world);

      const [ra, rb] = await Promise.all([
        evaluatePhase(a.scheduler, world.clock.now),
        evaluatePhase(b.scheduler, world.clock.now),
      ]);

      expect(ra.routes.length + rb.routes.length).toBe(25);
      expect(new Set([...ra.routes, ...rb.routes]).size).toBe(25);
      expect(totalCalls([a, b], 'dispatchSpy')).toBe(25);
      for (const id of routes) expect(offersFor(world, id)).toHaveLength(1);
    });

    it('five instances racing over 60 routes: no route is offered twice and no driver holds two offers', async () => {
      const world = makeWorld();
      const drivers = Array.from({ length: 100 }, (_, i) => `d${i}`);
      addDrivers(world, drivers);
      world.nearby[5] = drivers;
      const routes = addRoutes(world, 60);
      const insts = Array.from({ length: 5 }, () => makeInstance(world));

      await Promise.all(insts.map((i) => evaluatePhase(i.scheduler, world.clock.now)));

      expect(totalCalls(insts, 'dispatchSpy')).toBe(60);
      for (const id of routes) expect(offersFor(world, id)).toHaveLength(1);
      const offeredDrivers = eventsNamed(world, 'CORPORATE_ROUTE_OFFER').map((e) => e.payload.driverId);
      expect(new Set(offeredDrivers).size).toBe(offeredDrivers.length);
    });

    it('idempotent re-run: ticking again (same or other instance) never re-dispatches', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2', 'd3', 'd4']);
      world.nearby[5] = ['d1', 'd2', 'd3', 'd4'];
      const routes = addRoutes(world, 3);
      const a = makeInstance(world);
      const b = makeInstance(world);

      await a.scheduler.tick(world.clock.now);
      const second = await a.scheduler.tick(world.clock.now + 1000);
      const third = await b.scheduler.tick(world.clock.now + 2000);

      expect(second.dispatchedRoutes).toEqual([]);
      expect(third.dispatchedRoutes).toEqual([]);
      for (const id of routes) expect(offersFor(world, id)).toHaveLength(1);
    });

    it('manual "Start" racing the scheduler on the same route produces a single offer', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      const b = makeInstance(world);

      const results = await Promise.allSettled([
        a.scheduler.tick(world.clock.now),
        b.dispatch.dispatchRoute(routeId, true, 'admin-1'),
      ]);

      const manual = results[1];
      if (manual.status === 'rejected') expect(manual.reason).toBeInstanceOf(ConflictException);
      expect(offersFor(world, routeId)).toHaveLength(1);
    });

    it('dispatchRoute is idempotent while a live offer exists (returns the existing offer)', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);

      const first = await a.dispatch.dispatchRoute(routeId);
      const again = await a.dispatch.dispatchRoute(routeId);

      expect(first.offeredToDriverId).toBe('d1');
      expect(again.status).toBe('OFFERED');
      expect(again.offeredToDriverId).toBe('d1');
      expect(offersFor(world, routeId)).toHaveLength(1);
    });

    it('a route cancelled concurrently is never moved back to DISPATCHING', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [routeId] = addRoutes(world, 1);
      world.db.routes.get(routeId)!.status = 'CANCELLED';
      const a = makeInstance(world);

      const res = await a.dispatch.dispatchRoute(routeId);
      const tick = await a.scheduler.tick(world.clock.now);

      expect(res.status).toBe('ALREADY_ASSIGNED');
      expect(tick.dispatchedRoutes).toEqual([]);
      expect(world.db.routes.get(routeId)!.status).toBe('CANCELLED');
      expect(offersFor(world, routeId)).toHaveLength(0);
    });

    it('a failed dispatch releases the claim (back to PLANNED) and the next tick retries', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      a.dispatchSpy.mockRejectedValueOnce(new Error('transient DB failure'));

      const first = await a.scheduler.tick(world.clock.now);
      expect(first.dispatchedRoutes).toEqual([]);
      expect(world.db.routes.get(routeId)!.status).toBe('PLANNED');

      const second = await a.scheduler.tick(world.clock.now + 30_000);
      expect(second.dispatchedRoutes).toEqual([routeId]);
      expect(offersFor(world, routeId)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('60s offer reaper races', () => {
    it('two reapers racing on one expired offer: single blacklist + single cascade', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2', 'd3']);
      world.nearby[5] = ['d1', 'd2', 'd3'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      const b = makeInstance(world);
      await a.dispatch.dispatchRoute(routeId);

      world.clock.advance(61_000); // offer key TTL elapsed
      const [ra, rb] = await Promise.all([
        reapPhase(a.scheduler, world.clock.now),
        reapPhase(b.scheduler, world.clock.now),
      ]);

      expect(ra.length + rb.length).toBe(1);
      expect(totalCalls([a, b], 'rejectSpy')).toBe(1);
      expect(eventsNamed(world, 'CORPORATE_OFFER_TIMED_OUT')).toHaveLength(1);
      expect(offersFor(world, routeId).map((e) => e.payload.driverId)).toEqual(['d1', 'd2']);
      expect(world.redisClient.sets.get(CorporateDispatchKeys.rejected(routeId))).toEqual(new Set(['d1']));
    });

    it('timestamp-expired offers (TTL not yet elapsed) are also reaped exactly once across reapers', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [routeId] = addRoutes(world, 1);
      const insts = [makeInstance(world), makeInstance(world), makeInstance(world)];
      await insts[0].dispatch.dispatchRoute(routeId);

      const later = Date.now() + 61_000; // offerExpiresAt is wall-clock based
      const results = await Promise.all(insts.map((i) => reapPhase(i.scheduler, later)));

      expect(results.flat()).toEqual([routeId]);
      expect(totalCalls(insts, 'rejectSpy')).toBe(1);
      expect(offersFor(world, routeId)).toHaveLength(2);
    });

    it('five reapers racing over 20 expired offers: every route cascades exactly once', async () => {
      const world = makeWorld();
      const drivers = Array.from({ length: 60 }, (_, i) => `d${String(i).padStart(2, '0')}`);
      addDrivers(world, drivers);
      world.nearby[5] = drivers;
      const routes = addRoutes(world, 20);
      const insts = Array.from({ length: 5 }, () => makeInstance(world));
      for (const id of routes) await insts[0].dispatch.dispatchRoute(id);

      world.clock.advance(61_000);
      const results = await Promise.all(insts.map((i) => reapPhase(i.scheduler, world.clock.now)));

      expect(results.flat().sort()).toEqual([...routes].sort());
      expect(totalCalls(insts, 'rejectSpy')).toBe(20);
      for (const id of routes) expect(offersFor(world, id)).toHaveLength(2);
    });

    it('fresh offers inside the 60s window are never reaped', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      await a.dispatch.dispatchRoute(routeId);

      world.clock.advance(20_000);
      expect(await reapPhase(a.scheduler, Date.now() + 20_000)).toEqual([]);
      expect(a.rejectSpy).not.toHaveBeenCalled();
    });

    it('driver accepting while the reaper runs: accepted route is never cascaded', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      await a.dispatch.dispatchRoute(routeId);

      await a.dispatch.acceptRouteOffer(routeId, 'd1');
      const reaped = await reapPhase(a.scheduler, Date.now() + 61_000);

      expect(reaped).toEqual([]);
      expect(world.db.routes.get(routeId)!.status).toBe('ASSIGNED');
      expect(offersFor(world, routeId)).toHaveLength(1);
      // driver hold released on accept
      expect(await world.redisClient.get(CorporateDispatchKeys.driverHold('d1'))).toBeNull();
    });

    it('late reject from a driver whose offer was already reaped does not tear down the new offer', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2', 'd3']);
      world.nearby[5] = ['d1', 'd2', 'd3'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      await a.dispatch.dispatchRoute(routeId);
      world.clock.advance(61_000);
      await reapPhase(a.scheduler, world.clock.now); // cascades to d2

      await a.dispatch.rejectRouteOffer(routeId, 'd1', 'LATE_TAP');

      const live = JSON.parse((await world.redisClient.get(CorporateDispatchKeys.offer(routeId)))!);
      expect(live.driverId).toBe('d2');
      expect(offersFor(world, routeId)).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('Lock expiry & crash recovery', () => {
    it('crashed reaper: its reap lock blocks others until TTL expiry, then exactly one reaper cascades', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);
      const b = makeInstance(world);
      await a.dispatch.dispatchRoute(routeId);
      world.clock.advance(61_000);

      // Instance A grabbed the reap lock and then crashed (never released it).
      const crashed = await a.redis.acquireLockToken(CorporateDispatchSchedulerService.reapLockKey(routeId), 30);
      expect(crashed).toBeTruthy();
      expect(await reapPhase(b.scheduler, world.clock.now)).toEqual([]);

      world.clock.advance(31_000); // reap lock TTL elapses; offer_driver pointer (120s) survives
      expect(await reapPhase(b.scheduler, world.clock.now)).toEqual([routeId]);
      expect(offersFor(world, routeId).map((e) => e.payload.driverId)).toEqual(['d1', 'd2']);
    });

    it('crashed tick-lock holder: other instances skip until the lock TTL expires, then take over', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [routeId] = addRoutes(world, 1);
      const b = makeInstance(world);
      const ttl = b.scheduler.schedulerConfig.tickLockTtlSeconds;

      await b.redis.acquireLockToken(CorporateDispatchSchedulerService.TICK_LOCK_KEY, ttl); // "crashed" holder
      expect((await b.scheduler.tick(world.clock.now)).skipped).toBe(true);

      world.clock.advance(ttl * 1000 + 1);
      const res = await b.scheduler.tick(world.clock.now);
      expect(res.skipped).toBe(false);
      expect(res.dispatchedRoutes).toEqual([routeId]);
    });

    it('instance crashed between claim and offer: recovery sweep re-dispatches the stuck route once', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [routeId] = addRoutes(world, 1);
      // Claimed (PLANNED -> DISPATCHING) by an instance that died before creating the offer.
      Object.assign(world.db.routes.get(routeId)!, {
        status: 'DISPATCHING',
        updatedAt: new Date(world.clock.now - 5 * 60_000),
      });
      const a = makeInstance(world);
      const b = makeInstance(world);

      const [ra, rb] = await Promise.allSettled([
        a.scheduler.recoverStuckRoutes(world.clock.now),
        b.scheduler.recoverStuckRoutes(world.clock.now),
      ]);

      const recovered = [ra, rb].flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      expect(recovered).toEqual([routeId]);
      expect(offersFor(world, routeId)).toHaveLength(1);
    });

    it('recovery sweep runs from tick() only after the recovery interval and skips routes with live offers', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [stuck, live] = addRoutes(world, 2);
      const a = makeInstance(world);
      await a.dispatch.dispatchRoute(live);
      Object.assign(world.db.routes.get(stuck)!, {
        status: 'DISPATCHING',
        updatedAt: new Date(world.clock.now - 10 * 60_000),
      });
      world.db.routes.get(live)!.updatedAt = new Date(world.clock.now - 10 * 60_000);

      const first = await a.scheduler.tick(world.clock.now);
      expect(first.recoveredRoutes).toEqual([]); // first tick only arms the interval

      const later = world.clock.now + a.scheduler.schedulerConfig.recoveryIntervalMs;
      const second = await a.scheduler.tick(later);
      // By `later` the live offer has also expired: the reaper (not recovery) owns it and
      // cascades it exactly once; recovery only touches the offer-less route.
      expect(second.reapedOffers).toEqual([live]);
      expect(second.recoveredRoutes).toEqual([stuck]);
      expect(offersFor(world, live).map((e) => e.payload.driverId)).toEqual(['d1', 'd2']);
      expect(offersFor(world, stuck)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('Driver search, cascade & supply edge cases', () => {
    it('5 km empty -> expands to 10 km and offers the nearest driver there', async () => {
      const world = makeWorld();
      addDrivers(world, ['far1']);
      world.nearby[10] = ['far1'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);

      const res = await a.dispatch.dispatchRoute(routeId);
      expect(res).toMatchObject({ status: 'OFFERED', searchRadiusKm: 10, offeredToDriverId: 'far1' });
    });

    it('5 km none -> 10 km none -> UNSERVED alert, retry marker set, recovery waits for the marker', async () => {
      const world = makeWorld();
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);

      const tick = await a.scheduler.tick(world.clock.now);
      expect(tick.dispatchedRoutes).toEqual([routeId]);
      const unserved = eventsNamed(world, 'CORPORATE_DISPATCH_UNSERVED');
      expect(unserved).toHaveLength(1);
      expect(unserved[0].payload.routeId).toBe(routeId);
      expect(await world.redisClient.get(CorporateDispatchKeys.unserved(routeId))).toBe('NO_SUPPLY');

      // Supply appears; marker still present -> no retry yet
      addDrivers(world, ['late1']);
      world.nearby[5] = ['late1'];
      world.clock.advance(3 * 60_000);
      expect(await a.scheduler.recoverStuckRoutes(world.clock.now)).toEqual([]);

      // Marker (300s) expires -> recovery re-dispatches
      world.clock.advance(3 * 60_000);
      expect(await a.scheduler.recoverStuckRoutes(world.clock.now)).toEqual([routeId]);
      expect(offersFor(world, routeId).map((e) => e.payload.driverId)).toEqual(['late1']);
    });

    it('timeout cascade through 3 drivers (blacklisting each), then UNSERVED', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2', 'd3']);
      world.nearby[5] = ['d1', 'd2', 'd3'];
      world.nearby[10] = ['d1', 'd2', 'd3'];
      const [routeId] = addRoutes(world, 1);
      const a = makeInstance(world);

      await a.scheduler.tick(world.clock.now);
      for (let i = 0; i < 3; i++) {
        world.clock.advance(61_000);
        const r = await a.scheduler.tick(world.clock.now);
        expect(r.reapedOffers).toEqual([routeId]);
      }

      expect(offersFor(world, routeId).map((e) => e.payload.driverId)).toEqual(['d1', 'd2', 'd3']);
      expect(world.redisClient.sets.get(CorporateDispatchKeys.rejected(routeId))).toEqual(
        new Set(['d1', 'd2', 'd3']),
      );
      expect(eventsNamed(world, 'CORPORATE_OFFER_TIMED_OUT')).toHaveLength(3);
      expect(eventsNamed(world, 'CORPORATE_DISPATCH_UNSERVED')).toHaveLength(1);
      expect(world.redisClient.sets.get(CorporateDispatchKeys.ACTIVE_OFFERS_SET)?.has(routeId)).toBeFalsy();
    });

    it('driver holding another live offer is skipped for the next route', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [r1, r2] = addRoutes(world, 2);
      const a = makeInstance(world);

      const o1 = await a.dispatch.dispatchRoute(r1);
      const o2 = await a.dispatch.dispatchRoute(r2);

      expect(o1.offeredToDriverId).toBe('d1');
      expect(o2.offeredToDriverId).toBe('d2');
    });

    it('all candidates busy -> ALL_DRIVERS_BUSY + DEFERRED (no UNSERVED), short retry marker', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1']);
      world.nearby[5] = ['d1'];
      const [r1, r2] = addRoutes(world, 2);
      const a = makeInstance(world);

      await a.dispatch.dispatchRoute(r1);
      const res = await a.dispatch.dispatchRoute(r2);

      expect(res.status).toBe('ALL_DRIVERS_BUSY');
      expect(eventsNamed(world, 'CORPORATE_DISPATCH_DEFERRED')).toHaveLength(1);
      expect(eventsNamed(world, 'CORPORATE_DISPATCH_UNSERVED')).toHaveLength(0);
      expect(await world.redisClient.get(CorporateDispatchKeys.unserved(r2))).toBe('BUSY');
    });

    it('a timed-out driver is blacklisted only for that route and is free for other routes', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2']);
      world.nearby[5] = ['d1', 'd2'];
      const [r1, r2] = addRoutes(world, 2);
      const a = makeInstance(world);
      await a.dispatch.dispatchRoute(r1); // d1
      world.clock.advance(61_000);
      await reapPhase(a.scheduler, world.clock.now); // r1 -> d2

      const o2 = await a.dispatch.dispatchRoute(r2);
      expect(o2.offeredToDriverId).toBe('d1');
    });

    it('concurrent dispatch of many routes over a small driver pool never double-books a driver', async () => {
      const world = makeWorld();
      addDrivers(world, ['d1', 'd2', 'd3']);
      world.nearby[5] = ['d1', 'd2', 'd3'];
      const routes = addRoutes(world, 10);
      const insts = [makeInstance(world), makeInstance(world)];

      await Promise.all(insts.map((i) => evaluatePhase(i.scheduler, world.clock.now)));

      const offered = eventsNamed(world, 'CORPORATE_ROUTE_OFFER').map((e) => e.payload.driverId);
      expect(offered.sort()).toEqual(['d1', 'd2', 'd3']);
      expect(eventsNamed(world, 'CORPORATE_DISPATCH_DEFERRED')).toHaveLength(routes.length - 3);
    });
  });

  // -------------------------------------------------------------------------
  describe('Scale: pagination, bounded concurrency, shutdown', () => {
    it('pages 2,000 routes with keyset cursor (page size 200) and dispatches each exactly once', async () => {
      process.env.CORPORATE_SCHEDULER_PAGE_SIZE = '200';
      const world = makeWorld();
      const routes = addRoutes(world, 2000);
      const a = makeInstance(world);
      a.dispatchSpy.mockImplementation(async (id: string) => ({
        routeId: id,
        waveNumber: 1,
        searchRadiusKm: 5,
        status: 'OFFERED',
        candidatesCount: 1,
      }));

      const res = await a.scheduler.tick(world.clock.now);

      expect(res.evaluatedRoutesCount).toBe(2000);
      expect(new Set(res.dispatchedRoutes).size).toBe(2000);
      expect(a.dispatchSpy).toHaveBeenCalledTimes(2000);
      const planned = world.db.findManyCalls.filter((c) => c.where.status === 'PLANNED');
      expect(planned.length).toBeGreaterThanOrEqual(10);
      expect(planned.length).toBeLessThanOrEqual(11);
      expect(planned.every((c) => c.take === 200)).toBe(true);
      expect(planned.slice(1).every((c) => typeof c.where.id?.gt === 'string')).toBe(true);
      expect(routes.every((id) => world.db.routes.get(id)!.status === 'DISPATCHING')).toBe(true);
    });

    it('2,000 routes across two racing instances with mixed lead times: only due routes, each once', async () => {
      process.env.CORPORATE_SCHEDULER_PAGE_SIZE = '150';
      const world = makeWorld();
      const due = addRoutes(world, 1200, { prefix: 'due' });
      const notDue = addRoutes(world, 800, { prefix: 'later', dueInMs: 45 * 60_000 });
      const insts = [makeInstance(world), makeInstance(world)];
      for (const i of insts) {
        i.dispatchSpy.mockImplementation(async (id: string) => ({
          routeId: id,
          waveNumber: 1,
          searchRadiusKm: 5,
          status: 'OFFERED',
          candidatesCount: 1,
        }));
      }

      const results = await Promise.all(insts.map((i) => evaluatePhase(i.scheduler, world.clock.now)));

      const dispatched = results.flatMap((r) => r.routes);
      expect(dispatched.length).toBe(1200);
      expect(new Set(dispatched)).toEqual(new Set(due));
      expect(notDue.every((id) => world.db.routes.get(id)!.status === 'PLANNED')).toBe(true);
    });

    it('bounds in-flight dispatches to CORPORATE_SCHEDULER_CONCURRENCY', async () => {
      process.env.CORPORATE_SCHEDULER_CONCURRENCY = '4';
      const world = makeWorld();
      addRoutes(world, 40);
      const a = makeInstance(world);
      let inFlight = 0;
      let peak = 0;
      a.dispatchSpy.mockImplementation(async (id: string) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 2));
        inFlight--;
        return { routeId: id, waveNumber: 1, searchRadiusKm: 5, status: 'OFFERED', candidatesCount: 1 };
      });

      const res = await a.scheduler.tick(world.clock.now);

      expect(res.dispatchedRoutes).toHaveLength(40);
      expect(peak).toBeLessThanOrEqual(4);
      expect(peak).toBeGreaterThan(1);
    });

    it('mapWithConcurrency processes every item once and respects the stop signal', async () => {
      const seen: number[] = [];
      let stop = false;
      await mapWithConcurrency(
        Array.from({ length: 50 }, (_, i) => i),
        5,
        async (n) => {
          seen.push(n);
          if (n === 19) stop = true;
          await tickYield();
        },
        () => stop,
      );
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.length).toBeLessThan(50);
      expect(seen.length).toBeGreaterThanOrEqual(20);
    });

    it('graceful shutdown: stops taking new routes, awaits the in-flight tick, releases the tick lock', async () => {
      process.env.CORPORATE_SCHEDULER_CONCURRENCY = '2';
      const world = makeWorld();
      addRoutes(world, 30);
      const a = makeInstance(world);
      const b = makeInstance(world);
      let started = 0;
      a.dispatchSpy.mockImplementation(async (id: string) => {
        started++;
        await new Promise((r) => setTimeout(r, 5));
        return { routeId: id, waveNumber: 1, searchRadiusKm: 5, status: 'OFFERED', candidatesCount: 1 };
      });

      const tickPromise = a.scheduler.tick(world.clock.now);
      while (started < 2) await new Promise((r) => setTimeout(r, 1));
      await a.scheduler.onModuleDestroy();
      const res = await tickPromise;

      expect(res.dispatchedRoutes.length).toBeLessThan(30);
      expect(await world.redisClient.get(`lock:${CorporateDispatchSchedulerService.TICK_LOCK_KEY}`)).toBeNull();
      expect((await a.scheduler.tick(world.clock.now)).skipped).toBe(true);

      // Another instance can take over immediately (no wait for lock TTL); un-started routes
      // are still PLANNED and get dispatched there.
      const takeover = await b.scheduler.tick(world.clock.now);
      expect(takeover.skipped).toBe(false);
      expect(res.dispatchedRoutes.length + takeover.dispatchedRoutes.length).toBe(30);
    });

    it('CORPORATE_SCHEDULER_ENABLED=false: no poller is started; enabled: poller starts and shutdown clears it', async () => {
      process.env.CORPORATE_SCHEDULER_ENABLED = 'false';
      const world = makeWorld();
      const off = makeInstance(world);
      off.scheduler.onModuleInit();
      expect(off.scheduler.isPolling).toBe(false);
      await off.scheduler.onModuleDestroy();

      process.env.CORPORATE_SCHEDULER_ENABLED = 'true';
      const on = makeInstance(world);
      on.scheduler.onModuleInit();
      expect(on.scheduler.isPolling).toBe(true);
      await on.scheduler.onModuleDestroy();
      expect(on.scheduler.isPolling).toBe(false);
    });
  });
});
