/**
 * WS-D corporate analytics: KPI math, IST day boundaries (must pass under TZ=UTC too), tenant
 * isolation via CorporateAccessGuard, office filter, CSV, attendance paging, no payout fields.
 */
import 'reflect-metadata';
import { BadRequestException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { CorporateAnalyticsService } from '../src/domains/corporate/analytics/corporate-analytics.service';
import { CorporateAnalyticsController } from '../src/domains/corporate/analytics/corporate-analytics.controller';
import { istDayStart, toCsv, toIstIso } from '../src/domains/corporate/analytics/analytics.types';
import { METRIC_DEFINITIONS } from '../src/domains/corporate/analytics/metric-definitions';
import { collectKeys, FakeDb } from './helpers/corporate-ws-d-fakes';

const D3 = new Date('2026-11-03T00:00:00.000Z');
const D4 = new Date('2026-11-04T00:00:00.000Z');
/** IST wall clock on 2026-11-03 to instant. */
const ist = (hh: number, mm = 0, day = '2026-11-03') => new Date(istDayStart(day).getTime() + (hh * 60 + mm) * 60_000);
const PAYOUT_KEY = /fare|payout|margin|earning|paise/i;

function fixture() {
  const db = new FakeDb();
  db.insert('corporateTenant', { id: 'tA', code: 'A', name: 'Acme', status: 'ACTIVE' });
  db.insert('corporateTenant', { id: 'tB', code: 'B', name: 'Globex', status: 'ACTIVE' });
  db.insert('corporateOffice', { id: 'oA1', tenantId: 'tA', code: 'HYD' });
  db.insert('corporateOffice', { id: 'oA2', tenantId: 'tA', code: 'BLR' });
  db.insert('corporateOffice', { id: 'oB1', tenantId: 'tB', code: 'PNQ' });
  db.insert('driver', { id: 'drv1', fullName: 'Ravi', phone: '+9100' });
  const emp = (id: string, tenantId: string, officeId: string) =>
    db.insert('corporateEmployee', { id, tenantId, officeId, employeeCode: id.toUpperCase(), fullName: `Name ${id}`, department: 'Eng' });
  ['a1', 'a2', 'a3', 'a4'].forEach((e) => emp(e, 'tA', 'oA1'));
  emp('a5', 'tA', 'oA2');
  emp('b1', 'tB', 'oB1');

  let n = 0;
  const req = (employeeId: string, status: string, tenantId = 'tA', scheduledDate = D3, direction = 'LOGIN') =>
    db.insert('corporateTransportRequest', { id: `q${++n}`, tenantId, employeeId, scheduledDate, shiftTime: '09:00', direction, status });
  const route = (id: string, over: any = {}) =>
    db.insert('corporateRoute', {
      id, tenantId: 'tA', officeId: 'oA1', shiftDate: D3, shiftTime: '09:00', direction: 'LOGIN', vehicleCategory: 'SEDAN',
      maxCapacity: 4, assignedPassengerCount: 4, targetPickup1Time: ist(8), targetOfficeArrivalTime: ist(9), estDistanceMeters: 21000,
      status: 'COMPLETED', driverId: 'drv1', ...over,
    });
  const stop = (id: string, routeId: string, employeeId: string, status: string, plannedEta: Date, actual: Date | null, extra: any = {}) =>
    db.insert('corporateRouteStop', { id, routeId, employeeId, stopType: 'PICKUP', stopSequence: Number(id.replace(/\D/g, '')) || 1, status, plannedEta, actualArrivalTime: actual, ...extra });

  // Route r1 (oA1, COMPLETED, 4/4): a1 on time (+2), a2 exactly +5 (on time), a3 late +12, a4 no-show.
  route('r1');
  stop('s1', 'r1', 'a1', 'BOARDED', ist(8, 0), ist(8, 2));
  stop('s2', 'r1', 'a2', 'BOARDED', ist(8, 10), ist(8, 15));
  stop('s3', 'r1', 'a3', 'BOARDED', ist(8, 20), ist(8, 32));
  stop('s4', 'r1', 'a4', 'NO_SHOW', ist(8, 30), ist(8, 29), { noShowReason: '=HYPERLINK("x"), "quoted"' });
  // Route r2 (oA2, COMPLETED, 1/4): a5 early (-3) counts as 0 delay.
  route('r2', { officeId: 'oA2', assignedPassengerCount: 1 });
  stop('s5', 'r2', 'a5', 'BOARDED', ist(8, 0), ist(7, 57));
  // Route r3 (oA1, CANCELLED) and r4 (ASSIGNED) on the same day; r5 next day (excluded for 11-03).
  route('r3', { status: 'CANCELLED', assignedPassengerCount: 0 });
  route('r4', { status: 'ASSIGNED', direction: 'LOGOUT', shiftTime: '18:00' });
  route('r5', { shiftDate: D4 });
  stop('s6', 'r5', 'a1', 'BOARDED', ist(8, 0, '2026-11-04'), ist(8, 30, '2026-11-04'));
  // Tenant B noise on the same day.
  db.insert('corporateRoute', { id: 'rb', tenantId: 'tB', officeId: 'oB1', shiftDate: D3, shiftTime: '09:00', direction: 'LOGIN', maxCapacity: 4, assignedPassengerCount: 4, status: 'COMPLETED' });
  stop('s9', 'rb', 'b1', 'BOARDED', ist(8), ist(9));
  // Driver payout rows exist in the DB but must never surface.
  db.insert('corporateDriverEarning', { id: 'earn1', driverId: 'drv1', routeId: 'r1', routeFarePaise: BigInt(66000), totalEarnedPaise: BigInt(66000) });

  req('a1', 'COMPLETED'); req('a2', 'COMPLETED'); req('a3', 'COMPLETED'); req('a4', 'UNSERVED'); req('a5', 'COMPLETED');
  req('a1', 'CANCELLED', 'tA', D3, 'LOGOUT'); req('a2', 'UNSERVED', 'tA', D3, 'LOGOUT'); req('a3', 'RESCHEDULED', 'tA', D3, 'LOGOUT');
  req('a1', 'COMPLETED', 'tA', D4);
  req('b1', 'CANCELLED', 'tB');

  // SOS alerts around the IST midnight boundaries of 2026-11-03.
  const sos = (id: string, routeId: string, at: string, status = 'RESOLVED') => db.insert('corporateSosAlert', { id, routeId, createdAt: new Date(at), status });
  sos('sos-before', 'r1', '2026-11-02T18:29:59.999Z'); // 23:59:59 IST on 11-02
  sos('sos-start', 'r1', '2026-11-02T18:30:00.000Z'); // 00:00 IST on 11-03
  sos('sos-end', 'r2', '2026-11-03T18:29:59.999Z', 'FALSE_ALARM'); // 23:59:59 IST on 11-03
  sos('sos-after', 'r1', '2026-11-03T18:30:00.000Z'); // 00:00 IST on 11-04
  sos('sos-b', 'rb', '2026-11-03T05:00:00.000Z');
  return db;
}

const Q = { tenantId: 'tA', from: '2026-11-03', to: '2026-11-03' };

describe('WS-D analytics dashboard', () => {
  it('computes the KPI set exactly on fixture data', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    const asOf = new Date('2026-11-03T12:00:00Z');
    const d: any = await svc.getDashboard(Q, asOf);
    expect(d.asOf).toBe(asOf.toISOString());
    expect(d.trips).toEqual({ total: 4, byStatus: { PLANNED: 0, DISPATCHING: 0, ASSIGNED: 1, IN_TRANSIT: 0, COMPLETED: 2, CANCELLED: 1 } });
    expect(d.employeesServed).toBe(4);
    expect(d.requests).toMatchObject({ total: 8, cancelled: 1, noShows: 1, unserved: 1 });
    expect(d.requests.byStatus).toMatchObject({ COMPLETED: 4, UNSERVED: 2, CANCELLED: 1, RESCHEDULED: 1 });
    // On time: a1 (+2), a2 (+5 exactly), a5 (-3); late: a3 (+12). Delay sum = 2 + 5 + 12 + 0 = 19 / 4.
    expect(d.punctuality).toEqual({
      graceMinutes: 5, boardedStops: 4, measuredStops: 4, excludedNoArrival: 0, onTimePickups: 3, latePickups: 1, onTimePct: 75, avgDelayMinutes: 4.75,
    });
    expect(d.seatUtilisation).toEqual({ completedRoutes: 2, assignedSeats: 5, capacitySeats: 8, pct: 62.5 });
    expect(d.safety).toMatchObject({ sosAlerts: 2, byStatus: { RESOLVED: 1, FALSE_ALARM: 1 } });
  });

  it('uses IST day boundaries for instants, whatever the server TZ', async () => {
    expect(istDayStart('2026-11-03').toISOString()).toBe('2026-11-02T18:30:00.000Z');
    expect(toIstIso(new Date('2026-11-02T18:30:00Z'))).toBe('2026-11-03T00:00:00+05:30');
    const svc = new CorporateAnalyticsService(fixture() as any);
    const d2: any = await svc.getDashboard({ ...Q, from: '2026-11-02', to: '2026-11-02' });
    expect(d2.safety.sosAlerts).toBe(1); // only sos-before
    const d4: any = await svc.getDashboard({ ...Q, from: '2026-11-04', to: '2026-11-04' });
    expect(d4.safety.sosAlerts).toBe(1); // only sos-after
    expect(d4.trips.total).toBe(1);
    const both: any = await svc.getDashboard({ ...Q, to: '2026-11-04' });
    expect(both.safety.sosAlerts).toBe(3);
    expect(both.punctuality).toMatchObject({ measuredStops: 5, onTimePickups: 3 });
  });

  it('filters by office (and refuses an office of another tenant) and by direction / shiftTime', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    const o2: any = await svc.getDashboard({ ...Q, officeId: 'oA2' });
    expect(o2.trips.total).toBe(1);
    expect(o2.employeesServed).toBe(1);
    expect(o2.requests.total).toBe(1);
    expect(o2.seatUtilisation).toMatchObject({ assignedSeats: 1, capacitySeats: 4, pct: 25 });
    expect(o2.safety.sosAlerts).toBe(1);
    await expect(svc.getDashboard({ ...Q, officeId: 'oB1' })).rejects.toBeInstanceOf(NotFoundException);
    const logout: any = await svc.getDashboard({ ...Q, direction: 'logout' });
    expect(logout.trips.byStatus.ASSIGNED).toBe(1);
    expect(logout.requests.total).toBe(3);
    const at18: any = await svc.getDashboard({ ...Q, shiftTime: '18:00' });
    expect(at18.trips.total).toBe(1);
  });

  it('rejects invalid filters', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    for (const q of [
      { from: '2026-11-03', to: '2026-11-03' },
      { ...Q, from: '2026-11-31' },
      { ...Q, from: '2026-11-04', to: '2026-11-03' },
      { ...Q, from: '2026-01-01', to: '2026-12-31' },
      { ...Q, direction: 'SIDEWAYS' },
      { ...Q, shiftTime: '9am' },
    ]) {
      await expect(svc.getDashboard(q as any)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('issues a constant number of aggregate queries (no N+1)', async () => {
    const db = fixture();
    const svc = new CorporateAnalyticsService(db as any);
    await svc.getDashboard(Q);
    const small = db.calls.length;
    for (let i = 0; i < 50; i++) {
      db.insert('corporateRoute', { id: `x${i}`, tenantId: 'tA', officeId: 'oA1', shiftDate: D3, shiftTime: '09:00', direction: 'LOGIN', maxCapacity: 4, assignedPassengerCount: 2, status: 'COMPLETED' });
      db.insert('corporateRouteStop', { id: `xs${i}`, routeId: `x${i}`, employeeId: 'a1', status: 'BOARDED', plannedEta: ist(8), actualArrivalTime: ist(8) });
    }
    db.calls.length = 0;
    const d: any = await svc.getDashboard(Q);
    expect(db.calls.length).toBe(small);
    expect(db.calls.every(([, m]) => ['groupBy', 'aggregate', 'findMany'].includes(m))).toBe(true);
    expect(d.trips.byStatus.COMPLETED).toBe(52);
  });
});

describe('WS-D attendance and reports', () => {
  it('returns per-employee attendance with late days, paged', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    const p1: any = await svc.getAttendance({ ...Q, pageSize: 2, page: 1 });
    expect(p1).toMatchObject({ total: 5, hasMore: true, page: 1, pageSize: 2 });
    expect(p1.items.map((r: any) => r.employeeCode)).toEqual(['A1', 'A2']);
    expect(p1.items[0]).toMatchObject({ scheduledRides: 2, boarded: 1, noShows: 0, cancellations: 1, lateDays: 0 });
    // a3: RESCHEDULED LOGOUT request is not counted as scheduled
    const all: any = await svc.getAttendance({ ...Q, pageSize: 50 });
    const by = Object.fromEntries(all.items.map((r: any) => [r.employeeId, r]));
    expect(by.a2).toMatchObject({ scheduledRides: 2, boarded: 1, lateDays: 0 });
    expect(by.a3).toMatchObject({ scheduledRides: 1, boarded: 1, lateDays: 1 });
    expect(by.a4).toMatchObject({ scheduledRides: 1, boarded: 0, noShows: 1 });
    const twoDays: any = await svc.getAttendance({ ...Q, to: '2026-11-04' });
    expect(twoDays.items.find((r: any) => r.employeeId === 'a1')).toMatchObject({ scheduledRides: 3, boarded: 2, lateDays: 1 });
    const office: any = await svc.getAttendance({ ...Q, officeId: 'oA2' });
    expect(office.items.map((r: any) => r.employeeId)).toEqual(['a5']);
  });

  it('renders CSV safely (quoting, CRLF, formula-injection guard)', () => {
    const csv = toCsv(['a', 'b', 'c'], [{ a: 'x,y', b: 'say "hi"', c: '=SUM(A1)' }, { a: -5, b: null, c: '@cmd' }]);
    expect(csv).toBe('a,b,c\r\n"x,y","say ""hi""",\'=SUM(A1)\r\n-5,,\'@cmd\r\n');
  });

  it('streams the no-shows report as CSV through the controller with download headers', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    const ctrl = new CorporateAnalyticsController(svc);
    const res: any = { headers: {}, set: jest.fn(function (h: any) { Object.assign(res.headers, h); return res; }), status: jest.fn(() => res), send: jest.fn(), json: jest.fn() };
    await ctrl.report('no-shows.csv', res, undefined, 'tA', undefined, '2026-11-03', '2026-11-03');
    expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['Content-Disposition']).toBe('attachment; filename="no-shows_2026-11-03_2026-11-03.csv"');
    const lines = String(res.send.mock.calls[0][0]).trimEnd().split('\r\n');
    expect(lines[0]).toBe('shiftDate,shiftTime,direction,officeCode,employeeCode,employeeName,routeId,stopSequence,plannedPickup,cabArrivedAt,reason');
    expect(lines[1]).toBe('2026-11-03,09:00,LOGIN,HYD,A4,Name a4,r1,4,2026-11-03T08:30:00+05:30,2026-11-03T08:29:00+05:30,"\'=HYPERLINK(""x""), ""quoted"""');
    expect(lines).toHaveLength(2);
  });

  it('serves trips and attendance reports as JSON (enveloped) and CSV, and validates type/format', async () => {
    CorporateAnalyticsService.REPORT_CHUNK = 2; // exercise cursor paging
    try {
      const svc = new CorporateAnalyticsService(fixture() as any);
      const trips: any = await svc.getReport('trips', 'json', Q);
      expect(trips.body.rowCount).toBe(4);
      const r1 = trips.body.rows.find((r: any) => r.routeId === 'r1');
      expect(r1).toMatchObject({ boarded: 3, noShows: 1, assignedPassengers: 4, driverName: 'Ravi', estDistanceKm: 21, plannedPickup1: '2026-11-03T08:00:00+05:30' });
      const att = await svc.getReport('attendance', 'csv', Q);
      expect(String(att.body).split('\r\n')[1]).toBe('A1,Name a1,Eng,2,1,0,1,0');
      const ctrl = new CorporateAnalyticsController(svc);
      const res: any = { set: jest.fn(), status: jest.fn(() => res), send: jest.fn(), json: jest.fn() };
      await ctrl.report('trips', res, 'json', 'tA', undefined, '2026-11-03', '2026-11-03');
      expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, data: { type: 'trips', rowCount: 4 } });
      await expect(svc.getReport('payouts', 'csv', Q)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.getReport('trips', 'xlsx', Q)).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      CorporateAnalyticsService.REPORT_CHUNK = 1000;
    }
  });

  it('never exposes driver payout, fare or margin fields', async () => {
    const svc = new CorporateAnalyticsService(fixture() as any);
    const payloads = [
      await svc.getDashboard(Q),
      await svc.getAttendance(Q),
      ...(await Promise.all(['trips', 'no-shows', 'attendance'].map((t) => svc.getReport(t, 'json', Q)))).map((r) => r.body),
    ];
    for (const p of payloads) {
      expect([...collectKeys(p)].filter((k) => PAYOUT_KEY.test(k))).toEqual([]);
      expect(JSON.stringify(p)).not.toMatch(/66000/);
    }
    const csv = await svc.getReport('trips', 'csv', Q);
    expect(String(csv.body).split('\r\n')[0]).not.toMatch(PAYOUT_KEY);
  });

  it('documents numerator, timezone, status inclusion and freshness for every metric', () => {
    expect(METRIC_DEFINITIONS.length).toBeGreaterThanOrEqual(12);
    for (const m of METRIC_DEFINITIONS) {
      expect(m.numerator).toBeTruthy();
      expect(m.statusInclusion).toBeTruthy();
      expect(m.timezone).toMatch(/IST/);
      expect(m.freshness).toBeTruthy();
      if (m.unit === 'percent') expect(m.denominator).toBeTruthy();
    }
  });
});

