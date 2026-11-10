import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { CorporateGpsIngestService } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import { CorporateTrackingService } from '../src/domains/corporate/tracking/corporate-tracking.service';
import { CorporateGpsKeys, TelemetryChannels, TripTelemetryKeys } from '../src/domains/corporate/tracking/tracking.types';
import { TripsService } from '../src/modules/trips/trips.service';
import { FakeClock, FakeLuaRedis, FakeStreamRedis } from './helpers/fake-gps-stream';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const ROUTE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROUTE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRIP_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TRIP_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

async function bus() {
  const saved = { url: process.env.REDIS_URL, host: process.env.REDIS_HOST };
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  try {
    const svc = new RedisPubSubService({ get: () => undefined } as any);
    await svc.onModuleInit();
    return svc;
  } finally {
    if (saved.url !== undefined) process.env.REDIS_URL = saved.url;
    if (saved.host !== undefined) process.env.REDIS_HOST = saved.host;
  }
}

const flush = () => new Promise((r) => setImmediate(r));
const route = { id: ROUTE_A, tenantId: TENANT_A, driverId: 'drv-1', status: 'IN_TRANSIT' };

describe('GPS ingest: atomic (Lua) path', () => {
  it('runs dedupe + monotonic latest + XADD as one script call and publishes in-order fixes only', async () => {
    const clock = new FakeClock();
    const redis = new FakeLuaRedis(clock);
    const pubsub = await bus();
    const ops: any[] = [];
    await pubsub.subscribe(TelemetryChannels.opsFleet, (_c, raw) => ops.push(JSON.parse(raw)));
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any, undefined, pubsub);

    const a = await ingest.ingest(route, { latitude: 17.44, longitude: 78.38, recordedAt: clock.ms }, new Date(clock.ms));
    expect(a).toMatchObject({ duplicate: false, outOfOrder: false, persistence: 'STREAM' });
    expect(redis.calls.script).toBe(1);
    expect(redis.calls.xadd).toBe(1);

    // Same fix re-uploaded: duplicate, nothing written or published.
    const dup = await ingest.ingest(route, { latitude: 17.44, longitude: 78.38, recordedAt: clock.ms }, new Date(clock.ms + 50));
    expect(dup).toMatchObject({ duplicate: true, persistence: 'NONE' });
    expect(redis.calls.xadd).toBe(1);

    // Older fix: kept in history, latest untouched, not published.
    const old = await ingest.ingest(route, { latitude: 1, longitude: 1, recordedAt: clock.ms - 60_000 }, new Date(clock.ms + 100));
    expect(old).toMatchObject({ outOfOrder: true, persistence: 'STREAM' });
    expect(redis.calls.xadd).toBe(2);
    expect((await ingest.readLatest(ROUTE_A))?.latitude).toBe(17.44);
    expect((await ingest.readLatest(ROUTE_A))?.recordedAtMs).toBe(clock.ms);

    await flush();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ routeId: ROUTE_A, kind: 'CORPORATE_ROUTE' });
    // The multi-command path was never used.
    expect(redis.calls.script).toBe(3);
    await pubsub.onModuleDestroy();
  });

  it('buffers locally when XADD fails inside the script', async () => {
    const redis = new FakeLuaRedis();
    redis.failScriptXadd = true;
    const writer = { enqueueLocal: jest.fn() };
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any, writer as any);
    const r = await ingest.ingest(route, { latitude: 17.4, longitude: 78.4 }, new Date());
    expect(r.persistence).toBe('LOCAL_BUFFER');
    expect(writer.enqueueLocal).toHaveBeenCalledTimes(1);
  });

  it('without a driver: latest only, no dedupe key and no history', async () => {
    const redis = new FakeLuaRedis();
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    const r = await ingest.ingest({ ...route, driverId: null }, { latitude: 17.4, longitude: 78.4 }, new Date());
    expect(r.persistence).toBe('NONE');
    expect(redis.calls.xadd).toBe(0);
    expect([...redis.kv.keys()].some((k) => k.startsWith('corporate:gps:seen:'))).toBe(false);
    expect(await ingest.readLatest(ROUTE_A)).not.toBeNull();
  });

  it('falls back to multi-command ingest on CROSSSLOT and stops trying the script on that client', async () => {
    const clock = new FakeClock();
    const redis = new FakeLuaRedis(clock);
    redis.scriptError = 'CROSSSLOT Keys in request don\'t hash to the same slot';
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    const r1 = await ingest.ingest(route, { latitude: 17.4, longitude: 78.4, recordedAt: clock.ms }, new Date(clock.ms));
    const r2 = await ingest.ingest(route, { latitude: 17.5, longitude: 78.5, recordedAt: clock.ms + 1000 }, new Date(clock.ms + 1000));
    expect([r1.persistence, r2.persistence]).toEqual(['STREAM', 'STREAM']);
    expect(redis.calls.script).toBe(1);
    expect((await ingest.readLatest(ROUTE_A))?.latitude).toBe(17.5);
  });

  it('never uses the script on a Redis Cluster client', async () => {
    const redis = new FakeLuaRedis();
    (redis as any).isCluster = true;
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    await ingest.ingest(route, { latitude: 17.4, longitude: 78.4 }, new Date());
    expect(redis.calls.script).toBe(0);
    expect(redis.defined).toEqual([]);
  });

  it('a legacy latest entry (no recordedAtMs) is replaced by the next fix', async () => {
    const clock = new FakeClock();
    const redis = new FakeLuaRedis(clock);
    await redis.set(CorporateGpsKeys.latest(ROUTE_A), JSON.stringify({ latitude: 1, longitude: 1, recordedAt: new Date(clock.ms).toISOString() }));
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    const r = await ingest.ingest(route, { latitude: 17.4, longitude: 78.4, recordedAt: clock.ms - 1000 }, new Date(clock.ms));
    expect(r.outOfOrder).toBe(false);
    expect((await ingest.readLatest(ROUTE_A))?.latitude).toBe(17.4);
  });
});

