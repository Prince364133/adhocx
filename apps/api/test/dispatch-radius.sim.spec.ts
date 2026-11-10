/**
 * Dispatch radius simulation: why do drivers farther than the pickup radius receive offers?
 *
 * Runs the REAL DispatchService + LocationsService + H3Service (h3-js, resolution 8) against an
 * in-memory Postgres stand-in and an in-memory Redis implementing exactly the commands
 * LocationsService uses (GEOADD/GEOSEARCH, SADD/SMEMBERS/SREM, SETEX/GET/EXPIRE/DEL, pipelines).
 * Every driver sits at a known straight-line distance from the pickup; each scenario reports the
 * true distance of every driver that was offered the ride.
 *
 * Pickup: Connaught Place, New Delhi.
 */
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { LocationsService } from '../src/modules/locations/locations.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { DriverAvailability, RequirementStatus, UserStatus, VehicleType, VerificationStatus } from '@adhocx/contracts';
import { DriversService } from '../src/modules/drivers/drivers.service';
import { kRingForRadiusKm, waveSearchRadiusKm } from '../src/modules/dispatch/pickup-radius';
import { rookieExplorationHit, rookieQuotaFor } from '../src/modules/dispatch/dispatch-ranking';

const PICKUP = { lat: 28.6315, lng: 77.2167 };
const LIMIT_KM = 10;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
/** A point `km` east of the pickup. */
const east = (km: number) => ({ lat: PICKUP.lat, lng: PICKUP.lng + km / (111.32 * Math.cos((PICKUP.lat * Math.PI) / 180)) });

// ---------------------------------------------------------------------------------------------
// In-memory Redis (only what LocationsService uses)
// ---------------------------------------------------------------------------------------------
class FakeRedis {
  geo = new Map<string, Map<string, { lat: number; lng: number }>>();
  sets = new Map<string, Set<string>>();
  kv = new Map<string, string>();
  async get(k: string) {
    return this.kv.get(k) ?? null;
  }
  async smembers(k: string) {
    return [...(this.sets.get(k) ?? [])];
  }
  async geosearch(key: string, _from: string, lng: number, lat: number, _by: string, radius: number, _unit: string, _asc: string, _wd: string, _c: string, count: number) {
    const out: [string, string][] = [];
    for (const [m, p] of this.geo.get(key) ?? new Map()) {
      const d = haversineKm({ lat, lng }, p);
      if (d <= radius) out.push([m, d.toFixed(4)]);
    }
    return out.sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, count);
  }
  pipeline() {
    const ops: Array<() => any> = [];
    const p: any = {
      geoadd: (k: string, lng: number, lat: number, m: string) => (ops.push(() => (this.geo.get(k) ?? this.geo.set(k, new Map()).get(k)!).set(m, { lat, lng })), p),
      sadd: (k: string, m: string) => (ops.push(() => (this.sets.get(k) ?? this.sets.set(k, new Set()).get(k)!).add(m)), p),
      srem: (k: string, m: string) => (ops.push(() => this.sets.get(k)?.delete(m)), p),
      expire: (_k: string, _s: number) => (ops.push(() => 1), p),
      setex: (k: string, _s: number, v: string) => (ops.push(() => this.kv.set(k, v)), p),
      get: (k: string) => (ops.push(() => this.kv.get(k) ?? null), p),
      smembers: (k: string) => (ops.push(() => [...(this.sets.get(k) ?? [])]), p),
      zrem: (k: string, m: string) => (ops.push(() => this.geo.get(k)?.delete(m)), p),
      del: (k: string) => (ops.push(() => this.kv.delete(k)), p),
      exec: async () => ops.map((op) => [null, op()]),
    };
    return p;
  }
  /** Simulates the 15-minute metadata TTL elapsing. */
  expireMeta(driverId: string) {
    this.kv.delete(`drivers:meta:${driverId}`);
  }
}

// ---------------------------------------------------------------------------------------------
// In-memory Postgres stand-in
// ---------------------------------------------------------------------------------------------
interface SimDriver {
  id: string;
  /** Where the driver really is. */
  real: { lat: number; lng: number } | null;
  /** What the server has stored (may differ: stale, fake fallback, never sent). */
  stored: { lat: number; lng: number } | null;
  lastLocationAt: Date | null;
  trust?: number;
  rating?: number;
  rookie?: boolean;
}

