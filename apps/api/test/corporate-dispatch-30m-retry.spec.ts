import { CorporateDispatchService, CorporateDispatchKeys } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { attachSortedSets } from './helpers/fake-sorted-sets';

describe('Autonomous Dispatch 30m Approach + 30m Search (6 Runs x 5m) & Exhaustion Lifecycle', () => {
  const MIN = 60_000;
  const PICKUP1_MS = new Date('2026-11-20T09:00:00.000+05:30').getTime();

  let nowMs: number;
  let kv: Map<string, { value: string; expiresAtMs?: number }>;
  let sets: Map<string, Set<string>>;
  let routes: Map<string, any>;
  let drivers: Map<string, any>;
  let nearbyDrivers: Array<{ driverId: string; distanceKm: number }>;
  let notifications: Array<{ room: string; event: string; payload: any }>;

  let dispatchService: CorporateDispatchService;
  let scheduler: CorporateDispatchSchedulerService;

  beforeEach(() => {
    nowMs = PICKUP1_MS - 65 * MIN;
    kv = new Map();
    sets = new Map();
    routes = new Map();
    drivers = new Map();
    nearbyDrivers = [];
    notifications = [];

    const makeExpiredPurge = (key: string) => {
      const entry = kv.get(key);
      if (entry?.expiresAtMs !== undefined && nowMs >= entry.expiresAtMs) {
        kv.delete(key);
        return true;
      }
      return false;
    };

    const redisClient: any = {
      get: jest.fn(async (key: string) => {
        makeExpiredPurge(key);
        return kv.get(key)?.value ?? null;
      }),
      set: jest.fn(async (key: string, value: string, ...args: any[]) => {
        let exSec: number | undefined;
        let nx = false;
        for (let i = 0; i < args.length; i++) {
          if (args[i] === 'EX') exSec = Number(args[++i]);
          if (args[i] === 'NX') nx = true;
        }
        makeExpiredPurge(key);
        if (nx && kv.has(key)) return null;
        kv.set(key, {
          value,
          expiresAtMs: exSec !== undefined ? nowMs + exSec * 1000 : undefined,
        });
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        const deletedKv = kv.delete(key);
        const deletedSet = sets.delete(key);
        return deletedKv || deletedSet ? 1 : 0;
      }),
      ttl: jest.fn(async (key: string) => {
        makeExpiredPurge(key);
        const e = kv.get(key);
        if (!e) return -2;
        return e.expiresAtMs ? Math.max(0, Math.floor((e.expiresAtMs - nowMs) / 1000)) : -1;
      }),
      sadd: jest.fn(async (key: string, member: string) => {
        if (!sets.has(key)) sets.set(key, new Set());
        sets.get(key)!.add(member);
        return 1;
      }),
      srem: jest.fn(async (key: string, member: string) => {
        sets.get(key)?.delete(member);
        return 1;
      }),
      smembers: jest.fn(async (key: string) => Array.from(sets.get(key) || [])),
      expire: jest.fn(async () => 1),
    };

    const redisService: any = {
      getClient: () => redisClient,
      acquireLockToken: jest.fn(async (key: string, ttlSec = 10) => {
        const token = `tok-${Math.random()}`;
        const ok = await redisClient.set(`lock:${key}`, token, 'EX', ttlSec, 'NX');
        return ok === 'OK' ? token : null;
      }),
      releaseLockToken: jest.fn(async (key: string, token: string) => {
        const cur = kv.get(`lock:${key}`);
        if (cur?.value === token) kv.delete(`lock:${key}`);
      }),
    };
    attachSortedSets(redisClient, redisService);

    const routeRecord = {
      id: 'route-retry-1',
      tenantId: 'tenant-1',
      officeId: 'office-1',
      direction: 'LOGIN',
      status: 'PLANNED',
      dispatchStatus: 'PENDING',
      dispatchAttempts: 0,
      dispatchWindowStartedAt: null,
      lastDispatchAttemptAt: null,
      dispatchFailureReason: null,
      atRisk: false,
      vehicleCategory: 'SEDAN',
      shiftDate: new Date('2026-11-20T00:00:00.000Z'),
      shiftTime: '09:30',
      assignedPassengerCount: 2,
      estDistanceMeters: 14000,
      estDurationSeconds: 1800,
      targetPickup1Time: new Date(PICKUP1_MS),
      targetOfficeArrivalTime: new Date(PICKUP1_MS + 30 * MIN),
      updatedAt: new Date(nowMs - 10 * MIN),
      driverId: null,
      vehicleId: null,
    };
    routes.set(routeRecord.id, routeRecord);

    for (const id of ['drv-1', 'drv-2']) {
      drivers.set(id, {
        id,
        userId: `u-${id}`,
        fullName: `Driver ${id}`,
        phone: `+91990000000${id.slice(-1)}`,
        vehicleType: 'SEDAN',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicles: [
          {
            id: `veh-${id}`,
            driverId: id,
            vehicleType: 'SEDAN',
            verificationStatus: 'VERIFIED',
            seats: 4,
            insuranceExpiry: new Date('2027-12-31T00:00:00Z'),
          },
        ],
      });
    }
    nearbyDrivers = [
      { driverId: 'drv-1', distanceKm: 3.5 },
      { driverId: 'drv-2', distanceKm: 8.2 },
    ];

    const db: any = {
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
      corporateRoute: {
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(routes.values())
            .filter((r) => {
              if (where?.status && (typeof where.status === 'string' ? r.status !== where.status : !where.status.in?.includes(r.status))) {
                return false;
              }
              if (where?.driverId === null && r.driverId !== null) return false;
              if (where?.driverId?.in && !where.driverId.in.includes(r.driverId)) return false;
              if (where?.updatedAt?.lt && !(r.updatedAt < where.updatedAt.lt)) return false;
              if (where?.atRisk !== undefined && r.atRisk !== where.atRisk) return false;
              return true;
            })
            .map((r) => ({ ...r, tenant: { name: 'NovaTech Systems' }, stops: [] }));
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const r = routes.get(where.id);
          if (!r) return null;
          return {
            ...r,
            tenant: { id: 'tenant-1', name: 'NovaTech Systems' },
            office: { id: 'office-1', name: 'NovaTech Campus', latitude: 17.4435, longitude: 78.3772 },
            stops: [{ stopSequence: 1, stopType: 'PICKUP', latitude: 17.4933, longitude: 78.3914, dwellBufferSeconds: 600 }],
          };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const r = routes.get(where.id);
          if (!r) throw Object.assign(new Error('Not found'), { code: 'P2025' });
          Object.assign(r, data, { updatedAt: new Date(nowMs - 3 * MIN) }); // older than stuckAfterMs after wait
          return { ...r, tenant: { name: 'NovaTech Systems' }, office: { name: 'NovaTech Campus' }, stops: [] };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const r = routes.get(where.id);
          if (!r) return { count: 0 };
          if (where.status && (typeof where.status === 'string' ? r.status !== where.status : !where.status.in?.includes(r.status))) {
            return { count: 0 };
          }
          if (where.dispatchStatus?.not && r.dispatchStatus === where.dispatchStatus.not) return { count: 0 };
          if (where.atRisk !== undefined && r.atRisk !== where.atRisk) return { count: 0 };
          Object.assign(r, data, { updatedAt: new Date(nowMs - 3 * MIN) });
          return { count: 1 };
        }),
      },
      driver: {
        findMany: jest.fn(async ({ where }: any) =>
          (where.id?.in || []).map((id: string) => drivers.get(id)).filter(Boolean),
        ),
        findUnique: jest.fn(async ({ where }: any) => drivers.get(where.id) || null),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }: any) => ({
          id: `veh-${where.driverId}`,
          registrationNumber: 'TS09CD9001',
          model: 'Dzire',
        })),
      },
      corporateDriverEarning: {
        create: jest.fn(async ({ data }: any) => data),
      },
      $transaction: jest.fn(async (fn: any) => fn(db)),
    };

    const notifSvc: any = {
      emitEvent: jest.fn((room: string, event: string, payload: any) => {
        notifications.push({ room, event, payload });
      }),
      sendPushToUser: jest.fn(async () => undefined),
    };
    const auditSvc: any = { log: jest.fn(async () => undefined) };
    const locationsSvc: any = {
      findNearbyDrivers: jest.fn(async (_lat: number, _lng: number, radiusKm: number) =>
        nearbyDrivers.filter((d) => d.distanceKm <= radiusKm),
      ),
    };

    dispatchService = new CorporateDispatchService(db, redisService, notifSvc, auditSvc, locationsSvc);
    scheduler = new CorporateDispatchSchedulerService(db, dispatchService, notifSvc, auditSvc, redisService);
  });

  it('starts at T-60m, cascades in-wave declines, waits 5m before restarting 10km search, and marks NO_DRIVERS_FOUND after 6 runs notifying Ops + Corporate', async () => {
    // T - 65m: too early, lead time is 60m (30m approach + 30m dispatch search)
    let tickRes = await scheduler.tick(nowMs);
    expect(tickRes.dispatchedRoutes).toEqual([]);
    expect(routes.get('route-retry-1').status).toBe('PLANNED');

    // T - 60m: Run 1 starts -> offers drv-1 (3.5km), then drv-1 & drv-2 reject/timeout -> waits 5m
    nowMs = PICKUP1_MS - 60 * MIN;
    tickRes = await scheduler.tick(nowMs);
    expect(tickRes.dispatchedRoutes).toContain('route-retry-1');
    expect(routes.get('route-retry-1').dispatchAttempts).toBe(1);

    // Driver 1 declines -> cascades inside Run 1 to Driver 2 (still attempt #1)
    await dispatchService.withClock(nowMs, () => dispatchService.rejectRouteOffer('route-retry-1', 'drv-1', 'BUSY'));
    expect(routes.get('route-retry-1').dispatchAttempts).toBe(1);
    const activeOfferAfterD1 = JSON.parse(kv.get(CorporateDispatchKeys.offer('route-retry-1'))!.value);
    expect(activeOfferAfterD1.driverId).toBe('drv-2');

    // Driver 2 also declines -> Run 1 ends unserved, 5-min retry marker placed
    await dispatchService.withClock(nowMs, () => dispatchService.rejectRouteOffer('route-retry-1', 'drv-2', 'BUSY'));
    expect(kv.get(CorporateDispatchKeys.unserved('route-retry-1'))?.value).toBe('NO_SUPPLY');
    expect(routes.get('route-retry-1').dispatchStatus).toBe('PENDING');

    // After 3 minutes (within 5-min wait): recovery MUST wait
    nowMs += 3 * MIN;
    expect(await scheduler.recoverStuckRoutes(nowMs)).toEqual([]);
    expect(routes.get('route-retry-1').dispatchAttempts).toBe(1);

    // Run 2 through Run 6 at +5m intervals (T-55m, T-50m, T-45m, T-40m, T-35m)
    for (let runIdx = 2; runIdx <= 6; runIdx++) {
      nowMs = PICKUP1_MS - (60 - (runIdx - 1) * 5) * MIN;
      routes.get('route-retry-1').updatedAt = new Date(nowMs - 5 * MIN);
      const recovered = await scheduler.recoverStuckRoutes(nowMs);
      expect(recovered).toEqual(['route-retry-1']);
      // Fresh wave re-reached drv-1 after clearing prior wave rejections!
      expect(routes.get('route-retry-1').dispatchAttempts).toBe(runIdx);

      // Both drv-1 and drv-2 decline this wave too
      await dispatchService.withClock(nowMs, () => dispatchService.rejectRouteOffer('route-retry-1', 'drv-1', 'DECLINED'));
      await dispatchService.withClock(nowMs, () => dispatchService.rejectRouteOffer('route-retry-1', 'drv-2', 'DECLINED'));
    }

    // Once Run 6 fails: transitioned immediately to NO_DRIVERS_FOUND!
    const exhaustedRoute = routes.get('route-retry-1');
    expect(exhaustedRoute.dispatchStatus).toBe('NO_DRIVERS_FOUND');
    expect(exhaustedRoute.dispatchAttempts).toBe(6);
    expect(exhaustedRoute.dispatchFailureReason).toContain('10km');
    expect(exhaustedRoute.atRisk).toBe(true);

    // Both Ops Panel and Corporate Portal notified
    expect(notifications.some((n) => n.room === 'admin:operations' && n.event === 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND')).toBe(true);
    expect(notifications.some((n) => n.room === 'corporate:tenant-1' && n.event === 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND')).toBe(true);

    // Subsequent cron ticks (T-30m, T-25m) stop infinite retries
    nowMs = PICKUP1_MS - 25 * MIN;
    expect(await scheduler.recoverStuckRoutes(nowMs)).toEqual([]);
    expect(routes.get('route-retry-1').dispatchAttempts).toBe(6);

    // Manual Ops retry restarts cleanly and assigns driver on acceptance
    const manualRes = await dispatchService.withClock(nowMs, () =>
      dispatchService.dispatchRoute('route-retry-1', true, 'ops-user-1'),
    );
    expect(manualRes.status).toBe('OFFERED');
    expect(routes.get('route-retry-1').dispatchAttempts).toBe(1);

    const accepted = await dispatchService.acceptRouteOffer('route-retry-1', 'drv-1');
    expect(accepted.status).toBe('ASSIGNED');
    expect(routes.get('route-retry-1').dispatchStatus).toBe('DRIVER_ASSIGNED');
  });
});
