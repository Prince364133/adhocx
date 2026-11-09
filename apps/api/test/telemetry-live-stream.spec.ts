import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { lastValueFrom, take, toArray } from 'rxjs';
import { UserRole } from '@adhocx/contracts';
import { allowsQueryToken, JwtAuthGuard } from '../src/common/guards/auth.guard';
import { matchesPattern, RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { CorporateGpsIngestService } from '../src/domains/corporate/tracking/corporate-gps-ingest.service';
import { CorporateTrackingController } from '../src/domains/corporate/tracking/corporate-tracking.controller';
import { CorporateTrackingService } from '../src/domains/corporate/tracking/corporate-tracking.service';
import { CorporateGpsKeys, TelemetryChannels, toLiveTelemetry } from '../src/domains/corporate/tracking/tracking.types';
import { FakeClock, FakeStreamRedis } from './helpers/fake-gps-stream';
import { of } from 'rxjs';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const ROUTE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROUTE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** In-process bus (no Redis), so these tests are deterministic wherever they run. */
async function bus() {
  const saved = { url: process.env.REDIS_URL, host: process.env.REDIS_HOST };
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  try {
    const svc = new RedisPubSubService({ get: () => undefined } as any);
    await svc.onModuleInit();
    expect(svc.isLive()).toBe(false);
    return svc;
  } finally {
    if (saved.url !== undefined) process.env.REDIS_URL = saved.url;
    if (saved.host !== undefined) process.env.REDIS_HOST = saved.host;
  }
}

function collect(svc: RedisPubSubService, channel: string) {
  const got: any[] = [];
  svc.subscribe(channel, (_c, raw) => got.push(JSON.parse(raw)));
  return got;
}

describe('live telemetry: payloads', () => {
  it('derives freshness from the device time and converts m/s to km/h', () => {
    const now = new Date('2026-11-09T10:00:00Z');
    const fix = { latitude: 17.44, longitude: 78.38, speedMps: 10, headingDeg: 350, recordedAt: '2026-11-09T09:59:50Z' };
    const live = toLiveTelemetry({ id: ROUTE_A, tenantId: TENANT_A, status: 'IN_TRANSIT' }, fix, now);
    expect(live).toMatchObject({ routeId: ROUTE_A, tenantId: TENANT_A, speedKph: 36, heading: 350, gpsState: 'LIVE', status: 'IN_TRANSIT' });
    expect(live).not.toHaveProperty('accuracyM'); // not reported: no invented 5 m
    expect(toLiveTelemetry({ id: ROUTE_A, tenantId: TENANT_A }, { ...fix, recordedAt: '2026-11-09T09:58:00Z' }, now).gpsState).toBe('STALE');
    expect(toLiveTelemetry({ id: ROUTE_A, tenantId: TENANT_A }, { ...fix, recordedAt: '2026-11-09T09:50:00Z' }, now).gpsState).toBe('OFFLINE');
  });
});

describe('live telemetry: ingest fan-out', () => {
  it('publishes each accepted fix to the ops, tenant and route channels; out-of-order fixes are not published', async () => {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const pubsub = await bus();
    const ops = collect(pubsub, TelemetryChannels.opsFleet);
    const tenantA = collect(pubsub, TelemetryChannels.tenantFleet(TENANT_A));
    const tenantB = collect(pubsub, TelemetryChannels.tenantFleet(TENANT_B));
    const route = collect(pubsub, TelemetryChannels.route(ROUTE_A));
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any, undefined, pubsub);
    const r = { id: ROUTE_A, tenantId: TENANT_A, driverId: 'drv-1', status: 'IN_TRANSIT' };

    await ingest.ingest(r, { latitude: 17.44, longitude: 78.38, speedMps: 5, recordedAt: clock.ms }, new Date(clock.ms));
    await ingest.ingest(r, { latitude: 17.1, longitude: 78.1, recordedAt: clock.ms - 60_000 }, new Date(clock.ms + 100));
    await new Promise((res) => setImmediate(res));

    expect(ops).toHaveLength(1);
    expect(tenantA).toHaveLength(1);
    expect(route).toHaveLength(1);
    expect(tenantB).toHaveLength(0);
    expect(ops[0]).toMatchObject({ routeId: ROUTE_A, lat: 17.44, speedKph: 18, gpsState: 'LIVE', status: 'IN_TRANSIT', driverId: 'drv-1' });
    await pubsub.onModuleDestroy();
  });
});