function makeWorld(drivers: SimDriver[]) {
  const offers: any[] = [];
  const rows = drivers.map((d) => ({
    id: d.id,
    userId: `u-${d.id}`,
    user: { status: UserStatus.ACTIVE },
    verificationStatus: VerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailability.AVAILABLE,
    vehicleType: VehicleType.SEDAN,
    vehicles: [],
    trips: [],
    currentLat: d.stored?.lat ?? null,
    currentLng: d.stored?.lng ?? null,
    lastLocationAt: d.lastLocationAt,
    trustScore: d.trust ?? 95,
    averageRating: d.rating ?? 4.8,
    totalTrips: d.rookie ? 5 : 100,
    cooldownUntil: null,
  }));
  const requirement: any = {
    id: 'req-1',
    vendorId: 'vnd-1',
    vendor: { userId: 'u-vnd' },
    vehicleType: VehicleType.SEDAN,
    quantity: 1,
    assignedQuantity: 0,
    dispatchWaves: 0,
    pickupLat: PICKUP.lat,
    pickupLng: PICKUP.lng,
    dropLat: 28.5355,
    dropLng: 77.391,
    pickupAddress: 'Connaught Place',
    dropAddress: 'Noida',
    reportingTime: new Date(),
    pricingSnapshot: { vendorPricePaise: 150000, driverPayoutPaise: 120000, grossSpreadPaise: 30000 },
    status: RequirementStatus.POSTED,
    offers,
  };
  const db: any = {
    requirement: {
      findUnique: jest.fn(async () => requirement),
      update: jest.fn(async ({ data }: any) => Object.assign(requirement, data)),
    },
    offer: {
      create: jest.fn(async ({ data }: any) => {
        const o = { id: `off-${offers.length + 1}`, ...data };
        offers.push(o);
        return o;
      }),
      findMany: jest.fn(async () => offers),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    driver: {
      findMany: jest.fn(async ({ where, take }: any = {}) => {
        let out = rows.filter((r) => {
          if (where?.id?.in && !where.id.in.includes(r.id)) return false;
          if (where?.id?.notIn && where.id.notIn.includes(r.id)) return false;
          if (where?.availabilityStatus && r.availabilityStatus !== where.availabilityStatus) return false;
          if (where?.verificationStatus && r.verificationStatus !== where.verificationStatus) return false;
          if (where?.currentLat?.not === null && r.currentLat === null) return false;
          return true;
        });
        if (take) out = out.slice(0, take);
        return out;
      }),
    },
  };
  return { db, offers, requirement };
}

function build(drivers: SimDriver[], redis: FakeRedis | null) {
  const world = makeWorld(drivers);
  const redisService: any = redis ? { getClient: () => redis } : undefined;
  const h3 = new H3Service();
  const locations = new LocationsService(world.db, h3, redisService);
  const notifications: any = { emitEvent: jest.fn(), sendPushToUser: jest.fn(async () => ({})), sendPush: jest.fn() };
  const audit: any = { log: jest.fn(async () => undefined) };
  const maps: any = {
    computeRoadRoute: jest.fn(async () => ({ distanceKm: 20, durationMinutes: 45 })),
    // Road ≈ 1.3 × straight line, as an urban detour factor.
    computeDriverEtaMatrix: jest.fn(async (origins: any[], dest: any) =>
      origins.map((o) => {
        const km = haversineKm({ lat: o.latitude, lng: o.longitude }, { lat: dest.latitude, lng: dest.longitude }) * 1.3;
        const seconds = (km / 25) * 3600;
        return { distanceKm: km, etaMinutes: Math.max(1, Math.round(seconds / 60)), durationSeconds: seconds, isRealRoad: true };
      }),
    ),
  };
  const svc = new DispatchService(world.db, locations, notifications, audit, maps, undefined, undefined, undefined, undefined);
  return { svc, world, locations };
}

/** True distance of every offered driver, from where the driver REALLY is. */
function offeredRealDistances(world: ReturnType<typeof makeWorld>, drivers: SimDriver[]) {
  return world.offers.map((o) => {
    const d = drivers.find((x) => x.id === o.driverId)!;
    return { driverId: o.driverId, realKm: d.real ? Math.round(haversineKm(PICKUP, d.real) * 10) / 10 : null };
  });
}

const fresh = () => new Date(Date.now() - 60_000);
const stale = () => new Date(Date.now() - 45 * 60_000);

describe(`Dispatch radius simulation (limit ${LIMIT_KM} km)`, () => {
  const report: Array<{ scenario: string; offered: Array<{ driverId: string; realKm: number | null }> }> = [];
  afterAll(() => {
    console.log(
      '\nDISPATCH RADIUS SIMULATION\n' +
        report.map((r) => `- ${r.scenario}: ${r.offered.map((o) => `${o.driverId}@${o.realKm ?? '?'}km`).join(', ') || 'no offer'}`).join('\n'),
    );
  });

  async function run(scenario: string, drivers: SimDriver[], prepare?: (redis: FakeRedis, locations: LocationsService) => Promise<void>, opts: { redis?: boolean; waves?: number } = {}) {
    const redis = opts.redis === false ? null : new FakeRedis();
    const { svc, world, locations } = build(drivers, redis);
    if (redis) {
      // Only drivers that are currently reporting are in the live index; a stale driver's last
      // heartbeat is long expired there (it exists only as an old Postgres row).
      for (const d of drivers) {
        const recent = d.lastLocationAt && Date.now() - d.lastLocationAt.getTime() < 5 * 60_000;
        if (d.stored && recent) await locations.indexDriverLocation(d.id, d.stored.lat, d.stored.lng, VehicleType.SEDAN);
      }
      if (prepare) await prepare(redis, locations);
    }
    world.requirement.dispatchWaves = opts.waves ?? 0;
    await svc.dispatchRequirement('req-1');
    const offered = offeredRealDistances(world, drivers);
    report.push({ scenario, offered });
    return offered;
  }

  it('S1 nobody within the radius (drivers 35 km and 60 km away) → no offer (was: location-less fallback offered them)', async () => {
    const offered = await run('S1 no nearby supply', [
      { id: 'far-35', real: east(35), stored: east(35), lastLocationAt: fresh() },
      { id: 'far-60', real: east(60), stored: east(60), lastLocationAt: fresh() },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S2 idle driver whose position is 45 min old (now 25 km away) → not dispatchable (was: citywide fallback offered them)', async () => {
    const offered = await run('S2 idle driver marked stale', [
      // Went online 3 km away 45 min ago and has driven 25 km since: the app sends no idle heartbeat.
      { id: 'idle-moved', real: east(25), stored: east(3), lastLocationAt: stale() },
      { id: 'far-40', real: east(40), stored: east(40), lastLocationAt: fresh() },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S3 driver who never sent a location (really 50 km away) → not dispatchable (was: treated as standing at the pickup)', async () => {
    const offered = await run('S3 driver without any location', [
      { id: 'no-gps', real: east(50), stored: null, lastLocationAt: null },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S4 stale H3 membership + lagging DB row: driver now 30 km away → measured at the newest position, no offer', async () => {
    const offered = await run(
      'S4 stale H3 membership',
      [{ id: 'moved-30', real: east(30), stored: east(0.3), lastLocationAt: fresh() }],
      async (redis, locations) => {
        redis.expireMeta('moved-30'); // 15 min of silence: metadata TTL elapsed
        await locations.indexDriverLocation('moved-30', east(30).lat, east(30).lng, VehicleType.SEDAN); // next ping, far away
      },
    );
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S5 a 12 km driver in a late wave → no offer (was: radial fallback grew to 13–15 km)', async () => {
    const offered = await run('S5 wave-4 radius 13 km', [{ id: 'at-12', real: east(12), stored: east(12), lastLocationAt: fresh() }], undefined, { waves: 3 });
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S7 road cap: 8 km straight line but 10.4 km by road → offered without a road cap, not with DISPATCH_MAX_PICKUP_ROAD_KM=10', async () => {
    const drivers = [{ id: 'road-8', real: east(8), stored: east(8), lastLocationAt: fresh() }];
    expect((await run('S7a no road cap', drivers, undefined, { waves: 4 })).map((o) => o.driverId)).toEqual(['road-8']);
    process.env.DISPATCH_MAX_PICKUP_ROAD_KM = '10';
    try {
      expect(await run('S7b road cap 10 km', drivers, undefined, { waves: 4 })).toEqual([]);
    } finally {
      delete process.env.DISPATCH_MAX_PICKUP_ROAD_KM;
    }
  });

  it('S8 waves grow 2 → 4 → 6 → 8 → 10 km: a 9.5 km driver is reached at wave 5 (widening within the dispatch), a 10.5 km driver never', async () => {
    expect([1, 2, 3, 4, 5].map((w) => waveSearchRadiusKm(w, 5, 10))).toEqual([2, 4, 6, 8, 10]);
    expect(kRingForRadiusKm(10)).toBe(15);
    const drivers = [
      { id: 'edge-9.5', real: east(9.5), stored: east(9.5), lastLocationAt: fresh() },
      { id: 'out-10.5', real: east(10.5), stored: east(10.5), lastLocationAt: fresh() },
    ];
    // Dispatching at wave 4 (8 km) finds nobody, widens to wave 5 (10 km) in the same call.
    expect((await run('S8 from wave 4', drivers, undefined, { waves: 3 })).map((o) => o.driverId)).toEqual(['edge-9.5']);
    expect((await run('S8 wave 5 (10 km)', drivers, undefined, { waves: 4 })).map((o) => o.driverId)).toEqual(['edge-9.5']);
  });

  it('S9 Postgres-only lookup (Redis down): a stale row (45 min) is not dispatchable, a fresh one is', async () => {
    const offered = await run(
      'S9 DB fallback freshness',
      [
        { id: 'db-stale-2', real: east(2), stored: east(2), lastLocationAt: stale() },
        { id: 'db-fresh-6', real: east(6), stored: east(6), lastLocationAt: fresh() },
      ],
      undefined,
      { redis: false, waves: 4 },
    );
    expect(offered.map((o) => o.driverId)).toEqual(['db-fresh-6']);
  });

  it('S10 stale index entries are removed: old H3 membership (SREM) and GEO members without live metadata (ZREM)', async () => {
    const redis = new FakeRedis();
    const { locations } = build([], redis);
    await locations.indexDriverLocation('mover', east(0.3).lat, east(0.3).lng, VehicleType.SEDAN);
    const oldCell = JSON.parse((await redis.get('drivers:meta:mover'))!).h3Cell;
    redis.expireMeta('mover');
    await locations.indexDriverLocation('mover', east(30).lat, east(30).lng, VehicleType.SEDAN);
    await locations.indexDriverLocation('ghost', east(1).lat, east(1).lng, VehicleType.SEDAN);
    redis.expireMeta('ghost'); // app killed: no more pings
    expect((await redis.smembers(`drivers:h3:res8:${oldCell}`)).includes('mover')).toBe(true);

    const hits = await locations.findNearbyDriversByH3(PICKUP.lat, PICKUP.lng, kRingForRadiusKm(10), VehicleType.SEDAN, 10);
    expect(hits.map((h) => h.driverId)).toEqual([]);
    expect((await redis.smembers(`drivers:h3:res8:${oldCell}`)).includes('mover')).toBe(false);
    expect(redis.geo.get('drivers:geo:available')?.has('ghost')).toBe(false);
  });

  it('S11 heartbeat: only GPS-quality fixes are indexed or refresh lastLocationAt; an IP/network guess removes the driver from dispatch', async () => {
    const redis = new FakeRedis();
    const row: any = { id: 'hb-1', userId: 'u-hb', availabilityStatus: DriverAvailability.AVAILABLE, vehicleType: VehicleType.SEDAN, lastLocationAt: null };
    const db: any = {
      driver: {
        findUnique: jest.fn(async () => row),
        update: jest.fn(async ({ data }: any) => Object.assign(row, data)),
      },
    };
    const locations = new LocationsService(db, new H3Service(), { getClient: () => redis } as any);
    const drivers = new DriversService(db, {} as any, {} as any, locations, undefined);

    const ip = await drivers.reportLocation('u-hb', { latitude: PICKUP.lat, longitude: PICKUP.lng, source: 'IP', accuracyM: 5000 });
    expect(ip).toEqual({ indexed: false, reason: 'LOW_QUALITY_SOURCE' });
    const coarse = await drivers.reportLocation('u-hb', { latitude: PICKUP.lat, longitude: PICKUP.lng, source: 'GPS', accuracyM: 1200 });
    expect(coarse).toEqual({ indexed: false, reason: 'LOW_ACCURACY' });
    expect(row.lastLocationAt).toBeNull();
    expect(redis.kv.has('drivers:meta:hb-1')).toBe(false);

    const gps = await drivers.reportLocation('u-hb', { latitude: east(3).lat, longitude: east(3).lng, source: 'GPS', accuracyM: 12 });
    expect(gps).toEqual({ indexed: true });
    expect(row.lastLocationAt).toBeInstanceOf(Date);
    expect(JSON.parse(redis.kv.get('drivers:meta:hb-1')!).lat).toBeCloseTo(east(3).lat, 6);
  });

  it('S12 natural progression: nearest driver 6 km away is found in the SAME dispatch (empty 2/4 km waves widen, wave counter advances)', async () => {
    const drivers = [{ id: 'at-6', real: east(6), stored: east(6), lastLocationAt: fresh() }];
    const redis = new FakeRedis();
    const { svc, world, locations } = build(drivers, redis);
    await locations.indexDriverLocation('at-6', east(6).lat, east(6).lng, VehicleType.SEDAN);
    world.requirement.dispatchWaves = 0;
    await svc.dispatchRequirement('req-1');
    expect(world.offers.map((o) => [o.driverId, o.waveNumber])).toEqual([['at-6', 3]]);
    expect(world.requirement.status).not.toBe(RequirementStatus.NO_DRIVER_AVAILABLE);
    expect(world.requirement.dispatchWaves).toBe(3);
  });

  it('S13 trust ordering is monotonic: trust 82 beats 72 at equal distance (no low-trust boost by default)', async () => {
    const offered = await run('S13 trust 82 vs 72', [
      { id: 'trust72', real: east(1.2), stored: east(1.2), lastLocationAt: fresh(), trust: 72 },
      { id: 'trust82', real: east(-1.2), stored: east(-1.2), lastLocationAt: fresh(), trust: 82 },
    ]);
    expect(offered.map((o) => o.driverId)).toEqual(['trust82']);
  });

  it('S14 the closer of two otherwise identical drivers wins, even within the 2-minute ETA floor (0.5 km beats 0.7 km)', async () => {
    const offered = await run('S14 0.5 vs 0.7 km', [
      { id: 'at-0.7', real: east(0.7), stored: east(0.7), lastLocationAt: fresh() },
      { id: 'at-0.5', real: east(-0.5), stored: east(-0.5), lastLocationAt: fresh() },
    ]);
    expect(offered.map((o) => o.driverId)).toEqual(['at-0.5']);
  });

  it('S15 rookie exploration honours its 15 % share: single-offer waves go to a rookie for ~15 % of bookings, not all of them', () => {
    const hits = Array.from({ length: 10_000 }, (_, i) => rookieExplorationHit(`req-${i}`, 1, 0.15)).filter(Boolean).length;
    expect(hits / 10_000).toBeGreaterThan(0.13);
    expect(hits / 10_000).toBeLessThan(0.17);
    expect(rookieQuotaFor(10, 4, 0.15, 'r', 1)).toBe(1); // floor(10 × 0.15)
    expect(rookieQuotaFor(1, 0, 0.15, 'r', 1)).toBe(0); // no rookies, no slot
    expect(rookieExplorationHit('same', 1, 0.15)).toBe(rookieExplorationHit('same', 1, 0.15)); // deterministic
  });

  it('S6 control: drivers at 2 km and 8 km with fresh GPS → only in-radius drivers are offered', async () => {
    const offered = await run('S6 control (healthy supply)', [
      { id: 'near-2', real: east(2), stored: east(2), lastLocationAt: fresh() },
      { id: 'near-8', real: east(8), stored: east(8), lastLocationAt: fresh() },
      { id: 'far-40', real: east(40), stored: east(40), lastLocationAt: fresh() },
    ]);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });
});
