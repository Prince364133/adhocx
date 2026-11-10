/**
 * Live telemetry load harness: drives the real ingest service, Redis Pub/Sub and SSE stream hub
 * against a real Redis, and reports ingest latency, delivery latency, event-loop lag and memory.
 *
 * It does not include HTTP, auth or the per-fix route lookup in Postgres (see the plan doc §8 for
 * the full end-to-end test); it measures the telemetry pipeline itself.
 *
 *   docker run -d --rm --name adhocx-telemetry-test-redis -p 6390:6379 redis:7.2-alpine
 *   npx ts-node -T apps/api/scripts/telemetry-load.ts --vehicles 10000 --hz 1 --seconds 30 --viewers 20 --pods 2
 *
 * The Redis database is FLUSHED: use a throwaway instance only.
 */
import { monitorEventLoopDelay, performance } from 'perf_hooks';
import Redis from 'ioredis';
import { RedisService } from '../src/redis/redis.service';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { CorporateGpsIngestService } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import { TelemetryChannels } from '../src/domains/corporate/tracking/tracking.types';
import { TelemetryStreamHub } from '../src/domains/corporate/tracking/telemetry-stream-hub';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}
const VEHICLES = arg('vehicles', 2000);
const HZ = arg('hz', 0.5);
const SECONDS = arg('seconds', 30);
const VIEWERS = arg('viewers', 10);
const PODS = arg('pods', 2);
const URL = process.env.TELEMETRY_IT_REDIS_URL || 'redis://localhost:6390';
const TENANTS = 20;

