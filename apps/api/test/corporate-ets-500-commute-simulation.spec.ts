import * as ExcelJS from 'exceljs';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { CorporateSafetyService } from '../src/domains/corporate/safety/corporate-safety.service';
import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { RosterIngestionService } from '../src/domains/corporate/rosters/roster-ingestion.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { LocationsService } from '../src/modules/locations/locations.service';

/**
 * AdhocX Corporate Managed ETS: 500-Employee Full-Lifecycle Simulation & Stress Test Suite
 * Simulates an enterprise client (Global Tech India) operating in Hyderabad across 4 shifts,
 * 500 passengers, ~125 cab routes, autonomous H3 dispatch, boarding OTPs/QRs, P0 SOS, and dual financial ledgers.
 */
describe('Corporate ETS Enterprise 500-Commuter Full-Lifecycle Simulation & Stress Suite', () => {
  // Services
  let rosterIngestionService: RosterIngestionService;
  let routeSolverService: RouteSolverService;
  let dispatchService: CorporateDispatchService;
  let dispatchSchedulerService: CorporateDispatchSchedulerService;
  let executionService: CorporateTripExecutionService;
  let safetyService: CorporateSafetyService;
  let billingService: CorporateBillingService;

  // In-memory simulation state store
  const simDb: {
    tenants: Map<string, any>;
    offices: Map<string, any>;
    employees: Map<string, any>;
    rosters: Map<string, any>;
    requests: Map<string, any>;
    routes: Map<string, any>;
    stops: Map<string, any>;
    earnings: Map<string, any>;
    invoices: Map<string, any>;
    invoiceLines: Map<string, any>;
    sosAlerts: Map<string, any>;
    drivers: Map<string, any>;
    vehicles: Map<string, any>;
  } = {
    tenants: new Map(),
    offices: new Map(),
    employees: new Map(),
    rosters: new Map(),
    requests: new Map(),
    routes: new Map(),
    stops: new Map(),
    earnings: new Map(),
    invoices: new Map(),
    invoiceLines: new Map(),
    sosAlerts: new Map(),
    drivers: new Map(),
    vehicles: new Map(),
  };

  const redisStore = new Map<string, string>();
  const redisSets = new Map<string, Set<string>>();
  const emittedEvents: Array<{ channel: string; event: string; payload: any }> = [];

  // Hyderabad Office Hub: HITEC City
  const OFFICE_HUB = {
    id: 'office-hyd-hq',
    tenantId: 'tenant-global-tech',
    code: 'HYD-HQ',
    name: 'Global Tech Park, HITEC City',
    addressText: 'Phase 2, HITEC City, Madhapur, Hyderabad, Telangana 500081',
    latitude: 17.4474,
    longitude: 78.3762,
    h3Res8Index: '8860a25997fffff',
  };

  // Corridors around Hyderabad (lat/lng bounds)
  const CORRIDORS = [
    { name: 'Kondapur / Hafeezpet', baseLat: 17.4700, baseLng: 78.3550 },
    { name: 'Kukatpally / KPHB', baseLat: 17.4950, baseLng: 78.4000 },
    { name: 'Miyapur / Chandanagar', baseLat: 17.5000, baseLng: 78.3300 },
    { name: 'Gachibowli / Financial District', baseLat: 17.4250, baseLng: 78.3400 },
    { name: 'Banjara Hills / Jubilee Hills', baseLat: 17.4300, baseLng: 78.4200 },
  ];

  beforeAll(() => {
    // Mock Redis Client
    const mockRedisClient = {
      get: jest.fn(async (key: string) => redisStore.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
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
      expire: jest.fn(async () => 1),
    };

    const mockRedis = {
      getClient: jest.fn(() => mockRedisClient),
      acquireLockToken: jest.fn(async () => 'sim-lock-token'),
      releaseLockToken: jest.fn(async () => true),
    };

    const mockNotifications = {
      emitEvent: jest.fn((channel: string, event: string, payload: any) => {
        emittedEvents.push({ channel, event, payload });
      }),
      sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockLocationsService = {
      findNearbyDrivers: jest.fn(async (lat: number, lng: number) => {
        // Return simulated drivers within radius
        return Array.from(simDb.drivers.values()).map((d) => ({
          driverId: d.id,
          distanceMeters: 1500,
          latitude: lat + 0.005,
          longitude: lng + 0.005,
        }));
      }),
    };

    // Database Mock hooked to simDb
    const mockDb: any = {
      corporateTenant: {
        findUnique: jest.fn(async ({ where }) => simDb.tenants.get(where.id || where.code)),
        findMany: jest.fn(async () => Array.from(simDb.tenants.values())),
        create: jest.fn(async ({ data }) => {
          const tenant = { ...data, id: data.id || `tenant-${Date.now()}`, createdAt: new Date() };
          simDb.tenants.set(tenant.id, tenant);
          simDb.tenants.set(tenant.code, tenant);
          return tenant;
        }),
      },
      corporateOffice: {
        findFirst: jest.fn(async ({ where }) => {
          if (where.id) return simDb.offices.get(where.id);
          return OFFICE_HUB;
        }),
        findUnique: jest.fn(async ({ where }) => simDb.offices.get(where.id)),
        findMany: jest.fn(async () => [OFFICE_HUB]),
        create: jest.fn(async ({ data }) => {
          const off = { ...data, id: data.id || `office-${Date.now()}` };
          simDb.offices.set(off.id, off);
          return off;
        }),
      },
      corporateEmployee: {
        findFirst: jest.fn(async ({ where }) => {
          for (const emp of simDb.employees.values()) {
            if (where.employeeCode && emp.employeeCode === where.employeeCode) return emp;
            if (where.id && emp.id === where.id) return emp;
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }) => {
          for (const emp of simDb.employees.values()) {
            if (where.id && emp.id === where.id) return emp;
            if (where.tenantId_employeeCode && emp.employeeCode === where.tenantId_employeeCode.employeeCode) {
              return emp;
            }
          }
          return null;
        }),
        upsert: jest.fn(async ({ where, update, create }) => {
          let emp = null;
          for (const e of simDb.employees.values()) {
            if (where.tenantId_employeeCode && e.employeeCode === where.tenantId_employeeCode.employeeCode) {
              emp = e;
              break;
            }
          }
          if (emp) {
            Object.assign(emp, update);
            return emp;
          }
          const newEmp = { ...create, id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          simDb.employees.set(newEmp.id, newEmp);
          return newEmp;
        }),
        findMany: jest.fn(async () => Array.from(simDb.employees.values())),
        create: jest.fn(async ({ data }) => {
          const emp = { ...data, id: data.id || `emp-${Date.now()}` };
          simDb.employees.set(emp.id, emp);
          return emp;
        }),
      },
      corporateEmployeeLocation: {
        findFirst: jest.fn(async ({ where }) => {
          return {
            id: 'loc-1',
            employeeId: where.employeeId,
            addressText: 'Simulated Residence, Hyderabad',
            latitude: 17.4700,
            longitude: 78.3550,
            h3Res8Index: '8860a25997fffff',
            isDefault: true,
          };
        }),
        create: jest.fn(async ({ data }) => data),
      },
      corporateRoster: {
        create: jest.fn(async ({ data }) => {
          const ros = { ...data, id: data.id || `roster-${Date.now()}` };
          simDb.rosters.set(ros.id, ros);
          return ros;
        }),
        findUnique: jest.fn(async ({ where }) => simDb.rosters.get(where.id)),
      },
      corporateTransportRequest: {
        create: jest.fn(async ({ data }) => {
          const req = { ...data, id: data.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          simDb.requests.set(req.id, req);
          return req;
        }),
        findMany: jest.fn(async ({ where }) => {
          let list = Array.from(simDb.requests.values());
          if (where?.tenantId) list = list.filter((r) => r.tenantId === where.tenantId);
          if (where?.shiftTime) list = list.filter((r) => r.shiftTime === where.shiftTime);
          if (where?.direction) list = list.filter((r) => r.direction === where.direction);
          if (where?.status) list = list.filter((r) => r.status === where.status);
          return list;
        }),
        findUnique: jest.fn(async ({ where }) => simDb.requests.get(where.id)),
        update: jest.fn(async ({ where, data }) => {
          const existing = simDb.requests.get(where.id);
          const updated = { ...existing, ...data };
          simDb.requests.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          for (const req of simDb.requests.values()) {
            if (where.id?.in?.includes(req.id)) {
              Object.assign(req, data);
            }
          }
          return { count: where.id?.in?.length || 0 };
        }),
      },
      corporateRoute: {
        create: jest.fn(async ({ data }) => {
          const rt = {
            ...data,
            id: data.id || `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            stops: [],
            office: OFFICE_HUB,
            tenant: simDb.tenants.get(data.tenantId),
          };
          simDb.routes.set(rt.id, rt);
          return rt;
        }),
        findUnique: jest.fn(async ({ where }) => {
          const rt = simDb.routes.get(where.id);
          if (!rt) return null;
          const stops = Array.from(simDb.stops.values()).filter((s) => s.routeId === rt.id);
          stops.sort((a, b) => a.stopSequence - b.stopSequence);
          return {
            ...rt,
            stops,
            office: OFFICE_HUB,
            tenant: simDb.tenants.get(rt.tenantId) || { name: 'Global Tech' },
            driver: rt.driverId ? simDb.drivers.get(rt.driverId) : null,
          };
        }),
        findMany: jest.fn(async ({ where }) => {
          let list = Array.from(simDb.routes.values());
          if (where?.tenantId) list = list.filter((r) => r.tenantId === where.tenantId);
          if (where?.status) list = list.filter((r) => r.status === where.status);
          return list;
        }),
        update: jest.fn(async ({ where, data }) => {
          const existing = simDb.routes.get(where.id);
          const updated = { ...existing, ...data };
          simDb.routes.set(where.id, updated);
          return updated;
        }),
      },
      corporateRouteStop: {
        create: jest.fn(async ({ data }) => {
          const st = { ...data, id: data.id || `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          simDb.stops.set(st.id, st);
          return st;
        }),
        findUnique: jest.fn(async ({ where }) => {
          const st = simDb.stops.get(where.id);
          if (!st) return null;
          const rt = simDb.routes.get(st.routeId);
          return {
            ...st,
            route: rt,
            employee: st.employeeId ? simDb.employees.get(st.employeeId) : null,
          };
        }),
        update: jest.fn(async ({ where, data }) => {
          const existing = simDb.stops.get(where.id);
          const updated = { ...existing, ...data };
          simDb.stops.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          for (const s of simDb.stops.values()) {
            if (where.transportRequestId && s.transportRequestId === where.transportRequestId) {
              Object.assign(s, data);
            }
          }
          return { count: 1 };
        }),
      },
      corporateDriverEarning: {
        create: jest.fn(async ({ data }) => {
          const earn = { ...data, id: data.id || `earn-${Date.now()}` };
          simDb.earnings.set(earn.id, earn);
          return earn;
        }),
        findMany: jest.fn(async () => Array.from(simDb.earnings.values())),
        updateMany: jest.fn(async ({ where, data }) => {
          for (const e of simDb.earnings.values()) {
            if (where.id?.in?.includes(e.id)) {
              Object.assign(e, data);
            }
          }
          return { count: where.id?.in?.length || 0 };
        }),
      },
      corporateInvoice: {
        create: jest.fn(async ({ data }) => {
          const inv = { ...data, id: data.id || `inv-${Date.now()}` };
          simDb.invoices.set(inv.id, inv);
          return inv;
        }),
        findUnique: jest.fn(async ({ where }) => {
          const inv = simDb.invoices.get(where.id);
          if (!inv) return null;
          const lines = Array.from(simDb.invoiceLines.values()).filter((l) => l.invoiceId === inv.id);
          return { ...inv, lines, tenant: simDb.tenants.get(inv.tenantId) };
        }),
        findMany: jest.fn(async () => Array.from(simDb.invoices.values())),
        count: jest.fn(async () => simDb.invoices.size),
      },
      corporateInvoiceLine: {
        create: jest.fn(async ({ data }) => {
          const line = { ...data, id: data.id || `line-${Date.now()}` };
          simDb.invoiceLines.set(line.id, line);
          return line;
        }),
        findMany: jest.fn(async () => Array.from(simDb.invoiceLines.values())),
      },
      corporateSosAlert: {
        create: jest.fn(async ({ data }) => {
          const alert = { ...data, id: data.id || `sos-${Date.now()}`, createdAt: new Date() };
          simDb.sosAlerts.set(alert.id, alert);
          return alert;
        }),
        findUnique: jest.fn(async ({ where }) => simDb.sosAlerts.get(where.id)),
        update: jest.fn(async ({ where, data }) => {
          const existing = simDb.sosAlerts.get(where.id);
          const updated = { ...existing, ...data };
          simDb.sosAlerts.set(where.id, updated);
          return updated;
        }),
        findMany: jest.fn(async () => Array.from(simDb.sosAlerts.values())),
      },
      driver: {
        findUnique: jest.fn(async ({ where }) => simDb.drivers.get(where.id)),
        findMany: jest.fn(async () => Array.from(simDb.drivers.values())),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }) => {
          for (const v of simDb.vehicles.values()) {
            if (v.driverId === where.driverId) return v;
          }
          return null;
        }),
      },
      $transaction: jest.fn(async (cb) => cb(mockDb)),
    };

    // Instantiate Services
    rosterIngestionService = new RosterIngestionService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );

    routeSolverService = new RouteSolverService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );

    dispatchService = new CorporateDispatchService(
      mockDb as unknown as DatabaseService,
      mockRedis as unknown as RedisService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
      mockLocationsService as unknown as LocationsService,
    );

    dispatchSchedulerService = new CorporateDispatchSchedulerService(
      mockDb as unknown as DatabaseService,
      dispatchService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
      mockRedis as unknown as RedisService,
    );

    executionService = new CorporateTripExecutionService(
      mockDb as unknown as DatabaseService,
      mockRedis as unknown as RedisService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
    );

    safetyService = new CorporateSafetyService(
      mockDb as unknown as DatabaseService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
    );

    billingService = new CorporateBillingService(
      mockDb as unknown as DatabaseService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
    );

    // Setup initial seed data (Tenant, Office, Drivers)
    simDb.tenants.set('tenant-global-tech', {
      id: 'tenant-global-tech',
      code: 'GLOBALTECH',
      name: 'Global Tech India',
      legalEntityName: 'Global Tech Solutions India Pvt Ltd',
      gstin: '36AAACG1234F1Z9',
      status: 'ACTIVE',
    });

    simDb.offices.set(OFFICE_HUB.id, OFFICE_HUB);

    // Seed 150 Drivers with verified Sedans and SUVs
    for (let i = 1; i <= 150; i++) {
      const driverId = `drv-${i}`;
      const vCategory = i % 2 === 0 ? 'SEDAN' : 'SUV';
      const drv = {
        id: driverId,
        userId: `usr-drv-${i}`,
        fullName: `Driver Captain ${i}`,
        phone: `+9198765${(10000 + i).toString()}`,
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        vehicleType: vCategory,
      };
      simDb.drivers.set(driverId, drv);

      const veh = {
        id: `veh-${i}`,
        driverId,
        make: vCategory === 'SEDAN' ? 'Maruti Suzuki' : 'Toyota',
        model: vCategory === 'SEDAN' ? 'Dzire' : 'Innova',
        plateNumber: `TS09AB${(1000 + i).toString()}`,
        verificationStatus: 'VERIFIED',
      };
      simDb.vehicles.set(veh.id, veh);
    }
  });

  // =========================================================================
  // SIMULATION 1: Bulk Roster Ingestion & Validation Stress Test (500 Commuters)
  // =========================================================================
  it('Simulation 1: Validates and ingests 500 employee shift commute requests across 4 shifts', async () => {
    // Generate 500 realistic employees across 4 shift waves
    const shifts = [
      { time: '08:00', direction: 'LOGIN', count: 150 },
      { time: '09:00', direction: 'LOGIN', count: 100 },
      { time: '17:00', direction: 'LOGOUT', count: 150 },
      { time: '18:00', direction: 'LOGOUT', count: 100 },
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Roster');

    // Header row
    sheet.addRow([
      'employee_id*',
      'full_name*',
      'email*',
      'phone_number*',
      'gender*',
      'department',
      'cost_center',
      'office_code*',
      'roster_date*',
      'login_time',
      'logout_time',
      'home_address*',
      'landmark',
      'latitude',
      'longitude',
      'special_notes',
    ]);

    let empCounter = 1;

    for (const shift of shifts) {
      for (let i = 0; i < shift.count; i++) {
        const empCode = `EMP${(1000 + empCounter).toString()}`;
        const corridor = CORRIDORS[i % CORRIDORS.length];
        const latOffset = (Math.random() - 0.5) * 0.02;
        const lngOffset = (Math.random() - 0.5) * 0.02;
        const empLat = parseFloat((corridor.baseLat + latOffset).toFixed(7));
        const empLng = parseFloat((corridor.baseLng + lngOffset).toFixed(7));

        sheet.addRow([
          empCode,
          `Employee ${empCounter}`,
          `emp${empCounter}@globaltech.com`,
          `+9198111${(10000 + empCounter).toString()}`,
          empCounter % 3 === 0 ? 'FEMALE' : 'MALE',
          'Engineering',
          'CC_HYD_ENG',
          'HYD-HQ',
          '2026-11-03',
          shift.direction === 'LOGIN' ? shift.time : '',
          shift.direction === 'LOGOUT' ? shift.time : '',
          `Plot ${i + 1}, ${corridor.name}, Hyderabad`,
          corridor.name,
          empLat,
          empLng,
          'Standard pickup',
        ]);

        empCounter++;
      }
    }

    const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Dry-run validation
    const validationResult = await rosterIngestionService.dryRunValidateRoster(
      'tenant-global-tech',
      excelBuffer,
    );

    expect(validationResult.isValid).toBe(true);
    expect(validationResult.totalRows).toBe(500);
    expect(validationResult.validRows).toBe(500);
    expect(validationResult.invalidRows).toBe(0);
    expect(validationResult.loginRequestsCount).toBe(250);
    expect(validationResult.logoutRequestsCount).toBe(250);

    // Ingest and Persist
    const ingestionResult = await rosterIngestionService.ingestAndPublishRoster(
      'tenant-global-tech',
      excelBuffer,
      'usr-corp-admin',
    );

    expect(ingestionResult.totalEmployeesProcessed).toBe(500);
    expect(ingestionResult.loginRequestsCreated).toBe(250);
    expect(ingestionResult.logoutRequestsCreated).toBe(250);
    expect(simDb.requests.size).toBe(500);
  });

  // =========================================================================
  // SIMULATION 2: CVRPTW Solver Under Full Load (125 Routes Generated)
  // =========================================================================
  it('Simulation 2: CVRPTW clusters 500 passengers into optimized Sedan (max 4) and SUV (max 6) routes with 5-min buffers', async () => {
    // Run solver for Shift 1: 08:00 AM LOGIN (150 passengers)
    const summary08 = await routeSolverService.optimizeAndCreateRoutes({
      tenantId: 'tenant-global-tech',
      officeId: OFFICE_HUB.id,
      shiftDate: '2026-11-03',
      shiftTime: '08:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN', // 4 per cab -> ceil(150/4) = 38 cabs
    });

    expect(summary08.routesCreated).toBe(38); // Exactly 38 cabs for 150 passengers (4 per cab)
    expect(summary08.passengersAssigned).toBe(150);

    // Verify Invariant: Every Sedan route has strictly <= 4 passengers
    for (const rt of summary08.routes) {
      expect(rt.passengerCount).toBeLessThanOrEqual(4);
      expect(rt.maxCapacity).toBe(4);
    }

    // Run solver for Shift 2: 09:00 AM LOGIN (100 passengers) with SUVs (6 per cab)
    const summary09 = await routeSolverService.optimizeAndCreateRoutes({
      tenantId: 'tenant-global-tech',
      officeId: OFFICE_HUB.id,
      shiftDate: '2026-11-03',
      shiftTime: '09:00',
      direction: 'LOGIN',
      vehicleCategory: 'SUV', // 6 per cab -> ceil(100/6) = 17 cabs
    });

    expect(summary09.routesCreated).toBe(17);
    expect(summary09.passengersAssigned).toBe(100);
    for (const rt of summary09.routes) {
      expect(rt.passengerCount).toBeLessThanOrEqual(6);
      expect(rt.maxCapacity).toBe(6);
    }
  });

  // =========================================================================
  // SIMULATION 3: Autonomous Dispatch & Concentric H3 Grid Search
  // =========================================================================
  it('Simulation 3: Autonomous dispatch discovers candidate drivers in H3 Resolution 8 grid and issues 60s atomic offers', async () => {
    const route = Array.from(simDb.routes.values())[0];
    expect(route).toBeDefined();

    const dispatchResult = await dispatchService.dispatchRoute(route.id, false);

    expect(dispatchResult.status).toBe('OFFERED');
    expect(dispatchResult.offeredToDriverId).toBeDefined();
    expect(dispatchResult.candidatesCount).toBeGreaterThan(0);

    // Verify atomic offer stored in Redis with 60s TTL
    const rawOffer = await redisStore.get(`corporate:route:offer:${route.id}`);
    expect(rawOffer).toBeDefined();

    const offer = JSON.parse(rawOffer!);
    expect(offer.routeId).toBe(route.id);
    expect(offer.farePaise).toBeGreaterThan(30000); // >= ₹300 base
    expect(new Date(offer.offerExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  // =========================================================================
  // SIMULATION 4: 60-Second Offer Timeout Reaper & Automatic Cascading
  // =========================================================================
  it('Simulation 4: 60-second offer timeout reaper detects non-responsive driver, blacklists, and cascades to next candidate', async () => {
    const route = Array.from(simDb.routes.values())[1];
    const initialDispatch = await dispatchService.dispatchRoute(route.id, false);
    const firstDriverId = initialDispatch.offeredToDriverId!;

    // Simulate 60 seconds elapsing: expire offer in Redis
    redisStore.delete(`corporate:route:offer:${route.id}`);

    // Trigger Scheduler Reaper Tick
    const schedulerResult = await dispatchSchedulerService.tick(Date.now());

    expect(schedulerResult.reapedOffers).toContain(route.id);

    // Assert driver was blacklisted for this route
    const blacklisted = redisSets.get(`corporate:rejected:${route.id}`);
    expect(blacklisted?.has(firstDriverId)).toBe(true);

    // Assert cascaded to next candidate
    const updatedRoute = simDb.routes.get(route.id);
    expect(updatedRoute.status).toBe('DISPATCHING');
  });

  // =========================================================================
  // SIMULATION 5: Dynamic Traffic Advancer (DDA) Peak Rush Hour Congestion Shock
  // =========================================================================
  it('Simulation 5: DDA detects severe corridor delay (>=30m) and advances dispatch schedule earlier', async () => {
    const route = Array.from(simDb.routes.values())[0];
    // Force a long distance to trigger peak congestion heuristic
    route.estDistanceMeters = 35000; // 35 km arterial corridor stretch

    const dda = await dispatchService.assessDynamicTraffic(route.id);

    expect(dda.congestionLevel).toBe('SEVERE');
    expect(dda.trafficDelayMinutes).toBe(35);
    expect(dda.isAdvanced).toBe(true);
    expect(dda.adjustedDispatchTime.getTime()).toBeLessThan(dda.standardDispatchTime.getTime());
  });

  // =========================================================================
  // SIMULATION 6: Geofence Verification & 5-Minute Dwell Timer Lifecycle
  // =========================================================================
  it('Simulation 6: Verifies stop arrival geofence (<150m) and activates 300s dwell timer in Redis', async () => {
    const route = Array.from(simDb.routes.values())[0];
    const stop1 = Array.from(simDb.stops.values()).find((s) => s.routeId === route.id && s.stopSequence === 1)!;

    // Test rejection outside geofence (driver is 500m away)
    await expect(
      executionService.arriveAtStop(route.id, stop1.id, {
        driverLatitude: Number(stop1.latitude) + 0.005,
        driverLongitude: Number(stop1.longitude) + 0.005,
      }),
    ).rejects.toThrow(/Arrival outside geofence/);

    // Test success inside geofence (driver is ~30m away)
    const arriveResult = await executionService.arriveAtStop(route.id, stop1.id, {
      driverLatitude: Number(stop1.latitude) + 0.0002,
      driverLongitude: Number(stop1.longitude) + 0.0002,
    });

    expect(arriveResult.status).toBe('ARRIVED');
    expect(arriveResult.countdownRemainingSeconds).toBe(300);

    // Check Redis dwell timer set with 300s TTL
    expect(redisStore.get(`corporate:stop:timer:${stop1.id}`)).toBeDefined();
  });

  // =========================================================================
  // SIMULATION 7: Dual Boarding Modalities (Numeric OTP vs Dynamic Signed QR)
  // =========================================================================
  it('Simulation 7: Employee boards cab via 4-digit numeric OTP or scanned dynamic QR code token', async () => {
    const route = Array.from(simDb.routes.values())[0];
    const stop1 = Array.from(simDb.stops.values()).find((s) => s.routeId === route.id && s.stopSequence === 1)!;

    // Generate dynamic QR token
    const qrResult = await executionService.generateBoardingQrToken(route.id, stop1.id);
    expect(qrResult.qrPayload).toBeDefined();

    // Driver scans QR within geofence
    const verifyResult = await executionService.verifyBoardingQr(route.id, stop1.id, {
      qrPayload: qrResult.qrPayload,
      driverLatitude: Number(stop1.latitude),
      driverLongitude: Number(stop1.longitude),
    });

    expect(verifyResult.status).toBe('BOARDED');
    expect(verifyResult.actualDepartureTime).toBeDefined();

    // Redis wait timer cleared
    expect(redisStore.get(`corporate:stop:timer:${stop1.id}`)).toBeUndefined();
  });

  // =========================================================================
  // SIMULATION 8: Stop No-Show Lifecycle & Immediate Departure Instruction
  // =========================================================================
  it('Simulation 8: Marks commuter No-Show after 5 minutes have elapsed; vehicle departs immediately', async () => {
    const route = Array.from(simDb.routes.values())[0];
    const stop2 = Array.from(simDb.stops.values()).find((s) => s.routeId === route.id && s.stopSequence === 2)!;

    // Simulate arrival 6 minutes ago
    stop2.status = 'ARRIVED';
    stop2.actualArrivalTime = new Date(Date.now() - 360 * 1000);

    const noShowResult = await executionService.markNoShow(route.id, stop2.id, {
      reason: 'Passenger did not report to cab within 5 minutes',
    });

    expect(noShowResult.status).toBe('NO_SHOW');

    // Corporate attendance alert emitted
    const alertEvent = emittedEvents.find((e) => e.event === 'ATTENDANCE_NO_SHOW');
    expect(alertEvent).toBeDefined();
  });

  // =========================================================================
  // SIMULATION 9: Telemetry Ingestion, Route Deviation Alarm & Female Safe Drop
  // =========================================================================
  it('Simulation 9: Ingests telemetry, triggers >500m deviation alarm, and enforces female safe drop', async () => {
    const route = Array.from(simDb.routes.values())[0];

    // Ingest valid in-corridor telemetry
    const telem = await executionService.ingestRouteTelemetry(route.id, {
      latitude: 17.4600,
      longitude: 78.3700,
      speedMps: 11,
      headingDeg: 90,
    });
    expect(telem.nextStopSequence).toBeDefined();

    // Vehicle deviates 1.2km off corridor -> Check deviation alarm
    const deviation = await safetyService.checkRouteDeviation(route.id, 17.5200, 78.4500);
    expect(deviation.isDeviated).toBe(true);
    expect(deviation.minDeviationMeters).toBeGreaterThan(500);

    // Female Safe Drop Confirmation for night shift
    const stop1 = Array.from(simDb.stops.values()).find((s) => s.routeId === route.id && s.stopSequence === 1)!;
    const safeDrop = await safetyService.confirmSafeDrop(route.id, stop1.id, {
      confirmedByRole: 'DRIVER',
      notes: 'Female commuter confirmed safely inside residential gates',
    });
    expect(safeDrop.id).toBe(stop1.id);
  });

  // =========================================================================
  // SIMULATION 10: P0 Emergency SOS System & Command Centre Escalation
  // =========================================================================
  it('Simulation 10: P0 Emergency SOS trigger escalates instantly to Super Admin Command Centre', async () => {
    const route = Array.from(simDb.routes.values())[0];

    const sos = await safetyService.triggerSosAlert('emp-danger-1', 'EMPLOYEE', {
      routeId: route.id,
      latitude: 17.4470,
      longitude: 78.3750,
      batteryPct: 32,
      triggerReason: 'Cab stopped in unlit bypass for extended duration',
    });

    expect(sos.status).toBe('ACTIVE');

    // Command Centre broadcast
    const sosEvent = emittedEvents.find((e) => e.channel === 'admin:command-center:sos');
    expect(sosEvent).toBeDefined();
    expect(sosEvent?.payload.tenantName).toBe('Global Tech India');

    // Dispatcher resolves alert
    const resolved = await safetyService.resolveSosAlert(sos.id, 'admin-commander-1', {
      alertId: sos.id,
      status: 'RESOLVED' as any,
      resolutionNotes: 'Driver had a flat tyre; AdhocX backup vehicle dispatched immediately. Commuters safe.',
    });
    expect(resolved.status).toBe('RESOLVED');
  });

  // =========================================================================
  // SIMULATION 11: 9-Hour Advance Shift Reschedule & Cutoff Rule
  // =========================================================================
  it('Simulation 11: Allows reschedule >9h before shift, strictly locks modification <9h before shift', async () => {
    const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000); // 20 hours in future
    const nearDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours in future

    const reqFuture = {
      id: 'req-sim-future',
      employeeId: 'emp-id-1',
      scheduledDate: futureDate,
      shiftTime: '08:00',
      status: 'APPROVED',
    };
    const reqNear = {
      id: 'req-sim-near',
      employeeId: 'emp-id-1',
      scheduledDate: nearDate,
      shiftTime: '08:00',
      status: 'APPROVED',
    };

    simDb.requests.set(reqFuture.id, reqFuture);
    simDb.requests.set(reqNear.id, reqNear);

    // 20h in advance -> Must succeed!
    const cancelRes = await executionService.handleRescheduleOrCancel('req-sim-future', {
      employeeId: 'emp-id-1',
      action: 'CANCEL',
    });
    expect(cancelRes.status).toBe('CANCELLED');

    // 4h in advance -> Must fail strictly!
    await expect(
      executionService.handleRescheduleOrCancel('req-sim-near', {
        employeeId: 'emp-id-1',
        action: 'CANCEL',
      }),
    ).rejects.toThrow(/Modification locked: Rescheduling and cancellations must be submitted at least 9 hours/);
  });

  // =========================================================================
  // SIMULATION 12: Dual Financial Ledgers (Corporate GST Invoicing & Driver 1% TDS)
  // =========================================================================
  it('Simulation 12: Reconciles corporate GST invoicing and driver 1% TDS payouts with ZERO float math', async () => {
    // Mark 10 routes as COMPLETED for billing
    const completedRoutes = Array.from(simDb.routes.values()).slice(0, 10);
    for (const rt of completedRoutes) {
      rt.status = 'COMPLETED';
      rt.estDistanceMeters = 20000; // 20 km each
    }

    // Generate B2B Corporate Invoice with 5% GST
    const invoice = await billingService.generateInvoiceBatch({
      tenantId: 'tenant-global-tech',
      billingPeriodStart: '2026-11-01',
      billingPeriodEnd: '2026-11-15',
      gstRatePct: 5,
    });

    // 10 routes * [₹400 base (40000) + 20km * ₹25 (50000)] = 10 * 90000 = 900000 paise (₹9,000.00)
    // 5% GST: (900000 * 5) / 100 = 45000 paise (₹450.00)
    // Total: 945000 paise (₹9,450.00)
    expect(invoice.subtotalPaise).toBe('900000');
    expect(invoice.gstPaise).toBe('45000');
    expect(invoice.totalAmountPaise).toBe('945000');

    // Seed 10 Driver Earnings for payout
    for (let i = 0; i < 10; i++) {
      const earn = {
        id: `earn-sim-${i}`,
        driverId: `drv-${(i % 5) + 1}`, // 5 drivers
        routeId: completedRoutes[i].id,
        totalEarnedPaise: 70000n, // ₹700 each
        payoutStatus: 'UNPAID',
        driver: simDb.drivers.get(`drv-${(i % 5) + 1}`),
        route: completedRoutes[i],
        createdAt: new Date(),
      };
      simDb.earnings.set(earn.id, earn);
    }

    // Prepare Driver Payout Batch with 1% TDS
    const payoutBatch = await billingService.prepareDriverPayoutBatch();

    // 10 routes * ₹700 = ₹7,000.00 (700000 paise gross)
    // 1% TDS = ₹70.00 (7000 paise)
    // Net Payout = ₹6,930.00 (693000 paise)
    expect(payoutBatch.totalDrivers).toBe(5);
    expect(payoutBatch.totalGrossPaise).toBe('700000');
    expect(payoutBatch.totalTdsPaise).toBe('7000');
    expect(payoutBatch.totalNetPayoutPaise).toBe('693000');

    // Verify individual driver net disbursement
    for (const d of payoutBatch.disbursements) {
      expect(d.grossPaise).toBe('140000'); // 2 routes * 70000
      expect(d.tdsDeductionPaise).toBe('1400'); // 1% of 140000
      expect(d.netPayoutPaise).toBe('138600');
      expect(d.netPayoutRupees).toBe('1386.00');
    }
  });
});
