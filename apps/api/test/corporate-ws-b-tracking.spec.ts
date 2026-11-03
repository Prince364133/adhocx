import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@adhocx/contracts';
import { CORPORATE_RESOURCE_KEY } from '../src/common/decorators/corporate-resource.decorator';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { classifyGpsFreshness, CorporateGpsKeys } from '../src/domains/corporate/tracking/tracking.types';
import { CorporateGpsIngestService, resolveRecordedAt } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import {
  CorporateTelemetryWriter,
  TelemetryWriterConfig,
  parseFixPayload,
} from '../src/domains/corporate/tracking/corporate-telemetry-writer.service';
import {
  CorporateGpsPartitionMaintenance,
  createPartitionSql,
  expiredPartitions,
  planPartitions,
} from '../src/domains/corporate/tracking/corporate-gps-partition-maintenance.service';
import { TripEventRecorder } from '../src/domains/corporate/tracking/trip-event-recorder.service';
import { CorporateTrackingService } from '../src/domains/corporate/tracking/corporate-tracking.service';
import {
  CorporateTrackingController,
  trackingScopeOf,
} from '../src/domains/corporate/tracking/corporate-tracking.controller';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { createFakePositionsDb, FakeClock, FakeStreamRedis } from './helpers/fake-gps-stream';

const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';
const ROUTE_A = '11111111-1111-4111-8111-111111111111';
const DRIVER_1 = '22222222-2222-4222-8222-222222222222';

const writerConfig = (over: Partial<TelemetryWriterConfig> = {}): TelemetryWriterConfig => ({
  enabled: true,
  batchSize: 500,
  flushIntervalMs: 2000,
  pollIntervalMs: 200,
  maxReadsPerPoll: 50,
  reclaimIdleMs: 30_000,
  reclaimEveryMs: 10_000,
  maxLocalBuffer: 50_000,
  ...over,
});

function harness(clock = new FakeClock()) {
  const redis = new FakeStreamRedis(clock);
  const redisService: any = {
    getClient: () => redis,
    acquireLockToken: jest.fn().mockResolvedValue('tok'),
    releaseLockToken: jest.fn().mockResolvedValue(undefined),
  };
  const positions = createFakePositionsDb();
  const db: any = { corporateVehiclePosition: positions.delegate };
  return { clock, redis, redisService, positions, db };
}

const route = { id: ROUTE_A, tenantId: TENANT_A, driverId: DRIVER_1 };

describe('WS-B tracking: GPS freshness', () => {
  const now = new Date('2026-11-03T08:00:00.000Z');
  const ago = (s: number) => new Date(now.getTime() - s * 1000);

  it('LIVE up to 45 s, STALE up to 180 s, then OFFLINE; never LIVE for a stale fix', () => {
    expect(classifyGpsFreshness(ago(0), now)).toEqual({ gpsState: 'LIVE', lastFixAgeSec: 0 });
    expect(classifyGpsFreshness(ago(45), now)).toEqual({ gpsState: 'LIVE', lastFixAgeSec: 45 });
    expect(classifyGpsFreshness(ago(46), now)).toEqual({ gpsState: 'STALE', lastFixAgeSec: 46 });
    expect(classifyGpsFreshness(ago(180), now)).toEqual({ gpsState: 'STALE', lastFixAgeSec: 180 });
    expect(classifyGpsFreshness(ago(181), now)).toEqual({ gpsState: 'OFFLINE', lastFixAgeSec: 181 });
    // 45.9 s floors to 45 => still LIVE; 45.999 must never round up into a "fresher" bucket
    expect(classifyGpsFreshness(new Date(now.getTime() - 45_999), now).gpsState).toBe('LIVE');
    expect(classifyGpsFreshness(new Date(now.getTime() - 46_000), now).gpsState).toBe('STALE');
  });

  it('no fix or an invalid timestamp is OFFLINE with lastFixAgeSec null', () => {
    expect(classifyGpsFreshness(null, now)).toEqual({ gpsState: 'OFFLINE', lastFixAgeSec: null });
    expect(classifyGpsFreshness('not-a-date', now)).toEqual({ gpsState: 'OFFLINE', lastFixAgeSec: null });
  });

  it('device clocks ahead of the server are clamped to the receive time', () => {
    const received = new Date('2026-11-03T08:00:00.000Z');
    expect(resolveRecordedAt(received.getTime() + 60_000, received).getTime()).toBe(received.getTime());
    expect(resolveRecordedAt(undefined, received)).toBe(received);
    expect(resolveRecordedAt('garbage', received)).toBe(received);
    expect(resolveRecordedAt('2026-11-03T07:59:30.000Z', received).toISOString()).toBe('2026-11-03T07:59:30.000Z');
  });
});

