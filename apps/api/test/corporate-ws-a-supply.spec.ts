import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CorporateDispatchService, withdrawCorporateRouteOffer } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { DriverEligibilityService } from '../src/domains/corporate/supply/driver-eligibility.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { LocationsService } from '../src/modules/locations/locations.service';
import { TripEventRecorder } from '../src/domains/corporate/tracking/trip-event-recorder.service';
import { attachSortedSets } from './helpers/fake-sorted-sets';

describe('Corporate ETS Workstream A (WS-A): Supply Eligibility, Persisted Offers & Reconnect', () => {
  let dispatchService: CorporateDispatchService;
  let eligibilityService: DriverEligibilityService;

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
    acquireLockToken: jest.fn().mockResolvedValue('ws-a-lock-token'),
    releaseLockToken: jest.fn().mockResolvedValue(true),
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };
  attachSortedSets(mockRedisClient, mockRedis);

  const mockDb: any = {
    corporateRoute: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    corporateDriverOffer: {
      upsert: jest.fn().mockResolvedValue({ id: 'offer-1', status: 'SENT' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    corporateDriverEarning: {
      create: jest.fn().mockResolvedValue({ id: 'earning-1' }),
    },
    driver: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    vehicle: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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

  const mockTripEvents = {
    recordOfferSent: jest.fn().mockResolvedValue(undefined),
    recordOfferAccepted: jest.fn().mockResolvedValue(undefined),
    recordOfferDeclined: jest.fn().mockResolvedValue(undefined),
    recordOfferWithdrawn: jest.fn().mockResolvedValue(undefined),
    recordRouteAtRisk: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateDispatchService,
        DriverEligibilityService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
        { provide: LocationsService, useValue: mockLocationsService },
        { provide: TripEventRecorder, useValue: mockTripEvents },
      ],
    }).compile();

    dispatchService = module.get<CorporateDispatchService>(CorporateDispatchService);
    eligibilityService = module.get<DriverEligibilityService>(DriverEligibilityService);
  });

  describe('1. Driver & Supply Eligibility Rules (PRD ALLOC-01, ALLOC-06, ADM-07)', () => {
    const baseRoute = {
      id: 'route-test-1',
      vehicleCategory: 'SEDAN',
      maxCapacity: 4,
      targetPickup1Time: new Date(Date.now() + 3600_000), // 1 hour in future
      targetOfficeArrivalTime: new Date(Date.now() + 9000_000), // 2.5 hours in future
      estDurationSeconds: 5400,
    };

    it('should reject unverified driver', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-unverified',
        verificationStatus: 'PENDING',
        availabilityStatus: 'AVAILABLE',
      });

      const res = await eligibilityService.checkDriverEligibility('drv-unverified', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('DRIVER_NOT_VERIFIED');
    });

    it('should reject driver when availabilityStatus is not AVAILABLE', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-offline',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'OFFLINE',
      });

      const res = await eligibilityService.checkDriverEligibility('drv-offline', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('DRIVER_NOT_AVAILABLE');
    });

    it('should reject driver without any vehicle', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-no-veh',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [],
      });
      mockDb.vehicle.findMany.mockResolvedValue([]);

      const res = await eligibilityService.checkDriverEligibility('drv-no-veh', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('NO_VERIFIED_VEHICLE');
    });

    it('should strictly reject vehicle with null or empty vehicleType (Fixes PRD gap audit bug)', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-null-type',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-1',
            vehicleType: null, // Null vehicleType
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      const res = await eligibilityService.checkDriverEligibility('drv-null-type', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('MISSING_VEHICLE_TYPE');
    });

    it('should reject vehicle category mismatch (Hatchback on Sedan route)', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-hatchback',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-hatch',
            vehicleType: 'HATCHBACK',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      const res = await eligibilityService.checkDriverEligibility('drv-hatchback', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('VEHICLE_CATEGORY_MISMATCH');
    });

    it('should reject vehicle category mismatch (Sedan on SUV route)', async () => {
      const suvRoute = { ...baseRoute, vehicleCategory: 'SUV', maxCapacity: 6 };
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-sedan-on-suv',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-sedan',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      const res = await eligibilityService.checkDriverEligibility('drv-sedan-on-suv', suvRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('VEHICLE_CATEGORY_MISMATCH');
    });

    it('should reject vehicle with expired insurance', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-expired-ins',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-exp',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() - 86400000), // Expired yesterday
          },
        ],
      });

      const res = await eligibilityService.checkDriverEligibility('drv-expired-ins', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('INSURANCE_EXPIRED');
    });

    it('should reject vehicle with insurance expiring mid-trip before office arrival', async () => {
      // Insurance expires 1 hour in future, but office arrival is 2.5 hours in future
      const expiringMidTrip = new Date(Date.now() + 3600_000 * 1.5);
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-mid-exp',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-mid',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: expiringMidTrip,
          },
        ],
      });

      const res = await eligibilityService.checkDriverEligibility('drv-mid-exp', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('INSURANCE_EXPIRED');
    });

    it('should reject driver who exceeds 12-hour duty limit in rolling 24 hours (PRD ALLOC-06)', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-overworked',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-valid',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      // Existing 11 hours of duties + this route (1.5h) = 12.5h (> 12h max limit)
      mockDb.corporateRoute.findMany.mockResolvedValueOnce([
        { estDurationSeconds: 11 * 3600 },
      ]);

      const res = await eligibilityService.checkDriverEligibility('drv-overworked', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('DUTY_HOURS_EXCEEDED');
      expect(res.dutyHoursLast24h).toBeGreaterThan(12);
    });

    it('should reject driver with route time overlap or less than 30-minute turnaround gap', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-overlapping',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-valid',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      // Active route overlapping with turnaround gap
      mockDb.corporateRoute.findMany
        .mockResolvedValueOnce([]) // duty hours check passes
        .mockResolvedValueOnce([
          {
            targetPickup1Time: new Date(Date.now() + 1800_000), // 30 min in future
            targetOfficeArrivalTime: new Date(Date.now() + 5400_000), // overlaps baseRoute
            estDurationSeconds: 3600,
          },
        ]);

      const res = await eligibilityService.checkDriverEligibility('drv-overlapping', baseRoute);
      expect(res.isEligible).toBe(false);
      expect(res.rejectionReason).toBe('ROUTE_TIME_OVERLAP');
    });

    it('should approve fully compliant driver and match vehicle', async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-compliant',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-compliant',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 90),
          },
        ],
      });
      mockDb.corporateRoute.findMany.mockResolvedValue([]); // zero duty hours and zero overlaps

      const res = await eligibilityService.checkDriverEligibility('drv-compliant', baseRoute);
      expect(res.isEligible).toBe(true);
      expect(res.matchedVehicleId).toBe('veh-compliant');
      expect(res.rejectionReason).toBeUndefined();
    });
  });

  describe('2. Offer Lifecycle, Database Persistence & Audit (WS-A DB Model)', () => {
    it('should persist CorporateDriverOffer in Postgres on dispatch', async () => {
      const routeId = 'route-persist-1';
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: routeId,
        tenantId: 'tenant-acme',
        direction: 'LOGIN',
        shiftDate: new Date('2026-11-10T00:00:00Z'),
        shiftTime: '08:00',
        vehicleCategory: 'SEDAN',
        maxCapacity: 4,
        assignedPassengerCount: 4,
        targetPickup1Time: new Date(Date.now() + 3600_000),
        estDistanceMeters: 25000,
        estDurationSeconds: 5400,
        tenant: { name: 'Acme Corp' },
        office: { latitude: 17.44, longitude: 78.38 },
        stops: [{ stopSequence: 1, latitude: 17.40, longitude: 78.35 }],
      });

      mockLocationsService.findNearbyDrivers.mockResolvedValue([
        { driverId: 'drv-1', distanceKm: 2.5 },
      ]);

      mockDb.driver.findUnique.mockResolvedValue({
        id: 'drv-1',
        fullName: 'Rajesh Sharma',
        userId: 'user-drv-1',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: 'veh-1',
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 86400000 * 60),
          },
        ],
      });
      mockDb.driver.findMany.mockResolvedValue([
        {
          id: 'drv-1',
          fullName: 'Rajesh Sharma',
          userId: 'user-drv-1',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          vehicleType: 'SEDAN',
        },
      ]);
      mockDb.corporateRoute.findMany.mockResolvedValue([]);

      await dispatchService.dispatchRoute(routeId, false);

      expect(mockDb.corporateDriverOffer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            routeId_driverId_attempt: {
              routeId,
              driverId: 'drv-1',
              attempt: 1,
            },
          },
          create: expect.objectContaining({
            tenantId: 'tenant-acme',
            routeId,
            driverId: 'drv-1',
            status: 'SENT',
          }),
        }),
      );
    });

    it('should update offer to ACCEPTED with respondedAt timestamp on driver accept', async () => {
      const routeId = 'route-accept-1';
      const driverId = 'drv-acceptor';

      mockRedisClient.get.mockImplementation((k: string) => {
        if (k === `corporate:route:offer:${routeId}`) {
          return Promise.resolve(
            JSON.stringify({
              routeId,
              driverId,
              farePaise: 75000,
              offerExpiresAt: new Date(Date.now() + 45000),
            }),
          );
        }
        return Promise.resolve(null);
      });

      mockDb.driver.findUnique.mockResolvedValue({ id: driverId, userId: 'user-acc-1' });
      mockDb.vehicle.findFirst.mockResolvedValue({ id: 'veh-acc-1' });
      mockDb.corporateRoute.update.mockResolvedValue({
        id: routeId,
        status: 'ASSIGNED',
        driverId,
        vehicleId: 'veh-acc-1',
      });

      await dispatchService.acceptRouteOffer(routeId, driverId);

      expect(mockDb.corporateDriverOffer.updateMany).toHaveBeenCalledWith({
        where: { routeId, driverId, status: 'SENT' },
        data: expect.objectContaining({
          status: 'ACCEPTED',
          respondedAt: expect.any(Date),
        }),
      });
    });

    it('should reject late acceptance with 409 Conflict when offer is EXPIRED in DB', async () => {
      const routeId = 'route-late-1';
      const driverId = 'drv-late-1';

      // Redis key expired
      mockRedisClient.get.mockResolvedValue(null);

      // Database has marked offer as EXPIRED
      mockDb.corporateDriverOffer.findFirst.mockResolvedValue({
        id: 'offer-exp-1',
        routeId,
        driverId,
        status: 'EXPIRED',
      });

      await expect(dispatchService.acceptRouteOffer(routeId, driverId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject late acceptance with 409 Conflict when offer was WITHDRAWN in DB', async () => {
      const routeId = 'route-withdrawn-1';
      const driverId = 'drv-withdrawn-1';

      mockRedisClient.get.mockResolvedValue(null);
      mockDb.corporateDriverOffer.findFirst.mockResolvedValue({
        id: 'offer-w-1',
        routeId,
        driverId,
        status: 'WITHDRAWN',
      });

      await expect(dispatchService.acceptRouteOffer(routeId, driverId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update offer to WITHDRAWN in DB when withdrawCorporateRouteOffer is called', async () => {
      const routeId = 'route-withdraw-test';
      const driverId = 'drv-hold-1';

      mockRedisClient.get.mockImplementation((k: string) => {
        if (k === `corporate:route:offer:${routeId}`) {
          return Promise.resolve(JSON.stringify({ driverId }));
        }
        if (k === `corporate:driver:offer_hold:${driverId}`) {
          return Promise.resolve(routeId);
        }
        return Promise.resolve(null);
      });

      const withdrawnDriver = await withdrawCorporateRouteOffer(mockRedisClient, routeId, mockDb);
      expect(withdrawnDriver).toBe(driverId);
      expect(mockDb.corporateDriverOffer.updateMany).toHaveBeenCalledWith({
        where: { routeId, driverId, status: 'SENT' },
        data: expect.objectContaining({
          status: 'WITHDRAWN',
          respondedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('3. Route Escalation & Alerting (PRD ALLOC-05)', () => {
    it('should detect unassigned routes at risk within 30 min of pickup-1, flag atRisk = true, and emit alert', async () => {
      const urgentPickup = new Date(Date.now() + 20 * 60_000); // 20 minutes in future (<= 30m cutoff)
      mockDb.corporateRoute.findMany.mockResolvedValueOnce([
        {
          id: 'route-at-risk-1',
          tenantId: 'tenant-risk',
          status: 'DISPATCHING',
          atRisk: false,
          targetPickup1Time: urgentPickup,
          stops: [{ id: 'stop-1' }, { id: 'stop-2' }],
        },
      ]);

      const escalated = await dispatchService.checkAndEscalateAtRiskRoutes();
      expect(escalated).toContain('route-at-risk-1');
      expect(mockDb.corporateRoute.update).toHaveBeenCalledWith({
        where: { id: 'route-at-risk-1' },
        data: { atRisk: true },
      });
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:operations',
        'CORPORATE_ROUTE_AT_RISK',
        expect.objectContaining({
          routeId: 'route-at-risk-1',
          tenantId: 'tenant-risk',
        }),
      );
      expect(mockTripEvents.recordRouteAtRisk).toHaveBeenCalledWith(
        'route-at-risk-1',
        expect.any(Number),
        urgentPickup,
      );
    });
  });

  describe('4. Driver App Reconnect & Duty Query Endpoints (PRD DRV-06, DRV-08)', () => {
    it('should return active live offer on driver app reconnect', async () => {
      const driverId = 'drv-reconnect-1';
      const routeId = 'route-rec-1';

      mockRedisClient.get.mockImplementation((k: string) => {
        if (k === `corporate:driver:offer_hold:${driverId}`) return Promise.resolve(routeId);
        if (k === `corporate:route:offer:${routeId}`) {
          return Promise.resolve(
            JSON.stringify({
              routeId,
              driverId,
              tenantName: 'Mega Corp',
              shiftDate: '2026-11-10',
              shiftTime: '08:00',
              direction: 'LOGIN',
              passengerCount: 4,
              totalDistanceMeters: 22000,
              targetPickup1Time: new Date(),
              farePaise: 85000,
              offerExpiresAt: new Date(Date.now() + 45000),
            }),
          );
        }
        return Promise.resolve(null);
      });
      mockRedisClient.ttl.mockResolvedValue(45);

      const res = await dispatchService.getDriverActiveOffer(driverId);
      expect(res.hasActiveOffer).toBe(true);
      expect(res.offer).toBeDefined();
      expect(res.offer?.remainingSeconds).toBe(45);
      expect(res.offer?.farePaise).toBe(85000);
    });

    it('should return upcoming assigned duties for driver', async () => {
      const driverId = 'drv-duties-1';
      mockDb.corporateRoute.findMany.mockResolvedValueOnce([
        {
          id: 'route-duty-1',
          tenantId: 'tenant-1',
          direction: 'LOGIN',
          vehicleCategory: 'SEDAN',
          status: 'ASSIGNED',
          shiftDate: new Date('2026-11-10T00:00:00Z'),
          shiftTime: '08:00',
          assignedPassengerCount: 4,
          estDistanceMeters: 28000,
          estDurationSeconds: 5400,
          targetPickup1Time: new Date('2026-11-10T06:30:00Z'),
          targetOfficeArrivalTime: new Date('2026-11-10T08:00:00Z'),
          tenant: { name: 'Acme Corp' },
          stops: [
            { stopSequence: 1, stopType: 'PICKUP', plannedEta: new Date('2026-11-10T06:30:00Z'), status: 'PENDING' },
            { stopSequence: 2, stopType: 'DROPOFF', plannedEta: new Date('2026-11-10T08:00:00Z'), status: 'PENDING' },
          ],
        },
      ]);

      const duties = await dispatchService.getDriverAssignedDuties(driverId);
      expect(duties.length).toBe(1);
      expect(duties[0].routeId).toBe('route-duty-1');
      expect(duties[0].tenantName).toBe('Acme Corp');
      expect(duties[0].stopsCount).toBe(2);
    });
  });

  describe('5. High Concurrency Simulation: 50-Driver Race Condition', () => {
    it('should guarantee atomic assignment: exactly 1 driver succeeds, 49 rejected when racing for the same offer', async () => {
      const routeId = 'route-concurrency-50';
      let assignmentCommitted = false;

      // Mock database transaction simulating atomic conditional update WHERE status = 'DISPATCHING'
      mockDb.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          corporateRoute: {
            update: jest.fn().mockImplementation(({ where, data }: any) => {
              if (where.status === 'DISPATCHING' && !assignmentCommitted) {
                assignmentCommitted = true;
                return Promise.resolve({
                  id: routeId,
                  status: 'ASSIGNED',
                  driverId: data.driverId,
                });
              }
              // Already assigned or cancelled: throw conflict
              const err: any = new Error('Route is no longer in DISPATCHING state');
              err.code = 'P2025';
              throw err;
            }),
          },
          corporateDriverEarning: {
            create: jest.fn().mockResolvedValue({ id: 'earn-1' }),
          },
        };
        return callback(tx);
      });

      mockDb.driver.findUnique.mockResolvedValue({ id: 'any-drv', userId: 'user-any' });
      mockDb.vehicle.findFirst.mockResolvedValue({ id: 'veh-any' });

      // 50 drivers racing concurrently
      const driverIds = Array.from({ length: 50 }, (_, i) => `drv-race-${i + 1}`);

      mockRedisClient.get.mockImplementation((k: string) => {
        if (k === `corporate:route:offer:${routeId}`) {
          return Promise.resolve(
            JSON.stringify({
              routeId,
              driverId: 'drv-race-1',
              farePaise: 80000,
              offerExpiresAt: new Date(Date.now() + 40000),
            }),
          );
        }
        return Promise.resolve(null);
      });

      const results = await Promise.allSettled(
        driverIds.map((dId) => dispatchService.acceptRouteOffer(routeId, dId)),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(49);
      expect(assignmentCommitted).toBe(true);
    });
  });
});