describe('GPS cache: batched reads', () => {
  it('reads many latest fixes with chunked MGET', async () => {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    const at = new Date(clock.ms).toISOString();
    await redis.set(CorporateGpsKeys.latest(ROUTE_A), JSON.stringify({ latitude: 1, longitude: 2, recordedAt: at }));
    await redis.set(CorporateGpsKeys.latest(ROUTE_B), 'not json');
    const ids = [ROUTE_A, ROUTE_B, ...Array.from({ length: 5 }, (_, i) => `r-${i}`)];
    const got = await ingest.readLatestMany(ids, 3);
    expect([...got.keys()]).toEqual([ROUTE_A]);
    expect(redis.calls.mget).toBe(3); // 7 keys / 3 per chunk
  });

  it('falls back to per-key reads without MGET (in-memory store)', async () => {
    const store = new Map<string, string>([[CorporateGpsKeys.latest(ROUTE_A), JSON.stringify({ latitude: 1, longitude: 2, recordedAt: new Date().toISOString() })]]);
    const ingest = new CorporateGpsIngestService({ getClient: () => null, get: async (k: string) => store.get(k) ?? null } as any);
    expect([...(await ingest.readLatestMany([ROUTE_A, ROUTE_B])).keys()]).toEqual([ROUTE_A]);
  });
});

describe('fleet snapshot: on-demand trips', () => {
  function setup() {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    const db = {
      corporateRoute: { findMany: jest.fn(async () => []) },
      trip: {
        findMany: jest.fn(async () => [
          { id: TRIP_1, status: 'IN_PROGRESS', driverId: 'd1', driver: { fullName: 'Asha', vehiclePlate: 'TS09AB1234' }, vehicle: null },
          {
            id: TRIP_2,
            status: 'ASSIGNED',
            driverId: 'd2',
            driver: { fullName: 'Ravi', currentLat: '17.5', currentLng: '78.5', lastLocationAt: new Date(clock.ms - 100_000) },
            vehicle: { registrationNumber: 'TS10CD5678' },
          },
        ]),
      },
    };
    return { clock, redis, ingest, db, svc: new CorporateTrackingService(db as any, ingest) };
  }

  it('ops/admin see active trips from the trip cache, else the driver row', async () => {
    const { clock, redis, db, svc } = setup();
    await redis.set(TripTelemetryKeys.latest(TRIP_1), JSON.stringify({ routeId: TRIP_1, driverId: 'd1', lat: 17.4, lng: 78.4, speedKph: 30, heading: 90, recordedAt: clock.ms, gpsState: 'LIVE' }));
    const snap = await svc.getFleetSnapshot({}, new Date(clock.ms + 5_000));
    expect(snap).toEqual([
      expect.objectContaining({ routeId: TRIP_1, kind: 'TRIP', tripId: TRIP_1, driverName: 'Asha', vehicleNumber: 'TS09AB1234', lat: 17.4, gpsState: 'LIVE', status: 'IN_PROGRESS' }),
      expect.objectContaining({ routeId: TRIP_2, kind: 'TRIP', vehicleNumber: 'TS10CD5678', lat: 17.5, lng: 78.5, gpsState: 'STALE' }),
    ]);
    expect((db.trip.findMany.mock.calls[0] as any[])[0].where.status.in).toEqual(['ASSIGNED', 'ARRIVED', 'IN_PROGRESS']);
  });

  it('tenant-scoped callers never see on-demand trips', async () => {
    const { db, svc } = setup();
    expect(await svc.getFleetSnapshot({ tenantId: TENANT_A })).toEqual([]);
    expect(db.trip.findMany).not.toHaveBeenCalled();
  });
});

