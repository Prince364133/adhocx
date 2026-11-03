/**
 * WS-D simulation: one operating day (2026-11-03 IST) for 500 employees of one tenant across two
 * offices, with deterministic fixture data. Every KPI is asserted as an exact literal that was
 * derived by hand from the fixture rules below (not by re-running the service's formulas).
 *
 * Fixture rules (employee index i = 0..499; office O1 for i < 300, O2 otherwise)
 *  LOGIN 09:00   i % 25 == 0 -> request CANCELLED (20)          i % 50 == 1 -> planner UNSERVED (10)
 *                i % 20 == 7 -> routed but NO_SHOW (25)           else BOARDED (445)
 *                routes of 4 seats in O1 (cap 4, 71 routes, 282 riders), O2 (cap 6, 47 routes, 188 riders), all COMPLETED
 *                cab arrival vs plannedEta by i % 10: 3 -> +12m, 6 -> +6m (late), 5 -> +4m, 9 -> +5m (on time), else -1m
 *  LOGOUT 18:00  i % 40 == 0 -> request CANCELLED (13); others routed 4 per cab:
 *                O1 73 routes: 60 ASSIGNED, 10 DISPATCHING, 3 PLANNED; O2 49 routes: 45 ASSIGNED, 2 DISPATCHING,
 *                1 PLANNED, 1 CANCELLED (3 riders, their requests CANCELLED)
 *  SOS           4 alerts on tenant routes around the IST midnights; 2 fall on 2026-11-03 IST
 *  Noise         a 2026-11-04 route and a second tenant on 2026-11-03 must not leak in.
 */
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { CorporateAnalyticsService } from '../src/domains/corporate/analytics/corporate-analytics.service';
import { istDayStart } from '../src/domains/corporate/analytics/analytics.types';
import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateRiderNotifier } from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { CorporateOperationsService } from '../src/domains/corporate/operations/corporate-operations.service';
import { collectKeys, FakeDb, FakeRedisService, makeAudit, makeNotifications } from './helpers/corporate-ws-d-fakes';

// A full day for 500 employees through an in-memory Prisma stand-in; generous under `-w 4` load.
jest.setTimeout(60_000);

const D3 = new Date('2026-11-03T00:00:00.000Z');
const D4 = new Date('2026-11-04T00:00:00.000Z');
const ist = (hh: number, mm = 0, day = '2026-11-03') => new Date(istDayStart(day).getTime() + (hh * 60 + mm) * 60_000);
const pad = (n: number, w = 3) => String(n).padStart(w, '0');
const DELAY_MIN: Record<number, number> = { 3: 12, 6: 6, 5: 4, 9: 5 };

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

