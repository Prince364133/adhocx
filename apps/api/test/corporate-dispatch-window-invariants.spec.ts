import { CorporateDispatchService, CorporateDispatchKeys } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from '../src/domains/corporate/dispatch/corporate-dispatch-scheduler.service';
import { attachSortedSets } from './helpers/fake-sorted-sets';

describe('2026-11-11 audit: dispatch window invariants (6 x 5m runs, deadline, re-entry, LOGOUT, force)', () => {
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

  function setup(routeOverrides: Record<string, any> = {}, startMs = PICKUP1_MS - 65 * MIN) {
    nowMs = startMs;
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
      ...routeOverrides,
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
  }


  const route = () => routes.get('route-retry-1');
  /** Ticks the scheduler every 30 s; returns the minute offsets (vs pickup 1) at which a new run started. */
  async function tickUntil(endMs: number): Promise<number[]> {
    const runStarts: number[] = [];
    let last = route().dispatchAttempts;
    while (nowMs <= endMs) {
      await scheduler.tick(nowMs);
      if (route().dispatchAttempts > last) {
        last = route().dispatchAttempts;
        runStarts.push(Math.round((nowMs - PICKUP1_MS) / MIN));
      }
      nowMs += 30_000;
    }
    return runStarts;
  }

  it('no supply: exactly 6 runs at T-60,-55,-50,-45,-40,-35 then NO_DRIVERS_FOUND (Ops + Corporate notified)', async () => {
    setup();
    nearbyDrivers = [];
    const runStarts = await tickUntil(PICKUP1_MS - 25 * MIN);
    expect(runStarts).toEqual([-60, -55, -50, -45, -40, -35]);
    expect(route().dispatchAttempts).toBe(6);
    expect(route().dispatchStatus).toBe('NO_DRIVERS_FOUND');
    expect(route().dispatchFailureReason).toContain('within 10km');
    const rooms = notifications.filter((n) => n.event === 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND').map((n) => n.room);
    expect(rooms).toEqual(expect.arrayContaining(['admin:operations', 'corporate:tenant-1']));
  });

  it('a re-entry inside the 5-min interval (busy retry / crash recovery) continues the same run', async () => {
    setup();
    nearbyDrivers = [];
    nowMs = PICKUP1_MS - 60 * MIN;
    await scheduler.tick(nowMs);
    expect(route().dispatchAttempts).toBe(1);
    nowMs += 1 * MIN;
    await dispatchService.withClock(nowMs, () => dispatchService.dispatchRoute('route-retry-1', false));
    nowMs += 2 * MIN;
    await dispatchService.withClock(nowMs, () => dispatchService.dispatchRoute('route-retry-1', false));
    expect(route().dispatchAttempts).toBe(1);
    expect(route().dispatchStatus).not.toBe('NO_DRIVERS_FOUND');
  });

  it('a route committed late (first search at T-33) still gets one run, then reports Drivers not found', async () => {
    setup({}, PICKUP1_MS - 33 * MIN);
    nearbyDrivers = [];
    await scheduler.tick(nowMs);
    expect(route().dispatchAttempts).toBe(1);
    expect(route().dispatchStatus).toBe('NO_DRIVERS_FOUND');
  });

  it('LOGIN deadline = pickup1 - 30m; LOGOUT deadline = departure - 15m staging - 30m', async () => {
    setup();
    const policy = await (dispatchService as any).loadDispatchPolicy('tenant-1');
    expect(dispatchService.dispatchDeadlineMs({ direction: 'LOGIN', targetPickup1Time: new Date(PICKUP1_MS) }, policy)).toBe(
      PICKUP1_MS - 30 * MIN,
    );
    expect(dispatchService.dispatchDeadlineMs({ direction: 'LOGOUT', targetPickup1Time: new Date(PICKUP1_MS) }, policy)).toBe(
      PICKUP1_MS - 45 * MIN,
    );
  });

  it('a decline after the deadline does not cascade to another driver', async () => {
    setup({
      status: 'DISPATCHING',
      dispatchStatus: 'RETRY_SCHEDULED',
      dispatchAttempts: 5,
      dispatchWindowStartedAt: new Date(PICKUP1_MS - 60 * MIN),
      lastDispatchAttemptAt: new Date(PICKUP1_MS - 40 * MIN),
    }, PICKUP1_MS - 35 * MIN);
    await scheduler.tick(nowMs); // run 6 offers drv-1
    expect(route().dispatchAttempts).toBe(6);
    expect(JSON.parse(kv.get(CorporateDispatchKeys.offer('route-retry-1'))!.value).driverId).toBe('drv-1');
    nowMs = PICKUP1_MS - 29 * MIN;
    await dispatchService.withClock(nowMs, () => dispatchService.rejectRouteOffer('route-retry-1', 'drv-1', 'DECLINED'));
    expect(kv.get(CorporateDispatchKeys.offer('route-retry-1'))).toBeUndefined();
    expect(route().dispatchStatus).toBe('NO_DRIVERS_FOUND');
  });

  it('Ops "Start now" after exhaustion opens a fresh window that keeps retrying past the natural deadline', async () => {
    setup({
      status: 'DISPATCHING',
      dispatchStatus: 'NO_DRIVERS_FOUND',
      dispatchAttempts: 6,
      dispatchWindowStartedAt: new Date(PICKUP1_MS - 60 * MIN),
      lastDispatchAttemptAt: new Date(PICKUP1_MS - 35 * MIN),
    }, PICKUP1_MS - 20 * MIN);
    nearbyDrivers = [];
    await dispatchService.withClock(nowMs, () => dispatchService.dispatchRoute('route-retry-1', true, 'ops-user'));
    expect(route().dispatchAttempts).toBe(1);
    expect(route().dispatchStatus).toBe('RETRY_SCHEDULED');
    nowMs += 5 * MIN;
    await scheduler.tick(nowMs);
    expect(route().dispatchAttempts).toBe(2);
  });
});
