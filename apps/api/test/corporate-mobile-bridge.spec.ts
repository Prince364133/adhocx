import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CorporateDispatchController } from '../src/domains/corporate/dispatch/corporate-dispatch.controller';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateTripExecutionController } from '../src/domains/corporate/execution/corporate-trip-execution.controller';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CorporateRiderNotifier } from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { CorporateReplanningService } from '../src/domains/corporate/replanning/corporate-replanning.service';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';

describe('Corporate Mobile Bridge & Driver/Employee Flow Verification', () => {
  let dispatchController: CorporateDispatchController;
  let executionController: CorporateTripExecutionController;
  let executionService: CorporateTripExecutionService;
  let mockDb: any;
  let mockRedis: any;
  let mockRedisClient: any;
  let inMemoryRedis: Map<string, string>;

  const dummyOffice = {
    id: 'off-hitec-1',
    name: 'Global Tech Park, Hitec City',
    addressText: 'Building 3, Mindspace SEZ, Madhapur, Hyderabad',
    latitude: 17.4435,
    longitude: 78.3808,
  };

  const dummyDriver = {
    id: 'drv-test-101',
    userId: 'usr-driver-101',
    fullName: 'Ramesh Driver',
    phone: '+919876543210',
  };

  const dummyEmployee = {
    id: 'emp-commuter-202',
    userId: 'usr-employee-202',
    employeeCode: 'EMP-202',
    fullName: 'Priya Sharma',
    phone: '+919988776655',
    gender: 'FEMALE',
    office: dummyOffice,
    locations: [{ addressText: 'Flat 402, Lotus Apts, Madhapur', isDefault: true }],
  };

  const dummyVehicle = {
    id: 'veh-swift-1',
    registrationNumber: 'TS 09 UB 4410',
    model: 'Swift Dzire',
    vehicleType: 'SEDAN',
  };

  const dummyRoute = {
    id: 'route-test-corp-1',
    tenantId: 'tenant-acme-1',
    officeId: dummyOffice.id,
    shiftDate: new Date('2026-11-10'),
    shiftTime: '08:00',
    direction: 'LOGIN',
    vehicleCategory: 'SEDAN',
    maxCapacity: 4,
    assignedPassengerCount: 4,
    targetPickup1Time: new Date('2026-11-10T00:30:00.000Z'),
    targetOfficeArrivalTime: new Date('2026-11-10T02:20:00.000Z'),
    status: 'ASSIGNED',
    driverId: dummyDriver.id,
    vehicleId: dummyVehicle.id,
    office: dummyOffice,
    vehicle: dummyVehicle,
    driver: dummyDriver,
    stops: [
      {
        id: 'stop-p1',
        routeId: 'route-test-corp-1',
        stopSequence: 1,
        status: 'PENDING',
        plannedEta: new Date('2026-11-10T00:30:00.000Z'),
        actualArrivalTime: null,
        actualDepartureTime: null,
        boardingOtp: '4829',
        dwellBufferSeconds: 300,
        latitude: 17.4504,
        longitude: 78.3808,
        employeeId: dummyEmployee.id,
        employee: dummyEmployee,
      },
    ],
  };

  beforeEach(async () => {
    inMemoryRedis = new Map<string, string>();

    mockRedisClient = {
      get: jest.fn(async (key: string) => inMemoryRedis.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        inMemoryRedis.set(key, val);
        return 'OK';
      }),
      ttl: jest.fn(async () => 52),
      pttl: jest.fn(async () => 52000),
      del: jest.fn(async (key: string) => {
        inMemoryRedis.delete(key);
        return 1;
      }),
    };

    mockRedis = {
      getClient: jest.fn(() => mockRedisClient),
      get: jest.fn(async (key: string) => inMemoryRedis.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        inMemoryRedis.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        inMemoryRedis.delete(key);
        return 1;
      }),
      ttl: jest.fn(async () => 52),
    };

    mockDb = {
      driver: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId === dummyDriver.userId || where.id === dummyDriver.id) {
            return dummyDriver;
          }
          return null;
        }),
      },
      corporateEmployee: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.userId === dummyEmployee.userId || where.id === dummyEmployee.id) {
            return dummyEmployee;
          }
          return null;
        }),
      },
      corporateRoute: {
        findUnique: jest.fn(async () => dummyRoute),
        update: jest.fn(async () => dummyRoute),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.driverId === dummyDriver.id) {
            return dummyRoute;
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          if (where.driverId === dummyDriver.id) {
            return [dummyRoute];
          }
          return [];
        }),
      },
      corporateRouteStop: {
        findUnique: jest.fn(async () => ({ ...dummyRoute.stops[0], route: dummyRoute, employee: dummyEmployee })),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id === 'stop-p1' || where.employeeId === dummyEmployee.id) {
            return { ...dummyRoute.stops[0], route: dummyRoute, employee: dummyEmployee };
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          if (where.employeeId === dummyEmployee.id) {
            return [{ ...dummyRoute.stops[0], route: dummyRoute, employee: dummyEmployee }];
          }
          return [];
        }),
        update: jest.fn(async ({ data }: any) => {
          return { ...dummyRoute.stops[0], ...data };
        }),
      },
      corporateTransportRequest: {
        findMany: jest.fn(async () => [
          {
            id: 'req-shift-1',
            shiftDate: new Date('2026-11-10'),
            shiftTime: '08:00',
            direction: 'LOGIN',
            status: 'ROUTED',
            pickupLat: 17.4504,
            pickupLng: 78.3808,
            dropoffLat: 17.4435,
            dropoffLng: 78.3808,
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporateDispatchController, CorporateTripExecutionController],
      providers: [
        {
          provide: CorporateDispatchService,
          useValue: {
            acceptRouteOffer: jest.fn(async () => ({ success: true, routeId: 'route-test-corp-1' })),
            rejectRouteOffer: jest.fn(async () => ({ success: true })),
            assessDynamicTraffic: jest.fn(async () => ({ delayMinutes: 15 })),
            // my-offer delegates here: run the real read path against this suite's Redis / DB fakes.
            getDriverActiveOffer: jest.fn((driverId: string) =>
              CorporateDispatchService.prototype.getDriverActiveOffer.call(
                { redis: mockRedis, db: mockDb } as any,
                driverId,
              ),
            ),
          },
        },
        CorporateTripExecutionService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: { sendSms: jest.fn(), sendPush: jest.fn(), emitEvent: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CorporateRiderNotifier,
          useValue: {
            notifyRouteStarted: jest.fn(),
            notifyStopEvent: jest.fn(),
            notifyArrived: jest.fn(),
            notifyBoarded: jest.fn(),
            notifyNoShow: jest.fn(),
            notifyDropped: jest.fn(),
          },
        },
        { provide: CorporateReplanningService, useValue: { handleCancellationOrReschedule: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(CorporateAccessGuard).useValue({ canActivate: () => true })
      .compile();

    dispatchController = module.get<CorporateDispatchController>(CorporateDispatchController);
    executionController = module.get<CorporateTripExecutionController>(CorporateTripExecutionController);
    executionService = module.get<CorporateTripExecutionService>(CorporateTripExecutionService);
  });

  describe('1. Driver Corporate Offer Polling & Bridge', () => {
    it('returns hasOffer: false when no active corporate offer is held for driver', async () => {
      const res = await dispatchController.getMyActiveOffer({ user: { id: 'usr-driver-101' } });
      expect(res).toEqual({ hasOffer: false });
    });

    it('returns active corporate route offer when held in Redis with 60s TTL and ₹850 guaranteed payout', async () => {
      const offerData = {
        routeId: 'route-test-corp-1',
        driverId: 'drv-test-101',
        driverPayoutPaise: 85000,
        stopsCount: 4,
        stops: [{ sequence: 1, pickupAddress: 'Madhapur' }],
      };
      inMemoryRedis.set('corporate:driver:offer_hold:drv-test-101', 'route-test-corp-1');
      inMemoryRedis.set('corporate:route:offer:route-test-corp-1', JSON.stringify(offerData));

      const res = await dispatchController.getMyActiveOffer({ user: { id: 'usr-driver-101' } });
      expect(res.hasOffer).toBe(true);
      expect(res.routeId).toBe('route-test-corp-1');
      expect(res.remainingTtlSeconds).toBe(52);
      expect(res.offer.driverPayoutPaise).toBe(85000);
      expect(res.offer.stopsCount).toBe(4);
    });
  });

  describe('2. Driver Active Route & Turn-by-Turn Waypoints', () => {
    it('returns active corporate route with ordered stops, dwell buffers, and destination office', async () => {
      const res = await executionController.getDriverActiveRoute({ user: { id: 'usr-driver-101' } });
      expect(res.hasActiveRoute).toBe(true);
      expect(res.routeId).toBe('route-test-corp-1');
      expect(res.routeNumber).toBe('CR-ROUTE-TE');
      expect(res.vehicleCategory).toBe('SEDAN');
      expect(res.stops).toHaveLength(1);
      expect(res.stops[0].dwellBufferSeconds).toBe(300);
      expect(res.stops[0].passenger.name).toBe('Priya Sharma');
      expect(res.office.name).toBe('Global Tech Park, Hitec City');
    });

    it('returns all historical corporate routes assigned to the driver', async () => {
      const res = await executionController.getDriverRoutes({ user: { id: 'usr-driver-101' } });
      expect(Array.isArray(res)).toBe(true);
      expect(res).toHaveLength(1);
      expect(res[0].routeId).toBe('route-test-corp-1');
      expect(res[0].isCorporate).toBe(true);
    });
  });

  describe('3. Stop Lifecycle: Arrival, 5-Min Countdown & 4-Digit OTP Boarding', () => {
    it('marks arrival when driver is within geofence (<150m) and triggers 300s dwell timer', async () => {
      const res = await executionService.arriveAtStop('route-test-corp-1', 'stop-p1', {
        driverLatitude: 17.4504,
        driverLongitude: 78.3808,
      });
      expect(res.stopId).toBe('stop-p1');
      expect(res.status).toBe('ARRIVED');
      expect(res.countdownRemainingSeconds).toBe(300);
    });

    it('successfully boards employee when valid 4-digit OTP is supplied after arrival', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValueOnce({
        ...dummyRoute.stops[0],
        status: 'ARRIVED',
        route: dummyRoute,
        employee: dummyEmployee,
      });

      const res = await executionService.verifyBoardingOtp('route-test-corp-1', 'stop-p1', {
        otpCode: '4829',
      });
      expect(res.stopId).toBe('stop-p1');
      expect(res.status).toBe('BOARDED');
    });

    it('rejects invalid OTP with 400 Bad Request', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValueOnce({
        ...dummyRoute.stops[0],
        status: 'ARRIVED',
        route: dummyRoute,
        employee: dummyEmployee,
      });

      await expect(
        executionService.verifyBoardingOtp('route-test-corp-1', 'stop-p1', {
          otpCode: '0000',
        }),
      ).rejects.toThrow();
    });

    it('marks employee as NO-SHOW when absent after 5-minute wait', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValueOnce({
        ...dummyRoute.stops[0],
        status: 'ARRIVED',
        route: dummyRoute,
        employee: dummyEmployee,
      });

      const res = await executionService.markNoShow('route-test-corp-1', 'stop-p1', {
        reason: 'Employee unreachable after 5-minute wait',
      });
      expect(res.stopId).toBe('stop-p1');
      expect(res.status).toBe('NO_SHOW');
    });
  });

  describe('4. Employee Mobile Commuter Self-Service', () => {
    it('returns next upcoming corporate commute card with driver and OTP challenge (EMP-02-01)', async () => {
      const res = await executionController.getMyNextTrip({ user: { id: 'usr-employee-202' } });
      expect(res.hasActiveTrip).toBe(true);
      expect(res.routeNumber).toBe('CR-ROUTE-TE');
      expect(res.boardingOtp).toBe('4829');
      expect(res.driver.name).toBe('Ramesh Driver');
      expect(res.vehicle.registrationNumber).toBe('TS 09 UB 4410');
      expect(res.officeDestination.name).toBe('Global Tech Park, Hitec City');
    });

    it('returns employee shift calendar schedule (EMP-03-01)', async () => {
      const res = await executionController.getMySchedule({ user: { id: 'usr-employee-202' } });
      expect(res.employee.id).toBe('emp-commuter-202');
      expect(res.schedule).toHaveLength(1);
      expect(res.schedule[0].direction).toBe('LOGIN');
      expect(res.schedule[0].shiftTime).toBe('08:00');
    });

    it('returns completed trip history for commuter (EMP-08-02)', async () => {
      const res = await executionController.getMyTrips({ user: { id: 'usr-employee-202' } });
      expect(Array.isArray(res)).toBe(true);
      expect(res).toHaveLength(1);
      expect(res[0].driverName).toBe('Ramesh Driver');
      expect(res[0].vehiclePlate).toBe('TS 09 UB 4410');
    });
  });
});