describe('WS-B tracking: ingest (Redis latest key + stream)', () => {
  it('caches the latest position, XADDs to corporate:gps:stream with MAXLEN ~', async () => {
    const h = harness();
    const ingest = new CorporateGpsIngestService(h.redisService);
    const out = await ingest.ingest(route, { latitude: 17.44, longitude: 78.38, speedMps: 10, batteryPct: 81 }, new Date(h.clock.ms));

    expect(out).toMatchObject({ outOfOrder: false, duplicate: false, persistence: 'STREAM' });
    const latest = JSON.parse((await h.redis.get(CorporateGpsKeys.latest(ROUTE_A)))!);
    expect(latest).toMatchObject({ latitude: 17.44, longitude: 78.38, driverId: DRIVER_1 });
    expect(h.redis.xaddArgs[0].slice(0, 5)).toEqual([CorporateGpsKeys.STREAM, 'MAXLEN', '~', ingest.streamMaxLen, '*']);
    const rec = parseFixPayload(h.redis.xaddArgs[0][6]);
    expect(rec).toMatchObject({ routeId: ROUTE_A, tenantId: TENANT_A, speedKph: 36, batteryPct: 81 });
  });

  it('an out-of-order (older) fix goes to history but never moves the live position backwards', async () => {
    const h = harness();
    const ingest = new CorporateGpsIngestService(h.redisService);
    const t = h.clock.ms;
    await ingest.ingest(route, { latitude: 17.5, longitude: 78.5, recordedAt: t - 1_000 }, new Date(t));
    const late = await ingest.ingest(route, { latitude: 17.1, longitude: 78.1, recordedAt: t - 30_000 }, new Date(t + 500));

    expect(late.outOfOrder).toBe(true);
    expect(late.persistence).toBe('STREAM');
    const latest = JSON.parse((await h.redis.get(CorporateGpsKeys.latest(ROUTE_A)))!);
    expect(latest.latitude).toBe(17.5);
    expect(h.redis.calls.xadd).toBe(2);
  });

  it('a device re-upload of the same fix is dropped at ingest (SET NX)', async () => {
    const h = harness();
    const ingest = new CorporateGpsIngestService(h.redisService);
    const fix = { latitude: 17.44, longitude: 78.38, recordedAt: h.clock.ms - 2_000 };
    await ingest.ingest(route, fix, new Date(h.clock.ms));
    const again = await ingest.ingest(route, fix, new Date(h.clock.ms + 3_000));
    expect(again).toMatchObject({ duplicate: true, persistence: 'NONE' });
    expect(h.redis.calls.xadd).toBe(1);
  });

  it('rejects out-of-range coordinates and falls back to the writer buffer without Redis', async () => {
    const writer = new CorporateTelemetryWriter({} as any, { getClient: () => null } as any, undefined, writerConfig());
    const ingest = new CorporateGpsIngestService({ getClient: () => null } as any, writer);
    await expect(ingest.ingest(route, { latitude: 123, longitude: 78 })).rejects.toBeInstanceOf(BadRequestException);
    const out = await ingest.ingest(route, { latitude: 17.4, longitude: 78.4 });
    expect(out.persistence).toBe('LOCAL_BUFFER');
    expect(writer.bufferedCount).toBe(1);
  });
});

