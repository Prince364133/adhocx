import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { RedisService } from '../src/redis/redis.service';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '@nestjs/config';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRedis: { set: jest.Mock };

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: RedisService, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue?: any) => defaultValue ?? ''),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should emit and receive real-time SSE event on channel', async () => {
    const stream = service.getEventStream('driver:drv-1');
    const eventPromise = firstValueFrom(stream);

    service.emitEvent('driver:drv-1', 'OFFER_RECEIVED', { offerId: 'ofr-1' });

    const received = await eventPromise;
    expect(received.data.channel).toBe('driver:drv-1');
    expect(received.data.event).toBe('OFFER_RECEIVED');
    expect(received.data.payload).toEqual({ offerId: 'ofr-1' });
  });

  it('should send push notification without error', async () => {
    await expect(service.sendPush('usr-1', 'Ride Update', 'Driver is arriving soon')).resolves.toBeUndefined();
  });

  it('should send trip start OTP', async () => {
    await service.sendTripOtp('+919876543210', '4821');
    // Does not throw
    expect(true).toBe(true);
  });
});
