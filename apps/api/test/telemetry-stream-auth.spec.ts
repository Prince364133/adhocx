import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RedisService } from '../src/redis/redis.service';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { StreamTicketService } from '../src/redis/stream-ticket.service';
import { AUTH_REVOCATIONS_CHANNEL, hashToken } from '../src/redis/auth-revocation';
import { redisTlsOptions } from '../src/redis/redis-tls';
import { TelemetryStreamHub } from '../src/domains/corporate/tracking/telemetry-stream-hub';
import { CorporateTrackingController } from '../src/domains/corporate/tracking/corporate-tracking.controller';

const STREAM = '/api/v1/corporate/trips/routes/fleet/live-stream';
const ctx = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;
const future = () => Math.floor(Date.now() / 1000) + 3600;

/** In-process stores only: no Redis connection is attempted (onModuleInit is not called). */
function stores() {
  const redis = new RedisService({ get: () => undefined } as any);
  const tickets = new StreamTicketService(redis);
  return { redis, tickets };
}

async function bus(): Promise<RedisPubSubService> {
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

describe('stream tickets', () => {
  it('a ticket opens exactly one stream and carries the caller identity', async () => {
    const { redis, tickets } = stores();
    const jwt = { verifyAsync: jest.fn() };
    const guard = new JwtAuthGuard(jwt as any, { get: () => 'secret' } as any, redis, tickets);
    const { ticket, expiresAt } = await tickets.issue({ sub: 'u1', role: 'OPS', exp: future() }, 'access-token-1');
    expect(ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());

    const req: any = { method: 'GET', path: STREAM, headers: {}, query: { ticket } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toMatchObject({ id: 'u1', role: 'OPS' });
    expect(req.user).not.toHaveProperty('tokenHash');
    expect(req.streamTokenHash).toBe(hashToken('access-token-1'));
    expect(jwt.verifyAsync).not.toHaveBeenCalled();

    // replay
    await expect(guard.canActivate(ctx({ ...req, user: undefined }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unknown tickets, tickets on ordinary endpoints, expired tokens and revoked users', async () => {
    const { redis, tickets } = stores();
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn() } as any, { get: () => 'secret' } as any, redis, tickets);
    await expect(guard.canActivate(ctx({ method: 'GET', path: STREAM, headers: {}, query: { ticket: 'nope' } }))).rejects.toThrow(
      UnauthorizedException,
    );

    const t1 = (await tickets.issue({ sub: 'u1', role: 'OPS', exp: future() }, 'a')).ticket;
    await expect(guard.canActivate(ctx({ method: 'GET', path: '/api/v1/admin/users', headers: {}, query: { ticket: t1 } }))).rejects.toThrow(
      UnauthorizedException,
    );

    const t2 = (await tickets.issue({ sub: 'u1', role: 'OPS', exp: Math.floor(Date.now() / 1000) - 1 }, 'a')).ticket;
    await expect(guard.canActivate(ctx({ method: 'GET', path: STREAM, headers: {}, query: { ticket: t2 } }))).rejects.toThrow(/expired/);

    const t3 = (await tickets.issue({ sub: 'u2', role: 'OPS', exp: future() }, 'b')).ticket;
    await redis.set('user_revoked:u2', '1', 60);
    await expect(guard.canActivate(ctx({ method: 'GET', path: STREAM, headers: {}, query: { ticket: t3 } }))).rejects.toThrow(/revoked/);
  });

  it('stores only a hash of the ticket', async () => {
    const { redis, tickets } = stores();
    const { ticket } = await tickets.issue({ sub: 'u1' }, 'a');
    expect(await redis.get(`sse:ticket:${ticket}`)).toBeNull();
    expect(await redis.get(`sse:ticket:${hashToken(ticket)}`)).not.toBeNull();
  });

  it('the ticket endpoint requires a bearer access token (not another ticket)', async () => {
    const { tickets } = stores();
    const ctrl = new CorporateTrackingController({} as any, await bus(), undefined, tickets);
    await expect(ctrl.issueStreamTicket({ user: { sub: 'u1' } })).rejects.toThrow(UnauthorizedException);
    const out = await ctrl.issueStreamTicket({ user: { sub: 'u1', role: 'OPS' }, accessToken: 'tok' });
    expect(out.ticket).toBeTruthy();
    expect(await tickets.consume(out.ticket)).toMatchObject({ sub: 'u1', tokenHash: hashToken('tok') });
  });

  it('a bearer request records the token hash for revocation matching', async () => {
    const jwt = { verifyAsync: jest.fn(async () => ({ sub: 'u1', role: 'OPS' })) };
    const guard = new JwtAuthGuard(jwt as any, { get: () => 'secret' } as any);
    const req: any = { method: 'GET', path: STREAM, headers: { authorization: 'Bearer tok' }, query: {} };
    await guard.canActivate(ctx(req));
    expect(req.accessToken).toBe('tok');
    expect(req.streamTokenHash).toBe(hashToken('tok'));
  });
});

describe('live streams close on session revocation', () => {
  function open(hub: TelemetryStreamHub, ctxIn: any) {
    const events: any[] = [];
    let done = false;
    const sub = hub.openFleetStream('telemetry:ops:fleet', ctxIn).subscribe({ next: (e) => events.push(e), complete: () => (done = true) });
    return { events, isDone: () => done, sub };
  }

  it('logout (token hash) closes that session only; suspension (user id) closes all of the user', async () => {
    const pubsub = await bus();
    const hub = new TelemetryStreamHub(pubsub);
    const a1 = open(hub, { userId: 'u1', tokenHash: 'h1', tokenExpSec: future() });
    const a2 = open(hub, { userId: 'u1', tokenHash: 'h2', tokenExpSec: future() });
    const b = open(hub, { userId: 'u2', tokenHash: 'h3', tokenExpSec: future() });

    await pubsub.publish(AUTH_REVOCATIONS_CHANNEL, { tokenHash: 'h1' });
    expect(a1.isDone()).toBe(true);
    expect(a1.events.at(-1)).toEqual({ type: 'reauth', data: { reason: 'REVOKED' } });
    expect(a2.isDone()).toBe(false);

    await pubsub.publish(AUTH_REVOCATIONS_CHANNEL, { userId: 'u1' });
    expect(a2.isDone()).toBe(true);
    expect(b.isDone()).toBe(false);
    expect(hub.stats().streamsByUser).toBe(1);

    b.sub.unsubscribe();
    hub.onModuleDestroy();
    await pubsub.onModuleDestroy();
  });

  it('a revoked stream gets no final batch', async () => {
    jest.useFakeTimers();
    try {
      const pubsub = await bus();
      const hub = new TelemetryStreamHub(pubsub);
      const s = open(hub, { userId: 'u1', tokenHash: 'h1', tokenExpSec: future() });
      await pubsub.publish('telemetry:ops:fleet', { routeId: 'r1', recordedAt: 1 });
      await pubsub.publish(AUTH_REVOCATIONS_CHANNEL, { userId: 'u1' });
      expect(s.events.map((e) => e.type)).toEqual(['reauth']);
      hub.onModuleDestroy();
      await pubsub.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('RedisService announces logouts and suspensions on the revocation channel', async () => {
    const pubsub = await bus();
    const got: any[] = [];
    await pubsub.subscribe(AUTH_REVOCATIONS_CHANNEL, (_c, raw) => got.push(JSON.parse(raw)));
    const redis = new RedisService({ get: () => undefined } as any, pubsub);
    await redis.blacklistToken('tok', 60);
    await redis.revokeUserSessions('u9');
    await new Promise((r) => setImmediate(r));
    expect(got).toEqual([{ tokenHash: hashToken('tok') }, { userId: 'u9' }]);
    await pubsub.onModuleDestroy();
  });
});

describe('Redis TLS options', () => {
  it('verifies certificates by default and only opts out explicitly (with a warning)', () => {
    expect(redisTlsOptions(false, {})).toBeUndefined();
    expect(redisTlsOptions(true, {})).toEqual({ rejectUnauthorized: true });
    const warn = jest.fn();
    expect(redisTlsOptions(true, { REDIS_TLS_REJECT_UNAUTHORIZED: 'false' }, warn)).toEqual({ rejectUnauthorized: false });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/DISABLED/));
  });

  it('accepts an inline CA and a servername', () => {
    const pem = '-----BEGIN CERTIFICATE-----\\nAAA\\n-----END CERTIFICATE-----';
    const opts = redisTlsOptions(true, { REDIS_TLS_CA: pem, REDIS_TLS_SERVERNAME: 'redis.internal' });
    expect(opts).toMatchObject({ rejectUnauthorized: true, servername: 'redis.internal' });
    expect(String(opts!.ca)).toContain('\nAAA\n');
  });
});

describe('RedisModule wiring', () => {
  it('Nest injects the Pub/Sub service into RedisService (revocations reach other pods) and provides tickets', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ConfigModule } = await import('@nestjs/config');
    const { RedisModule } = await import('../src/redis/redis.module');
    const mod = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }), RedisModule] }).compile();
    expect((mod.get(RedisService) as any).pubsub).toBe(mod.get(RedisPubSubService));
    expect(mod.get(StreamTicketService)).toBeInstanceOf(StreamTicketService);
    await mod.close();
  });
});