describe('WS-B tracking: CorporateTelemetryWriter', () => {
  async function seed(h: ReturnType<typeof harness>, n: number, routeId = ROUTE_A) {
    const ingest = new CorporateGpsIngestService(h.redisService);
    for (let i = 0; i < n; i++) {
      await ingest.ingest({ ...route, id: routeId }, { latitude: 17 + i * 1e-4, longitude: 78, recordedAt: h.clock.ms - (n - i) * 1000 }, new Date(h.clock.ms));
    }
  }

  it('writes full batches of exactly 500 rows and XACKs only after the insert', async () => {
    const h = harness();
    await seed(h, 1200);
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, undefined, writerConfig());

    await writer.pump(h.clock.ms);
    expect(h.positions.state.batchSizes).toEqual([500, 500]);
    expect(writer.bufferedCount).toBe(200);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(200);
  });

  it('flushes a partial batch only once its oldest row has waited 2 s', async () => {
    const h = harness();
    await seed(h, 37);
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, undefined, writerConfig());

    await writer.pump(h.clock.ms);
    expect(h.positions.delegate.createMany).not.toHaveBeenCalled();
    h.clock.advance(1_999);
    await writer.pump(h.clock.ms);
    expect(h.positions.delegate.createMany).not.toHaveBeenCalled();
    h.clock.advance(1);
    await writer.pump(h.clock.ms);
    expect(h.positions.state.batchSizes).toEqual([37]);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(0);
  });

  it('a failed insert leaves entries pending; the re-delivery is written once, never duplicated', async () => {
    const h = harness();
    await seed(h, 10);
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, undefined, writerConfig({ flushIntervalMs: 1 }));
    h.positions.state.failNext = 1;

    await writer.pump(h.clock.ms); // read
    h.clock.advance(5);
    await writer.pump(h.clock.ms); // flush fails
    expect(h.positions.delegate.createMany).toHaveBeenCalledTimes(1);
    expect(h.positions.rows.size).toBe(0);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(10);

    h.clock.advance(31_000); // past reclaimIdleMs and reclaimEveryMs
    await writer.pump(h.clock.ms);
    h.clock.advance(5);
    await writer.pump(h.clock.ms);
    expect(h.positions.rows.size).toBe(10);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(0);
  });

  it('a lost XACK re-delivers the batch and skipDuplicates turns it into a no-op', async () => {
    const h = harness();
    await seed(h, 500);
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, undefined, writerConfig());
    h.redis.failNextAcks = 1;

    await writer.pump(h.clock.ms);
    expect(h.positions.rows.size).toBe(500);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(500);

    h.clock.advance(31_000);
    await writer.pump(h.clock.ms);
    expect(h.positions.delegate.createMany).toHaveBeenLastCalledWith(expect.objectContaining({ skipDuplicates: true }));
    expect(h.positions.rows.size).toBe(500);
    expect(h.positions.state.skipped).toBe(500);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(0);
  });

  it('malformed stream entries are acknowledged and dropped (no poison loop)', async () => {
    const h = harness();
    await h.redis.xadd(CorporateGpsKeys.STREAM, '*', 'f', '{not json');
    await h.redis.xadd(CorporateGpsKeys.STREAM, '*', 'f', JSON.stringify({ routeId: ROUTE_A }));
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, undefined, writerConfig());
    await writer.pump(h.clock.ms);
    expect(writer.stats.malformed).toBe(2);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(0);
    expect(h.positions.delegate.createMany).not.toHaveBeenCalled();
  });

  it('a missing partition triggers partition maintenance and the batch is retried later', async () => {
    const h = harness();
    await seed(h, 3);
    const maintenance: any = { ensurePartitions: jest.fn().mockResolvedValue([]) };
    const writer = new CorporateTelemetryWriter(h.db, h.redisService, maintenance, writerConfig({ flushIntervalMs: 1 }));
    h.positions.state.failNext = 1;
    h.positions.state.failWith = new Error('no partition of relation "corporate_vehicle_positions" found for row');
    await writer.pump(h.clock.ms);
    h.clock.advance(5);
    await writer.pump(h.clock.ms);
    expect(maintenance.ensurePartitions).toHaveBeenCalledTimes(1);
    expect(h.redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(3);
  });
});

