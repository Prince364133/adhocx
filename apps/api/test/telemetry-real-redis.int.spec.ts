/**
 * Live telemetry against a REAL Redis (the in-memory fakes elsewhere cannot prove Lua semantics,
 * atomicity under concurrency, GETDEL, or cross-connection Pub/Sub).
 *
 * Uses TELEMETRY_IT_REDIS_URL (default redis://localhost:6390) and skips itself when that Redis is
 * not reachable. The database is FLUSHED: point it only at a throwaway instance, e.g.
 *   docker run -d --rm --name adhocx-telemetry-test-redis -p 6390:6379 redis:7.2-alpine
 */
import Redis from 'ioredis';
import { RedisService } from '../src/redis/redis.service';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { StreamTicketService } from '../src/redis/stream-ticket.service';
import { CorporateGpsIngestService } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import { CorporateGpsKeys, TelemetryChannels } from '../src/domains/corporate/tracking/tracking.types';
import { TelemetryStreamHub } from '../src/domains/corporate/tracking/telemetry-stream-hub';

const URL = process.env.TELEMETRY_IT_REDIS_URL || 'redis://localhost:6390';
// Production batching on the real-Redis path (unit tests run with it off).
process.env.TELEMETRY_PUBLISH_BATCH_MS = process.env.TELEMETRY_PUBLISH_BATCH_MS || '100';
const config = { get: (k: string) => (k === 'redis.url' ? URL : undefined) } as any;
const TENANT = '11111111-1111-4111-8111-111111111111';
const until = async (cond: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 20));
  }
};

let available = false;
let admin: Redis;

beforeAll(async () => {
  admin = new Redis(URL, { lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null, connectTimeout: 1000 });
  admin.on('error', () => undefined);
  try {
    await admin.connect();
    await admin.flushdb();
    available = true;
  } catch {
    available = false;
  }
});
afterAll(async () => {
  admin?.disconnect();
});

/** A "pod": its own Redis command connection, Pub/Sub pair and services. */
async function pod() {
  const pubsub = new RedisPubSubService(config);
  await pubsub.onModuleInit();
  const redis = new RedisService(config, pubsub); // as Nest injects it
  await redis.onModuleInit();
  const ingest = new CorporateGpsIngestService(redis, undefined, pubsub);
  const hub = new TelemetryStreamHub(pubsub);
  const tickets = new StreamTicketService(redis);
  const close = async () => {
    hub.onModuleDestroy();
    await pubsub.onModuleDestroy();
    await redis.onModuleDestroy();
  };
  return { redis, pubsub, ingest, hub, tickets, close };
}

const itRedis = (name: string, fn: () => Promise<void>, timeout = 20_000) =>
  it(name, async () => {
    if (!available) {
      console.warn(`[skipped: no Redis at ${URL}] ${name}`);
      return;
    }
    await fn();
  }, timeout);

