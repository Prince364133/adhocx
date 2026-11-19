import { UserRole } from '@adhocx/contracts';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { CorporateRouteDirectionsService } from '../src/domains/corporate/routing/corporate-route-directions.service';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { GoogleRoutesV2Adapter } from '../src/domains/corporate/routing/google-routes-v2.adapter';
import { CorporateSafetyService } from '../src/domains/corporate/safety/corporate-safety.service';
import { CorporateSafetyController } from '../src/domains/corporate/safety/corporate-safety.controller';
import { CorporateAnalyticsService } from '../src/domains/corporate/analytics/corporate-analytics.service';
import {
  buildRouteFinancials,
  computeDispatchSchedule,
  computeRouteOperationalSummary,
  isOfficeRouteStop,
  isValidCoordinate,
  resolveEffectiveRoutePolicy,
} from '../src/domains/corporate/routing/route-presentation.helper';

describe('Ops Routing Module — Comprehensive Regression & Security Suite', () => {
  describe('Coordinate validation & office stop detection', () => {
    it('rejects null, empty, NaN, out-of-range, and (0, 0) Null Island coordinates', () => {
      expect(isValidCoordinate(null, 78.37)).toBe(false);
      expect(isValidCoordinate(17.44, undefined)).toBe(false);
      expect(isValidCoordinate('', '')).toBe(false);
      expect(isValidCoordinate(0, 0)).toBe(false);
      expect(isValidCoordinate('0.0000000', '0.0000000')).toBe(false);
      expect(isValidCoordinate(91, 78)).toBe(false);
      expect(isValidCoordinate(17.44, -181)).toBe(false);
      expect(isValidCoordinate(17.4231202, 78.3407063)).toBe(true);
    });

    it('identifies office stops accurately across both LOGIN (DROPOFF) and LOGOUT (PICKUP)', () => {
      expect(isOfficeRouteStop({ employeeId: null, employeeName: null, employee: null })).toBe(true);
      expect(isOfficeRouteStop({ employeeId: 'emp-1', employeeName: null, employee: null })).toBe(false);
      expect(isOfficeRouteStop({ employeeId: null, employeeName: 'Santhosh Rao', employee: null })).toBe(false);
      expect(isOfficeRouteStop({ employeeId: null, employeeName: null, employee: { id: 'emp-1', fullName: 'A' } })).toBe(
        false,
      );
    });
  });

  describe('Tenant policy-driven dispatch schedule & operational summary', () => {
    it('computes dynamic dispatch windows from tenant policy including LOGOUT 15m staging lead', () => {
      const policy = resolveEffectiveRoutePolicy({
        version: 3,
        approachLeadMinutes: 20,
        dispatchWindowMinutes: 45,
        dispatchRetryIntervalMinutes: 15,
        searchRadiusKm: 8,
        stopDwellMinutes: 6,
        officeArrivalBufferMinutes: 15,
      });
      expect(policy).toMatchObject({
        isPolicyConfigured: true,
        policyVersion: 3,
        approachLeadMinutes: 20,
        dispatchWindowMinutes: 45,
        dispatchRetryIntervalMinutes: 15,
        searchRadiusKm: 8,
        maxRuns: 3,
        stopDwellMinutes: 6,
        officeArrivalBufferMinutes: 15,
      });

      const loginSchedule = computeDispatchSchedule(
        {
          direction: 'LOGIN',
          status: 'PLANNED',
          dispatchStatus: 'PENDING',
          dispatchAttempts: 0,
          targetPickup1Time: '2026-11-20T02:00:00.000Z', // 07:30 IST
        },
        policy,
      );
      // Deadline = 02:00 - 20m = 01:40; Window start = 01:40 - 45m = 00:55
      expect(loginSchedule.windowStartAt).toBe('2026-11-20T00:55:00.000Z');
      expect(loginSchedule.windowEndAt).toBe('2026-11-20T01:40:00.000Z');
      expect(loginSchedule.approachStartAt).toBe('2026-11-20T01:40:00.000Z');
      expect(loginSchedule.reportingTimeAt).toBe('2026-11-20T02:00:00.000Z');
      expect(loginSchedule.nextAttemptAt).toBe('2026-11-20T00:55:00.000Z');

      const logoutSchedule = computeDispatchSchedule(
        {
          direction: 'LOGOUT',
          status: 'DISPATCHING',
          dispatchStatus: 'RETRY_SCHEDULED',
          dispatchAttempts: 1,
          lastDispatchAttemptAt: '2026-11-20T11:10:00.000Z',
          targetPickup1Time: '2026-11-20T12:30:00.000Z', // 18:00 IST
        },
        policy,
      );
      // LOGOUT reporting = 12:30 - 15m = 12:15; Deadline = 12:15 - 20m = 11:55; Window start = 11:55 - 45m = 11:10
      expect(logoutSchedule.reportingTimeAt).toBe('2026-11-20T12:15:00.000Z');
      expect(logoutSchedule.windowEndAt).toBe('2026-11-20T11:55:00.000Z');
      expect(logoutSchedule.windowStartAt).toBe('2026-11-20T11:10:00.000Z');
      expect(logoutSchedule.nextAttemptAt).toBe('2026-11-20T11:25:00.000Z');
    });

    it('separates drive and dwell without double counting and resolves LOGOUT plannedEndTime from last drop-off', () => {
      const logoutRoute = {
        direction: 'LOGOUT',
        shiftDate: new Date('2026-11-20T00:00:00.000Z'),
        shiftTime: '18:00',
        maxCapacity: 4,
        assignedPassengerCount: 2,
        targetPickup1Time: '2026-11-20T12:30:00.000Z',
        targetOfficeArrivalTime: '2026-11-20T12:30:00.000Z', // DB stores office departure here on LOGOUT
        estDistanceMeters: 12400,
        estDurationSeconds: 2400, // 36m drive (2160s) + 4m dwell (240s)
      };
      const stops = [
        {
          id: 'office',
          stopSequence: 1,
          stopType: 'PICKUP',
          employeeId: null,
          employeeName: null,
          latitude: 17.44,
          longitude: 78.38,
          plannedEta: '2026-11-20T12:30:00.000Z',
          dwellBufferSeconds: 0,
          status: 'PENDING',
        },
        {
          id: 'e1',
          stopSequence: 2,
          stopType: 'DROPOFF',
          employeeId: 'emp-1',
          employeeName: 'Emp 1',
          latitude: 17.45,
          longitude: 78.39,
          plannedEta: '2026-11-20T12:48:00.000Z',
          dwellBufferSeconds: 120,
          status: 'BOARDED',
        },
        {
          id: 'e2',
          stopSequence: 3,
          stopType: 'DROPOFF',
          employeeId: 'emp-2',
          employeeName: 'Emp 2',
          latitude: 17.46,
          longitude: 78.40,
          plannedEta: '2026-11-20T13:10:00.000Z',
          dwellBufferSeconds: 120,
          status: 'PENDING',
        },
      ];

      const summary = computeRouteOperationalSummary(logoutRoute, stops);
      expect(summary.employeeStopCount).toBe(2);
      expect(summary.occupancyPct).toBe(50);
      expect(summary.boardedCount).toBe(1);
      expect(summary.pendingCount).toBe(1);
      expect(summary.plannedStartTime).toBe('2026-11-20T12:30:00.000Z');
      expect(summary.plannedEndTime).toBe('2026-11-20T13:10:00.000Z'); // Final drop-off, NOT 12:30!
      expect(summary.plannedDwellSeconds).toBe(240);
      expect(summary.plannedDriveSeconds).toBe(2160);
      expect(summary.plannedTotalSeconds).toBe(2400);
    });
  });

  describe('LOGIN buffered arrival consistency in commitPlanToDatabase', () => {
    it('stores buffered planned arrival (07:45 IST) in targetOfficeArrivalTime & HQ stop while keeping shiftTime 08:00', async () => {
      const createdRoutes: any[] = [];
      const createdStops: any[] = [];
      const db: any = {
        corporateOffice: {
          findUnique: jest.fn(async () => ({
            id: 'office-1',
            tenantId: 't1',
            name: 'olama hyderabad',
            addressText: 'Mindspace, HITEC City',
            latitude: 17.44,
            longitude: 78.37,
          })),
        },
        vehiclePricingTier: {
          findMany: jest.fn(async () => [{ vehicleType: 'SEDAN', seatingCapacity: '3 seats', isActive: true }]),
        },
        corporateTenantPolicy: {
          findFirst: jest.fn(async () => null),
        },
        corporateEmployee: {
          findFirst: jest.fn(async () => null),
          create: jest.fn(async ({ data }: any) => ({ id: `emp-${createdStops.length + 1}`, ...data })),
        },
        corporateEmployeeLocation: {
          create: jest.fn(async ({ data }: any) => data),
        },
        corporateRoute: {
          create: jest.fn(async ({ data }: any) => {
            const r = { id: 'route-buffered-1', ...data };
            createdRoutes.push(r);
            return r;
          }),
        },
        corporateRouteStop: {
          create: jest.fn(async ({ data }: any) => {
            createdStops.push(data);
            return data;
          }),
        },
        $transaction: jest.fn(async (fn: any) => fn(db)),
      };

      const planner = new CorporateRoutePlannerService({} as any, {} as any, db);
      await planner.commitPlanToDatabase({
        tenantId: 't1',
        officeId: 'office-1',
        shiftDate: '2026-11-20',
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        stopDwellMinutes: 10,
        plan: {
          office: { name: 'olama hyderabad', lat: 17.44, lng: 78.37 },
          routes: [
            {
              cab: 1,
              direction: 'LOGIN',
              cabType: 'SEDAN',
              office: { name: 'olama hyderabad', lat: 17.44, lng: 78.37 },
              requiredArrival: '08:00 AM',
              requiredArrivalDateTime: '2026-11-20T02:30:00.000Z', // 08:00 IST shift time
              departureDateTime: '2026-11-20T01:32:22.000Z', // 07:02:22 IST
              arrivalDateTime: '2026-11-20T02:15:04.000Z', // 07:45:04 IST (15m buffer!)
              distanceKm: 9.11,
              driveMinutes: 22.7,
              stops: [
                {
                  sequence: 1,
                  name: 'Santhosh Rao',
                  employeeCode: 'EMP-2001',
                  phoneNumber: '+917386851163',
                  address: 'Mantri Celestia, Narsingi',
                  lat: 17.4231202,
                  lng: 78.3407063,
                  etaIso: '2026-11-20T01:32:22.000Z',
                },
                {
                  sequence: 2,
                  name: 'Sana Fatima',
                  employeeCode: 'EMP-2004',
                  phoneNumber: '+919000010004',
                  address: 'Gachibowli',
                  lat: 17.4400802,
                  lng: 78.3489168,
                  etaIso: '2026-11-20T01:53:10.000Z',
                },
              ],
            },
          ],
        } as any,
      });

      expect(createdRoutes).toHaveLength(1);
      const r = createdRoutes[0];
      expect(r.shiftTime).toBe('08:00');
      expect(r.targetPickup1Time.toISOString()).toBe('2026-11-20T01:32:22.000Z');
      expect(r.targetOfficeArrivalTime.toISOString()).toBe('2026-11-20T02:15:04.000Z');
      expect(r.estDurationSeconds).toBe(2562); // 1362s drive + 1200s dwell === 02:15:04 - 01:32:22!
      const hqStop = createdStops.find((s) => s.stopType === 'DROPOFF');
      expect(hqStop.plannedEta.toISOString()).toBe('2026-11-20T02:15:04.000Z');
    });
  });

  describe('CorporateRouteDirectionsService — LOGOUT dwell, co-located stops, invalid coords, <2 waypoint fallback', () => {
    it('includes final employee dwell on LOGOUT and preserves 0m/0s legs for co-located employees with exact leg sums', async () => {
      const adapter = {
        computeRoute: jest.fn(async () => ({
          durationSeconds: 900,
          distanceMeters: 5000,
          distanceKm: 5,
          optimizedIntermediateWaypointIndex: [0, 1],
          legs: [
            { durationSeconds: 900, distanceMeters: 5000 }, // Office -> Emp1
            { durationSeconds: 0, distanceMeters: 0 }, // Emp1 -> Emp2 (same apartment gate!)
          ],
          encodedPolyline: 'poly',
          decodedPath: [
            [17.44, 78.37],
            [17.45, 78.38],
          ],
          isRealRoad: true,
        })),
      };
      const service = new CorporateRouteDirectionsService({} as any, adapter as any);
      const res = await service.computeFromRouteRecord({
        id: 'logout-colocated',
        direction: 'LOGOUT',
        targetPickup1Time: '2026-11-20T12:30:00.000Z',
        office: { id: 'o1', name: 'HQ', addressText: 'Mindspace', latitude: 17.44, longitude: 78.37 },
        stops: [
          {
            id: 's1',
            stopSequence: 1,
            stopType: 'PICKUP',
            employeeId: null,
            latitude: 17.44,
            longitude: 78.37,
            dwellBufferSeconds: 0,
            plannedEta: '2026-11-20T12:30:00.000Z',
          },
          {
            id: 's2',
            stopSequence: 2,
            stopType: 'DROPOFF',
            employeeId: 'e1',
            employeeName: 'Alice',
            latitude: 17.45,
            longitude: 78.38,
            dwellBufferSeconds: 180,
            plannedEta: '2026-11-20T12:45:00.000Z',
          },
          {
            id: 's3',
            stopSequence: 3,
            stopType: 'DROPOFF',
            employeeId: 'e2',
            employeeName: 'Bob',
            latitude: 17.45,
            longitude: 78.38,
            dwellBufferSeconds: 180,
            plannedEta: '2026-11-20T12:48:00.000Z',
          },
        ],
      });

      expect(res.legs).toHaveLength(2);
      // Co-located leg must stay 0m / 0s (not inflated to 50m / 60s!)
      expect(res.legs[1].distanceMeters).toBe(0);
      expect(res.legs[1].trafficDurationSeconds).toBe(0);
      // Sum of legs equals route totals
      expect(res.totalDistanceMeters).toBe(5000);
      expect(res.totalDurationSeconds).toBe(900);
      // Both Emp1 (180s) AND final Emp2 (180s) dwell counted!
      expect(res.totalDwellSeconds).toBe(360);
      expect(res.totalTravelWithWaitMinutes).toBe(21);
    });

    it('excludes (0, 0) invalid stops and avoids double-counting dwell on <2 waypoint fallback', async () => {
      const adapter = new GoogleRoutesV2Adapter();
      const service = new CorporateRouteDirectionsService({} as any, adapter);
      const res = await service.computeFromRouteRecord({
        id: 'invalid-coords-route',
        direction: 'LOGIN',
        estDistanceMeters: 5000,
        estDurationSeconds: 1500, // 900s drive + 600s dwell
        office: { id: 'o1', name: 'HQ', latitude: 0, longitude: 0 }, // invalid office
        stops: [
          {
            id: 'bad-stop',
            stopSequence: 1,
            stopType: 'PICKUP',
            employeeId: 'e-bad',
            employeeName: 'Bad Coords',
            latitude: 0,
            longitude: 0,
            dwellBufferSeconds: 600,
          },
          {
            id: 'good-stop',
            stopSequence: 2,
            stopType: 'PICKUP',
            employeeId: 'e-good',
            employeeName: 'Good Coords',
            latitude: 17.45,
            longitude: 78.38,
            dwellBufferSeconds: 600,
          },
        ],
      });

      expect(res.excludedInvalidStopIds).toEqual(['bad-stop']);
      expect(res.totalDwellSeconds).toBe(600);
      // Drive = 1500 - 600 = 900s (15 min), totalTravelWithWait = 25 min (not 35 min!)
      expect(res.totalDurationSeconds).toBe(900);
      expect(res.totalDurationMinutes).toBe(15);
      expect(res.totalTravelWithWaitMinutes).toBe(25);
    });
  });

  describe('RouteSolverService stop metadata persistence', () => {
    it('persists addressText, employeeName, employeePhone on employee stops and office address on office stop', async () => {
      const createdStops: any[] = [];
      const db: any = {
        vehiclePricingTier: { findMany: jest.fn(async () => [{ vehicleType: 'SEDAN', seatingCapacity: '4 seats', isActive: true }]) },
        corporateOffice: {
          findFirst: jest.fn(async () => ({
            id: 'office-1',
            tenantId: 't1',
            name: 'HITEC Hub',
            addressText: 'Mindspace Gate 2, Hyderabad',
            latitude: 17.4435,
            longitude: 78.3772,
          })),
        },
        corporateTransportRequest: {
          findMany: jest.fn(async () => [
            {
              id: 'req-1',
              employeeId: 'emp-1',
              pickupLat: 17.4231,
              pickupLng: 78.3407,
              dropoffLat: 17.4435,
              dropoffLng: 78.3772,
              employee: {
                id: 'emp-1',
                employeeCode: 'E001',
                fullName: 'Asha Reddy',
                phoneNumber: '+919876543210',
                gender: 'FEMALE',
                locations: [{ addressText: 'Narsingi Circle, Hyderabad' }],
              },
            },
          ]),
          update: jest.fn(async () => ({})),
        },
        corporateRoute: {
          create: jest.fn(async ({ data }: any) => ({ id: 'solved-r1', ...data })),
        },
        corporateRouteStop: {
          create: jest.fn(async ({ data }: any) => {
            createdStops.push(data);
            return data;
          }),
        },
        $transaction: jest.fn(async (fn: any) => fn(db)),
      };
      const audit: any = { log: jest.fn(async () => undefined) };
      const solver = new RouteSolverService(db, audit);

      await solver.optimizeAndCreateRoutes({
        tenantId: 't1',
        officeId: 'office-1',
        shiftDate: '2026-11-20',
        direction: 'LOGIN',
        loginTime: '09:00',
      });

      const empStop = createdStops.find((s) => s.employeeId === 'emp-1');
      const officeStop = createdStops.find((s) => !s.employeeId);
      expect(empStop).toMatchObject({
        employeeName: 'Asha Reddy',
        employeePhone: '+919876543210',
        addressText: 'Narsingi Circle, Hyderabad',
      });
      expect(officeStop).toMatchObject({
        addressText: 'Mindspace Gate 2, Hyderabad',
        employeeName: null,
        employeePhone: null,
      });
    });
  });

  describe('CorporateRoutingController — Pagination, Search, Cancelled KPIs & RBAC Financial Isolation', () => {
    it('returns paginated routes with accurate KPIs (excluding CANCELLED from pending) and expanded search OR', async () => {
      let capturedWhere: any = null;
      let capturedOrderBy: any = null;
      const sampleRoutes = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          tenantId: 't1',
          shiftDate: new Date('2026-11-20T00:00:00.000Z'),
          shiftTime: '08:00',
          direction: 'LOGIN',
          status: 'PLANNED',
          dispatchStatus: 'PENDING',
          driverId: null,
          maxCapacity: 4,
          assignedPassengerCount: 2,
          targetPickup1Time: new Date('2026-11-20T01:30:00.000Z'),
          targetOfficeArrivalTime: new Date('2026-11-20T02:20:00.000Z'),
          estDistanceMeters: 10000,
          estDurationSeconds: 3000,
          stops: [],
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          tenantId: 't1',
          shiftDate: new Date('2026-11-20T00:00:00.000Z'),
          shiftTime: '08:00',
          direction: 'LOGIN',
          status: 'CANCELLED',
          dispatchStatus: 'PENDING',
          driverId: null,
          maxCapacity: 4,
          assignedPassengerCount: 3,
          targetPickup1Time: new Date('2026-11-20T01:30:00.000Z'),
          targetOfficeArrivalTime: new Date('2026-11-20T02:20:00.000Z'),
          estDistanceMeters: 8000,
          estDurationSeconds: 2400,
          stops: [],
        },
      ];

      const db: any = {
        corporateTenantPolicy: { findFirst: jest.fn(async () => null) },
        corporateRoute: {
          findMany: jest.fn(async (args: any) => {
            if (!args.select) {
              capturedWhere = args.where;
              capturedOrderBy = args.orderBy;
              return sampleRoutes.slice(args.skip, args.skip + args.take);
            }
            return sampleRoutes;
          }),
        },
      };

      const controller = new CorporateRoutingController({} as any, db);
      const res = await controller.listRoutes(
        't1',
        undefined,
        undefined,
        undefined,
        undefined,
        '1',
        '0',
        'true',
        undefined,
        undefined,
        '11111111-1111-4111-8111-111111111111',
        'targetPickup1Time',
        'asc',
        'true',
        { user: { role: UserRole.OPS } },
      );

      expect(capturedWhere.OR).toEqual(
        expect.arrayContaining([
          { id: '11111111-1111-4111-8111-111111111111' },
          { driver: { phone: { contains: '11111111-1111-4111-8111-111111111111', mode: 'insensitive' } } },
          { stops: { some: { employeePhone: { contains: '11111111-1111-4111-8111-111111111111', mode: 'insensitive' } } } },
          { stops: { some: { employee: { employeeCode: { contains: '11111111-1111-4111-8111-111111111111', mode: 'insensitive' } } } } },
        ]),
      );
      expect(capturedOrderBy[0]).toEqual({ targetPickup1Time: 'asc' });
      expect(res.items).toHaveLength(1);
      expect(res.pagination).toEqual({ total: 2, limit: 1, offset: 0, page: 1, totalPages: 2 });
      // Cancelled route is NOT counted in pendingOrOffering, and its 3 passengers are excluded from active totalPassengers
      expect(res.summary).toMatchObject({
        total: 2,
        pendingOrOffering: 1,
        cancelled: 1,
        assigned: 0,
        noDrivers: 0,
        totalPassengers: 2,
      });
    });

    it('enforces RBAC on GET /corporate/routes/:id (ADMIN vs OPS vs CORPORATE_ADMIN vs DRIVER)', async () => {
      const routeRow = {
        id: 'route-rbac-1',
        tenantId: 't1',
        officeId: 'o1',
        shiftDate: new Date('2026-11-20T00:00:00.000Z'),
        shiftTime: '18:00',
        direction: 'LOGOUT',
        vehicleCategory: 'SEDAN',
        maxCapacity: 3,
        assignedPassengerCount: 1,
        targetPickup1Time: new Date('2026-11-20T12:30:00.000Z'),
        targetOfficeArrivalTime: new Date('2026-11-20T12:30:00.000Z'),
        estDistanceMeters: 8000,
        estDurationSeconds: 1800,
        status: 'DISPATCHING',
        dispatchStatus: 'OFFERED',
        office: { id: 'o1', name: 'Campus', addressText: 'Mindspace, HYD', latitude: 17.44, longitude: 78.37 },
        invoiceLines: [
          {
            id: 'inv-l1',
            invoiceId: 'inv-1',
            lineType: 'TRIP',
            billableDistanceMeters: 8000,
            amountPaise: BigInt(65000),
            noShowCount: 0,
            noShowPaise: BigInt(0),
            invoice: { invoiceNumber: 'INV-2026-001', status: 'ISSUED' },
          },
        ],
        driverEarnings: [
          {
            id: 'earn-1',
            driverId: 'drv-1',
            routeFarePaise: BigInt(48000),
            approachBonusPaise: BigInt(2000),
            tollReimbursementPaise: BigInt(0),
            totalEarnedPaise: BigInt(50000),
            payoutStatus: 'UNPAID',
            voidedAt: null,
            voidReason: null,
          },
        ],
        stops: [
          {
            id: 's-office',
            stopSequence: 1,
            stopType: 'PICKUP',
            employeeId: null,
            employeeName: null,
            addressText: null,
            latitude: 17.44,
            longitude: 78.37,
            plannedEta: new Date('2026-11-20T12:30:00.000Z'),
            boardingOtp: '------',
            dwellBufferSeconds: 0,
            status: 'PENDING',
            employee: null,
          },
          {
            id: 's-emp1',
            stopSequence: 2,
            stopType: 'DROPOFF',
            employeeId: 'e1',
            employeeName: 'Meera',
            employeePhone: '+919900000001',
            addressText: 'Kondapur',
            latitude: 17.46,
            longitude: 78.36,
            plannedEta: new Date('2026-11-20T13:00:00.000Z'),
            boardingOtp: '7412',
            dwellBufferSeconds: 180,
            status: 'PENDING',
            employee: { id: 'e1', fullName: 'Meera', phoneNumber: '+919900000001', locations: [] },
          },
        ],
      };

      const db: any = {
        corporateRoute: { findUnique: jest.fn(async () => routeRow) },
        corporateTenantPolicy: { findFirst: jest.fn(async () => null) },
        corporateTripEvent: { findMany: jest.fn(async () => []) },
      };
      const opsSvc: any = {
        readPositions: jest.fn(async () => new Map([['route-rbac-1', { freshness: 'LIVE', latitude: 17.445, longitude: 78.372, lastSeenAt: new Date().toISOString(), ageSeconds: 5 }]])),
        readOfferStates: jest.fn(async () => new Map([['route-rbac-1', { state: 'OFFERED', driverId: 'drv-1', driverName: 'Ravi', secondsRemaining: 42, rejectedDriverCount: 1, offerExpiresAt: new Date().toISOString() }]])),
      };

      const controller = new CorporateRoutingController({} as any, db, undefined, undefined, opsSvc);

      // ADMIN: full ops view + canCancelRoute === true + OTP only on employee stop (NOT office '------')
      const adminView = await controller.getRouteById('route-rbac-1', 'false', { user: { role: UserRole.ADMIN } });
      expect(adminView.stops[0].isOfficeStop).toBe(true);
      expect(adminView.stops[0].addressText).toBe('Mindspace, HYD');
      expect(adminView.stops[0].boardingOtp).toBeUndefined();
      expect(adminView.stops[1].boardingOtp).toBe('7412');
      expect(adminView.permissions).toEqual({
        canForceDispatch: true,
        canReassignDriver: true,
        canCancelRoute: true,
        canManageStops: true,
      });
      expect(adminView.financials.corporateBilling.amountInr).toBe(650);
      expect(adminView.financials.driverEarning.totalEarnedInr).toBe(500);
      expect(adminView.livePosition.freshness).toBe('LIVE');
      expect(adminView.activeOffer.driverName).toBe('Ravi');

      // OPS: gets financials & reassign, but canCancelRoute === false (ADMIN-only cancel!)
      const opsView = await controller.getRouteById('route-rbac-1', 'false', { user: { role: UserRole.OPS } });
      expect(opsView.permissions.canCancelRoute).toBe(false);
      expect(opsView.permissions.canReassignDriver).toBe(true);
      expect(opsView.stops[1].boardingOtp).toBe('7412');

      // CORPORATE_ADMIN: NO OTP, NO driver earnings / financials, NO activeOffer, NO raw BigInt arrays
      const corpView = await controller.getRouteById('route-rbac-1', 'false', { user: { role: UserRole.CORPORATE_ADMIN } });
      expect(corpView.stops[1].boardingOtp).toBeUndefined();
      expect(corpView.financials).toBeUndefined();
      expect(corpView.driverEarnings).toBeUndefined();
      expect(corpView.invoiceLines).toBeUndefined();
      expect(corpView.activeOffer).toBeUndefined();

      // DRIVER: NO OTP, NO corporate billing / financials
      const driverView = await controller.getRouteById('route-rbac-1', 'false', { user: { role: UserRole.DRIVER } });
      expect(driverView.stops[1].boardingOtp).toBeUndefined();
      expect(driverView.financials).toBeUndefined();
      expect(driverView.invoiceLines).toBeUndefined();
    });

    it('buildRouteFinancials returns nulls cleanly when no invoice or earning rows exist', () => {
      expect(buildRouteFinancials({ invoiceLines: [], driverEarnings: [] })).toEqual({
        corporateBilling: null,
        driverEarning: null,
      });
    });

    it('enforces officeId filtering and rejects cross-office access for office-scoped corporate users', async () => {
      let capturedWhere: any = null;
      const findManyPolicies = jest.fn(async () => []);
      const db: any = {
        corporateTenantPolicy: { findMany: findManyPolicies },
        corporateRoute: {
          findMany: jest.fn(async (args: any) => {
            if (!args.select) capturedWhere = args.where;
            return [];
          }),
        },
      };
      const controller = new CorporateRoutingController({} as any, db);

      // Platform staff can filter by officeId
      await controller.listRoutes(
        't1',
        undefined,
        undefined,
        undefined,
        undefined,
        '25',
        '0',
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
        { user: { role: UserRole.OPS } },
        'office-hyd',
      );
      expect(capturedWhere.officeId).toBe('office-hyd');
      expect(findManyPolicies).toHaveBeenCalledTimes(1);

      // Office-scoped corporate user requesting an out-of-scope office gets 403 Forbidden
      await expect(
        controller.listPortalRoutes(
          't1',
          undefined,
          undefined,
          undefined,
          undefined,
          '25',
          '0',
          'true',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'true',
          { user: { role: UserRole.CORPORATE_MANAGER }, corporateOfficeScope: ['office-hyd'] },
          'office-blr',
        ),
      ).rejects.toThrow('Access denied for the requested office');
    });

    it('returns BigInt-safe dispatchHistory and operationalEvents only to platform staff', async () => {
      const routeRow = {
        id: 'route-hist-1',
        tenantId: 't1',
        officeId: 'o1',
        shiftDate: new Date('2026-11-20T00:00:00.000Z'),
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        maxCapacity: 4,
        assignedPassengerCount: 1,
        targetPickup1Time: new Date('2026-11-20T01:30:00.000Z'),
        targetOfficeArrivalTime: new Date('2026-11-20T02:15:00.000Z'),
        estDistanceMeters: 8000,
        estDurationSeconds: 2700,
        status: 'ASSIGNED',
        office: { id: 'o1', name: 'Campus', addressText: 'Mindspace', latitude: 17.44, longitude: 78.37 },
        driverOffers: [
          {
            id: 'offer-1',
            driverId: 'drv-1',
            attempt: 1,
            status: 'ACCEPTED',
            payoutPaise: BigInt(45000),
            expiresAt: new Date('2026-11-20T00:45:00.000Z'),
            respondedAt: new Date('2026-11-20T00:44:20.000Z'),
            rejectReason: null,
            createdAt: new Date('2026-11-20T00:44:00.000Z'),
            driver: { id: 'drv-1', fullName: 'Ravi Kumar', phone: '+919900112233' },
          },
        ],
        stops: [],
      };
      const db: any = {
        corporateRoute: { findUnique: jest.fn(async () => routeRow) },
        corporateTenantPolicy: { findFirst: jest.fn(async () => null) },
        corporateTripEvent: {
          findMany: jest.fn(async () => [
            { id: BigInt(101), type: 'ROUTE_STARTED', stopId: null, actorRole: 'DRIVER', at: new Date('2026-11-20T01:25:00.000Z') },
          ]),
        },
      };
      const controller = new CorporateRoutingController({} as any, db);

      const opsView = await controller.getRouteById('route-hist-1', 'false', { user: { role: UserRole.OPS } });
      expect(() => JSON.stringify(opsView)).not.toThrow();
      expect(opsView.dispatchHistory).toHaveLength(1);
      expect(opsView.dispatchHistory[0]).toMatchObject({ driverName: 'Ravi Kumar', payoutInr: 450, status: 'ACCEPTED' });
      expect(opsView.operationalEvents).toEqual([
        expect.objectContaining({ id: '101', type: 'ROUTE_STARTED', actorRole: 'DRIVER' }),
      ]);

      const corpView = await controller.getRouteById('route-hist-1', 'false', { user: { role: UserRole.CORPORATE_ADMIN } });
      expect(corpView.dispatchHistory).toBeUndefined();
      expect(corpView.driverOffers).toBeUndefined();
      expect(corpView.operationalEvents).toBeUndefined();
    });
  });

  describe('Industry ETS Safety & Analytics Gap Fixes (Corridor Deviation, Unexpected Stop, Valid Enums)', () => {
    it('measures point-to-corridor distance (no false positive mid-segment; detects >500m off-corridor)', async () => {
      const db: any = {
        corporateRoute: {
          findUnique: jest.fn(async () => ({
            id: 'r-dev-1',
            tenantId: 't1',
            direction: 'LOGIN',
            office: { latitude: 17.44, longitude: 78.38 },
            stops: [
              { stopSequence: 1, latitude: 17.40, longitude: 78.38 }, // ~4.4 km south of office
              { stopSequence: 2, latitude: 17.44, longitude: 78.38 },
            ],
          })),
        },
      };
      const notifications: any = { emitEvent: jest.fn() };
      const audit: any = { log: jest.fn(async () => undefined) };
      const safety = new CorporateSafetyService(db, notifications, audit);

      // Midpoint on straight corridor (2.2 km from both endpoints, 0m off corridor) -> NOT deviated!
      const onCorridor = await safety.checkRouteDeviation('r-dev-1', 17.42, 78.38);
      expect(onCorridor.isDeviated).toBe(false);
      expect(onCorridor.minDeviationMeters).toBeLessThan(20);

      // 1 km east of corridor midpoint -> DEVIATED!
      const offCorridor = await safety.checkRouteDeviation('r-dev-1', 17.42, 78.39);
      expect(offCorridor.isDeviated).toBe(true);
      expect(offCorridor.minDeviationMeters).toBeGreaterThan(500);
    });

    it('detects unexpected stationary stop (>5 min at <3 km/h >200m from scheduled stops)', async () => {
      const redisStore = new Map<string, string>();
      const client = {
        get: jest.fn(async (k: string) => redisStore.get(k) ?? null),
        set: jest.fn(async (k: string, v: string) => {
          redisStore.set(k, v);
          return 'OK';
        }),
        del: jest.fn(async (k: string) => {
          redisStore.delete(k);
          return 1;
        }),
      };
      const redis: any = { getClient: () => client };
      const db: any = {
        corporateRoute: {
          findUnique: jest.fn(async () => ({
            id: 'r-idle-1',
            tenantId: 't1',
            driverId: 'drv-1',
            direction: 'LOGIN',
            office: { latitude: 17.44, longitude: 78.38 },
            stops: [{ stopSequence: 1, latitude: 17.40, longitude: 78.38 }],
          })),
        },
      };
      const notifications: any = { emitEvent: jest.fn() };
      const audit: any = { log: jest.fn(async () => undefined) };
      const safety = new CorporateSafetyService(db, notifications, audit, redis);

      // Pre-seed idle timer 6 minutes ago
      redisStore.set(
        'corporate:safety:idle:r-idle-1',
        JSON.stringify({ startedAtMs: Date.now() - 360_000, alerted: false, lat: 17.42, lng: 78.38 }),
      );

      const res = await safety.evaluateTelemetrySafety('r-idle-1', { latitude: 17.42, longitude: 78.38, speedKph: 0 });
      expect(res.unexpectedStop).toBe(true);
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:deviation',
        'CORPORATE_UNEXPECTED_STOP_ALERT',
        expect.objectContaining({ routeId: 'r-idle-1', tenantId: 't1' }),
      );
    });

    it('exposes GET /corporate/safety/alerts/:id and queries valid enums in CorporateAnalyticsService.getExceptions', async () => {
      let capturedRouteWhere: any;
      let capturedSosArgs: any;
      const db: any = {
        corporateSosAlert: {
          findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, status: 'NEW', routeId: 'r1' })),
          findMany: jest.fn(async (args: any) => {
            capturedSosArgs = args;
            return [];
          }),
        },
        corporateTenant: { findUnique: jest.fn(async () => ({ id: 't1' })) },
        corporateTransportRequest: { findMany: jest.fn(async () => []) },
        corporateRouteStop: {
          findMany: jest.fn(async () => [
            {
              id: 'stop-1',
              stopSequence: 1,
              plannedEta: new Date('2026-11-20T02:00:00.000Z'),
              actualArrivalTime: new Date('2026-11-20T02:22:00.000Z'),
              employee: { fullName: 'Ravi' },
              route: { id: 'route-12345678', office: { name: 'Campus' } },
            },
          ]),
        },
        corporateRoute: {
          findMany: jest.fn(async (args: any) => {
            capturedRouteWhere = args.where;
            return [];
          }),
        },
      };
      const safetySvc = new CorporateSafetyService(db, { emitEvent: jest.fn() } as any, { log: jest.fn() } as any);
      const safetyCtrl = new CorporateSafetyController(safetySvc);
      const alert = await safetyCtrl.getAlert('sos-1');
      expect(alert).toMatchObject({ id: 'sos-1', status: 'NEW' });

      const analytics = new CorporateAnalyticsService(db);
      const exc = await analytics.getExceptions(
        { tenantId: 't1', from: '2026-11-20', to: '2026-11-20' },
        new Date('2026-11-20T03:00:00.000Z'),
      );
      expect(capturedRouteWhere.status).toBe('IN_TRANSIT');
      expect(capturedSosArgs.where.status.in).toEqual(['NEW', 'ACTIVE', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED']);
      expect(capturedSosArgs.orderBy).toEqual({ createdAt: 'desc' });
      expect(exc.items[0].duration).toBe('+22 min');
    });
  });
});
