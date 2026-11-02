import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import {
  CorporateRiderNotifier,
  haversineMeters,
  NO_SHOW_DEFAULT_REASON,
} from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';

/**
 * Corporate ETS rider notifications: driver start-route, per-stop ETAs, "you're next",
 * arrival/boarding/no-show/drop lifecycle over websocket + FCM push + dashboard attendance.
 */
describe('Corporate ETS Rider Notifications', () => {
  const ROUTE_ID = 'route-rn-1';
  const TENANT_ID = 'tenant-rn';
  const DRIVER_ID = 'drv-rn';
  const EMPLOYEES = ['emp-1', 'emp-2', 'emp-3', 'emp-4'];
  const DRIVER_START = { driverLatitude: 17.39, driverLongitude: 78.4 };

  type Emitted = { channel: string; event: string; payload: any };

  let routes: Map<string, any>;
  let stops: Map<string, any>;
  let employees: Map<string, any>;
  let users: Array<{ id: string; phone: string; email: string }>;
  let deviceTokens: Array<{ userId: string; isActive: boolean }>;
  let redisKeys: Map<string, string>;
  let emitted: Emitted[];
  let redisAvailable: boolean;

  const routeView = (id: string) => {
    const r = routes.get(id);
    if (!r) return null;
    return {
      ...r,
      stops: Array.from(stops.values())
        .filter((s) => s.routeId === id)
        .sort((a, b) => a.stopSequence - b.stopSequence)
        .map((s) => ({ ...s })),
    };
  };

  const db: any = {
    corporateRoute: {
      findUnique: jest.fn(async ({ where }: any) => routeView(where.id)),
      update: jest.fn(async ({ where, data }: any) => Object.assign(routes.get(where.id), data)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const r = routes.get(where.id);
        if (!r || (where.status && r.status !== where.status)) return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      }),
    },
    corporateRouteStop: {
      findUnique: jest.fn(async ({ where }: any) => {
        const s = stops.get(where.id);
        if (!s) return null;
        return {
          ...s,
          route: routeView(s.routeId),
          employee: s.employeeId ? employees.get(s.employeeId) : null,
        };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(stops.get(where.id), data)),
      updateMany: jest.fn(),
      findFirst: jest.fn(async ({ where }: any) => {
        const found = Array.from(stops.values())
          .filter(
            (s) =>
              s.routeId === where.routeId &&
              (!where.stopType || s.stopType === where.stopType) &&
              (!where.status || s.status === where.status) &&
              (!where.employeeId || s.employeeId) &&
              (!where.stopSequence || s.stopSequence > where.stopSequence.gt),
          )
          .sort((a, b) => a.stopSequence - b.stopSequence);
        return found[0] ?? null;
      }),
    },
    corporateEmployee: {
      findUnique: jest.fn(async ({ where }: any) => employees.get(where.id) ?? null),
    },
    corporateTransportRequest: {
      update: jest.fn(async () => ({})),
    },
    user: {
      findFirst: jest.fn(async ({ where }: any) => {
        const ors: any[] = where.OR || [];
        return (
          users.find((u) => ors.some((c) => (c.phone && c.phone === u.phone) || (c.email && c.email === u.email))) ??
          null
        );
      }),
    },
    deviceToken: {
      count: jest.fn(
        async ({ where }: any) =>
          deviceTokens.filter((d) => d.userId === where.userId && d.isActive === where.isActive).length,
      ),
    },
  };

  const redisClient = {
    set: jest.fn(async (key: string, val: string, ...args: any[]) => {
      if (args.includes('NX') && redisKeys.has(key)) return null;
      redisKeys.set(key, val);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => (redisKeys.delete(key) ? 1 : 0)),
  };
  const redis = { getClient: jest.fn(() => (redisAvailable ? redisClient : null)) };

  const notifications = {
    emitEvent: jest.fn((channel: string, event: string, payload: any) => {
      emitted.push({ channel, event, payload });
    }),
    sendPushToUser: jest.fn(async (..._args: any[]): Promise<any> => ({ success: true, totalTokens: 1, successCount: 1, failureCount: 0 })),
  };
  const audit = { log: jest.fn(async () => undefined) };

  let notifier: CorporateRiderNotifier;
  let service: CorporateTripExecutionService;

  const employeeEvents = (employeeId: string) =>
    emitted.filter((e) => e.channel === `employee:${employeeId}`).map((e) => e.event);
  const eventsFor = (employeeId: string, event: string) =>
    emitted.filter((e) => e.channel === `employee:${employeeId}` && e.event === event);
  const dashboard = (event: string) => emitted.filter((e) => e.channel === `corporate:${TENANT_ID}` && e.event === event);

  const stopId = (seq: number) => `stop-${seq}`;
  const stopCoord = (seq: number) => ({ driverLatitude: 17.4 + (seq - 1) * 0.01, driverLongitude: 78.4 });

  /** Simulate the 5-minute wait elapsing (or a custom wait) since cab arrival. */
  const backdateArrival = (seq: number, seconds: number) => {
    stops.get(stopId(seq)).actualArrivalTime = new Date(Date.now() - seconds * 1000);
  };

  const otp = (seq: number) => stops.get(stopId(seq)).boardingOtp;

  beforeEach(() => {
    jest.clearAllMocks();
    notifications.sendPushToUser.mockImplementation(async () => ({
      success: true,
      totalTokens: 1,
      successCount: 1,
      failureCount: 0,
    }));
    emitted = [];
    redisKeys = new Map();
    redisAvailable = true;

    routes = new Map([
      [
        ROUTE_ID,
        {
          id: ROUTE_ID,
          tenantId: TENANT_ID,
          direction: 'LOGIN',
          status: 'ASSIGNED',
          driverId: DRIVER_ID,
          vehicleId: 'veh-rn',
          driver: { id: DRIVER_ID, fullName: 'Ravi Kumar', phone: '+919999900000' },
          vehicle: { id: 'veh-rn', make: 'Maruti', model: 'Dzire', registrationNumber: 'TS09AB1234' },
        },
      ],
    ]);

    const now = Date.now();
    stops = new Map();
    EMPLOYEES.forEach((emp, i) => {
      const seq = i + 1;
      stops.set(stopId(seq), {
        id: stopId(seq),
        routeId: ROUTE_ID,
        stopSequence: seq,
        stopType: 'PICKUP',
        status: 'PENDING',
        employeeId: emp,
        transportRequestId: `req-${seq}`,
        latitude: stopCoord(seq).driverLatitude,
        longitude: stopCoord(seq).driverLongitude,
        plannedEta: new Date(now + seq * 10 * 60 * 1000),
        boardingOtp: `48${seq}${seq}`,
        actualArrivalTime: null,
      });
    });
    stops.set(stopId(5), {
      id: stopId(5),
      routeId: ROUTE_ID,
      stopSequence: 5,
      stopType: 'DROPOFF',
      status: 'PENDING',
      employeeId: null,
      latitude: 17.45,
      longitude: 78.4,
      plannedEta: new Date(now + 60 * 60 * 1000),
      boardingOtp: '------',
    });

    employees = new Map(
      EMPLOYEES.map((id, i) => [
        id,
        {
          id,
          tenantId: TENANT_ID,
          fullName: `Employee${i + 1} Test`,
          employeeCode: `E00${i + 1}`,
          phoneNumber: `+91900000000${i + 1}`,
          email: `emp${i + 1}@corp.test`,
        },
      ]),
    );
    // emp-1, emp-2, emp-3 have app accounts; emp-4 has none. emp-3 has no device token.
    users = [
      { id: 'user-1', phone: '+919000000001', email: 'emp1@corp.test' },
      { id: 'user-2', phone: '+919000000002', email: 'emp2@corp.test' },
      { id: 'user-3', phone: '+919000000003', email: 'emp3@corp.test' },
    ];
    deviceTokens = [
      { userId: 'user-1', isActive: true },
      { userId: 'user-2', isActive: true },
      { userId: 'user-3', isActive: false },
    ];

    notifier = new CorporateRiderNotifier(
      db as DatabaseService,
      redis as unknown as RedisService,
      notifications as unknown as NotificationsService,
    );
    service = new CorporateTripExecutionService(
      db as DatabaseService,
      redis as unknown as RedisService,
      notifications as unknown as NotificationsService,
      audit as unknown as AuditService,
      notifier,
    );
  });

  describe('Start route (driver driving toward pickup 1)', () => {
    it('transitions ASSIGNED -> IN_TRANSIT and returns an ETA for every pickup', async () => {
      const res = await service.startRoute(ROUTE_ID, { driverId: DRIVER_ID, ...DRIVER_START });

      expect(res.status).toBe('IN_TRANSIT');
      expect(routes.get(ROUTE_ID).status).toBe('IN_TRANSIT');
      expect(res.stopEtas.map((e) => e.employeeId)).toEqual(EMPLOYEES);
      expect(dashboard('ROUTE_STARTED')).toHaveLength(1);
    });

    it('computes individual, increasing per-stop ETAs from driver position (leg distance + dwell)', async () => {
      const res = await service.startRoute(ROUTE_ID, DRIVER_START);
      const etas = res.stopEtas.map((e) => e.etaMinutes);

      // Leg 1: start -> stop 1 at 500 m/min
      const leg1Meters = haversineMeters(DRIVER_START.driverLatitude, DRIVER_START.driverLongitude, 17.4, 78.4);
      expect(etas[0]).toBe(Math.max(1, Math.round(leg1Meters / 500)));

      // Stop 2 adds leg 2 + one expected dwell of 120s
      const leg2Meters = haversineMeters(17.4, 78.4, 17.41, 78.4);
      const expectedStop2 = Math.round((((leg1Meters + leg2Meters) / 500) * 60 + 120) / 60);
      expect(etas[1]).toBe(expectedStop2);

      for (let i = 1; i < etas.length; i++) expect(etas[i]).toBeGreaterThan(etas[i - 1]);
    });

    it('sends each employee CAB_EN_ROUTE with their own ETA and driver/vehicle details', async () => {
      const res = await service.startRoute(ROUTE_ID, DRIVER_START);

      EMPLOYEES.forEach((emp, i) => {
        const [ev] = eventsFor(emp, 'CAB_EN_ROUTE');
        expect(ev.payload).toMatchObject({
          lifecycle: 'EN_ROUTE',
          etaMinutes: res.stopEtas[i].etaMinutes,
          stopsBeforeYou: i,
          driverName: 'Ravi Kumar',
          vehicleNumber: 'TS09AB1234',
          vehicleModel: 'Maruti Dzire',
        });
        expect(ev.payload.message).toContain(`${res.stopEtas[i].etaMinutes} min`);
      });
    });

    it('pushes EN_ROUTE via FCM only to employees with an active device token', async () => {
      await service.startRoute(ROUTE_ID, DRIVER_START);

      const enRoutePushes = notifications.sendPushToUser.mock.calls.filter(
        (c: any[]) => c[1].data.action === 'CORPORATE_RIDE_EN_ROUTE',
      );
      expect(enRoutePushes.map((c: any[]) => c[0]).sort()).toEqual(['user-1', 'user-2']);
      expect(enRoutePushes[0][1]).toMatchObject({ type: 'TRIP_STATUS' });
    });

    it("fires \"you're next\" (CAB_APPROACHING) for pickup 1 only at start", async () => {
      await service.startRoute(ROUTE_ID, DRIVER_START);

      expect(eventsFor('emp-1', 'CAB_APPROACHING')).toHaveLength(1);
      ['emp-2', 'emp-3', 'emp-4'].forEach((e) => expect(eventsFor(e, 'CAB_APPROACHING')).toHaveLength(0));
    });

    it('falls back to solver plannedEta when driver position is not supplied', async () => {
      const res = await service.startRoute(ROUTE_ID);
      expect(res.stopEtas.map((e) => e.etaMinutes)).toEqual([10, 20, 30, 40]);
    });

    it('rejects starting the same route twice without re-notifying employees', async () => {
      await service.startRoute(ROUTE_ID, DRIVER_START);
      const before = emitted.length;

      await expect(service.startRoute(ROUTE_ID, DRIVER_START)).rejects.toThrow(BadRequestException);
      expect(emitted.length).toBe(before);
    });

    it('rejects starting an unassigned route (no driver, PLANNED)', async () => {
      Object.assign(routes.get(ROUTE_ID), { status: 'PLANNED', driverId: null });

      await expect(service.startRoute(ROUTE_ID, DRIVER_START)).rejects.toThrow(/must be ASSIGNED/);
      expect(routes.get(ROUTE_ID).status).toBe('PLANNED');
      expect(emitted).toHaveLength(0);
    });

    it('rejects a start from a driver who is not assigned to the route', async () => {
      await expect(service.startRoute(ROUTE_ID, { driverId: 'other-driver' })).rejects.toThrow(
        /assigned to another driver/,
      );
    });

    it('returns Conflict when a concurrent start already moved the route (CAS lost)', async () => {
      db.corporateRoute.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.startRoute(ROUTE_ID)).rejects.toThrow(ConflictException);
      expect(emitted.filter((e) => e.event === 'CAB_EN_ROUTE')).toHaveLength(0);
    });

    it('returns 404 for an unknown route', async () => {
      await expect(service.startRoute('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Full 4-stop lifecycle', () => {
    const runLifecycle = async () => {
      await notifier.notifyRouteAssigned(ROUTE_ID);
      await service.startRoute(ROUTE_ID, DRIVER_START);

      for (const seq of [1, 2, 3, 4]) {
        await service.arriveAtStop(ROUTE_ID, stopId(seq), stopCoord(seq));
        if (seq === 3) {
          backdateArrival(seq, 320);
          await service.markNoShow(ROUTE_ID, stopId(seq), {});
        } else {
          if (seq === 4) backdateArrival(seq, 200); // boarded 3m20s after cab arrived -> LATE
          await service.verifyBoardingOtp(ROUTE_ID, stopId(seq), { otpCode: otp(seq) });
        }
      }
      await service.arriveAtStop(ROUTE_ID, stopId(5), { driverLatitude: 17.45, driverLongitude: 78.4 });
      await service.completeRoute(ROUTE_ID);
    };

    it('delivers the exact ordered event sequence to each employee', async () => {
      await runLifecycle();

      const boardedFlow = [
        'CAB_ASSIGNED',
        'CAB_EN_ROUTE',
        'CAB_APPROACHING',
        'CAB_ARRIVED_AT_STOP',
        'BOARDING_CONFIRMED',
        'RIDE_DROPPED',
      ];
      expect(employeeEvents('emp-1')).toEqual(boardedFlow);
      expect(employeeEvents('emp-2')).toEqual(boardedFlow);
      expect(employeeEvents('emp-4')).toEqual(boardedFlow);
      expect(employeeEvents('emp-3')).toEqual([
        'CAB_ASSIGNED',
        'CAB_EN_ROUTE',
        'CAB_APPROACHING',
        'CAB_ARRIVED_AT_STOP',
        'RIDE_NO_SHOW',
      ]);
    });

    it("fires \"you're next\" exactly once per employee, after the previous stop is boarded or no-show", async () => {
      await runLifecycle();
      EMPLOYEES.forEach((e) => expect(eventsFor(e, 'CAB_APPROACHING')).toHaveLength(1));

      // emp-4's approach was triggered by emp-3's no-show (previous stop seq 3)
      const idx3NoShow = emitted.findIndex((e) => e.event === 'RIDE_NO_SHOW');
      const idx4Approach = emitted.findIndex(
        (e) => e.channel === 'employee:emp-4' && e.event === 'CAB_APPROACHING',
      );
      expect(idx4Approach).toBeGreaterThan(idx3NoShow);

      // Re-triggering is deduped
      const again = await notifier.notifyApproaching({
        routeId: ROUTE_ID,
        tenantId: TENANT_ID,
        employeeId: 'emp-2',
        stopId: stopId(2),
      });
      expect(again.deduped).toBe(true);
      expect(eventsFor('emp-2', 'CAB_APPROACHING')).toHaveLength(1);
    });

    it('emits dashboard attendance PRESENT / LATE / NO_SHOW', async () => {
      await runLifecycle();

      expect(dashboard('ATTENDANCE_PRESENT').map((e) => e.payload.employeeId)).toEqual(['emp-1', 'emp-2']);
      expect(dashboard('ATTENDANCE_LATE').map((e) => e.payload.employeeId)).toEqual(['emp-4']);
      expect(dashboard('ATTENDANCE_LATE')[0].payload.waitedSeconds).toBeGreaterThanOrEqual(200);
      const [noShow] = dashboard('ATTENDANCE_NO_SHOW');
      expect(noShow.payload).toMatchObject({ employeeId: 'emp-3', employeeCode: 'E003' });
    });

    it('sends ASSIGNED with driver/vehicle details and boarding OTP', async () => {
      await notifier.notifyRouteAssigned(ROUTE_ID);
      const [ev] = eventsFor('emp-2', 'CAB_ASSIGNED');
      expect(ev.payload).toMatchObject({
        driverName: 'Ravi Kumar',
        driverPhone: '+919999900000',
        vehicleNumber: 'TS09AB1234',
        boardingOtp: '4822',
      });
    });
  });

  describe('No-show reason', () => {
    it('tells the employee they were not at pickup within the 5-minute wait and cab left', async () => {
      await service.arriveAtStop(ROUTE_ID, stopId(1), stopCoord(1));
      backdateArrival(1, 301);
      await service.markNoShow(ROUTE_ID, stopId(1), {});

      const [ev] = eventsFor('emp-1', 'RIDE_NO_SHOW');
      expect(ev.payload.reason).toMatch(/5-minute boarding window expired/);
      expect(ev.payload.message).toMatch(/^Cab has left: .*5-minute/);

      const push = notifications.sendPushToUser.mock.calls.find(
        (c: any[]) => c[1].data.action === 'CORPORATE_RIDE_NO_SHOW',
      );
      expect(push![0]).toBe('user-1');
      expect(push![1].body).toContain('5-minute');
    });

    it('uses the standard 5-minute reason text when notifier is called without one', async () => {
      await notifier.notifyNoShow({ routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-2', stopId: 's' });
      expect(eventsFor('emp-2', 'RIDE_NO_SHOW')[0].payload.message).toBe(`Cab has left: ${NO_SHOW_DEFAULT_REASON}`);
      expect(dashboard('ATTENDANCE_NO_SHOW')[0].payload.reason).toBe(NO_SHOW_DEFAULT_REASON);
    });
  });

  describe('Resilience, dedupe and delivery channels', () => {
    it('push failure never breaks the trip flow (boarding still succeeds, websocket still sent)', async () => {
      notifications.sendPushToUser.mockRejectedValue(new Error('FCM unavailable'));

      await service.arriveAtStop(ROUTE_ID, stopId(1), stopCoord(1));
      const res = await service.verifyBoardingOtp(ROUTE_ID, stopId(1), { otpCode: otp(1) });

      expect(res.status).toBe('BOARDED');
      expect(eventsFor('emp-1', 'BOARDING_CONFIRMED')).toHaveLength(1);
      expect(notifications.sendPushToUser).toHaveBeenCalled();
    });

    it('user lookup / DB failure inside notifier is swallowed and reported as FAILED push', async () => {
      db.user.findFirst.mockRejectedValueOnce(new Error('db down'));
      const out = await notifier.notifyArrived({ routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-1', stopId: 'x' });
      expect(out).toMatchObject({ delivered: true, websocket: true, push: 'FAILED' });
    });

    it('dedupes the same event for the same stop via Redis NX key with TTL', async () => {
      const ctx = { routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-1', stopId: stopId(1) };
      const first = await notifier.notifyBoarded(ctx);
      const second = await notifier.notifyBoarded(ctx);

      expect(first.deduped).toBe(false);
      expect(second.deduped).toBe(true);
      expect(eventsFor('emp-1', 'BOARDING_CONFIRMED')).toHaveLength(1);
      expect(notifications.sendPushToUser).toHaveBeenCalledTimes(1);
      expect(redisClient.set).toHaveBeenCalledWith(
        `corporate:rider-notify:BOARDED:${ROUTE_ID}:${stopId(1)}`,
        expect.any(String),
        'EX',
        CorporateRiderNotifier.DEDUPE_TTL_SECONDS,
        'NX',
      );
    });

    it('fails open (still delivers) when Redis is unavailable', async () => {
      redisAvailable = false;
      const out = await notifier.notifyArrived({ routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-1' });
      expect(out.delivered).toBe(true);
      expect(eventsFor('emp-1', 'CAB_ARRIVED_AT_STOP')).toHaveLength(1);
    });

    it('employee with an account but no active device token gets websocket only', async () => {
      const out = await notifier.notifyArrived({ routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-3' });
      expect(out).toMatchObject({ websocket: true, push: 'NO_DEVICE' });
      expect(notifications.sendPushToUser).not.toHaveBeenCalled();
    });

    it('employee with no linked app account gets websocket only', async () => {
      const out = await notifier.notifyArrived({ routeId: ROUTE_ID, tenantId: TENANT_ID, employeeId: 'emp-4' });
      expect(out).toMatchObject({ websocket: true, push: 'NO_DEVICE' });
      expect(notifications.sendPushToUser).not.toHaveBeenCalled();
    });

    it('arrival at a home DROPOFF stop (logout route) notifies DROPPED instead of ARRIVED', async () => {
      Object.assign(stops.get(stopId(2)), { stopType: 'DROPOFF' });
      await service.arriveAtStop(ROUTE_ID, stopId(2), stopCoord(2));

      expect(eventsFor('emp-2', 'RIDE_DROPPED')).toHaveLength(1);
      expect(eventsFor('emp-2', 'CAB_ARRIVED_AT_STOP')).toHaveLength(0);
    });
  });
});
