/**
 * WS-B simulation: a burst of 10,000 GPS fixes across 500 routes goes through the real ingest
 * service and three CorporateTelemetryWriter instances sharing one consumer group, with a mocked
 * DB and an in-memory Redis Stream. Faults injected: one writer crashes holding a buffered batch,
 * one batch insert fails, one XACK is lost, 10% of routes deliver fixes out of order, and 300
 * fixes are re-uploaded by devices.
 */
import { CorporateGpsIngestService } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import { CorporateTelemetryWriter, TelemetryWriterConfig } from '../src/domains/corporate/tracking/corporate-telemetry-writer.service';
import { CorporateTrackingService } from '../src/domains/corporate/tracking/corporate-tracking.service';
import { CorporateGpsKeys } from '../src/domains/corporate/tracking/tracking.types';
import { createFakePositionsDb, FakeClock, FakeStreamRedis } from './helpers/fake-gps-stream';

const ROUTES = 500;
const FIXES_PER_ROUTE = 20;
const TOTAL = ROUTES * FIXES_PER_ROUTE;
const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
const routeId = (i: number) => `aaaaaaaa-0000-4000-8000-${hex(i, 12)}`;
const driverId = (i: number) => `dddddddd-0000-4000-8000-${hex(i, 12)}`;
const tenantOf = (i: number) => (i % 2 === 0 ? 'tttttttt-0000-4000-8000-00000000000a' : 'tttttttt-0000-4000-8000-00000000000b');

const config: TelemetryWriterConfig = {
  enabled: true,
  batchSize: 500,
  flushIntervalMs: 2000,
  pollIntervalMs: 200,
  maxReadsPerPoll: 4,
  reclaimIdleMs: 30_000,
  reclaimEveryMs: 10_000,
  maxLocalBuffer: 50_000,
};

