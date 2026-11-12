import { JwtService } from '@nestjs/jwt';
import { CorporateRole } from '@adhocx/contracts';
import { CorporateOnboardingService } from '../src/domains/corporate/tenants/corporate-onboarding.service';
import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { CorporateRouteDirectionsService } from '../src/domains/corporate/routing/corporate-route-directions.service';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { CorporateDispatchService, CorporateDispatchKeys } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { attachSortedSets } from './helpers/fake-sorted-sets';

describe('Full ETS End-to-End Stepped-Clock Simulation (Onboard -> Portal -> CSV Optimize -> Routes -> Cron Dispatch)', () => {
  it('simulates full lifecycle across happy assignment and 6-run NO_DRIVERS_FOUND escalation', async () => {
    const MIN = 60_000;
    let clockNowMs = new Date('2026-11-25T07:55:00.000+05:30').getTime();

    const tenants = new Map<string, any>();
    const offices = new Map<string, any>();
    const policies = new Map<string, any[]>();
    const users = new Map<string, any>();
    const employees = new Map<string, any>();
    const routes = new Map<string, any>();
    const stops = new Map<string, any[]>();
    const drivers = new Map<string, any>();
    const earnings: any[] = [];
    const emitted: Array<{ room: string; event: string; payload: any }> = [];
    const kv = new Map<string, { value: string; expiresAtMs?: number }>();
    const sets = new Map<string, Set<string>>();

    const redisClient: any = {
      get: async (k: string) => {
        const e = kv.get(k);
        if (e?.expiresAtMs !== undefined && clockNowMs >= e.expiresAtMs) {
          kv.delete(k);
          return null;
        }
        return e?.value ?? null;
      },
      set: async (k: string, v: string, ...args: any[]) => {
        let exSec: number | undefined;
        let nx = false;
        for (let i = 0; i < args.length; i++) {
          if (args[i] === 'EX') exSec = Number(args[++i]);
          if (args[i] === 'NX') nx = true;
        }
        const cur = kv.get(k);
        if (cur?.expiresAtMs !== undefined && clockNowMs >= cur.expiresAtMs) {
          kv.delete(k);
        }
        if (nx && kv.has(k)) return null;
        kv.set(k, { value: v, expiresAtMs: exSec !== undefined ? clockNowMs + exSec * 1000 : undefined });
        return 'OK';
      },
      del: async (k: string) => (kv.delete(k) || sets.delete(k) ? 1 : 0),
      incr: async () => 1,
      expire: async () => 1,
      ttl: async (k: string) => {
        const val = await redisClient.get(k);
        if (!val) return -2;
        const e = kv.get(k)!;
        return e.expiresAtMs ? Math.max(0, Math.floor((e.expiresAtMs - clockNowMs) / 1000)) : -1;
      },
      sadd: async (k: string, m: string) => {
        if (!sets.has(k)) sets.set(k, new Set());
        sets.get(k)!.add(m);
        return 1;
      },
      srem: async (k: string, m: string) => {
        sets.get(k)?.delete(m);
        return 1;
      },
      smembers: async (k: string) => Array.from(sets.get(k) || []),
    };
    const redisService: any = {
      getClient: () => redisClient,
      get: async (k: string) => redisClient.get(k),
      set: async (k: string, v: string, ttlSec?: number) => redisClient.set(k, v, ...(ttlSec ? ['EX', ttlSec] : [])),
      checkRateLimit: async () => ({ allowed: true, remaining: 9 }),
      unrevokeUser: async () => undefined,
      acquireLockToken: async (key: string, ttlSec = 10) => {
        const tok = `lock-${Math.random()}`;
        const ok = await redisClient.set(`lock:${key}`, tok, 'EX', ttlSec, 'NX');
        return ok === 'OK' ? tok : null;
      },
      releaseLockToken: async (key: string, tok: string) => {
        if ((await redisClient.get(`lock:${key}`)) === tok) kv.delete(`lock:${key}`);
      },
    };
    attachSortedSets(redisClient, redisService);

    const db: any = {
      corporateTenant: {
        findUnique: async ({ where }: any) => {
          for (const t of tenants.values()) if (t.id === where.id || t.code === where.code) return t;
          return null;
        },
        create: async ({ data }: any) => {
          const row = { id: `t-${tenants.size + 1}`, createdAt: new Date(clockNowMs), ...data };
          tenants.set(row.id, row);
          return row;
        },
        count: async () => tenants.size,
        findMany: async ({ where }: any) => {
          const all = Array.from(tenants.values());
          const matched = where?.OR
            ? all.filter((t) =>
                where.OR.some((c: any) => {
                  const k = Object.keys(c)[0];
                  return String(t[k] || '').toLowerCase().includes(String(c[k]?.contains || '').toLowerCase());
                }),
              )
            : all;
          return matched.map((t) => ({
            ...t,
            offices: Array.from(offices.values()).filter((o) => o.tenantId === t.id),
            policies: policies.get(t.id) || [],
            users: Array.from(users.values()).filter((u) => u.corporateTenantId === t.id),
            _count: { offices: 1, employees: employees.size, routes: routes.size },
          }));
        },
      },
      corporateOffice: {
        findUnique: async ({ where }: any) => offices.get(where.id) || null,
        create: async ({ data }: any) => {
          const row = { id: `o-${offices.size + 1}`, createdAt: new Date(clockNowMs), ...data };
          offices.set(row.id, row);
          return row;
        },
      },
      corporateTenantPolicy: {
        create: async ({ data }: any) => {
          const list = policies.get(data.tenantId) || [];
          const row = { id: `pol-${list.length + 1}`, ...data };
          list.unshift(row);
          policies.set(data.tenantId, list);
          return row;
        },
        findFirst: async ({ where }: any) => (policies.get(where.tenantId) || [])[0] || null,
      },
      corporateShiftTemplate: { create: async ({ data }: any) => data },
      user: {
        findFirst: async ({ where }: any) => {
          for (const u of users.values()) {
            if (where.email?.equals && u.email?.toLowerCase() === where.email.equals.toLowerCase()) return u;
            if (where.phone?.in && where.phone.in.includes(u.phone)) return u;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const row = { id: `u-${users.size + 1}`, createdAt: new Date(clockNowMs), ...data };
          users.set(row.id, row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const u = users.get(where.id);
          if (u) Object.assign(u, data);
          return u;
        },
      },
      driver: {
        findFirst: async () => null,
        findMany: async ({ where }: any) => (where.id?.in || []).map((id: string) => drivers.get(id)).filter(Boolean),
        findUnique: async ({ where }: any) => drivers.get(where.id) || null,
      },
      vendor: { findFirst: async () => null },
      vehicle: {
        findFirst: async ({ where }: any) => ({
          id: `veh-${where.driverId}`,
          registrationNumber: 'TS09EF2026',
          model: 'Ertiga',
        }),
      },
      corporateEmployee: {
        findFirst: async ({ where }: any) => {
          for (const e of employees.values()) {
            if (e.tenantId === where.tenantId && (e.employeeCode === where.employeeCode || e.phoneNumber === where.phoneNumber)) {
              return e;
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const row = { id: `e-${employees.size + 1}`, ...data };
          employees.set(row.id, row);
          return row;
        },
      },
      corporateEmployeeLocation: { create: async ({ data }: any) => data },
      corporateRoute: {
        create: async ({ data }: any) => {
          const row = {
            id: `r-${routes.size + 1}`,
            createdAt: new Date(clockNowMs),
            updatedAt: new Date(clockNowMs),
            dispatchAttempts: 0,
            dispatchStatus: 'PENDING',
            atRisk: false,
            driverId: null,
            vehicleId: null,
            ...data,
          };
          routes.set(row.id, row);
          stops.set(row.id, []);
          return row;
        },
        findMany: async ({ where }: any) =>
          Array.from(routes.values())
            .filter((r) => {
              if (where?.tenantId && r.tenantId !== where.tenantId) return false;
              if (where?.status && (typeof where.status === 'string' ? r.status !== where.status : !where.status.in?.includes(r.status))) return false;
              if (where?.driverId === null && r.driverId !== null) return false;
              if (where?.driverId?.in && !where.driverId.in.includes(r.driverId)) return false;
              if (where?.updatedAt?.lt && !(r.updatedAt < where.updatedAt.lt)) return false;
              if (where?.atRisk !== undefined && r.atRisk !== where.atRisk) return false;
              return true;
            })
            .map(hydrate),
        findUnique: async ({ where }: any) => (routes.has(where.id) ? hydrate(routes.get(where.id)) : null),
        update: async ({ where, data }: any) => {
          const r = routes.get(where.id);
          if (!r) throw Object.assign(new Error('Not found'), { code: 'P2025' });
          Object.assign(r, data, { updatedAt: new Date(clockNowMs) });
          return hydrate(r);
        },
        updateMany: async ({ where, data }: any) => {
          const r = routes.get(where.id);
          if (!r) return { count: 0 };
          if (where.status && (typeof where.status === 'string' ? r.status !== where.status : !where.status.in?.includes(r.status))) return { count: 0 };
          if (where.dispatchStatus?.not && r.dispatchStatus === where.dispatchStatus.not) return { count: 0 };
          if (where.atRisk !== undefined && r.atRisk !== where.atRisk) return { count: 0 };
          Object.assign(r, data, { updatedAt: new Date(clockNowMs) });
          return { count: 1 };
        },
      },
      corporateRouteStop: {
        create: async ({ data }: any) => {
          const s = { id: `st-${Math.random().toString(36).slice(2, 8)}`, ...data };
          const list = stops.get(data.routeId) || [];
          list.push(s);
          stops.set(data.routeId, list);
          return s;
        },
      },
      corporateDriverEarning: {
        create: async ({ data }: any) => {
          earnings.push(data);
          return data;
        },
      },
      corporateTripEvent: { findMany: async () => [] },
      $transaction: async (fn: any) => fn(db),
    };

    function hydrate(r: any) {
      return {
        ...r,
        tenant: tenants.get(r.tenantId),
        office: offices.get(r.officeId),
        driver: r.driverId ? drivers.get(r.driverId) || null : null,
        vehicle: r.vehicleId ? { id: r.vehicleId, registrationNumber: 'TS09EF2026', model: 'Ertiga' } : null,
        stops: (stops.get(r.id) || []).map((s) => ({ ...s, employee: employees.get(s.employeeId) || null })),
      };
    }

    const audit: any = { log: async () => undefined };
    const notif: any = {
      emitEvent: (room: string, event: string, payload: any) => emitted.push({ room, event, payload }),
      sendPushToUser: async () => undefined,
    };
    const h3 = new H3Service();
    const geocoder: any = {
      geocode: async (addr: string) => {
        if (addr.includes('Gachibowli')) return { lat: 17.4401, lng: 78.3489, formattedAddress: addr };
        if (addr.includes('Kondapur')) return { lat: 17.4622, lng: 78.3568, formattedAddress: addr };
        return { lat: 17.4435, lng: 78.3772, formattedAddress: addr };
      },
      batchGeocode: async (addresses: string[]) => {
        const map = new Map<string, { lat: number; lng: number; formattedAddress: string }>();
        for (const addr of addresses) {
          map.set(addr.trim().toLowerCase(), await geocoder.geocode(addr));
        }
        return map;
      },
    };
    const routesAdapter: any = {
      computeRoute: async (_o: any, inter: any[]) => ({
        durationSeconds: (inter.length + 1) * 600,
        distanceMeters: (inter.length + 1) * 4000,
        distanceKm: (inter.length + 1) * 4,
        optimizedIntermediateWaypointIndex: inter.map((_, i) => i),
        legs: Array.from({ length: inter.length + 1 }, () => ({ durationSeconds: 600, distanceMeters: 4000 })),
        encodedPolyline: 'e2epoly',
        decodedPath: [[17.4622, 78.3568], [17.4435, 78.3772]],
        isRealRoad: true,
      }),
    };

    const onboarding = new CorporateOnboardingService(db, audit, h3, geocoder);
    const tenantSvc = new CorporateTenantService(db, audit, h3);
    const jwtSvc = new JwtService({ secret: 'e2e-secret' });
    const authSvc = new AuthService(
      db,
      jwtSvc,
      { get: (k: string) => (k.includes('Secret') ? 'e2e-secret' : undefined) } as any,
      redisService,
      notif,
    );
    const planner = new CorporateRoutePlannerService(geocoder, routesAdapter, db);
    const directions = new CorporateRouteDirectionsService(db, routesAdapter, redisService);
    const routingCtrl = new CorporateRoutingController({} as any, db, planner, directions);
    const locationsSvc: any = {
      findNearbyDrivers: async () =>
        Array.from(drivers.keys()).map((driverId, idx) => ({ driverId, distanceKm: 3 + idx * 3 })),
    };
    const dispatch = new CorporateDispatchService(db, redisService, notif, audit, locationsSvc);
    const scheduler = new CorporateDispatchSchedulerService(db, dispatch, notif, audit, redisService);

    // 1. Onboard Company + Verify Immediate Corporate Portal Login
    const onboardRes = await onboarding.onboardCompany({
      code: 'APEXBIO',
      name: 'Apex Biotech Ltd',
      legalEntityName: 'Apex Biotech Private Limited',
      office: {
        code: 'HYD-01',
        name: 'Apex HITEC Campus',
        addressText: 'Madhapur HITEC City, Hyderabad',
        latitude: 17.4435,
        longitude: 78.3772,
      },
      adminUser: {
        fullName: 'Karthik Rao',
        email: 'karthik@apexbio.com',
        phone: '+919848012345',
        password: 'ApexPassword@1',
        corporateRole: CorporateRole.CORP_SUPER_ADMIN,
      },
      policy: {
        stopDwellMinutes: 10,
        approachLeadMinutes: 30,
        dispatchWindowMinutes: 30,
        dispatchRetryIntervalMinutes: 5,
        searchRadiusKm: 10,
      },
    });
    const loginRes = await authSvc.login({ identifier: 'karthik@apexbio.com', password: 'ApexPassword@1' });
    const tokenClaims: any = jwtSvc.decode(loginRes.accessToken);
    expect(tokenClaims.corporateTenantId).toBe(onboardRes.tenant.id);

    // 2. Search company in Ops Route Optimizer
    const foundCompanies = await tenantSvc.listTenants({ search: 'Apex' });
    expect(foundCompanies.items[0].id).toBe(onboardRes.tenant.id);

    // 3. Upload Roster CSV + Optimize + Commit 2 routes (Cab 1 & Cab 2)
    const csv = [
      'Employee Name,Employee Code,Phone Number,Pickup Address,Office Address,Arrival Time',
      'Divya Menon,APX01,+919111111101,"Kondapur Junction, Hyderabad","Madhapur HITEC City, Hyderabad",09:30',
      'Arjun Nair,APX02,+919111111102,"Gachibowli Circle, Hyderabad","Madhapur HITEC City, Hyderabad",09:30',
    ].join('\n');
    const plan = await planner.planFromFile(Buffer.from(csv, 'utf8'), 'apex.csv', {
      tenantId: onboardRes.tenant.id,
      officeId: onboardRes.office.id,
      direction: 'LOGIN',
      loginTime: new Date('2026-11-25T09:30:00+05:30'),
      cabCapacity: 1, // Force 2 separate cabs: Route A (accept) & Route B (exhaust)
      pickupWaitMinutes: 10,
      routingPreference: 'TRAFFIC_AWARE',
    });
    expect(plan.routes).toHaveLength(2);

    const committed = await planner.commitPlanToDatabase({
      tenantId: onboardRes.tenant.id,
      officeId: onboardRes.office.id,
      shiftDate: '2026-11-25',
      shiftTime: '09:30',
      direction: 'LOGIN',
      stopDwellMinutes: 10,
      includeMetadata: true,
      plan,
    });
    const [routeHappyId, routeExhaustId] = committed.routeIds!;

    // Align targetPickup1Time for deterministic simulation window at 09:00 IST (so T-60m = 08:00 IST)
    const pickupAnchorMs = new Date('2026-11-25T09:00:00.000+05:30').getTime();
    routes.get(routeHappyId)!.targetPickup1Time = new Date(pickupAnchorMs);
    routes.get(routeExhaustId)!.targetPickup1Time = new Date(pickupAnchorMs);

    // 4. Verify Split Detail View API returns tenant, stops + phone numbers, and Google live-traffic legs
    const detailHappy: any = await routingCtrl.getRouteById(routeHappyId, 'true');
    expect(detailHappy.directions.trafficSource).toBe('GOOGLE_MAPS_LIVE_TRAFFIC');
    expect(detailHappy.stops[0].employeePhone).toBeTruthy();

    // 5. Provision 1 nearby driver (<10km) who rejects Route B, and accepts Route A on Run 2
    drivers.set('drv-sim', {
      id: 'drv-sim',
      userId: 'u-drv-sim',
      fullName: 'Vikram Singh',
      phone: '+919988776655',
      vehicleType: 'SEDAN',
      verificationStatus: 'VERIFIED',
      availabilityStatus: 'AVAILABLE',
      vehicles: [
        {
          id: 'veh-drv-sim',
          driverId: 'drv-sim',
          vehicleType: 'SEDAN',
          verificationStatus: 'VERIFIED',
          seats: 4,
          insuranceExpiry: new Date('2027-12-31T00:00:00Z'),
        },
      ],
    });

    // T-60m: Run 1 fires; drv-sim receives offer for Route Happy (Route Exhaust sees driver held busy)
    clockNowMs = pickupAnchorMs - 60 * MIN;
    await scheduler.tick(clockNowMs);
    await dispatch.withClock(clockNowMs, () => dispatch.rejectRouteOffer(routeHappyId, 'drv-sim', 'LATER'));
    if (kv.has(CorporateDispatchKeys.offer(routeExhaustId))) {
      await dispatch.withClock(clockNowMs, () => dispatch.rejectRouteOffer(routeExhaustId, 'drv-sim', 'TOO_FAR'));
    }

    // Run 2 (+5m): Route Happy re-offers & Driver accepts!
    clockNowMs = pickupAnchorMs - 55 * MIN;
    routes.get(routeHappyId)!.updatedAt = new Date(clockNowMs - 5 * MIN);
    routes.get(routeExhaustId)!.updatedAt = new Date(clockNowMs - 5 * MIN);
    await scheduler.recoverStuckRoutes(clockNowMs);
    await dispatch.acceptRouteOffer(routeHappyId, 'drv-sim');
    expect(routes.get(routeHappyId)!.status).toBe('ASSIGNED');
    expect(routes.get(routeHappyId)!.dispatchStatus).toBe('DRIVER_ASSIGNED');
    expect(earnings).toHaveLength(1);

    if (kv.has(CorporateDispatchKeys.offer(routeExhaustId))) {
      await dispatch.withClock(clockNowMs, () => dispatch.rejectRouteOffer(routeExhaustId, 'drv-sim', 'DECLINED'));
    }

    // Runs 3..6 for Route Exhaust (+5m each): drv-sim is now committed to overlapping Route Happy
    for (let run = 3; run <= 6; run++) {
      clockNowMs = pickupAnchorMs - (60 - (run - 1) * 5) * MIN;
      routes.get(routeExhaustId)!.updatedAt = new Date(clockNowMs - 5 * MIN);
      await scheduler.recoverStuckRoutes(clockNowMs);
      if (kv.has(CorporateDispatchKeys.offer(routeExhaustId))) {
        await dispatch.withClock(clockNowMs, () => dispatch.rejectRouteOffer(routeExhaustId, 'drv-sim', 'DECLINED'));
      }
    }
    expect(routes.get(routeExhaustId)!.dispatchAttempts).toBe(6);

    // Verify Corporate Portal & Ops panel both see ASSIGNED on Route A and NO_DRIVERS_FOUND on Route B
    const portalList: any[] = await routingCtrl.listPortalRoutes(onboardRes.tenant.id);
    const byId = new Map(portalList.map((r) => [r.id, r]));
    expect(byId.get(routeHappyId)!.dispatchStatus).toBe('DRIVER_ASSIGNED');
    expect(byId.get(routeExhaustId)!.dispatchStatus).toBe('NO_DRIVERS_FOUND');
    expect(
      emitted.some(
        (e) => e.room === `corporate:${onboardRes.tenant.id}` && e.event === 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND',
      ),
    ).toBe(true);
    expect(
      emitted.some((e) => e.room === 'admin:operations' && e.event === 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND'),
    ).toBe(true);
  });
});