function buildDay() {
  const db = new FakeDb();
  db.insert('corporateTenant', { id: 'tA', code: 'GTI', name: 'Global Tech India', status: 'ACTIVE' });
  db.insert('corporateTenant', { id: 'tB', code: 'OTH', name: 'Other Co', status: 'ACTIVE' });
  db.insert('corporateOffice', { id: 'o1', tenantId: 'tA', code: 'HYD', name: 'HITEC City', latitude: 17.44, longitude: 78.38 });
  db.insert('corporateOffice', { id: 'o2', tenantId: 'tA', code: 'GAC', name: 'Gachibowli', latitude: 17.42, longitude: 78.34 });
  db.insert('corporateOffice', { id: 'oB', tenantId: 'tB', code: 'BLR', name: 'Other', latitude: 12.9, longitude: 77.6 });

  let q = 0;
  let st = 0;
  let r = 0;
  const office = (i: number) => (i < 300 ? 'o1' : 'o2');
  const empId = (i: number) => `emp-${pad(i)}`;
  for (let i = 0; i < 500; i++) {
    db.insert('corporateEmployee', { id: empId(i), tenantId: 'tA', officeId: office(i), employeeCode: `E${pad(i)}`, fullName: `Employee ${i}`, department: i % 2 ? 'Eng' : 'Ops' });
  }
  const request = (i: number, direction: string, status: string, scheduledDate = D3, tenantId = 'tA') =>
    db.insert('corporateTransportRequest', {
      id: `req-${pad(++q, 5)}`, tenantId, employeeId: empId(i), scheduledDate, shiftTime: direction === 'LOGIN' ? '09:00' : '18:00', direction, status,
    });
  const route = (over: any) => {
    const id = `rt-${pad(++r, 4)}`;
    db.insert('corporateRoute', {
      id, tenantId: 'tA', shiftDate: D3, vehicleCategory: 'SEDAN', estDistanceMeters: 15000, estDurationSeconds: 3000, driverId: null, vehicleId: null, updatedAt: ist(6), ...over,
    });
    return id;
  };
  const stop = (routeId: string, seq: number, i: number, over: any) =>
    db.insert('corporateRouteStop', { id: `st-${pad(++st, 5)}`, routeId, stopSequence: seq, employeeId: empId(i), boardingOtp: '1234', latitude: 17.4, longitude: 78.4, ...over });

  // ---- LOGIN 09:00 ----
  const routedLogin: Record<string, number[]> = { o1: [], o2: [] };
  for (let i = 0; i < 500; i++) {
    if (i % 25 === 0) request(i, 'LOGIN', 'CANCELLED');
    else if (i % 50 === 1) request(i, 'LOGIN', 'UNSERVED');
    else {
      request(i, 'LOGIN', i % 20 === 7 ? 'UNSERVED' : 'COMPLETED');
      routedLogin[office(i)].push(i);
    }
  }
  const loginRoutes: Record<string, string[]> = { o1: [], o2: [] };
  for (const o of ['o1', 'o2']) {
    for (const group of chunk(routedLogin[o], 4)) {
      const id = route({ officeId: o, shiftTime: '09:00', direction: 'LOGIN', maxCapacity: o === 'o1' ? 4 : 6, assignedPassengerCount: group.length, status: 'COMPLETED', targetPickup1Time: ist(8), targetOfficeArrivalTime: ist(9) });
      loginRoutes[o].push(id);
      group.forEach((i, k) => {
        const planned = ist(8, k * 7);
        const noShow = i % 20 === 7;
        const delay = DELAY_MIN[i % 10] ?? -1;
        stop(id, k + 1, i, {
          stopType: 'PICKUP',
          plannedEta: planned,
          status: noShow ? 'NO_SHOW' : 'BOARDED',
          actualArrivalTime: new Date(planned.getTime() + (noShow ? 0 : delay) * 60_000),
          noShowReason: noShow ? 'Not at pickup within 5 minutes' : null,
        });
      });
    }
  }

  // ---- LOGOUT 18:00 ----
  const routedLogout: Record<string, number[]> = { o1: [], o2: [] };
  for (let i = 0; i < 500; i++) if (i % 40 !== 0) routedLogout[office(i)].push(i);
  const plan: Record<string, string[]> = {
    o1: [...Array(60).fill('ASSIGNED'), ...Array(10).fill('DISPATCHING'), ...Array(3).fill('PLANNED')],
    o2: [...Array(45).fill('ASSIGNED'), ...Array(2).fill('DISPATCHING'), 'PLANNED', 'CANCELLED'],
  };
  const reqStatus: Record<string, string> = { ASSIGNED: 'ASSIGNED', DISPATCHING: 'PLANNED', PLANNED: 'PLANNED', CANCELLED: 'CANCELLED' };
  const assignedLogout: string[] = [];
  let drv = 0;
  for (let i = 0; i < 500; i++) if (i % 40 === 0) request(i, 'LOGOUT', 'CANCELLED');
  for (const o of ['o1', 'o2']) {
    chunk(routedLogout[o], 4).forEach((group, idx) => {
      const status = plan[o][idx];
      let driverId: string | null = null;
      if (status === 'ASSIGNED') {
        driverId = `drv-${pad(++drv)}`;
        db.insert('driver', { id: driverId, userId: `u-${driverId}`, fullName: `Driver ${drv}`, verificationStatus: 'VERIFIED', availabilityStatus: 'AVAILABLE' });
      }
      const id = route({ officeId: o, shiftTime: '18:00', direction: 'LOGOUT', maxCapacity: 4, assignedPassengerCount: group.length, status, driverId, targetPickup1Time: ist(18), targetOfficeArrivalTime: ist(18) });
      if (status === 'ASSIGNED') assignedLogout.push(id);
      group.forEach((i, k) => {
        request(i, 'LOGOUT', reqStatus[status]);
        stop(id, k + 1, i, { stopType: 'DROPOFF', plannedEta: ist(18, 30 + k * 8), status: status === 'CANCELLED' ? 'CANCELLED' : 'PENDING', actualArrivalTime: null });
      });
    });
  }

  // ---- SOS around the IST midnights ----
  const sos = (id: string, routeId: string, at: string) => db.insert('corporateSosAlert', { id, routeId, createdAt: new Date(at), status: 'RESOLVED' });
  sos('sos-1', loginRoutes.o1[0], '2026-11-02T18:29:59.999Z');
  sos('sos-2', loginRoutes.o1[1], '2026-11-02T18:30:00.000Z');
  sos('sos-3', loginRoutes.o2[0], '2026-11-03T18:29:59.999Z');
  sos('sos-4', loginRoutes.o1[2], '2026-11-03T18:30:00.000Z');

  // ---- Noise: next day and another tenant ----
  const next = route({ officeId: 'o1', shiftDate: D4, shiftTime: '09:00', direction: 'LOGIN', maxCapacity: 4, assignedPassengerCount: 4, status: 'COMPLETED', targetPickup1Time: ist(8, 0, '2026-11-04'), targetOfficeArrivalTime: ist(9, 0, '2026-11-04') });
  [10, 11, 12, 13].forEach((i, k) => {
    request(i, 'LOGIN', 'COMPLETED', D4);
    const planned = ist(8, k * 7, '2026-11-04');
    stop(next, k + 1, i, { stopType: 'PICKUP', plannedEta: planned, status: 'BOARDED', actualArrivalTime: new Date(planned.getTime() + 20 * 60_000) });
  });
  db.insert('corporateEmployee', { id: 'emp-b', tenantId: 'tB', officeId: 'oB', employeeCode: 'B1', fullName: 'Other' });
  db.insert('corporateRoute', { id: 'rt-b', tenantId: 'tB', officeId: 'oB', shiftDate: D3, shiftTime: '09:00', direction: 'LOGIN', maxCapacity: 4, assignedPassengerCount: 1, status: 'COMPLETED' });
  db.insert('corporateRouteStop', { id: 'st-b', routeId: 'rt-b', employeeId: 'emp-b', status: 'BOARDED', plannedEta: ist(8), actualArrivalTime: ist(8, 30) });
  db.insert('corporateTransportRequest', { id: 'req-b', tenantId: 'tB', employeeId: 'emp-b', scheduledDate: D3, shiftTime: '09:00', direction: 'LOGIN', status: 'COMPLETED' });
  db.insert('corporateSosAlert', { id: 'sos-b', routeId: 'rt-b', createdAt: ist(10), status: 'ACTIVE' });

  return { db, assignedLogout };
}