describe('WS-B tracking: daily partition maintenance', () => {
  it('plans today..today+3 as UTC days regardless of process TZ, with exact bounds', () => {
    const plan = planPartitions(new Date('2026-11-03T20:30:00.000Z'), 3); // 02:00 IST on Nov 4
    expect(plan.map((p) => p.name)).toEqual([
      'corporate_vehicle_positions_p20261103',
      'corporate_vehicle_positions_p20261104',
      'corporate_vehicle_positions_p20261105',
      'corporate_vehicle_positions_p20261106',
    ]);
    expect(createPartitionSql(plan[0])).toBe(
      'CREATE TABLE IF NOT EXISTS "corporate_vehicle_positions_p20261103" PARTITION OF "corporate_vehicle_positions" ' +
        "FOR VALUES FROM ('2026-11-03 00:00:00.000') TO ('2026-11-04 00:00:00.000')",
    );
  });

  it('drops only partitions older than the retention window and ignores foreign tables', async () => {
    const now = new Date('2026-11-03T05:00:00.000Z');
    expect(
      expiredPartitions(
        ['corporate_vehicle_positions_p20260804', 'corporate_vehicle_positions_p20260805', 'corporate_vehicle_positions_p20260806', 'corporate_vehicle_positions_old', 'other_p20200101'],
        now,
        90,
      ),
    ).toEqual(['corporate_vehicle_positions_p20260804']); // Aug 5 still holds rows newer than now - 90d

    const db: any = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ name: 'corporate_vehicle_positions_p20260101' }, { name: 'corporate_vehicle_positions_p20261103' }]),
    };
    const redis: any = { acquireLockToken: jest.fn().mockResolvedValue('t'), releaseLockToken: jest.fn() };
    const m = new CorporateGpsPartitionMaintenance(db, redis);
    const res = await m.run(now);
    expect(res.created).toHaveLength(4);
    expect(res.dropped).toEqual(['corporate_vehicle_positions_p20260101']);
    expect(db.$executeRawUnsafe).toHaveBeenCalledWith('DROP TABLE IF EXISTS "corporate_vehicle_positions_p20260101"');
    expect(redis.releaseLockToken).toHaveBeenCalledWith(CorporateGpsPartitionMaintenance.LOCK_KEY, 't');

    redis.acquireLockToken.mockResolvedValueOnce(null);
    expect((await m.run(now)).skipped).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// Trip events, timeline, playback, tenant isolation
// ---------------------------------------------------------------------------------------------

function eventsDb() {
  const tripEvents: any[] = [];
  const assignments: any[] = [];
  let id = 1n;
  const routes = new Map<string, any>([
    [ROUTE_A, { id: ROUTE_A, tenantId: TENANT_A, status: 'IN_TRANSIT', driverId: DRIVER_1 }],
  ]);
  const order = (list: any[], where: any) =>
    list
      .filter((e) => e.routeId === where.routeId && (!where.tenantId || e.tenantId === where.tenantId))
      .sort((a, b) => a.at.getTime() - b.at.getTime() || (a.id < b.id ? -1 : 1));
  const db: any = {
    corporateRoute: {
      findUnique: jest.fn(async ({ where }: any) => routes.get(where.id) ?? null),
    },
    corporateTripEvent: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: id++, at: data.at ?? new Date(), ...data };
        tripEvents.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where, take }: any) => order(tripEvents, where).slice(0, take)),
    },
    corporateRouteAssignmentEvent: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: id++, at: data.at ?? new Date(), ...data };
        assignments.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where, take }: any) => order(assignments, where).slice(0, take)),
    },
  };
  return { db, tripEvents, assignments, routes };
}

