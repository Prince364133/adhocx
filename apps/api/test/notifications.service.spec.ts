import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { RedisService } from '../src/redis/redis.service';
import { firstValueFrom } from 'rxjs';

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
    expect(received.data.eventName).toBe('OFFER_RECEIVED');
    expect(received.data.data).toEqual({ offerId: 'ofr-1' });
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it('should send push notification', async () => {
    await service.sendPush('usr-1', 'Ride Update', 'Driver is arriving soon');
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it('should send trip start OTP', async () => {
    await service.sendTripOtp('+919876543210', '4821');
    // Does not throw
    expect(true).toBe(true);
  });
});