describe('publisher-side batching', () => {
  const saved = process.env.TELEMETRY_PUBLISH_BATCH_MS;
  afterEach(() => {
    if (saved === undefined) delete process.env.TELEMETRY_PUBLISH_BATCH_MS;
    else process.env.TELEMETRY_PUBLISH_BATCH_MS = saved;
  });

  it('defaults to 100 ms outside tests and 0 (off) under NODE_ENV=test; env overrides', () => {
    const { publishBatchMs } = require('../src/redis/redis-pubsub.service');
    expect(publishBatchMs({ NODE_ENV: 'production' })).toBe(100);
    expect(publishBatchMs({ NODE_ENV: 'test' })).toBe(0);
    expect(publishBatchMs({ NODE_ENV: 'production', TELEMETRY_PUBLISH_BATCH_MS: '0' })).toBe(0);
    expect(publishBatchMs({ NODE_ENV: 'production', TELEMETRY_PUBLISH_BATCH_MS: '250' })).toBe(250);
  });

  it('publishes one array per channel per window, and the hub unpacks it into fixes', async () => {
    jest.useFakeTimers();
    try {
      process.env.TELEMETRY_PUBLISH_BATCH_MS = '100';
      const pubsub = await bus();
      const raw: string[] = [];
      await pubsub.subscribe('telemetry:ops:fleet', (_c, m) => raw.push(m));
      const hub = new TelemetryStreamHub(pubsub);
      const events: any[] = [];
      const sub = hub.openRouteStream('telemetry:ops:fleet', { userId: 'u1' }).subscribe((e) => events.push(e));

      for (let i = 0; i < 5; i++) pubsub.publishBatched('telemetry:ops:fleet', { routeId: `r${i}`, recordedAt: i });
      expect(raw).toHaveLength(0);
      await jest.advanceTimersByTimeAsync(100);
      expect(raw).toHaveLength(1);
      expect(JSON.parse(raw[0])).toHaveLength(5);
      expect(events.filter((e) => !e.type).map((e) => e.data.routeId)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);

      sub.unsubscribe();
      hub.onModuleDestroy();
      await pubsub.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('flushes early at 2000 items and on shutdown (nothing buffered is lost)', async () => {
    jest.useFakeTimers();
    try {
      process.env.TELEMETRY_PUBLISH_BATCH_MS = '100';
      const pubsub = await bus();
      const raw: string[] = [];
      await pubsub.subscribe('c', (_c, m) => raw.push(m));
      for (let i = 0; i < 2001; i++) pubsub.publishBatched('c', { i });
      await Promise.resolve();
      expect(raw).toHaveLength(1);
      expect(JSON.parse(raw[0])).toHaveLength(2000);
      const stop = pubsub.onModuleDestroy();
      await jest.runAllTimersAsync();
      await stop;
      expect(raw).toHaveLength(2);
      expect(JSON.parse(raw[1])).toEqual([{ i: 2000 }]);
    } finally {
      jest.useRealTimers();
    }
  });
});