describe('live telemetry: fleet snapshot', () => {
  it('returns real cached positions only, scoped to the tenant', async () => {
    const clock = new FakeClock();
    const redis = new FakeStreamRedis(clock);
    const ingest = new CorporateGpsIngestService({ getClient: () => redis } as any);
    await redis.set(CorporateGpsKeys.latest(ROUTE_A), JSON.stringify({ latitude: 17.4, longitude: 78.4, recordedAt: new Date(clock.ms).toISOString() }));
    const findMany = jest.fn(async ({ where }: any) =>
      [
        { id: ROUTE_A, tenantId: TENANT_A, status: 'IN_TRANSIT', driverId: 'd1', driver: { fullName: 'Ravi' } },
        { id: ROUTE_B, tenantId: TENANT_A, status: 'ASSIGNED', driverId: 'd2', driver: null }, // no GPS yet
      ].filter((r) => !where.tenantId || r.tenantId === where.tenantId),
    );
    const svc = new CorporateTrackingService({ corporateRoute: { findMany } } as any, ingest);

    const snap = await svc.getFleetSnapshot({ tenantId: TENANT_A }, new Date(clock.ms + 5_000));
    expect(snap).toEqual([expect.objectContaining({ routeId: ROUTE_A, driverName: 'Ravi', lat: 17.4, gpsState: 'LIVE' })]);
    expect(findMany.mock.calls[0][0].where.tenantId).toBe(TENANT_A);

    // A tenant-bound caller without a tenant matches nothing (never "all tenants").
    await svc.getFleetSnapshot({ tenantId: null });
    expect(findMany.mock.calls[1][0].where.tenantId).toBe('__none__');
  });
});

