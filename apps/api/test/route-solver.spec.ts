import { Test, TestingModule } from '@nestjs/testing';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('Corporate Route Capacity Solver (CVRPTW)', () => {
  let solverService: RouteSolverService;

  const mockOffice = {
    id: 'office-hyd-hq',
    tenantId: 'tenant-acme',
    code: 'HYD-HQ',
    latitude: 17.444, // Cyber Towers area
    longitude: 78.377,
  };

  const mockDb: any = {
    corporateOffice: {
      findFirst: jest.fn(),
    },
    corporateTransportRequest: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    corporateRoute: {
      create: jest.fn(),
    },
    corporateRouteStop: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockDb)),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteSolverService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    solverService = module.get<RouteSolverService>(RouteSolverService);

    mockDb.corporateOffice.findFirst.mockResolvedValue(mockOffice);
    mockDb.corporateRoute.create.mockImplementation((args: any) => ({
      id: `route-${Math.random().toString(36).substring(7)}`,
      ...args.data,
    }));
    mockDb.corporateRouteStop.create.mockImplementation((args: any) => ({
      id: `stop-${Math.random().toString(36).substring(7)}`,
      ...args.data,
    }));
    mockDb.corporateTransportRequest.update.mockResolvedValue({ id: 'req' });
  });

  describe('Sedan Capacity & 5-Minute Dwell Buffer (LOGIN Commute)', () => {
    it('should split 8 passengers into Sedan routes of 4 passengers max and enforce 300s dwell buffer', async () => {
      // 8 employees along the same corridor (Kondapur / Gachibowli towards HITEC City)
      const mockRequests = Array.from({ length: 8 }).map((_, idx) => ({
        id: `req-${idx + 1}`,
        tenantId: 'tenant-acme',
        employeeId: `emp-${idx + 1}`,
        scheduledDate: new Date('2026-11-10'),
        shiftTime: '08:00',
        direction: 'LOGIN',
        pickupLat: 17.46 + idx * 0.005, // Varied distances from office
        pickupLng: 78.36 + idx * 0.003,
        dropoffLat: 17.444,
        dropoffLng: 78.377,
        status: 'APPROVED',
        employee: {
          employeeCode: `EMP${idx + 100}`,
          fullName: `Employee ${idx + 1}`,
          gender: 'MALE',
          phoneNumber: `987654321${idx}`,
        },
      }));

      mockDb.corporateTransportRequest.findMany.mockResolvedValue(mockRequests);

      const result = await solverService.optimizeAndCreateRoutes({
        tenantId: 'tenant-acme',
        officeId: 'office-hyd-hq',
        shiftDate: '2026-11-10',
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN', // max 4 pax
      });

      expect(result.routesCreated).toBe(2);
      expect(result.passengersAssigned).toBe(8);
      expect(result.unassignedRequests).toBe(0);
      expect(result.averagePassengersPerRoute).toBeCloseTo(8 / 2);

      // Verify each created route has capacity <= 4
      for (const route of result.routes) {
        expect(route.passengerCount).toBeLessThanOrEqual(4);
        expect(route.maxCapacity).toBe(4);
      }

      // Verify DB transaction calls: corporateRoute.create should be called twice
      expect(mockDb.corporateRoute.create).toHaveBeenCalledTimes(2);

      // 8 employee pickups + 2 office dropoffs
      expect(mockDb.corporateRouteStop.create).toHaveBeenCalledTimes(10);

      // Verify stops for Route 1 have 300s dwell buffer for employee pickups
      const firstRouteStopCalls = mockDb.corporateRouteStop.create.mock.calls;
      const firstRouteDropoffIndex = firstRouteStopCalls.findIndex(
        (call: any) => call[0].data.stopType === 'DROPOFF',
      );
      const firstRouteStops = firstRouteStopCalls
        .slice(0, firstRouteDropoffIndex + 1)
        .map((call: any) => call[0].data);

      expect(firstRouteDropoffIndex).toBeGreaterThan(0);
      expect(firstRouteStops.slice(0, -1).every((stop: any) => stop.dwellBufferSeconds === 300)).toBe(true);
      expect(firstRouteStops[firstRouteStops.length - 1].stopType).toBe('DROPOFF');
      expect(firstRouteStops[firstRouteStops.length - 1].dwellBufferSeconds).toBe(0);
    });

    it('should split 12 passengers into 2 SUV routes of 6 passengers max', async () => {
      const mockRequests = Array.from({ length: 12 }).map((_, idx) => ({
        id: `req-suv-${idx + 1}`,
        tenantId: 'tenant-acme',
        employeeId: `emp-${idx + 1}`,
        scheduledDate: new Date('2026-11-10'),
        shiftTime: '09:00',
        direction: 'LOGIN',
        pickupLat: 17.47 + idx * 0.003,
        pickupLng: 78.35 + idx * 0.002,
        dropoffLat: 17.444,
        dropoffLng: 78.377,
        status: 'APPROVED',
        employee: {
          employeeCode: `EMP-SUV-${idx}`,
          fullName: `SUV Employee ${idx + 1}`,
          gender: 'FEMALE',
          phoneNumber: `987654320${idx}`,
        },
      }));

      mockDb.corporateTransportRequest.findMany.mockResolvedValue(mockRequests);

      const result = await solverService.optimizeAndCreateRoutes({
        tenantId: 'tenant-acme',
        officeId: 'office-hyd-hq',
        shiftDate: '2026-11-10',
        shiftTime: '09:00',
        direction: 'LOGIN',
        vehicleCategory: 'SUV', // max 6 pax
      });

      expect(result.routesCreated).toBe(2);
      expect(result.passengersAssigned).toBe(12);
      expect(result.averagePassengersPerRoute).toBe(6);
      for (const route of result.routes) {
        expect(route.passengerCount).toBe(6);
        expect(route.maxCapacity).toBe(6);
      }
    });
  });

  describe('LOGOUT Commute Solving', () => {
    it('should create LOGOUT routes where Stop 1 is Office Hub and subsequent stops are home drops', async () => {
      const mockRequests = Array.from({ length: 4 }).map((_, idx) => ({
        id: `req-logout-${idx + 1}`,
        tenantId: 'tenant-acme',
        employeeId: `emp-logout-${idx + 1}`,
        scheduledDate: new Date('2026-11-10'),
        shiftTime: '17:00',
        direction: 'LOGOUT',
        pickupLat: 17.444,
        pickupLng: 78.377,
        dropoffLat: 17.48 + idx * 0.005,
        dropoffLng: 78.39 + idx * 0.003,
        status: 'APPROVED',
        employee: {
          employeeCode: `EMP-LOGOUT-${idx}`,
          fullName: `Logout Employee ${idx + 1}`,
          gender: 'MALE',
          phoneNumber: `987654310${idx}`,
        },
      }));

      mockDb.corporateTransportRequest.findMany.mockResolvedValue(mockRequests);

      const result = await solverService.optimizeAndCreateRoutes({
        tenantId: 'tenant-acme',
        officeId: 'office-hyd-hq',
        shiftDate: '2026-11-10',
        shiftTime: '17:00',
        direction: 'LOGOUT',
        vehicleCategory: 'SUV',
      });

      expect(result.routesCreated).toBe(1);
      expect(result.passengersAssigned).toBe(4);

      const stops = mockDb.corporateRouteStop.create.mock.calls.map((call: any) => call[0].data);
      expect(stops).toHaveLength(5);

      // Stop 1 must be PICKUP at Office Hub
      expect(stops[0].stopSequence).toBe(1);
      expect(stops[0].stopType).toBe('PICKUP');
      expect(stops[0].latitude).toBe(mockOffice.latitude);
      expect(stops[0].longitude).toBe(mockOffice.longitude);

      // Stops 2, 3, 4, 5 must be DROPOFF at employees' residences
      expect(stops[1].stopType).toBe('DROPOFF');
      expect(stops[2].stopType).toBe('DROPOFF');
      expect(stops[3].stopType).toBe('DROPOFF');
      expect(stops[4].stopType).toBe('DROPOFF');
      expect(stops[1].dwellBufferSeconds).toBe(300);
    });
  });
});
