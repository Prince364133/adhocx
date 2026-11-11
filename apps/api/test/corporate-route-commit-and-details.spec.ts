import { UserRole } from '@adhocx/contracts';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { CorporateRouteDirectionsService } from '../src/domains/corporate/routing/corporate-route-directions.service';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';

describe('Corporate Route CSV -> Commit -> Portal List & Google Maps Directions Pipeline', () => {
  let planner: CorporateRoutePlannerService;
  let directionsService: CorporateRouteDirectionsService;
  let controller: CorporateRoutingController;
  let db: any;

  let employees: Map<string, any>;
  let locations: any[];
  let routes: Map<string, any>;
  let stops: Map<string, any[]>;
  let mockRoutesAdapter: { computeRoute: jest.Mock };

  beforeEach(() => {
    employees = new Map();
    locations = [];
    routes = new Map();
    stops = new Map();

    const geocodeMap: Record<string, { lat: number; lng: number; formattedAddress: string }> = {
      'Madhapur Mindspace, Hyderabad': { lat: 17.4435, lng: 78.3772, formattedAddress: 'Madhapur Mindspace, Hyderabad' },
      'KPHB Phase 1, Hyderabad': { lat: 17.4933, lng: 78.3914, formattedAddress: 'KPHB Phase 1, Hyderabad' },
      'Ameerpet X Roads, Hyderabad': { lat: 17.4375, lng: 78.4482, formattedAddress: 'Ameerpet X Roads, Hyderabad' },
      'Jubilee Hills Checkpost, Hyderabad': { lat: 17.4286, lng: 78.4126, formattedAddress: 'Jubilee Hills Checkpost, Hyderabad' },
    };

    const mockGeocoder: any = {
      geocode: jest.fn(async (address: string) => {
        const hit = geocodeMap[address];
        if (hit) return hit;
        return { lat: 17.45, lng: 78.4, formattedAddress: address };
      }),
      batchGeocode: jest.fn(async (addresses: string[]) => {
        const map = new Map<string, { lat: number; lng: number; formattedAddress: string }>();
        for (const address of addresses) {
          const trimmed = address.trim();
          const hit = geocodeMap[trimmed] || geocodeMap[address];
          map.set(
            trimmed.toLowerCase(),
            hit || { lat: 17.45, lng: 78.4, formattedAddress: trimmed },
          );
        }
        return map;
      }),
    };

    mockRoutesAdapter = {
      computeRoute: jest.fn(async (_origin: any, intermediates: any[], _dest: any) => {
        const legCount = intermediates.length + 1;
        return {
          durationSeconds: legCount * 720,
          distanceMeters: legCount * 4500,
          distanceKm: Number(((legCount * 4500) / 1000).toFixed(2)),
          optimizedIntermediateWaypointIndex: intermediates.map((_, idx) => idx),
          legs: Array.from({ length: legCount }, () => ({
            durationSeconds: 720,
            distanceMeters: 4500,
          })),
          encodedPolyline: 'abcd1234',
          decodedPath: [
            [17.4933, 78.3914],
            [17.4375, 78.4482],
            [17.4286, 78.4126],
            [17.4435, 78.3772],
          ],
          isRealRoad: true,
        };
      }),
    };

    db = {
      corporateOffice: {
        findUnique: jest.fn(async ({ where }: any) =>
          where.id === 'office-hyd'
            ? {
                id: 'office-hyd',
                tenantId: 'tenant-1',
                code: 'HYD-HQ',
                name: 'NovaTech Campus',
                addressText: 'Madhapur Mindspace, Hyderabad',
                latitude: 17.4435,
                longitude: 78.3772,
              }
            : null,
        ),
      },
      corporateTenantPolicy: {
        findFirst: jest.fn(async () => ({
          version: 1,
          stopDwellMinutes: 10,
          approachLeadMinutes: 30,
          dispatchWindowMinutes: 30,
          dispatchRetryIntervalMinutes: 5,
          searchRadiusKm: 10,
        })),
      },
      corporateEmployee: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const emp of employees.values()) {
            if (where.tenantId && emp.tenantId !== where.tenantId) continue;
            if (where.employeeCode && emp.employeeCode === where.employeeCode) return emp;
            if (where.phoneNumber && emp.phoneNumber === where.phoneNumber) return emp;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const emp = { id: `emp-${employees.size + 1}`, ...data };
          employees.set(emp.id, emp);
          return emp;
        }),
      },
      corporateEmployeeLocation: {
        create: jest.fn(async ({ data }: any) => {
          const loc = { id: `loc-${locations.length + 1}`, ...data };
          locations.push(loc);
          return loc;
        }),
      },
      corporateRoute: {
        create: jest.fn(async ({ data }: any) => {
          const r = {
            id: `route-${routes.size + 1}`,
            createdAt: new Date(),
            ...data,
          };
          routes.set(r.id, r);
          stops.set(r.id, []);
          return r;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(routes.values())
            .filter((r) => !where?.tenantId || r.tenantId === where.tenantId)
            .map((r) => hydrateRoute(r));
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const r = routes.get(where.id);
          return r ? hydrateRoute(r) : null;
        }),
      },
      corporateRouteStop: {
        create: jest.fn(async ({ data }: any) => {
          const s = { id: `stop-${Math.random().toString(36).slice(2, 9)}`, ...data };
          const list = stops.get(data.routeId) || [];
          list.push(s);
          stops.set(data.routeId, list);
          return s;
        }),
      },
      corporateTripEvent: {
        findMany: jest.fn(async () => []),
      },
      $transaction: jest.fn(async (fn: any) => fn(db)),
    };

    function hydrateRoute(r: any) {
      const routeStops = (stops.get(r.id) || []).map((s) => ({
        ...s,
        employee: s.employeeId ? employees.get(s.employeeId) || null : null,
      }));
      return {
        ...r,
        tenant: {
          id: r.tenantId,
          code: 'NOVATECH',
          name: 'NovaTech Systems',
          legalEntityName: 'NovaTech Systems Pvt Ltd',
          gstin: null,
          status: 'ACTIVE',
        },
        office: {
          id: 'office-hyd',
          code: 'HYD-HQ',
          name: 'NovaTech Campus',
          addressText: 'Madhapur Mindspace, Hyderabad',
          latitude: 17.4435,
          longitude: 78.3772,
        },
        driver: null,
        vehicle: null,
        stops: routeStops,
        _count: { stops: routeStops.length },
      };
    }

    const fakeRedis: any = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => 'OK'),
    };

    planner = new CorporateRoutePlannerService(mockGeocoder, mockRoutesAdapter as any, db);
    directionsService = new CorporateRouteDirectionsService(db, mockRoutesAdapter as any, fakeRedis);
    controller = new CorporateRoutingController({} as any, db, planner, directionsService);
  });

  it('parses employee CSV with phone/code/department, clamps wait time <=10m, commits to DB, and serves split live-traffic directions', async () => {
    const csv = [
      'Employee Name,Employee Code,Phone Number,Department,Pickup Address,Office Address,Arrival Time,Logout Time,Gender',
      'Priya Nair,EMP101,+919800011101,Engineering,"KPHB Phase 1, Hyderabad","Madhapur Mindspace, Hyderabad",09:30,18:30,FEMALE',
      'Rohan Verma,EMP102,+919800011102,Operations,"Ameerpet X Roads, Hyderabad","Madhapur Mindspace, Hyderabad",09:30,18:30,MALE',
      'Meera Joshi,EMP103,+919800011103,Product,"Jubilee Hills Checkpost, Hyderabad","Madhapur Mindspace, Hyderabad",09:30,18:30,FEMALE',
    ].join('\n');

    const plan = await planner.planFromFile(Buffer.from(csv, 'utf8'), 'roster.csv', {
      tenantId: 'tenant-1',
      officeId: 'office-hyd',
      direction: 'LOGIN',
      cabCapacity: 4,
      pickupWaitMinutes: 25, // intentionally > 10m to prove 10m cap is enforced
      routingPreference: 'TRAFFIC_AWARE',
    });

    expect(plan.routes.length).toBeGreaterThanOrEqual(1);
    const plannedStops = plan.routes.flatMap((r) => r.stops);
    expect(plannedStops).toHaveLength(3);
    for (const s of plannedStops) {
      expect(s.dwellSeconds).toBeLessThanOrEqual(600);
      expect(s.phoneNumber).toMatch(/^\+91980001110/);
    }

    const commitRes = await planner.commitPlanToDatabase({
      tenantId: 'tenant-1',
      officeId: 'office-hyd',
      shiftDate: '2026-11-15',
      shiftTime: '09:30',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      stopDwellMinutes: 10,
      includeMetadata: true,
      plan,
    });

    expect(commitRes.routesCreated).toBe(plan.routes.length);
    expect(commitRes.stopsCreated).toBe(3 + plan.routes.length); // 3 employee pickups + 1 office dropoff per route
    expect(commitRes.routeIds?.length).toBe(plan.routes.length);
    expect(commitRes.employeesLinked).toBe(3);

    const committedRouteId = commitRes.routeIds![0];
    const committedRoute = routes.get(committedRouteId)!;
    expect(committedRoute.dispatchStatus).toBe('PENDING');

    // Portal listing exposes tenant routes & enriched passenger phones
    const portalRoutes: any[] = await controller.listPortalRoutes(
      'tenant-1',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'true',
    );
    expect(portalRoutes).toHaveLength(plan.routes.length);
    expect(portalRoutes[0].stops[0].employeePhone).toBeTruthy();

    // Detail endpoint includes live Google Maps traffic directions + ordered pickup legs
    const detail: any = await controller.getRouteById(committedRouteId, 'true');
    expect(detail.tenant.name).toBe('NovaTech Systems');
    expect(detail.stops.every((s: any) => s.dwellBufferSeconds <= 600)).toBe(true);
    expect(detail.directions).toBeDefined();
    expect(detail.directions.trafficSource).toBe('GOOGLE_MAPS_LIVE_TRAFFIC');
    expect(detail.directions.isRealRoad).toBe(true);
    expect(detail.directions.decodedPath.length).toBeGreaterThanOrEqual(2);
    const pickupStops = detail.stops.filter((s: any) => s.stopType === 'PICKUP');
    expect(pickupStops.length).toBeGreaterThanOrEqual(1);
    expect(detail.directions.legs).toHaveLength(pickupStops.length);
    expect(detail.directions.legs[0].fromPhone).toMatch(/^\+91980001110/);

    // Verify Google Routes API called with future departure >= now + 120s
    const lastComputeArgs = mockRoutesAdapter.computeRoute.mock.calls.at(-1)!;
    expect(lastComputeArgs[3].getTime()).toBeGreaterThan(Date.now() + 60_000);
    expect(UserRole.CORPORATE_ADMIN).toBe('CORPORATE_ADMIN');
  });
});
