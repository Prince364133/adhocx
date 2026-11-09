import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('RedisPubSubService', () => {
  let service: RedisPubSubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPubSubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string) => undefined),
          },
        },
      ],
    }).compile();

    service = module.get<RedisPubSubService>(RedisPubSubService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined and initialized', () => {
    expect(service).toBeDefined();
    expect(typeof service.isLive()).toBe('boolean');
  });

  it('should deliver published messages to subscribed channel handlers', async () => {
    const received: string[] = [];
    const handler = (channel: string, message: string) => {
      received.push(`${channel}:${message}`);
    };

    await service.subscribe('telemetry:ops:fleet', handler);
    await service.publish('telemetry:ops:fleet', { routeId: 'rt-1', lat: 17.44, lng: 78.37 });

    await delay(100);

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toContain('telemetry:ops:fleet');
    expect(received[0]).toContain('rt-1');

    await service.unsubscribe('telemetry:ops:fleet', handler);
  });

  it('should stop delivering messages after unsubscribing', async () => {
    let callCount = 0;
    const handler = () => {
      callCount++;
    };

    await service.subscribe('telemetry:route:123', handler);
    await service.publish('telemetry:route:123', { test: true });
    await delay(100);
    expect(callCount).toBe(1);

    await service.unsubscribe('telemetry:route:123', handler);
    await service.publish('telemetry:route:123', { test: true });
    await delay(100);
    expect(callCount).toBe(1); // No increment after unsubscribe
  });

  it('should deliver messages matching glob patterns in psubscribe', async () => {
    const matched: string[] = [];
    const patternHandler = (channel: string, _message: string) => {
      matched.push(channel);
    };

    await service.psubscribe('telemetry:route:*', patternHandler);

    await service.publish('telemetry:route:alpha', { id: 'alpha' });
    await service.publish('telemetry:route:beta', { id: 'beta' });
    await service.publish('telemetry:ops:fleet', { id: 'fleet' }); // Should NOT match

    await delay(100);

    expect(matched).toContain('telemetry:route:alpha');
    expect(matched).toContain('telemetry:route:beta');
    expect(matched).not.toContain('telemetry:ops:fleet');

    await service.punsubscribe('telemetry:route:*', patternHandler);
  });
});
