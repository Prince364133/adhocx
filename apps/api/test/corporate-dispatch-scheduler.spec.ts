import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('CorporateDispatchSchedulerService', () => {
  let scheduler: CorporateDispatchSchedulerService;
  let mockDb: any;
  let mockDispatchService: any;
  let mockNotifications: any;
  let mockAudit: any;
  let mockRedis: any;
  let redisStorage: Map<string, string>;
  let redisSets: Map<string, Set<string>>;

  beforeEach(() => {
    redisStorage = new Map();
    redisSets = new Map();

    const mockRedisClient = {
      get: jest.fn(async (key: string) => redisStorage.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStorage.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        redisStorage.delete(key);
        return 1;
      }),
      smembers: jest.fn(async (key: string) => {
        const s = redisSets.get(key);
        return s ? Array.from(s) : [];
      }),
      sadd: jest.fn(async (key: string, member: string) => {
        if (!redisSets.has(key)) redisSets.set(key, new Set());
        redisSets.get(key)!.add(member);
        return 1;
      }),
      srem: jest.fn(async (key: string, member: string) => {
        const s = redisSets.get(key);
        if (s) s.delete(member);
        return 1;
      }),
    };

    mockRedis = {
      getClient: jest.fn(() => mockRedisClient),
    };

    mockDb = {
      corporateRoute: {
        findMany: jest.fn(),
      },
    };

    mockDispatchService = {
      assessDynamicTraffic: jest.fn(),
      dispatchRoute: jest.fn(),
      rejectRouteOffer: jest.fn(),
    };

    mockNotifications = {
      emitEvent: jest.fn(),
    };

    mockAudit = {
      log: jest.fn(),
    };

    scheduler = new CorporateDispatchSchedulerService(
      mockDb as unknown as DatabaseService,
      mockDispatchService as unknown as CorporateDispatchService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
      mockRedis as unknown as RedisService,
    );
  });

  describe('Autonomous Dispatch Evaluation', () => {
    it('should automatically trigger dispatch when route pickup1Time is within 60 minutes', async () => {
      const now = new Date('2026-11-03T07:05:00.000Z');
      const pickupTime = new Date('2026-11-03T08:00:00.000Z'); // 55 mins away (< 60m lead)

      const mockRoute = {
        id: 'route-auto-1',
        direction: 'LOGIN',
        status: 'PLANNED',
        targetPickup1Time: pickupTime,
        tenant: { name: 'Acme Corp' },
      };

      mockDb.corporateRoute.findMany.mockResolvedValue([mockRoute]);
      mockDispatchService.assessDynamicTraffic.mockResolvedValue({
        routeId: 'route-auto-1',
        adjustedDispatchTime: new Date('2026-11-03T07:00:00.000Z'), // 5 minutes in the past
        trafficDelayMinutes: 0,
      });
      mockDispatchService.dispatchRoute.mockResolvedValue({ status: 'OFFERED' });

      const result = await scheduler.tick(now.getTime());

      expect(mockDb.corporateRoute.findMany).toHaveBeenCalled();
      expect(mockDispatchService.assessDynamicTraffic).toHaveBeenCalledWith('route-auto-1');
      expect(mockDispatchService.dispatchRoute).toHaveBeenCalledWith('route-auto-1', false);
      expect(result.dispatchedRoutes).toContain('route-auto-1');
      expect(result.evaluatedRoutesCount).toBe(1);
    });

    it('should advance dispatch time and fire early if DDA detected severe congestion (>=30m delay)', async () => {
      const now = new Date('2026-11-03T06:25:00.000Z');
      const pickupTime = new Date('2026-11-03T08:00:00.000Z'); // 95 mins away, normally dispatches at 07:00

      const mockRoute = {
        id: 'route-congested-1',
        direction: 'LOGIN',
        status: 'PLANNED',
        targetPickup1Time: pickupTime,
        tenant: { name: 'Acme Tech' },
      };

      mockDb.corporateRoute.findMany.mockResolvedValue([mockRoute]);
      // DDA 35m delay advances dispatch from 07:00 to 06:25
      mockDispatchService.assessDynamicTraffic.mockResolvedValue({
        routeId: 'route-congested-1',
        adjustedDispatchTime: new Date('2026-11-03T06:25:00.000Z'),
        trafficDelayMinutes: 35,
        isAdvanced: true,
      });
      mockDispatchService.dispatchRoute.mockResolvedValue({ status: 'OFFERED' });

      const result = await scheduler.tick(now.getTime());

      expect(mockDispatchService.dispatchRoute).toHaveBeenCalledWith('route-congested-1', false);
      expect(result.dispatchedRoutes).toContain('route-congested-1');
    });

    it('should NOT dispatch routes whose lead time has not yet arrived', async () => {
      const now = new Date('2026-11-03T06:00:00.000Z');
      const pickupTime = new Date('2026-11-03T08:00:00.000Z'); // 120 mins away

      const mockRoute = {
        id: 'route-far-future',
        direction: 'LOGIN',
        status: 'PLANNED',
        targetPickup1Time: pickupTime,
        tenant: { name: 'Acme Future' },
      };

      mockDb.corporateRoute.findMany.mockResolvedValue([mockRoute]);
      mockDispatchService.assessDynamicTraffic.mockResolvedValue({
        routeId: 'route-far-future',
        adjustedDispatchTime: new Date('2026-11-03T07:00:00.000Z'), // Still 1 hour away
        trafficDelayMinutes: 0,
      });

      const result = await scheduler.tick(now.getTime());

      expect(mockDispatchService.dispatchRoute).not.toHaveBeenCalled();
      expect(result.dispatchedRoutes).toEqual([]);
    });
  });

  describe('60-Second Offer Timeout Reaper', () => {
    it('should reap expired offers when Redis TTL has elapsed and trigger cascade', async () => {
      const now = Date.now();
      const routeId = 'route-timeout-1';
      const driverId = 'driver-sleeping-1';

      // Setup active offer set
      redisSets.set('corporate:active_offers_set', new Set([routeId]));
      // Offer key in Redis is expired (null)
      redisStorage.delete(`corporate:route:offer:${routeId}`);
      // Fallback driver key is present
      redisStorage.set(`corporate:offer_driver:${routeId}`, driverId);

      mockDb.corporateRoute.findMany.mockResolvedValue([]);
      mockDispatchService.rejectRouteOffer.mockResolvedValue(undefined);

      const result = await scheduler.tick(now);

      expect(mockDispatchService.rejectRouteOffer).toHaveBeenCalledWith(
        routeId,
        driverId,
        'OFFER_TIMEOUT_EXPIRED',
      );
      expect(result.reapedOffers).toContain(routeId);
    });

    it('should reap offer if offerExpiresAt has passed in timestamp', async () => {
      const now = new Date('2026-11-03T07:01:05.000Z').getTime();
      const routeId = 'route-timeout-2';
      const driverId = 'driver-busy-2';

      const offerData = {
        routeId,
        driverId,
        offerExpiresAt: new Date('2026-11-03T07:01:00.000Z').toISOString(), // 5 seconds ago
      };

      redisSets.set('corporate:active_offers_set', new Set([routeId]));
      redisStorage.set(`corporate:route:offer:${routeId}`, JSON.stringify(offerData));

      mockDb.corporateRoute.findMany.mockResolvedValue([]);
      mockDispatchService.rejectRouteOffer.mockResolvedValue(undefined);

      const result = await scheduler.tick(now);

      expect(mockDispatchService.rejectRouteOffer).toHaveBeenCalledWith(
        routeId,
        driverId,
        'OFFER_TIMEOUT_EXPIRED',
      );
      expect(result.reapedOffers).toContain(routeId);
    });

    it('should NOT reap fresh offers within the 60-second window', async () => {
      const now = new Date('2026-11-03T07:00:20.000Z').getTime();
      const routeId = 'route-fresh-1';
      const driverId = 'driver-thinking-1';

      const offerData = {
        routeId,
        driverId,
        offerExpiresAt: new Date('2026-11-03T07:01:00.000Z').toISOString(), // 40 seconds remaining
      };

      redisSets.set('corporate:active_offers_set', new Set([routeId]));
      redisStorage.set(`corporate:route:offer:${routeId}`, JSON.stringify(offerData));

      mockDb.corporateRoute.findMany.mockResolvedValue([]);

      const result = await scheduler.tick(now);

      expect(mockDispatchService.rejectRouteOffer).not.toHaveBeenCalled();
      expect(result.reapedOffers).toEqual([]);
    });
  });
});