describe('WS-D simulation: 500 employees, one IST day', () => {
  const Q = { tenantId: 'tA', from: '2026-11-03', to: '2026-11-03' };
  let world: ReturnType<typeof buildDay>;
  let analytics: CorporateAnalyticsService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    CorporateAnalyticsService.SCAN_CHUNK = 100; // 445 boarded stops -> 5 cursor pages
    world = buildDay();
    analytics = new CorporateAnalyticsService(world.db as any);
  });
  afterAll(() => {
    CorporateAnalyticsService.SCAN_CHUNK = 5000;
  });

  it('fixture shape: 500 employees, 1000 requests and 240 routes on the day', () => {
    const { db } = world;
    expect(db.all('corporateEmployee').filter((e) => e.tenantId === 'tA')).toHaveLength(500);
    expect(db.all('corporateTransportRequest').filter((x) => x.tenantId === 'tA' && x.scheduledDate === D3)).toHaveLength(1000);
    expect(db.all('corporateRoute').filter((x) => x.tenantId === 'tA' && x.shiftDate === D3)).toHaveLength(240);
  });

  it('tenant dashboard KPIs are exact', async () => {
    const d: any = await analytics.getDashboard(Q);
    expect(d.trips).toEqual({ total: 240, byStatus: { PLANNED: 4, DISPATCHING: 12, ASSIGNED: 105, IN_TRANSIT: 0, COMPLETED: 118, CANCELLED: 1 } });
    expect(d.employeesServed).toBe(445);
    expect(d.requests).toEqual({
      total: 1000,
      byStatus: { APPROVED: 0, PLANNED: 64, ASSIGNED: 420, IN_PROGRESS: 0, COMPLETED: 445, CANCELLED: 36, RESCHEDULED: 0, UNSERVED: 35 },
      cancelled: 36,
      noShows: 25,
      unserved: 10,
    });
    expect(d.punctuality).toEqual({
      graceMinutes: 5, boardedStops: 445, measuredStops: 445, excludedNoArrival: 0, onTimePickups: 345, latePickups: 100, onTimePct: 77.53, avgDelayMinutes: 2.94,
    });
    expect(d.seatUtilisation).toEqual({ completedRoutes: 118, assignedSeats: 470, capacitySeats: 566, pct: 83.04 });
    expect(d.safety.sosAlerts).toBe(2);
  });

  it('office O2 dashboard KPIs are exact', async () => {
    const d: any = await analytics.getDashboard({ ...Q, officeId: 'o2' });
    expect(d.trips).toEqual({ total: 96, byStatus: { PLANNED: 1, DISPATCHING: 2, ASSIGNED: 45, IN_TRANSIT: 0, COMPLETED: 47, CANCELLED: 1 } });
    expect(d.employeesServed).toBe(178);
    expect(d.requests).toMatchObject({ total: 400, cancelled: 16, noShows: 10, unserved: 4 });
    expect(d.requests.byStatus).toMatchObject({ COMPLETED: 178, UNSERVED: 14, ASSIGNED: 180, PLANNED: 12 });
    expect(d.punctuality).toMatchObject({ measuredStops: 178, onTimePickups: 138, latePickups: 40, onTimePct: 77.53, avgDelayMinutes: 2.94 });
    expect(d.seatUtilisation).toEqual({ completedRoutes: 47, assignedSeats: 188, capacitySeats: 282, pct: 66.67 });
    expect(d.safety.sosAlerts).toBe(1);
  });

  it('LOGIN-only and two-day views are exact', async () => {
    const login: any = await analytics.getDashboard({ ...Q, direction: 'LOGIN' });
    expect(login.trips.total).toBe(118);
    expect(login.requests.byStatus).toMatchObject({ CANCELLED: 20, UNSERVED: 35, COMPLETED: 445 });
    expect(login.requests.total).toBe(500);
    const two: any = await analytics.getDashboard({ ...Q, to: '2026-11-04' });
    expect(two.trips.total).toBe(241);
    expect(two.employeesServed).toBe(445); // emp-010..013 rode again on 11-04: distinct employees, not rides
    expect(two.punctuality).toMatchObject({ measuredStops: 449, onTimePickups: 345 });
    expect(two.safety.sosAlerts).toBe(3);
  });

  it('attendance for all 500 employees is exact', async () => {
    const att: any = await analytics.getAttendance({ ...Q, pageSize: 500 });
    expect(att.total).toBe(500);
    expect(att.items).toHaveLength(500);
    const total = (k: string) => att.items.reduce((n: number, r: any) => n + r[k], 0);
    expect([total('scheduledRides'), total('boarded'), total('noShows'), total('cancellations'), total('lateDays')]).toEqual([1000, 445, 25, 36, 100]);
    const by = Object.fromEntries(att.items.map((r: any) => [r.employeeCode, r]));
    expect(by.E000).toMatchObject({ scheduledRides: 2, boarded: 0, noShows: 0, cancellations: 2, lateDays: 0 });
    expect(by.E001).toMatchObject({ scheduledRides: 2, boarded: 0, noShows: 0, cancellations: 0, lateDays: 0 });
    expect(by.E003).toMatchObject({ scheduledRides: 2, boarded: 1, lateDays: 1 });
    expect(by.E007).toMatchObject({ boarded: 0, noShows: 1, lateDays: 0 });
    expect(by.E009).toMatchObject({ boarded: 1, lateDays: 0 }); // exactly +5 min is on time
    const page3: any = await analytics.getAttendance({ ...Q, page: 3, pageSize: 200 });
    expect(page3.items.map((r: any) => r.employeeCode)).toEqual(Array.from({ length: 100 }, (_, k) => `E${pad(400 + k)}`));
    const twoDays: any = await analytics.getAttendance({ ...Q, to: '2026-11-04', pageSize: 500 });
    const e13 = twoDays.items.find((r: any) => r.employeeCode === 'E013');
    expect(e13).toMatchObject({ scheduledRides: 3, boarded: 2, lateDays: 2 });
  });

  it('reports: attendance CSV has 500 rows, no-shows has 25, no payout fields anywhere', async () => {
    const csv = await analytics.getReport('attendance', 'csv', Q);
    const lines = String(csv.body).trimEnd().split('\r\n');
    expect(lines).toHaveLength(501);
    expect(lines.find((l) => l.startsWith('E003,'))).toBe('E003,Employee 3,Eng,2,1,0,0,1');
    const ns: any = await analytics.getReport('no-shows', 'json', Q);
    expect(ns.body.rowCount).toBe(25);
    const trips: any = await analytics.getReport('trips', 'json', Q);
    expect(trips.body.rowCount).toBe(240);
    for (const p of [ns.body, trips.body, await analytics.getDashboard(Q)]) {
      expect([...collectKeys(p)].filter((k) => /fare|payout|margin|earning|paise/i.test(k))).toEqual([]);
    }
  });

  it('command-centre board for the day, then an ops reassign moves one route back to dispatch', async () => {
    const { db, assignedLogout } = world;
    const redis = new FakeRedisService();
    const notifications = makeNotifications();
    const audit = makeAudit();
    const rider = new CorporateRiderNotifier(db as any, redis as any, notifications as any);
    const locations = { findNearbyDrivers: jest.fn(async () => []) };
    const dispatch = new CorporateDispatchService(db as any, redis as any, notifications as any, audit as any, locations as any, undefined, rider);
    const ops = new CorporateOperationsService(db as any, redis as any, notifications as any, audit as any, dispatch, rider);
    const now = ist(16, 30);

    const before: any = await ops.getBoard({ date: '2026-11-03', tenantId: 'tA' }, now);
    expect(before.counts).toMatchObject({ PLANNED: 4, DISPATCHING: 12, ASSIGNED: 105, IN_TRANSIT: 0, COMPLETED: 118, CANCELLED: 1, total: 240 });
    expect(before.atRisk.items).toHaveLength(0); // 18:00 pickups are 90 min away

    const target = assignedLogout[0];
    db.insert('corporateDriverEarning', { id: 'earn-sim', driverId: db.tables.corporateRoute.get(target)!.driverId, routeId: target, routeFarePaise: BigInt(60000), totalEarnedPaise: BigInt(60000), payoutStatus: 'UNPAID', payoutBatchId: null });
    const res: any = await ops.reassignRoute(target, { reason: 'Driver called in sick' }, { id: 'u-ops' });
    expect(res.dispatch.status).toBe('NO_DRIVERS_FOUND');
    expect(notifications.events.filter((e) => e.event === 'CORPORATE_CAB_REPLACED')).toHaveLength(4);

    const late = ist(17, 45); // within the 30-minute escalation lead of the 18:00 pickups
    const after: any = await ops.getBoard({ date: '2026-11-03', tenantId: 'tA', officeId: 'o1' }, late);
    expect(after.counts).toMatchObject({ DISPATCHING: 11, ASSIGNED: 59, PLANNED: 3 });
    expect(after.atRisk.items).toHaveLength(14); // 11 DISPATCHING + 3 PLANNED O1 LOGOUT routes
    expect(after.atRisk.items.find((r: any) => r.id === target).offer.state).toBe('RETRY_NO_SUPPLY');
  });
});
