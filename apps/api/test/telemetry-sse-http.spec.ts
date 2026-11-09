import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import { UserRole } from '@adhocx/contracts';
import { CorporateTrackingController } from '../src/domains/corporate/tracking/corporate-tracking.controller';
import { CorporateTrackingService } from '../src/domains/corporate/tracking/corporate-tracking.service';
import { TelemetryChannels } from '../src/domains/corporate/tracking/tracking.types';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Over real HTTP with the app's global response interceptor: the browser's EventSource must get
 * `data: <telemetry JSON>` frames (not the JSON envelope) and named heartbeat events.
 */
describe('fleet live stream over HTTP (SSE wire format)', () => {
  let app: INestApplication;
  let pubsub: RedisPubSubService;
  let port: number;

  beforeAll(async () => {
    const saved = { url: process.env.REDIS_URL, host: process.env.REDIS_HOST };
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    const asOps = { canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().user = { id: 'u1', role: UserRole.OPS }), true) };
    const moduleRef = await Test.createTestingModule({
      controllers: [CorporateTrackingController],
      providers: [
        { provide: CorporateTrackingService, useValue: { getFleetSnapshot: async () => [{ routeId: 'r1' }] } },
        { provide: RedisPubSubService, useFactory: async () => {
          const s = new RedisPubSubService({ get: () => undefined } as any);
          await s.onModuleInit();
          return s;
        } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(asOps)
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(CorporateAccessGuard).useValue({ canActivate: () => true })
      .compile();
    if (saved.url !== undefined) process.env.REDIS_URL = saved.url;
    if (saved.host !== undefined) process.env.REDIS_HOST = saved.host;

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0);
    port = (app.getHttpServer().address() as any).port;
    pubsub = app.get(RedisPubSubService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('streams raw telemetry frames; the snapshot endpoint keeps the JSON envelope', async () => {
    const body = await new Promise<string>((resolve, reject) => {
      const req = http.get({ port, path: '/corporate/trips/routes/fleet/live-stream' }, (res) => {
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        expect(res.headers['x-accel-buffering']).toBe('no');
        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          if (buf.includes('"recordedAt":2') && buf.lastIndexOf('\n\n') > buf.indexOf('"recordedAt":2')) {
            req.destroy();
            resolve(buf);
          }
        });
      });
      req.on('error', (e: any) => (e.code === 'ECONNRESET' ? undefined : reject(e)));
      // Publish until the stream has subscribed (on a loaded machine the request can take a while).
      const pump = setInterval(() => {
        void pubsub.publish(TelemetryChannels.opsFleet, { routeId: 'r2', lat: 17.0, lng: 78.0, recordedAt: 1 });
        void pubsub.publish(TelemetryChannels.opsFleet, { routeId: 'r2', lat: 17.4, lng: 78.4, recordedAt: 2 });
      }, 200);
      req.on('close', () => clearInterval(pump));
    });
    // One `fixes` event carrying the conflated batch (newest fix per route).
    const lines = body.split('\n');
    const eventIdx = lines.findIndex((l) => l.trim() === 'event: fixes');
    expect(eventIdx).toBeGreaterThanOrEqual(0);
    const dataLine = lines.slice(eventIdx).find((l) => l.startsWith('data:'))!;
    expect(JSON.parse(dataLine.slice(5))).toEqual([{ routeId: 'r2', lat: 17.4, lng: 78.4, recordedAt: 2 }]);
    expect(body).not.toContain('"success"');

    const snap = await new Promise<any>((resolve) =>
      http.get({ port, path: '/corporate/trips/routes/fleet/live' }, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      }),
    );
    expect(snap).toMatchObject({ success: true, data: [{ routeId: 'r1' }] });
  }, 15000);
});