describe('WS-B simulation: 10,000-fix burst across 500 routes', () => {
  it('writes every unique fix exactly once in <= 500-row batches despite crash, failure, lost ack, reorder and re-uploads', async () => {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const redisService: any = { getClient: () => redis };
    const positions = createFakePositionsDb();
    const db: any = {
      corporateVehiclePosition: positions.delegate,
      corporateRoute: {
        findUnique: jest.fn(async ({ where }: any) => {
          const i = Number.parseInt(where.id.slice(-12), 16);
          return { id: where.id, tenantId: tenantOf(i), status: 'IN_TRANSIT', driverId: driverId(i) };
        }),
      },
    };
    const ingest = new CorporateGpsIngestService(redisService);

    // ---- Burst ingest: device times 15 s apart, all received at T0 (a reconnect burst) ----
    const T0 = clock.ms;
    const firstFix = T0 - FIXES_PER_ROUTE * 15_000;
    let outOfOrderSeen = 0;
    let duplicatesSeen = 0;
    const started = Date.now();
    for (let r = 0; r < ROUTES; r++) {
      const order = Array.from({ length: FIXES_PER_ROUTE }, (_, k) => k);
      if (r % 10 === 0) order.reverse(); // 10% of routes: newest first
      for (const k of order) {
        const out = await ingest.ingest(
          { id: routeId(r), tenantId: tenantOf(r), driverId: driverId(r) },
          { latitude: 17 + r * 1e-3, longitude: 78 + k * 1e-4, speedMps: 8, recordedAt: firstFix + k * 15_000 },
          new Date(T0),
        );
        if (out.outOfOrder) outOfOrderSeen++;
      }
      if (r < 15) {
        // 20 re-uploads of already ingested fixes on 15 routes = 300
        for (let k = 0; k < FIXES_PER_ROUTE; k++) {
          const out = await ingest.ingest(
            { id: routeId(r), tenantId: tenantOf(r), driverId: driverId(r) },
            { latitude: 17 + r * 1e-3, longitude: 78 + k * 1e-4, recordedAt: firstFix + k * 15_000 },
            new Date(T0 + 1_000),
          );
          if (out.duplicate) duplicatesSeen++;
        }
      }
    }
    expect(duplicatesSeen).toBe(300);
    expect(outOfOrderSeen).toBe(50 * (FIXES_PER_ROUTE - 1));
    expect(redis.calls.xadd).toBe(TOTAL);

    // ---- Three writers on one consumer group ----
    const writers = [0, 1, 2].map(() => new CorporateTelemetryWriter(db, redisService, undefined, config));
    // Writer 0 reads 499 entries, then "crashes" with them buffered and un-acked.
    const crashed = writers[0];
    (crashed as any).config = { ...config, maxReadsPerPoll: 1 };
    await (crashed as any).ensureGroup(redis);
    await (crashed as any).read(redis, 499, clock.ms);
    expect(crashed.bufferedCount).toBe(499);
    const live = writers.slice(1);

    positions.state.failNext = 1; // first batch insert fails
    redis.failNextAcks = 1; // one XACK is lost after a successful insert

    for (let step = 0; step < 400; step++) {
      await Promise.all(live.map((w) => w.pump(clock.ms)));
      clock.advance(250);
      const pending = redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP);
      if (pending === 0 && live.every((w) => w.bufferedCount === 0) && positions.rows.size === TOTAL) break;
    }
    const elapsedMs = Date.now() - started;

    // ---- Assertions ----
    const sizes = positions.state.batchSizes;
    expect(Math.max(...sizes)).toBeLessThanOrEqual(500);
    expect(sizes.filter((n) => n === 500).length).toBeGreaterThanOrEqual(15); // the burst goes in full batches
    expect(positions.rows.size).toBe(TOTAL); // every unique fix persisted
    expect(positions.state.inserted).toBe(TOTAL); // ... exactly once
    expect(positions.state.skipped).toBeGreaterThan(0); // the lost-ack redelivery hit the unique key
    expect(redis.pendingCount(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP)).toBe(0);
    const reclaimed = live.reduce((a, w) => a + w.stats.reclaimed, 0);
    expect(reclaimed).toBeGreaterThanOrEqual(499 + 500); // crashed buffer + failed batch + lost ack
    expect(live.every((w) => w.stats.batches > 0)).toBe(true); // work spread over instances

    // Unique key holds: no (route, driver, recordedAt) appears twice
    const keys = new Set([...positions.rows.values()].map((p) => `${p.routeId}|${p.driverId}|${p.recordedAt.getTime()}`));
    expect(keys.size).toBe(TOTAL);

    // Latest position = newest device fix on every route, including the reversed ones
    for (const r of [0, 10, 137, 499]) {
      const latest = JSON.parse((await redis.get(CorporateGpsKeys.latest(routeId(r))))!);
      expect(new Date(latest.recordedAt).getTime()).toBe(firstFix + (FIXES_PER_ROUTE - 1) * 15_000);
    }

    // Playback of a reversed route comes back ordered by device time and pinned to its tenant
    const tracking = new CorporateTrackingService(db, ingest);
    const pb = await tracking.getPlayback(
      routeId(10),
      { from: new Date(firstFix - 1).toISOString(), to: new Date(T0).toISOString() },
      { tenantId: tenantOf(10) },
      new Date(T0),
    );
    expect(pb.points).toHaveLength(FIXES_PER_ROUTE);
    const times = pb.points.map((p) => p.recordedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    await expect(tracking.getPlayback(routeId(10), {}, { tenantId: tenantOf(11) }, new Date(T0))).rejects.toThrow();

    // The newest fix is 15 s old at T0 => LIVE; 3 minutes later the same fix is never LIVE
    expect((await tracking.getTracking(routeId(3), {}, new Date(T0))).gpsState).toBe('LIVE');
    expect((await tracking.getTracking(routeId(3), {}, new Date(T0 + 200_000))).gpsState).toBe('OFFLINE');

    // eslint-disable-next-line no-console
    console.log(
      `[WS-B sim] ${TOTAL} fixes, ${sizes.length} batches (max ${Math.max(...sizes)}), ` +
        `${reclaimed} reclaimed, ${positions.state.skipped} duplicate rows skipped, ${elapsedMs} ms wall`,
    );
  }, 120_000);
});
