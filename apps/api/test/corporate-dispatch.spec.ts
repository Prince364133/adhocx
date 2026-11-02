import { Test, TestingModule } from '@nestjs/testing';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { LocationsService } from '../src/modules/locations/locations.service';
import { attachSortedSets } from './helpers/fake-sorted-sets';

describe('Corporate Autonomous Dispatch & Dynamic Traffic Advancer (DDA)', () => {
  let dispatchService: CorporateDispatchService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(55),
    smembers: jest.fn().mockResolvedValue([]),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };

  const mockRedis = {
    acquireLockToken: jest.fn().mockResolvedValue('test-lock-token'),
    releaseLockToken: jest.fn().mockResolvedValue(true),
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };
  attachSortedSets(mockRedisClient, mockRedis);

  const mockDb: any = {
    corporateRoute: {
      findUnique: jest.fn(),
      update: jest.fn(),
      // Busy-driver check: by default nobody is committed to another route.
      findMany: jest.fn().mockResolvedValue([]),
    },
    corporateDriverEarning: {
      create: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockDb))),
  };

  const mockNotifications = {
    emitEvent: jest.fn(),
    sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockLocationsService = {
    findNearbyDrivers: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateDispatchService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    dispatchService = module.get<CorporateDispatchService>(CorporateDispatchService);
  });

  describe('Dynamic Traffic Advancer (DDA)', () => {
    it('should detect severe congestion and advance dispatch schedule by 35 minutes for peak-hour routes', async () => {
      const targetPickup1Time = new Date('2026-11-10T06:30:00+05:30');
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-peak-1',
        targetPickup1Time,
        estDistanceMeters: 38000, // 38 km commute corridor
        direction: 'LOGIN',
        stops: [{ stopSequence: 1, latitude: 17.50, longitude: 78.35 }],
      });

      // Target pickup is at 07:30 AM (peak hour)
      const peakPickupTime = new Date('2026-11-10T07:30:00+05:30');
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-peak-1',
        targetPickup1Time: peakPickupTime,
        estDistanceMeters: 38000,
        direction: 'LOGIN',
        stops: [{ stopSequence: 1, latitude: 17.50, longitude: 78.35 }],
      });

      const assessment = await dispatchService.assessDynamicTraffic('route-peak-1');

      expect(assessment.isAdvanced).toBe(true);
      expect(assessment.congestionLevel).toBe('SEVERE');
      expect(assessment.trafficDelayMinutes).toBe(35);
      expect(assessment.adjustedDispatchTime.getTime()).toBeLessThan(
        assessment.standardDispatchTime.getTime(),
      );
    });

    it('should maintain standard 60-minute dispatch lead time for non-peak optimal routes', async () => {
      const nonPeakTime = new Date('2026-11-10T12:00:00+05:30');
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-midday',
        targetPickup1Time: nonPeakTime,
        estDistanceMeters: 15000,
        direction: 'LOGIN',
        stops: [{ stopSequence: 1, latitude: 17.44, longitude: 78.38 }],
      });

      const assessment = await dispatchService.assessDynamicTraffic('route-midday');

      expect(assessment.isAdvanced).toBe(false);
      expect(assessment.congestionLevel).toBe('NORMAL');
      expect(assessment.trafficDelayMinutes).toBe(0);
      expect(assessment.adjustedDispatchTime.getTime()).toBe(assessment.standardDispatchTime.getTime());
    });
  });

  describe('H3 Spatial Driver Discovery (5 km to 10 km expansion)', () => {
    it('should find drivers in primary 5 km radius when supply is available', async () => {
      const mockRoute = {
        id: 'route-101',
        tenant: { name: 'Acme Corp' },
        office: { name: 'HYD HQ', latitude: 17.444, longitude: 78.377 },
        direction: 'LOGIN',
        status: 'PLANNED',
        vehicleCategory: 'SEDAN',
        assignedPassengerCount: 4,
        estDistanceMeters: 25000,
        targetPickup1Time: new Date('2026-11-10T06:30:00+05:30'),
        shiftDate: new Date('2026-11-10'),
        shiftTime: '08:00',
        stops: [
          { stopSequence: 1, latitude: 17.48, longitude: 78.36 },
          { stopSequence: 2, latitude: 17.47, longitude: 78.37 },
        ],
      };

      mockDb.corporateRoute.findUnique.mockResolvedValue(mockRoute);
      mockDb.corporateRoute.update.mockResolvedValue({ ...mockRoute, status: 'DISPATCHING' });

      // Return 2 nearby drivers within 5 km
      mockLocationsService.findNearbyDrivers.mockImplementation((_lat, _lng, radiusKm) => {
        if (radiusKm <= 5) {
          return Promise.resolve([
            { driverId: 'driver-1', distanceKm: 2.1 },
            { driverId: 'driver-2', distanceKm: 3.8 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockDb.driver.findMany.mockResolvedValue([
        {
          id: 'driver-1',
          fullName: 'Suresh Kumar',
          phone: '9876543210',
          userId: 'user-drv-1',
          vehicleType: 'SEDAN',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
        },
      ]);

      const result = await dispatchService.dispatchRoute('route-101');

      expect(result.status).toBe('OFFERED');
      expect(result.searchRadiusKm).toBe(5);
      expect(result.offeredToDriverId).toBe('driver-1');

      // 60-second atomic offer set in Redis
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'corporate:route:offer:route-101',
        expect.any(String),
        'EX',
        60,
      );

      // Realtime event emitted
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'driver:driver-1',
        'CORPORATE_ROUTE_OFFER',
        expect.any(Object),
      );
    });

    it('should automatically expand radius to 10 km when 0 drivers exist within 5 km', async () => {
      const mockRoute = {
        id: 'route-102',
        tenant: { name: 'Acme Corp' },
        office: { name: 'HYD HQ', latitude: 17.444, longitude: 78.377 },
        direction: 'LOGIN',
        status: 'PLANNED',
        vehicleCategory: 'SEDAN',
        assignedPassengerCount: 4,
        estDistanceMeters: 25000,
        targetPickup1Time: new Date('2026-11-10T06:30:00+05:30'),
        shiftDate: new Date('2026-11-10'),
        shiftTime: '08:00',
        stops: [{ stopSequence: 1, latitude: 17.55, longitude: 78.30 }],
      };

      mockDb.corporateRoute.findUnique.mockResolvedValue(mockRoute);
      mockDb.corporateRoute.update.mockResolvedValue({ ...mockRoute, status: 'DISPATCHING' });

      // 0 drivers in 5 km, 1 driver found in 10 km
      mockLocationsService.findNearbyDrivers.mockImplementation((_lat, _lng, radiusKm) => {
        if (radiusKm <= 5) {
          return Promise.resolve([]);
        }
        return Promise.resolve([{ driverId: 'driver-expanded-1', distanceKm: 8.4 }]);
      });

      mockDb.driver.findMany.mockResolvedValue([
        {
          id: 'driver-expanded-1',
          fullName: 'Ramesh Reddy',
          phone: '9876543211',
          userId: 'user-drv-2',
          vehicleType: 'SEDAN',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
        },
      ]);

      const result = await dispatchService.dispatchRoute('route-102');

      expect(result.status).toBe('OFFERED');
      expect(result.searchRadiusKm).toBe(10);
      expect(result.offeredToDriverId).toBe('driver-expanded-1');
      expect(mockLocationsService.findNearbyDrivers).toHaveBeenCalledTimes(2);
    });
  });

  describe('60-Second Atomic Offer Acceptance & Earnings Ledger', () => {
    it('should assign driver, calculate driver earnings in integer paise, and clear Redis offer on acceptance', async () => {
      const routeId = 'route-103';
      const driverId = 'driver-winner';

      const offerPayload = {
        routeId,
        driverId,
        tenantName: 'Acme Corp',
        shiftDate: '2026-11-10',
        shiftTime: '08:00',
        direction: 'LOGIN',
        passengerCount: 4,
        totalDistanceMeters: 25000,
        targetPickup1Time: new Date('2026-11-10T06:30:00+05:30'),
        farePaise: 80000, // ₹800 in paise
        offerExpiresAt: new Date(Date.now() + 50000),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(offerPayload));

      mockDb.driver.findUnique.mockResolvedValue({
        id: driverId,
        fullName: 'Winner Driver',
        phone: '9876543299',
        userId: 'user-winner',
      });

      mockDb.vehicle.findFirst.mockResolvedValue({
        id: 'veh-1',
        registrationNumber: 'TS09AB1234',
      });

      mockDb.corporateRoute.update.mockResolvedValue({
        id: routeId,
        driverId,
        vehicleId: 'veh-1',
        status: 'ASSIGNED',
        targetPickup1Time: offerPayload.targetPickup1Time,
      });

      const updatedRoute = await dispatchService.acceptRouteOffer(routeId, driverId);

      expect(updatedRoute.status).toBe('ASSIGNED');

      // Verify CorporateDriverEarning created with integer paise
      expect(mockDb.corporateDriverEarning.create).toHaveBeenCalledWith({
        data: {
          driverId,
          routeId,
          routeFarePaise: BigInt(80000),
          approachBonusPaise: BigInt(0),
          tollReimbursementPaise: BigInt(0),
          totalEarnedPaise: BigInt(80000),
          payoutStatus: 'UNPAID',
        },
      });

      // Active offer cleared from Redis
      expect(mockRedisClient.del).toHaveBeenCalledWith(`corporate:route:offer:${routeId}`);

      // Notifications emitted
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        `driver:${driverId}`,
        'CORPORATE_ROUTE_CONFIRMED',
        expect.any(Object),
      );
    });
  });
});