describe('WS-B tracking: TripEventRecorder', () => {
  it('resolves the tenant from the route, and never throws when the insert fails', async () => {
    const { db, tripEvents } = eventsDb();
    const rec = new TripEventRecorder(db);
    expect(await rec.record({ routeId: ROUTE_A, type: 'ROUTE_STARTED' })).toBe(true);
    expect(tripEvents[0]).toMatchObject({ tenantId: TENANT_A, type: 'ROUTE_STARTED', payload: {} });

    db.corporateTripEvent.create.mockRejectedValueOnce(new Error('db down'));
    await expect(rec.record({ tenantId: TENANT_A, routeId: ROUTE_A, type: 'STOP_ARRIVED' })).resolves.toBe(false);
    expect(await rec.record({ routeId: 'unknown-route', type: 'STOP_ARRIVED' })).toBe(false);
  });

  it('offer accept writes OFFER_ACCEPTED and an assignment event; timeout => OFFER_EXPIRED', async () => {
    const { db, tripEvents, assignments } = eventsDb();
    const rec = new TripEventRecorder(db);
    await rec.recordOfferAccepted({ tenantId: TENANT_A, routeId: ROUTE_A, driverId: DRIVER_1, actorId: 'user-d1' });
    await rec.recordOfferDeclined(ROUTE_A, DRIVER_1, 'OFFER_TIMEOUT_EXPIRED');
    await rec.recordOfferDeclined(ROUTE_A, DRIVER_1, 'too far');

    expect(tripEvents.map((e) => e.type)).toEqual(['OFFER_ACCEPTED', 'OFFER_EXPIRED', 'OFFER_REJECTED']);
    expect(tripEvents[1]).toMatchObject({ actorRole: 'SYSTEM', actorId: null });
    expect(assignments).toEqual([
      expect.objectContaining({ routeId: ROUTE_A, fromDriverId: null, toDriverId: DRIVER_1, reason: 'OFFER_ACCEPTED', actorId: 'user-d1' }),
    ]);
  });

  it('replanning records STOP_REMOVED on the old route and STOP_ADDED on the new one', async () => {
    const { db, tripEvents } = eventsDb();
    const rec = new TripEventRecorder(db);
    await rec.recordReplan({
      tenantId: TENANT_A,
      requestId: 'req-1',
      action: 'RESCHEDULE',
      stopId: 'stop-old',
      removal: { routeId: ROUTE_A, mode: 'RESEQUENCED', routeCancelled: false, remainingPassengers: 2 },
      insertion: { routeId: 'route-new', stopId: 'stop-new', stopSequence: 3 },
    });
    expect(tripEvents.map((e) => [e.routeId, e.type, e.stopId])).toEqual([
      [ROUTE_A, 'STOP_REMOVED', 'stop-old'],
      ['route-new', 'STOP_ADDED', 'stop-new'],
    ]);
    expect(tripEvents[0].actorRole).toBe('EMPLOYEE');
  });
});

