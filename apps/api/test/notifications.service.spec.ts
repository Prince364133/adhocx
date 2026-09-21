import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationQueueService } from '../src/modules/notifications/notification-queue.service';
import { RedisService } from '../src/redis/redis.service';
import { DatabaseService } from '../src/database/database.service';
import { ConfigService } from '@nestjs/config';
import { DevicePlatform, NotificationType, UserRole } from '@adhocx/contracts';
import { firstValueFrom } from 'rxjs';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let queueService: NotificationQueueService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    mockDb = {
      deviceToken: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tok-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tok-1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { token: 'fcm_token_123', platform: DevicePlatform.ANDROID, isActive: true },
        ]),
      },
      notification: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'notif-1', ...data })),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'notif-1',
            userId: 'usr-1',
            title: 'Trip Confirmed',
            body: 'Your driver is on the way',
            type: NotificationType.TRIP_ASSIGNED,
            data: { tripId: 'trp-1' },
            isRead: false,
            createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pref-1',
          userId: 'usr-1',
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: true,
          tripAlerts: true,
          marketingPromos: true,
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pref-1', ...data })),
        upsert: jest.fn().mockImplementation(({ create, update }) => Promise.resolve({ id: 'pref-1', ...create, ...update })),
      },
      notificationCampaign: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cmp-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'usr-1',
            deviceTokens: [{ platform: DevicePlatform.ANDROID }],
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({ id: 'usr-1', phone: '+919876543210' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationQueueService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'FIREBASE_PROJECT_ID') return 'adhocx-507407';
              return defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    queueService = module.get<NotificationQueueService>(NotificationQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(queueService).toBeDefined();
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

  it('should register a new device token', async () => {
    const result = await service.registerDeviceToken('usr-1', {
      token: 'fcm_tok_abc123',
      platform: DevicePlatform.ANDROID,
      deviceModel: 'Pixel 8',
      appVersion: '1.0.0',
    });

    expect(result).toBeDefined();
    expect(mockDb.deviceToken.create).toHaveBeenCalled();
  });

  it('should send push notification to user and save in-app notification', async () => {
    const result = await service.sendPushToUser('usr-1', {
      title: 'Ride Confirmed',
      body: 'Your driver is arriving in 5 mins',
      type: NotificationType.TRIP_ASSIGNED,
      data: { tripId: 'trip-1' },
      saveInApp: true,
    });

    expect(result.success).toBe(true);
    expect(mockDb.notification.create).toHaveBeenCalled();
  });

  it('should estimate audience reach based on filters', async () => {
    const estimate = await service.estimateAudience({
      role: UserRole.DRIVER,
    });

    expect(estimate.matchingUsers).toBe(1);
    expect(estimate.matchingDevices).toBe(1);
    expect(estimate.platformBreakdown.android).toBe(1);
  });

  it('should broadcast push campaign to filtered audience', async () => {
    const res = await service.broadcastPush(
      {
        title: 'Surge Alert',
        body: 'High demand in your area',
        filter: { role: UserRole.DRIVER },
      },
      'admin-1',
    );

    expect(res.campaignId).toBe('cmp-1');
    expect(res.totalTargetedUsers).toBe(1);
    expect(mockDb.notificationCampaign.create).toHaveBeenCalled();
  });

  it('should retrieve in-app notifications and mark as read', async () => {
    const feed = await service.getUserNotifications('usr-1');
    expect(feed.notifications.length).toBe(1);
    expect(feed.unreadCount).toBe(1);

    const markRes = await service.markAsRead('usr-1', 'notif-1');
    expect(markRes.success).toBe(true);
    expect(mockDb.notification.updateMany).toHaveBeenCalled();
  });

  it('should manage user notification delivery preferences', async () => {
    const pref = await service.getPreferences('usr-1');
    expect(pref.pushEnabled).toBe(true);

    const updated = await service.updatePreferences('usr-1', {
      marketingPromos: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    expect(updated).toBeDefined();
    expect(mockDb.notificationPreference.upsert).toHaveBeenCalled();
  });

  it('should track notification interaction clicks and CTR', async () => {
    const result = await service.trackInteraction('usr-1', 'notif-1');
    expect(result.success).toBe(true);
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isClicked: true }),
      }),
    );
  });

  it('should sanitize unsafe HTML text and deduplicate idempotent keys', async () => {
    const dirty = '<script>alert("hack")</script>Hello <b>World</b>';
    const clean = queueService.sanitizeText(dirty);
    expect(clean).not.toContain('<script>');

    const key = 'trip_offer_123_drv1';
    const isFirstDupe = await queueService.isDuplicate(key, 60);
    expect(isFirstDupe).toBe(false);
  });
});