describe('live telemetry: SSE endpoints', () => {
  function controller(pubsub: RedisPubSubService) {
    return new CorporateTrackingController({} as any, pubsub);
  }
  const req = (role: string, corporateTenantId?: string | null) => ({ user: { role, corporateTenantId }, res: { setHeader: jest.fn() } });

  it('corporate admins only receive their own tenant; ops receive the whole fleet', async () => {
    const pubsub = await bus();
    const c = controller(pubsub);
    const admin$ = c.streamFleetTelemetry(req(UserRole.CORPORATE_ADMIN, TENANT_A));
    const ops$ = c.streamFleetTelemetry(req(UserRole.OPS));
    const adminGot = lastValueFrom(admin$.pipe(take(1), toArray()));
    const opsGot = lastValueFrom(ops$.pipe(take(2), toArray()));
    await new Promise((r) => setImmediate(r));

    const fixB = { routeId: ROUTE_B, tenantId: TENANT_B };
    const fixA = { routeId: ROUTE_A, tenantId: TENANT_A };
    await pubsub.publish(TelemetryChannels.opsFleet, fixB);
    await pubsub.publish(TelemetryChannels.tenantFleet(TENANT_B), fixB);
    await pubsub.publish(TelemetryChannels.opsFleet, fixA);
    await pubsub.publish(TelemetryChannels.tenantFleet(TENANT_A), fixA);

    expect((await adminGot).map((e: any) => e.data)).toEqual([fixA]);
    expect((await opsGot).map((e: any) => e.data)).toEqual([fixB, fixA]);
    await pubsub.onModuleDestroy();
  });

  it('a corporate account without a tenant is refused instead of seeing every tenant', async () => {
    const pubsub = await bus();
    expect(() => controller(pubsub).streamFleetTelemetry(req(UserRole.CORPORATE_ADMIN, null))).toThrow(ForbiddenException);
    await pubsub.onModuleDestroy();
  });

  it('sends heartbeats and unsubscribes when the client disconnects', async () => {
    jest.useFakeTimers();
    try {
      const pubsub = await bus();
      const r = req(UserRole.OPS);
      const events: any[] = [];
      const sub = controller(pubsub).streamRouteTelemetry(r, ROUTE_A).subscribe((e) => events.push(e));
      jest.advanceTimersByTime(25_000);
      expect(events).toEqual([{ type: 'heartbeat', data: '{}' }]);

      sub.unsubscribe();
      await Promise.resolve();
      await pubsub.publish(TelemetryChannels.route(ROUTE_A), { routeId: ROUTE_A });
      jest.advanceTimersByTime(60_000);
      expect(events).toHaveLength(1);
      await pubsub.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('live telemetry: token in URL only for live streams', () => {
  it('accepts ?access_token only on GET .../live-stream', () => {
    expect(allowsQueryToken({ method: 'GET', path: '/api/v1/corporate/trips/routes/fleet/live-stream' })).toBe(true);
    expect(allowsQueryToken({ method: 'GET', path: '/api/v1/corporate/trips/routes/abc/live-stream' })).toBe(true);
    expect(allowsQueryToken({ method: 'GET', path: '/api/v1/admin/users' })).toBe(false);
    expect(allowsQueryToken({ method: 'POST', path: '/api/v1/corporate/trips/routes/fleet/live-stream' })).toBe(false);
  });

  it('the guard rejects a query token on ordinary endpoints and accepts it on a stream', async () => {
    const jwt = { verifyAsync: jest.fn(async () => ({ sub: 'u1', role: 'OPS' })) };
    const guard = new JwtAuthGuard(jwt as any, { get: () => 'secret' } as any);
    const ctx = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

    await expect(guard.canActivate(ctx({ method: 'GET', path: '/api/v1/admin/users', headers: {}, query: { token: 't' } }))).rejects.toThrow(
      UnauthorizedException,
    );
    const ok = { method: 'GET', path: '/api/v1/corporate/trips/routes/fleet/live-stream', headers: {}, query: { access_token: 't' } } as any;
    await expect(guard.canActivate(ctx(ok))).resolves.toBe(true);
    expect(ok.user.id).toBe('u1');
  });
});

describe('RedisPubSubService fallback patterns', () => {
  it('uses Redis glob rules (only * and ? are wildcards)', () => {
    expect(matchesPattern('telemetry:route:*', 'telemetry:route:abc')).toBe(true);
    expect(matchesPattern('telemetry:route:*', 'telemetry:trip:abc')).toBe(false);
    expect(matchesPattern('a.b:*', 'axb:1')).toBe(false);
    expect(matchesPattern('r?', 'r1')).toBe(true);
  });
});

/**
 * Against a real Redis (skipped when none is reachable on REDIS_URL / localhost:6379): messages
 * cross connections, and a dropped subscriber connection comes back with its subscriptions.
 */
describe('RedisPubSubService with a real Redis', () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  let available = false;
  beforeAll(async () => {
    const net = await import('net');
    const u = new URL(url);
    available = await new Promise<boolean>((resolve) => {
      const sock = net.connect(Number(u.port || 6379), u.hostname);
      sock.once('connect', () => (sock.end(), resolve(true)));
      sock.once('error', () => resolve(false));
      setTimeout(() => (sock.destroy(), resolve(false)), 1000);
    });
  });

  const waitFor = async (cond: () => boolean, ms = 5000) => {
    const end = Date.now() + ms;
    while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
    return cond();
  };

  it('delivers across instances and resubscribes after the subscriber connection drops', async () => {
    if (!available) return; // no local Redis: covered by the in-process tests above
    const cfg: any = { get: (k: string) => (k === 'redis.url' ? url : undefined) };
    const a = new RedisPubSubService(cfg);
    const b = new RedisPubSubService(cfg);
    await Promise.all([a.onModuleInit(), b.onModuleInit()]);
    try {
      expect(a.isLive() && b.isLive()).toBe(true);
      const channel = `telemetry:test:${Date.now()}`;
      const got: string[] = [];
      await b.subscribe(channel, (_c, raw) => got.push(raw));

      await a.publish(channel, { n: 1 });
      expect(await waitFor(() => got.length === 1)).toBe(true);

      // Simulate a network drop on b's subscriber connection.
      (b as any).subClient.disconnect(true);
      expect(await waitFor(() => !b.isLive(), 2000)).toBe(true);
      expect(await waitFor(() => b.isLive(), 15000)).toBe(true);
      await new Promise((r) => setTimeout(r, 200)); // let the re-SUBSCRIBE land

      await a.publish(channel, { n: 2 });
      expect(await waitFor(() => got.length === 2)).toBe(true);
      expect(JSON.parse(got[1])).toEqual({ n: 2 });
    } finally {
      await Promise.all([a.onModuleDestroy(), b.onModuleDestroy()]);
    }
  }, 30000);
});

describe('response envelope and SSE', () => {
  const ctxFor = (handler: any) => ({ getHandler: () => handler }) as any;
  it('does not wrap Server-Sent Events, but still wraps normal JSON responses', async () => {
    const interceptor = new TransformInterceptor();
    const event = { data: { routeId: ROUTE_A } };
    const sse = await lastValueFrom(
      interceptor.intercept(ctxFor(CorporateTrackingController.prototype.streamFleetTelemetry), { handle: () => of(event) }),
    );
    expect(sse).toBe(event);
    const json: any = await lastValueFrom(
      interceptor.intercept(ctxFor(CorporateTrackingController.prototype.getFleetSnapshot), { handle: () => of([1]) }),
    );
    expect(json).toMatchObject({ success: true, data: [1] });
  });
});