describe('WS-B tracking: call sites (execution + dispatch)', () => {
  it('execution records start, arrive, boarded, no-show and complete in order', async () => {
    const { db: evDb, tripEvents } = eventsDb();
    const stops: any[] = [
      { id: 's1', routeId: ROUTE_A, stopSequence: 1, stopType: 'PICKUP', status: 'PENDING', latitude: 17.45, longitude: 78.38, boardingOtp: '1234', employeeId: 'e1' },
      { id: 's2', routeId: ROUTE_A, stopSequence: 2, stopType: 'PICKUP', status: 'PENDING', latitude: 17.46, longitude: 78.39, boardingOtp: '5678', employeeId: 'e2' },
    ];
    const routeRow: any = { id: ROUTE_A, tenantId: TENANT_A, driverId: DRIVER_1, status: 'ASSIGNED', stops };
    const db: any = {
      ...evDb,
      corporateRoute: {
        findUnique: jest.fn(async () => routeRow),
        updateMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(async ({ data }: any) => Object.assign(routeRow, data)),
      },
      corporateRouteStop: {
        findUnique: jest.fn(async ({ where }: any) => ({ ...stops.find((s) => s.id === where.id), route: routeRow })),
        findFirst: jest.fn(async () => null),
        update: jest.fn(async ({ where, data }: any) => Object.assign(stops.find((s) => s.id === where.id), data)),
      },
      corporateTransportRequest: { update: jest.fn() },
    };
    const rider: any = new Proxy({}, { get: (_t, k) => (k === 'computePickupEtas' ? () => [] : jest.fn().mockResolvedValue(undefined)) });
    const svc = new CorporateTripExecutionService(db, { getClient: () => null } as any, { emitEvent: jest.fn() } as any, { log: jest.fn() } as any, rider);
    (svc as any).tripEvents = new TripEventRecorder(db);

    await svc.startRoute(ROUTE_A, {});
    await svc.arriveAtStop(ROUTE_A, 's1', { driverLatitude: 17.45, driverLongitude: 78.38 });
    await svc.verifyBoardingOtp(ROUTE_A, 's1', { otpCode: '1234' });
    await svc.arriveAtStop(ROUTE_A, 's2', { driverLatitude: 17.46, driverLongitude: 78.39 });
    stops[1].actualArrivalTime = new Date(Date.now() - 301_000);
    await svc.markNoShow(ROUTE_A, 's2', {});
    await svc.completeRoute(ROUTE_A);

    expect(tripEvents.map((e) => [e.type, e.stopId ?? null])).toEqual([
      ['ROUTE_STARTED', null],
      ['STOP_ARRIVED', 's1'],
      ['PASSENGER_BOARDED', 's1'],
      ['STOP_ARRIVED', 's2'],
      ['PASSENGER_NO_SHOW', 's2'],
      ['ROUTE_COMPLETED', null],
    ]);
    expect(tripEvents.every((e) => e.tenantId === TENANT_A && e.actorId === DRIVER_1)).toBe(true);
  });

  it('dispatch reaper timeout is recorded as OFFER_EXPIRED before cascading', async () => {
    const { db, tripEvents } = eventsDb();
    const svc = new CorporateDispatchService(db, { getClient: () => null } as any, {} as any, {} as any, {} as any);
    (svc as any).tripEvents = new TripEventRecorder(db);
    const cascade = jest.spyOn(svc, 'dispatchRoute').mockResolvedValue({} as any);
    await svc.rejectRouteOffer(ROUTE_A, DRIVER_1, 'OFFER_TIMEOUT_EXPIRED');
    expect(tripEvents.map((e) => e.type)).toEqual(['OFFER_EXPIRED']);
    expect(cascade).toHaveBeenCalledWith(ROUTE_A, false);
  });
});