const pct = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '-');

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  // Production publish batching unless overridden (e.g. TELEMETRY_PUBLISH_BATCH_MS=0 to compare).
  process.env.TELEMETRY_PUBLISH_BATCH_MS = process.env.TELEMETRY_PUBLISH_BATCH_MS ?? '100';
  const admin = new Redis(URL);
  await admin.flushdb();
  const cpu0 = await redisCpu(admin);
  const config = { get: (k: string) => (k === 'redis.url' ? URL : undefined) } as any;

  // Silence Nest loggers (warnings would dominate output under load).
  const { Logger } = await import('@nestjs/common');
  Logger.overrideLogger(['error']);

  const pods = await Promise.all(
    Array.from({ length: PODS }, async () => {
      const pubsub = new RedisPubSubService(config);
      await pubsub.onModuleInit();
      const redis = new RedisService(config, pubsub);
      await redis.onModuleInit();
      return { pubsub, redis, ingest: new CorporateGpsIngestService(redis, undefined, process.argv.includes('--no-publish') ? undefined : pubsub), hub: new TelemetryStreamHub(pubsub) };
    }),
  );

  // Viewers spread across pods: half ops-wide, half tenant-scoped.
  const delivery: number[] = [];
  let frames = 0;
  let fixesDelivered = 0;
  let maxBatch = 0;
  const subs = Array.from({ length: VIEWERS }, (_, i) => {
    const pod = pods[i % PODS];
    const channel = i % 2 === 0 ? TelemetryChannels.opsFleet : TelemetryChannels.tenantFleet(tenantId(i % TENANTS));
    return pod.hub.openFleetStream(channel, { userId: `viewer-${i}` }).subscribe((e: any) => {
      if (e.type !== 'fixes') return;
      frames++;
      const now = Date.now();
      maxBatch = Math.max(maxBatch, e.data.length);
      // JSON round trip, as the SSE writer would do
      const wire = JSON.stringify(e.data);
      fixesDelivered += e.data.length;
      if (frames % 5 === 0) for (const f of JSON.parse(wire)) if (f.receivedAt) delivery.push(now - f.receivedAt);
    });
  });
  await new Promise((r) => setTimeout(r, 300));

  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  const rss0 = process.memoryUsage().rss;
  const ingestMs: number[] = [];
  let sent = 0;
  let errors = 0;
  const outcomes: Record<string, number> = {};

  const tickMs = 100;
  const perTick = (VEHICLES * HZ * tickMs) / 1000;
  let carry = 0;
  let cursor = 0;
  const pos = Array.from({ length: VEHICLES }, (_, i) => ({ lat: 17.3 + (i % 100) / 500, lng: 78.3 + Math.floor(i / 100) / 500 }));
  const start = Date.now();
  let inflight = 0;
  let maxInflight = 0;

  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (Date.now() - start >= SECONDS * 1000) {
        clearInterval(timer);
        resolve();
        return;
      }
      carry += perTick;
      const n = Math.floor(carry);
      carry -= n;
      for (let k = 0; k < n; k++) {
        const v = cursor++ % VEHICLES;
        const p = pos[v];
        p.lat += (Math.random() - 0.5) * 0.0002;
        p.lng += (Math.random() - 0.5) * 0.0002;
        const route = { id: `load-route-${v}`, tenantId: tenantId(v % TENANTS), driverId: `load-driver-${v}`, status: 'IN_TRANSIT' };
        const t = performance.now();
        inflight++;
        maxInflight = Math.max(maxInflight, inflight);
        pods[v % PODS].ingest
          .ingest(route, { latitude: p.lat, longitude: p.lng, speedMps: 8, headingDeg: 90, recordedAt: Date.now() })
          .then((o) => {
            ingestMs.push(performance.now() - t);
            outcomes[o.persistence] = (outcomes[o.persistence] ?? 0) + 1;
          })
          .catch(() => errors++)
          .finally(() => inflight--);
        sent++;
      }
    }, tickMs);
  });
  while (inflight > 0) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 800)); // last flush
  loop.disable();
  const elapsed = (Date.now() - start) / 1000;
  const cpu1 = await redisCpu(admin);
  const streamLen = await admin.xlen('corporate:gps:stream');

  subs.forEach((s) => s.unsubscribe());
  for (const p of pods) {
    p.hub.onModuleDestroy();
    await p.pubsub.onModuleDestroy();
    await p.redis.onModuleDestroy();
  }
  await admin.quit();

  const report = {
    config: { vehicles: VEHICLES, hz: HZ, seconds: SECONDS, viewers: VIEWERS, pods: PODS, targetFixesPerSec: VEHICLES * HZ },
    ingest: {
      sent,
      completed: ingestMs.length,
      errors,
      achievedFixesPerSec: Math.round(ingestMs.length / elapsed),
      p50ms: fmt(pct(ingestMs, 50)),
      p95ms: fmt(pct(ingestMs, 95)),
      p99ms: fmt(pct(ingestMs, 99)),
      maxInflight,
      persistence: outcomes,
      streamLen,
    },
    delivery: {
      frames,
      fixesDelivered,
      maxFixesPerFrame: maxBatch,
      p50ms: fmt(pct(delivery, 50)),
      p95ms: fmt(pct(delivery, 95)),
      p99ms: fmt(pct(delivery, 99)),
      note: 'server receive -> viewer frame, includes the 500 ms conflation window',
    },
    process: {
      eventLoopLagP99ms: fmt(loop.percentile(99) / 1e6),
      eventLoopLagMaxms: fmt(loop.max / 1e6),
      rssMB: Math.round(process.memoryUsage().rss / 1048576),
      rssGrowthMB: Math.round((process.memoryUsage().rss - rss0) / 1048576),
    },
    redis: { cpuSecondsUsed: fmt(cpu1 - cpu0), cpuPctOfOneCore: fmt(((cpu1 - cpu0) / elapsed) * 100) },
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

function tenantId(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
}

async function redisCpu(r: Redis): Promise<number> {
  const info = await r.info('cpu');
  const sys = Number(/used_cpu_sys:([\d.]+)/.exec(info)?.[1] ?? 0);
  const user = Number(/used_cpu_user:([\d.]+)/.exec(info)?.[1] ?? 0);
  return sys + user;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