describe('TripsService.updateLocation: live fan-out and throttled persistence', () => {
  const dto = { location: { latitude: 17.44, longitude: 78.38 }, heading: 45, speed: 10 } as any;

  function setup(redisClient: any) {
    const order: string[] = [];
    const trip = { id: TRIP_1, status: 'IN_PROGRESS', driverId: 'd1', vendorId: 'v1', vehicleType: 'SEDAN', driver: { id: 'd1', fullName: 'Asha', vehiclePlate: 'TS09AB1234' } };
    const db = {
      trip: { findUnique: jest.fn(async () => trip) },
      driver: { findUnique: jest.fn(async () => ({ id: 'd1' })), update: jest.fn(async () => (order.push('driver.update'), {})) },
      tripEvent: { create: jest.fn(async () => (order.push('tripEvent.create'), {})) },
    };
    const published: Array<[string, any]> = [];
    const pubsub = { publish: jest.fn(async (ch: string, p: any) => (order.push(`publish:${ch}`), published.push([ch, typeof p === 'string' ? JSON.parse(p) : p]), 1)),
      // unbatched delegate, as the real service behaves with TELEMETRY_PUBLISH_BATCH_MS=0
      publishBatched: (ch: string, p: any) => void pubsub.publish(ch, p),
    } as any;
    const notifications = { emitEvent: jest.fn() };
    const locations = { indexDriverLocation: jest.fn(async () => undefined) };
    const redisSvc = { getClient: () => redisClient, set: jest.fn(async () => undefined) };
    const svc = new TripsService(db as any, {} as any, notifications as any, { log: jest.fn() } as any, locations as any, pubsub as any, redisSvc as any);
    return { svc, db, pubsub, published, order, locations, notifications, redisSvc };
  }

  afterEach(() => delete process.env.TRIP_LOCATION_PERSIST_INTERVAL_SEC);

  it('publishes a TRIP payload and caches it before any Postgres write', async () => {
    const redis = new FakeStreamRedis();
    const { svc, published, order } = setup(redis);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    expect(published.map(([c]) => c)).toEqual([TelemetryChannels.opsFleet, TelemetryChannels.trip(TRIP_1)]);
    expect(published[0][1]).toMatchObject({ routeId: TRIP_1, tripId: TRIP_1, kind: 'TRIP', driverName: 'Asha', vehicleNumber: 'TS09AB1234', speedKph: 36, heading: 45, status: 'IN_PROGRESS' });
    expect(order.indexOf('driver.update')).toBeGreaterThan(order.indexOf(`publish:${TelemetryChannels.trip(TRIP_1)}`));
    expect(JSON.parse((await redis.get(TripTelemetryKeys.latest(TRIP_1)))!)).toMatchObject({ lat: 17.44, kind: 'TRIP' });
  });

  it('persists at most once per interval per trip, but fans out and indexes every ping', async () => {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const { svc, db, pubsub, locations } = setup(redis);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    expect(db.driver.update).toHaveBeenCalledTimes(1);
    expect(db.tripEvent.create).toHaveBeenCalledTimes(1);
    expect(pubsub.publish).toHaveBeenCalledTimes(6);
    expect(locations.indexDriverLocation).toHaveBeenCalledTimes(3);
    clock.advance(10_001);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    expect(db.driver.update).toHaveBeenCalledTimes(2);
  });

  it('without Redis every ping is persisted (fail safe) and the cache goes through RedisService', async () => {
    const { svc, db, redisSvc } = setup(null);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    expect(db.driver.update).toHaveBeenCalledTimes(2);
    expect(redisSvc.set).toHaveBeenCalledWith(TripTelemetryKeys.latest(TRIP_1), expect.any(String), 900);
  });

  it('TRIP_LOCATION_PERSIST_INTERVAL_SEC=0 disables throttling', async () => {
    process.env.TRIP_LOCATION_PERSIST_INTERVAL_SEC = '0';
    const { svc, db } = setup(new FakeStreamRedis());
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    await svc.updateLocation(TRIP_1, 'user-1', dto);
    expect(db.tripEvent.create).toHaveBeenCalledTimes(2);
  });
});
