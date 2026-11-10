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
    trustScore: 95,
    averageRating: 4.8,
    totalTrips: 100,
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
      origins.map((o) => ({ distanceKm: haversineKm({ lat: o.latitude, lng: o.longitude }, { lat: dest.latitude, lng: dest.longitude }) * 1.3, etaMinutes: 10, isRealRoad: true })),
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
    // eslint-disable-next-line no-console
    console.log(
      '\nDISPATCH RADIUS SIMULATION\n' +
        report.map((r) => `- ${r.scenario}: ${r.offered.map((o) => `${o.driverId}@${o.realKm ?? '?'}km`).join(', ') || 'no offer'}`).join('\n'),
    );
  });

  async function run(scenario: string, drivers: SimDriver[], prepare?: (redis: FakeRedis, locations: LocationsService) => Promise<void>, opts: { redis?: boolean; waves?: number } = {}) {
    const redis = opts.redis === false ? null : new FakeRedis();
    const { svc, world, locations } = build(drivers, redis);
    if (redis) {
      for (const d of drivers) if (d.stored) await locations.indexDriverLocation(d.id, d.stored.lat, d.stored.lng, VehicleType.SEDAN);
      if (prepare) await prepare(redis, locations);
    }
    world.requirement.dispatchWaves = opts.waves ?? 0;
    await svc.dispatchRequirement('req-1');
    const offered = offeredRealDistances(world, drivers);
    report.push({ scenario, offered });
    return offered;
  }

  it('S1 nobody within the search area → the "any available driver" fallback offers drivers 35 km and 60 km away', async () => {
    const offered = await run('S1 no nearby supply', [
      { id: 'far-35', real: east(35), stored: east(35), lastLocationAt: fresh() },
      { id: 'far-60', real: east(60), stored: east(60), lastLocationAt: fresh() },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S2 the nearby driver went online 45 min ago (no idle GPS heartbeat) → filtered as stale → citywide fallback offers a far driver', async () => {
    const offered = await run('S2 idle driver marked stale', [
      // Went online 3 km away 45 min ago and has driven 25 km since: the app sends no idle heartbeat.
      { id: 'idle-moved', real: east(25), stored: east(3), lastLocationAt: stale() },
      { id: 'far-40', real: east(40), stored: east(40), lastLocationAt: fresh() },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S3 a driver who never sent a location is treated as standing at the pickup', async () => {
    const offered = await run('S3 driver without any location', [
      { id: 'no-gps', real: east(50), stored: null, lastLocationAt: null },
    ]);
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
  });

  it('S4 stale H3 cell membership: driver indexed at the pickup, metadata expired, now 30 km away → found via the old hexagon', async () => {
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

  it('S5 radial fallback grows to 13 km in wave 4 (3 + 4 × 2.5): a 12 km driver is offered despite a 10 km limit', async () => {
    const offered = await run('S5 wave-4 radius 13 km', [{ id: 'at-12', real: east(12), stored: east(12), lastLocationAt: fresh() }], undefined, { waves: 3 });
    expect(offered.every((o) => (o.realKm ?? Infinity) <= LIMIT_KM)).toBe(true);
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