describe('WS-D analytics tenant isolation (CorporateAccessGuard)', () => {
  const guardDb = {
    corporateTenant: {
      findUnique: jest.fn(async ({ where }: any) => ({ tA: { id: 'tA', code: 'A', name: 'Acme', status: 'ACTIVE' }, tB: { id: 'tB', code: 'B', name: 'Globex', status: 'ACTIVE' } } as any)[where.id] ?? null),
    },
  };
  const guard = new CorporateAccessGuard(new Reflector(), guardDb as any);
  const ctx = (method: string, user: any, query: any): [ExecutionContext, any] => {
    const req = { user, params: {}, query, body: {}, headers: {} };
    return [
      { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => (CorporateAnalyticsController.prototype as any)[method], getClass: () => CorporateAnalyticsController } as any,
      req,
    ];
  };
  const corpA = { id: 'u-ca', role: UserRole.CORPORATE_ADMIN, corporateTenantId: 'tA' };

  it('403 when a corporate user of tenant A asks for tenant B, on every analytics endpoint', async () => {
    for (const m of ['dashboard', 'attendance', 'report']) {
      const [c] = ctx(m, corpA, { tenantId: 'tB', from: '2026-11-03', to: '2026-11-03' });
      await expect(guard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
    }
    const [hdr] = ctx('dashboard', { ...corpA, role: UserRole.CORPORATE_MANAGER }, {});
    (hdr.switchToHttp().getRequest() as any).headers['x-corporate-tenant-id'] = 'tB';
    await expect(guard.canActivate(hdr)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces the caller tenant when omitted, so a corporate user only sees their own data', async () => {
    const [c, req] = ctx('dashboard', corpA, { from: '2026-11-03', to: '2026-11-03' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(req.query.tenantId).toBe('tA');
    const d: any = await new CorporateAnalyticsService(fixture() as any).getDashboard(req.query);
    expect(d.filter.tenantId).toBe('tA');
    expect(d.safety.sosAlerts).toBe(2); // tenant B's alert is not included
  });

  it('ADMIN may target any tenant; drivers and employees are refused', async () => {
    const [a, req] = ctx('dashboard', { id: 'adm', role: UserRole.ADMIN }, { tenantId: 'tB' });
    await expect(guard.canActivate(a)).resolves.toBe(true);
    expect(req.query.tenantId).toBe('tB');
    for (const role of [UserRole.DRIVER, UserRole.EMPLOYEE]) {
      const [c] = ctx('dashboard', { id: 'x', role, corporateTenantId: 'tA' }, {});
      await expect(guard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(Reflect.getMetadata(ROLES_KEY, CorporateAnalyticsController.prototype.dashboard)).toEqual([
      UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER,
    ]);
  });
});