describe('telemetry on a real Redis', () => {
  itRedis('the Lua ingest is used and handles accept / duplicate / out-of-order', async () => {
    const p = await pod();
    try {
      expect(p.pubsub.isLive()).toBe(true);
      const route = { id: 'it-route-1', tenantId: TENANT, driverId: 'drv-1', status: 'IN_TRANSIT' };
      const t0 = Date.now() - 10_000;
      const a = await p.ingest.ingest(route, { latitude: 17.4, longitude: 78.3, recordedAt: t0 + 2000 });
      expect(a).toMatchObject({ duplicate: false, outOfOrder: false, persistence: 'STREAM' });
      expect(typeof (p.redis.getClient() as any).adhocxGpsApply).toBe('function'); // script path, not fallback

      const dup = await p.ingest.ingest(route, { latitude: 17.4, longitude: 78.3, recordedAt: t0 + 2000 });
      expect(dup).toMatchObject({ duplicate: true, persistence: 'NONE' });

      const old = await p.ingest.ingest(route, { latitude: 1, longitude: 1, recordedAt: t0 + 1000 });
      expect(old).toMatchObject({ outOfOrder: true, persistence: 'STREAM' }); // kept in history

      const latest = JSON.parse((await admin.get(CorporateGpsKeys.latest(route.id)))!);
      expect(latest.latitude).toBe(17.4); // not moved backwards
      expect(await admin.ttl(CorporateGpsKeys.latest(route.id))).toBeGreaterThan(800);
      expect(await admin.xlen(CorporateGpsKeys.STREAM)).toBe(2);
    } finally {
      await p.close();
    }
  });

  itRedis('100 concurrent fixes from two pods: the live position is always the newest one', async () => {
    const a = await pod();
    const b = await pod();
    try {
      const route = { id: 'it-route-race', tenantId: TENANT, driverId: 'drv-2', status: 'IN_TRANSIT' };
      const base = Date.now() - 60_000;
      const order = Array.from({ length: 100 }, (_, i) => i).sort(() => Math.random() - 0.5);
      await Promise.all(
        order.map((i) => (i % 2 ? a : b).ingest.ingest(route, { latitude: 10 + i / 1000, longitude: 70, recordedAt: base + i * 100 })),
      );
      const latest = JSON.parse((await admin.get(CorporateGpsKeys.latest(route.id)))!);
      expect(latest.recordedAtMs).toBe(base + 99 * 100);
      expect(latest.latitude).toBeCloseTo(10.099, 6);
      expect(await admin.xlen(CorporateGpsKeys.STREAM)).toBeGreaterThanOrEqual(100);
    } finally {
      await a.close();
      await b.close();
    }
  });

  itRedis('a fix ingested on pod A reaches a fleet stream on pod B as a batched `fixes` frame', async () => {
    const a = await pod();
    const b = await pod();
    try {
      const events: any[] = [];
      const sub = b.hub.openFleetStream(TelemetryChannels.opsFleet, { userId: 'ops-1' }).subscribe((e) => events.push(e));
      await new Promise((r) => setTimeout(r, 150)); // let SUBSCRIBE land on the real server
      const route = { id: 'it-route-x', tenantId: TENANT, driverId: 'drv-3', status: 'IN_TRANSIT' };
      for (let i = 0; i < 5; i++) await a.ingest.ingest(route, { latitude: 12 + i, longitude: 77, recordedAt: Date.now() - 5000 + i });
      await until(() => events.some((e) => e.type === 'fixes'));
      const batch = events.find((e) => e.type === 'fixes').data;
      expect(batch).toHaveLength(1); // conflated to the newest fix
      expect(batch[0]).toMatchObject({ routeId: route.id, lat: 16, kind: 'CORPORATE_ROUTE' });
      sub.unsubscribe();
    } finally {
      await a.close();
      await b.close();
    }
  });

  itRedis('a stream ticket is single-use even when two pods race for it (GETDEL)', async () => {
    const a = await pod();
    const b = await pod();
    try {
      const { ticket } = await a.tickets.issue({ sub: 'u1', role: 'OPS' }, 'tok');
      const [x, y] = await Promise.all([a.tickets.consume(ticket), b.tickets.consume(ticket)]);
      expect([x, y].filter(Boolean)).toHaveLength(1);
      const { ticket: t2 } = await a.tickets.issue({ sub: 'u1' }, 'tok');
      expect(await admin.ttl(`sse:ticket:${require('../src/redis/auth-revocation').hashToken(t2)}`)).toBeLessThanOrEqual(30);
    } finally {
      await a.close();
      await b.close();
    }
  });

  itRedis('suspending a user on pod A closes their live stream on pod B', async () => {
    const a = await pod();
    const b = await pod();
    try {
      const events: any[] = [];
      let done = false;
      b.hub
        .openFleetStream(TelemetryChannels.opsFleet, { userId: 'u-suspend', tokenHash: 'h' })
        .subscribe({ next: (e) => events.push(e), complete: () => (done = true) });
      await new Promise((r) => setTimeout(r, 150));
      await a.redis.revokeUserSessions('u-suspend');
      await until(() => done);
      expect(events.at(-1)).toEqual({ type: 'reauth', data: { reason: 'REVOKED' } });
    } finally {
      await a.close();
      await b.close();
    }
  });

  itRedis('streams keep receiving after the Redis subscriber connection is killed', async () => {
    const a = await pod();
    const b = await pod();
    try {
      const events: any[] = [];
      const sub = b.hub.openFleetStream(TelemetryChannels.opsFleet, { userId: 'ops-2' }).subscribe((e) => events.push(e));
      await new Promise((r) => setTimeout(r, 150));
      const killed = Number(await admin.client('KILL', 'TYPE', 'pubsub'));
      expect(killed).toBeGreaterThanOrEqual(1); // pod B's subscriber (pod A subscribes to nothing)
      // Pub/Sub drops what is published while a subscriber reconnects (by design: the next fix
      // repairs the map). Keep reporting like a real driver and require delivery to resume.
      const route = { id: 'it-route-reconnect', tenantId: TENANT, driverId: 'drv-4', status: 'IN_TRANSIT' };
      const seen = () => events.some((e) => e.type === 'fixes' && e.data.some((f: any) => f.routeId === route.id));
      const started = Date.now();
      for (let i = 0; !seen(); i++) {
        if (Date.now() - started > 15_000) throw new Error('live stream did not recover within 15 s');
        await a.ingest.ingest(route, { latitude: 13, longitude: 77, recordedAt: Date.now() - 1000 + i });
        await new Promise((r) => setTimeout(r, 250));
      }
      expect(Date.now() - started).toBeLessThan(15_000);
      sub.unsubscribe();
    } finally {
      await a.close();
      await b.close();
    }
  }, 30_000);
});