describe('WS-B tracking: read side (tracking, timeline, playback)', () => {
  const now = new Date('2026-11-03T08:00:00.000Z');

  function readHarness() {
    const h = harness(new FakeClock(now.getTime()));
    const ev = eventsDb();
    const db: any = { ...ev.db, corporateVehiclePosition: h.positions.delegate };
    const ingest = new CorporateGpsIngestService(h.redisService);
    const svc = new CorporateTrackingService(db, ingest);
    return { ...h, ...ev, db, ingest, svc };
  }

  it('tracking reports LIVE, then STALE, then OFFLINE for the same cached fix (isLive only when LIVE)', async () => {
    const r = readHarness();
    await r.ingest.ingest(route, { latitude: 17.44, longitude: 78.38, recordedAt: now.getTime() - 10_000 }, now);

    const live = await r.svc.getTracking(ROUTE_A, {}, now);
    expect(live).toMatchObject({ gpsState: 'LIVE', lastFixAgeSec: 10, isLive: true, source: 'CACHE' });
    const stale = await r.svc.getTracking(ROUTE_A, {}, new Date(now.getTime() + 60_000));
    expect(stale).toMatchObject({ gpsState: 'STALE', lastFixAgeSec: 70, isLive: false });
    expect(stale.position?.lat).toBe(17.44);
    const offline = await r.svc.getTracking(ROUTE_A, {}, new Date(now.getTime() + 600_000));
    expect(offline).toMatchObject({ gpsState: 'OFFLINE', isLive: false });
  });

  it('falls back to the last persisted fix when the cache is gone, and OFFLINE with no fix at all', async () => {
    const r = readHarness();
    expect(await r.svc.getTracking(ROUTE_A, {}, now)).toMatchObject({ gpsState: 'OFFLINE', lastFixAgeSec: null, position: null, source: 'NONE' });

    await r.positions.delegate.createMany({
      data: [
        { tenantId: TENANT_A, routeId: ROUTE_A, driverId: DRIVER_1, lat: 1, lng: 1, recordedAt: new Date(now.getTime() - 100_000), receivedAt: new Date(now.getTime() - 99_000) },
        { tenantId: TENANT_A, routeId: ROUTE_A, driverId: DRIVER_1, lat: 2, lng: 2, recordedAt: new Date(now.getTime() - 90_000), receivedAt: new Date(now.getTime() - 89_000) },
      ],
      skipDuplicates: true,
    });
    const view = await r.svc.getTracking(ROUTE_A, {}, now);
    expect(view).toMatchObject({ gpsState: 'STALE', lastFixAgeSec: 90, source: 'HISTORY', isLive: false });
    expect(view.position?.lat).toBe(2);
  });

  it('timeline merges trip events and assignment history in time order, ids as strings', async () => {
    const r = readHarness();
    const rec = new TripEventRecorder(r.db);
    const t = (s: number) => new Date(now.getTime() + s * 1000);
    await rec.record({ tenantId: TENANT_A, routeId: ROUTE_A, type: 'ROUTE_STARTED', at: t(30) });
    await rec.record({ tenantId: TENANT_A, routeId: ROUTE_A, type: 'OFFER_SENT', at: t(0) });
    await rec.recordAssignment({ tenantId: TENANT_A, routeId: ROUTE_A, toDriverId: DRIVER_1, reason: 'OFFER_ACCEPTED', at: t(10) });
    await rec.record({ tenantId: TENANT_A, routeId: ROUTE_A, type: 'OFFER_ACCEPTED', at: t(10) });
    await rec.record({ tenantId: TENANT_A, routeId: ROUTE_A, stopId: 's1', type: 'STOP_ARRIVED', at: t(30) });

    const tl = await r.svc.getTimeline(ROUTE_A, { tenantId: TENANT_A });
    expect(tl.items.map((i) => `${i.kind}:${i.type}`)).toEqual([
      'TRIP_EVENT:OFFER_SENT',
      'TRIP_EVENT:OFFER_ACCEPTED',
      'ASSIGNMENT:OFFER_ACCEPTED',
      'TRIP_EVENT:ROUTE_STARTED',
      'TRIP_EVENT:STOP_ARRIVED',
    ]);
    expect(tl.assignmentHistory).toHaveLength(1);
    expect(typeof tl.items[0].id).toBe('string');
    expect(() => JSON.stringify(tl)).not.toThrow();
  });

  it('playback is ordered by device time (not arrival order), paged by cursor and window-limited', async () => {
    const r = readHarness();
    const base = now.getTime() - 3_600_000;
    // received in reverse order (offline upload): recordedAt must still drive the order
    const data = Array.from({ length: 25 }, (_, i) => ({
      tenantId: TENANT_A,
      routeId: ROUTE_A,
      driverId: DRIVER_1,
      lat: i,
      lng: i,
      recordedAt: new Date(base + i * 15_000),
      receivedAt: new Date(base + (25 - i) * 15_000 + 400_000),
    }));
    await r.positions.delegate.createMany({ data, skipDuplicates: true });

    const from = new Date(base - 1).toISOString();
    const to = now.toISOString();
    const p1 = await r.svc.getPlayback(ROUTE_A, { from, to, limit: '10' }, {}, now);
    const p2 = await r.svc.getPlayback(ROUTE_A, { from, to, limit: '10', cursor: p1.nextCursor! }, {}, now);
    const p3 = await r.svc.getPlayback(ROUTE_A, { from, to, limit: '10', cursor: p2.nextCursor! }, {}, now);
    const lats = [...p1.points, ...p2.points, ...p3.points].map((p) => p.lat);
    expect(lats).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(p3.nextCursor).toBeNull();
    expect(r.positions.delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A, receivedAt: { gte: new Date(base - 1) } }) }),
    );

    await expect(r.svc.getPlayback(ROUTE_A, { from: '2026-11-01T00:00:00Z', to: '2026-11-03T00:00:00Z' }, {}, now)).rejects.toBeInstanceOf(BadRequestException);
    await expect(r.svc.getPlayback(ROUTE_A, { from: to, to: from }, {}, now)).rejects.toBeInstanceOf(BadRequestException);
    await expect(r.svc.getPlayback(ROUTE_A, { cursor: 'bogus!' }, {}, now)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tenant isolation: a caller scoped to another tenant gets 404 on tracking, timeline and playback', async () => {
    const r = readHarness();
    await r.ingest.ingest(route, { latitude: 17.44, longitude: 78.38 }, now);
    await expect(r.svc.getTracking(ROUTE_A, { tenantId: TENANT_B }, now)).rejects.toBeInstanceOf(NotFoundException);
    await expect(r.svc.getTimeline(ROUTE_A, { tenantId: TENANT_B })).rejects.toBeInstanceOf(NotFoundException);
    await expect(r.svc.getPlayback(ROUTE_A, {}, { tenantId: TENANT_B }, now)).rejects.toBeInstanceOf(NotFoundException);
    // events written for another tenant on the same route id are never returned
    await new TripEventRecorder(r.db).record({ tenantId: TENANT_B, routeId: ROUTE_A, type: 'ROUTE_STARTED' });
    expect((await r.svc.getTimeline(ROUTE_A, { tenantId: TENANT_A })).items).toHaveLength(0);
  });

  it('controller: tenant-bound roles are pinned to their token tenant; guards and roles are declared', () => {
    expect(trackingScopeOf({ user: { role: 'CORPORATE_ADMIN', corporateTenantId: TENANT_B } })).toEqual({ tenantId: TENANT_B });
    expect(trackingScopeOf({ user: { role: 'EMPLOYEE', corporateTenantId: TENANT_A } })).toEqual({ tenantId: TENANT_A });
    expect(trackingScopeOf({ user: { role: 'ADMIN' } })).toEqual({});

    const proto = CorporateTrackingController.prototype as any;
    for (const m of ['getTracking', 'getTimeline', 'getPlayback']) {
      expect(Reflect.getMetadata(CORPORATE_RESOURCE_KEY, proto[m])).toMatchObject({ kind: 'route', param: 'id' });
    }
    expect(Reflect.getMetadata(ROLES_KEY, proto.getPlayback)).not.toContain(UserRole.EMPLOYEE);
    expect(Reflect.getMetadata(ROLES_KEY, proto.getPlayback)).not.toContain(UserRole.DRIVER);
    expect(Reflect.getMetadata(ROLES_KEY, proto.getTracking)).toContain(UserRole.EMPLOYEE);
  });
});
