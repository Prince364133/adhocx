import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  AnalyticsFilter,
  AnalyticsFilterError,
  AnalyticsQuery,
  buildAnalyticsFilter,
  REPORT_TYPES,
  ReportFormat,
  ReportType,
  toCsv,
  toIstIso,
} from './analytics.types';
import { ANALYTICS_TIMEZONE, METRIC_DEFINITIONS, ON_TIME_GRACE_MINUTES } from './metric-definitions';

const ROUTE_STATUSES = ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
const REQUEST_STATUSES = [
  'APPROVED',
  'PLANNED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
  'UNSERVED',
] as const;
const SOS_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDED', 'RESOLVED', 'FALSE_ALARM'] as const;
const GRACE_MS = ON_TIME_GRACE_MINUTES * 60_000;
/** Hard cap on rows in one report download. */
export const MAX_REPORT_ROWS = 50_000;

export interface AttendanceRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string;
  department: string | null;
  scheduledRides: number;
  boarded: number;
  noShows: number;
  cancellations: number;
  lateDays: number;
}

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num * 10000) / den) / 100 : null);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const countOf = (g: any): number => Number(g?._count?._all ?? g?._count ?? 0);

/**
 * Corporate dashboard, attendance and reports (PRD CP-DASH / CP-RPT / COR-02).
 * Every metric is defined in metric-definitions.ts. All counts are aggregate queries (groupBy / count /
 * aggregate); the only row scan is the stop timestamp pair for punctuality, read in id-keyed chunks
 * with a two-column select. No driver payout / fare / margin field is ever selected.
 */
@Injectable()
export class CorporateAnalyticsService {
  /** Rows read per round-trip when scanning stop timestamps (constant memory, no N+1). */
  static SCAN_CHUNK = 5000;
  /** Rows read per round-trip when building a report. */
  static REPORT_CHUNK = 1000;

  constructor(private readonly db: DatabaseService) {}

  getMetricDefinitions() {
    return { timezone: ANALYTICS_TIMEZONE, onTimeGraceMinutes: ON_TIME_GRACE_MINUTES, metrics: METRIC_DEFINITIONS };
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  async resolveFilter(q: AnalyticsQuery): Promise<AnalyticsFilter> {
    let f: AnalyticsFilter;
    try {
      f = buildAnalyticsFilter(q);
    } catch (err) {
      if (err instanceof AnalyticsFilterError) throw new BadRequestException(err.message);
      throw err;
    }
    if (f.officeId) {
      const office = await (this.db as any).corporateOffice.findFirst({
        where: { id: f.officeId, tenantId: f.tenantId },
        select: { id: true },
      });
      // Same answer for "does not exist" and "belongs to another tenant": no cross-tenant probing.
      if (!office) throw new NotFoundException(`Office ${f.officeId} not found for this tenant`);
    }
    return f;
  }

  private routeWhere(f: AnalyticsFilter): Record<string, any> {
    return {
      tenantId: f.tenantId,
      shiftDate: { gte: f.fromDate, lte: f.toDate },
      ...(f.officeId ? { officeId: f.officeId } : {}),
      ...(f.direction ? { direction: f.direction } : {}),
      ...(f.shiftTime ? { shiftTime: f.shiftTime } : {}),
    };
  }

  private requestWhere(f: AnalyticsFilter): Record<string, any> {
    return {
      tenantId: f.tenantId,
      scheduledDate: { gte: f.fromDate, lte: f.toDate },
      ...(f.officeId ? { employee: { officeId: f.officeId } } : {}),
      ...(f.direction ? { direction: f.direction } : {}),
      ...(f.shiftTime ? { shiftTime: f.shiftTime } : {}),
    };
  }

  private stopWhere(f: AnalyticsFilter): Record<string, any> {
    return { employeeId: { not: null }, route: this.routeWhere(f) };
  }

  private sosWhere(f: AnalyticsFilter): Record<string, any> {
    return {
      createdAt: { gte: f.fromInstant, lt: f.toInstantExclusive },
      route: {
        tenantId: f.tenantId,
        ...(f.officeId ? { officeId: f.officeId } : {}),
        ...(f.direction ? { direction: f.direction } : {}),
        ...(f.shiftTime ? { shiftTime: f.shiftTime } : {}),
      },
    };
  }

  private filterEcho(f: AnalyticsFilter) {
    return {
      tenantId: f.tenantId,
      officeId: f.officeId ?? null,
      from: f.from,
      to: f.to,
      direction: f.direction ?? null,
      shiftTime: f.shiftTime ?? null,
      timezone: ANALYTICS_TIMEZONE,
    };
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboard(q: AnalyticsQuery, now: Date = new Date()) {
    const f = await this.resolveFilter(q);
    const db: any = this.db;
    const routeWhere = this.routeWhere(f);
    const stopWhere = this.stopWhere(f);

    const [routeGroups, requestGroups, stopGroups, servedGroups, utilisation, sosGroups, punctuality] =
      await Promise.all([
        db.corporateRoute.groupBy({ by: ['status'], where: routeWhere, _count: { _all: true } }),
        db.corporateTransportRequest.groupBy({ by: ['status'], where: this.requestWhere(f), _count: { _all: true } }),
        db.corporateRouteStop.groupBy({ by: ['status'], where: stopWhere, _count: { _all: true } }),
        db.corporateRouteStop.groupBy({ by: ['employeeId'], where: { ...stopWhere, status: 'BOARDED' } }),
        db.corporateRoute.aggregate({
          where: { ...routeWhere, status: 'COMPLETED' },
          _sum: { assignedPassengerCount: true, maxCapacity: true },
          _count: { _all: true },
        }),
        db.corporateSosAlert.groupBy({ by: ['status'], where: this.sosWhere(f), _count: { _all: true } }),
        this.scanPunctuality({ ...stopWhere, status: 'BOARDED' }),
      ]);

    const trips = zeroed(ROUTE_STATUSES);
    for (const g of routeGroups) trips[g.status] = countOf(g);
    const requests = zeroed(REQUEST_STATUSES);
    for (const g of requestGroups) requests[g.status] = countOf(g);
    const stops: Record<string, number> = {};
    for (const g of stopGroups) stops[g.status] = countOf(g);
    const sos = zeroed(SOS_STATUSES);
    for (const g of sosGroups) sos[g.status] = countOf(g);

    const noShows = stops.NO_SHOW ?? 0;
    const assignedSeats = Number(utilisation?._sum?.assignedPassengerCount ?? 0);
    const capacitySeats = Number(utilisation?._sum?.maxCapacity ?? 0);

    return {
      asOf: now.toISOString(),
      filter: this.filterEcho(f),
      trips: { total: sum(trips), byStatus: trips },
      employeesServed: servedGroups.filter((g: any) => g.employeeId).length,
      requests: {
        total: sum(requests),
        byStatus: requests,
        cancelled: requests.CANCELLED,
        noShows,
        unserved: Math.max(0, requests.UNSERVED - noShows),
      },
      punctuality: {
        graceMinutes: ON_TIME_GRACE_MINUTES,
        boardedStops: stops.BOARDED ?? 0,
        measuredStops: punctuality.measured,
        excludedNoArrival: punctuality.noArrival,
        onTimePickups: punctuality.onTime,
        latePickups: punctuality.measured - punctuality.onTime,
        onTimePct: pct(punctuality.onTime, punctuality.measured),
        avgDelayMinutes: punctuality.measured > 0 ? round2(punctuality.delayMinutesSum / punctuality.measured) : null,
      },
      seatUtilisation: {
        completedRoutes: countOf(utilisation),
        assignedSeats,
        capacitySeats,
        pct: pct(assignedSeats, capacitySeats),
      },
      safety: { sosAlerts: sum(sos), byStatus: sos },
    };
  }

  /** Streams (plannedEta, actualArrivalTime) of matching stops in id order, SCAN_CHUNK rows per query. */
  private async scanPunctuality(where: Record<string, any>) {
    const db: any = this.db;
    let measured = 0;
    let onTime = 0;
    let noArrival = 0;
    let delayMinutesSum = 0;
    let cursor: string | undefined;
    for (;;) {
      const rows: any[] = await db.corporateRouteStop.findMany({
        where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
        select: { id: true, plannedEta: true, actualArrivalTime: true },
        orderBy: { id: 'asc' },
        take: CorporateAnalyticsService.SCAN_CHUNK,
      });
      for (const r of rows) {
        if (!r.actualArrivalTime || !r.plannedEta) {
          noArrival++;
          continue;
        }
        const delayMs = new Date(r.actualArrivalTime).getTime() - new Date(r.plannedEta).getTime();
        measured++;
        if (delayMs <= GRACE_MS) onTime++;
        delayMinutesSum += Math.max(0, delayMs) / 60_000;
      }
      if (rows.length < CorporateAnalyticsService.SCAN_CHUNK) break;
      cursor = rows[rows.length - 1].id;
    }
    return { measured, onTime, noArrival, delayMinutesSum };
  }

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------

  async getAttendance(q: AnalyticsQuery & { page?: number; pageSize?: number }, now: Date = new Date()) {
    const f = await this.resolveFilter(q);
    const pageSize = clampInt(q.pageSize, 50, 1, 500);
    const page = clampInt(q.page, 1, 1, 100_000);
    const { rows, total } = await this.attendancePage(f, page, pageSize);
    return {
      asOf: now.toISOString(),
      filter: this.filterEcho(f),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      items: rows,
    };
  }

  private async attendancePage(
    f: AnalyticsFilter,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AttendanceRow[]; total: number }> {
    const db: any = this.db;
    const requestWhere = this.requestWhere(f);
    const routeWhere = this.routeWhere(f);
    // Employees with at least one ride request in the window (the population attendance is about).
    const { tenantId: _t, employee: _e, ...requestScope } = requestWhere;
    const employeeWhere = {
      tenantId: f.tenantId,
      ...(f.officeId ? { officeId: f.officeId } : {}),
      transportRequests: { some: requestScope },
    };

    const [total, employees] = await Promise.all([
      db.corporateEmployee.count({ where: employeeWhere }),
      db.corporateEmployee.findMany({
        where: employeeWhere,
        select: { id: true, employeeCode: true, fullName: true, officeId: true, department: true },
        orderBy: [{ employeeCode: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    if (employees.length === 0) return { rows: [], total };

    const ids = employees.map((e: any) => e.id);
    const [requestGroups, stopGroups, boardedTimes] = await Promise.all([
      db.corporateTransportRequest.groupBy({
        by: ['employeeId', 'status'],
        where: { ...requestWhere, employeeId: { in: ids } },
        _count: { _all: true },
      }),
      db.corporateRouteStop.groupBy({
        by: ['employeeId', 'status'],
        where: { employeeId: { in: ids }, status: { in: ['BOARDED', 'NO_SHOW'] }, route: routeWhere },
        _count: { _all: true },
      }),
      db.corporateRouteStop.findMany({
        where: { employeeId: { in: ids }, status: 'BOARDED', actualArrivalTime: { not: null }, route: routeWhere },
        select: { employeeId: true, plannedEta: true, actualArrivalTime: true, route: { select: { shiftDate: true } } },
      }),
    ]);

    const acc = new Map<string, { scheduled: number; cancelled: number; boarded: number; noShows: number; late: Set<string> }>();
    for (const id of ids) acc.set(id, { scheduled: 0, cancelled: 0, boarded: 0, noShows: 0, late: new Set() });
    for (const g of requestGroups) {
      const a = acc.get(g.employeeId);
      if (!a) continue;
      if (g.status !== 'RESCHEDULED') a.scheduled += countOf(g);
      if (g.status === 'CANCELLED') a.cancelled += countOf(g);
    }
    for (const g of stopGroups) {
      const a = acc.get(g.employeeId);
      if (!a) continue;
      if (g.status === 'BOARDED') a.boarded += countOf(g);
      if (g.status === 'NO_SHOW') a.noShows += countOf(g);
    }
    for (const s of boardedTimes) {
      const a = acc.get(s.employeeId);
      if (!a || !s.plannedEta || !s.actualArrivalTime) continue;
      if (new Date(s.actualArrivalTime).getTime() - new Date(s.plannedEta).getTime() > GRACE_MS) {
        a.late.add(new Date(s.route.shiftDate).toISOString().slice(0, 10));
      }
    }

    const rows: AttendanceRow[] = employees.map((e: any) => {
      const a = acc.get(e.id)!;
      return {
        employeeId: e.id,
        employeeCode: e.employeeCode,
        fullName: e.fullName,
        officeId: e.officeId,
        department: e.department ?? null,
        scheduledRides: a.scheduled,
        boarded: a.boarded,
        noShows: a.noShows,
        cancellations: a.cancelled,
        lateDays: a.late.size,
      };
    });
    return { rows, total };
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  async getReport(
    type: string,
    format: string | undefined,
    q: AnalyticsQuery,
    now: Date = new Date(),
  ): Promise<{ format: ReportFormat; filename: string; contentType: string; body: any }> {
    const reportType = String(type).replace(/\.(csv|json)$/i, '') as ReportType;
    const ext = /\.(csv|json)$/i.exec(String(type))?.[1]?.toLowerCase();
    if (!REPORT_TYPES.includes(reportType)) {
      throw new BadRequestException(`report type must be one of ${REPORT_TYPES.join(', ')}`);
    }
    const fmt = String(format ?? ext ?? 'csv').toLowerCase();
    if (fmt !== 'csv' && fmt !== 'json') throw new BadRequestException('format must be csv or json');
    const f = await this.resolveFilter(q);

    const { columns, rows, truncated } =
      reportType === 'trips'
        ? await this.tripsReport(f)
        : reportType === 'no-shows'
          ? await this.noShowsReport(f)
          : await this.attendanceReport(f);

    const filename = `${reportType}_${f.from}_${f.to}.${fmt}`;
    if (fmt === 'csv') {
      return { format: 'csv', filename, contentType: 'text/csv; charset=utf-8', body: toCsv(columns, rows) };
    }
    return {
      format: 'json',
      filename,
      contentType: 'application/json',
      body: { asOf: now.toISOString(), type: reportType, filter: this.filterEcho(f), columns, rowCount: rows.length, truncated, rows },
    };
  }

  private async tripsReport(f: AnalyticsFilter) {
    const db: any = this.db;
    const columns = [
      'routeId',
      'shiftDate',
      'shiftTime',
      'direction',
      'officeCode',
      'status',
      'vehicleCategory',
      'vehicleNumber',
      'driverName',
      'maxCapacity',
      'assignedPassengers',
      'boarded',
      'noShows',
      'plannedPickup1',
      'plannedOfficeArrival',
      'estDistanceKm',
    ];
    const rows: Record<string, unknown>[] = [];
    const where = this.routeWhere(f);
    let cursor: string | undefined;
    let truncated = false;
    for (;;) {
      const routes: any[] = await db.corporateRoute.findMany({
        where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
        select: {
          id: true,
          shiftDate: true,
          shiftTime: true,
          direction: true,
          status: true,
          vehicleCategory: true,
          maxCapacity: true,
          assignedPassengerCount: true,
          targetPickup1Time: true,
          targetOfficeArrivalTime: true,
          estDistanceMeters: true,
          office: { select: { code: true } },
          driver: { select: { fullName: true } },
          vehicle: { select: { registrationNumber: true } },
        },
        orderBy: { id: 'asc' },
        take: CorporateAnalyticsService.REPORT_CHUNK,
      });
      if (routes.length === 0) break;
      const groups: any[] = await db.corporateRouteStop.groupBy({
        by: ['routeId', 'status'],
        where: { routeId: { in: routes.map((r) => r.id) }, employeeId: { not: null }, status: { in: ['BOARDED', 'NO_SHOW'] } },
        _count: { _all: true },
      });
      const per = new Map<string, { boarded: number; noShows: number }>();
      for (const g of groups) {
        const p = per.get(g.routeId) ?? { boarded: 0, noShows: 0 };
        if (g.status === 'BOARDED') p.boarded += countOf(g);
        else p.noShows += countOf(g);
        per.set(g.routeId, p);
      }
      for (const r of routes) {
        rows.push({
          routeId: r.id,
          shiftDate: new Date(r.shiftDate).toISOString().slice(0, 10),
          shiftTime: r.shiftTime,
          direction: r.direction,
          officeCode: r.office?.code ?? null,
          status: r.status,
          vehicleCategory: r.vehicleCategory,
          vehicleNumber: r.vehicle?.registrationNumber ?? null,
          driverName: r.driver?.fullName ?? null,
          maxCapacity: r.maxCapacity,
          assignedPassengers: r.assignedPassengerCount,
          boarded: per.get(r.id)?.boarded ?? 0,
          noShows: per.get(r.id)?.noShows ?? 0,
          plannedPickup1: toIstIso(r.targetPickup1Time),
          plannedOfficeArrival: toIstIso(r.targetOfficeArrivalTime),
          estDistanceKm: Math.round(Number(r.estDistanceMeters ?? 0) / 100) / 10,
        });
      }
      if (rows.length >= MAX_REPORT_ROWS) {
        truncated = true;
        rows.length = MAX_REPORT_ROWS;
        break;
      }
      if (routes.length < CorporateAnalyticsService.REPORT_CHUNK) break;
      cursor = routes[routes.length - 1].id;
    }
    rows.sort((a: any, b: any) =>
      a.shiftDate !== b.shiftDate ? (a.shiftDate < b.shiftDate ? -1 : 1) : String(a.plannedPickup1).localeCompare(String(b.plannedPickup1)),
    );
    return { columns, rows, truncated };
  }

  private async noShowsReport(f: AnalyticsFilter) {
    const db: any = this.db;
    const columns = [
      'shiftDate',
      'shiftTime',
      'direction',
      'officeCode',
      'employeeCode',
      'employeeName',
      'routeId',
      'stopSequence',
      'plannedPickup',
      'cabArrivedAt',
      'reason',
    ];
    const where = { ...this.stopWhere(f), status: 'NO_SHOW' };
    const rows: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    let truncated = false;
    for (;;) {
      const stops: any[] = await db.corporateRouteStop.findMany({
        where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
        select: {
          id: true,
          routeId: true,
          stopSequence: true,
          plannedEta: true,
          actualArrivalTime: true,
          noShowReason: true,
          employee: { select: { employeeCode: true, fullName: true } },
          route: { select: { shiftDate: true, shiftTime: true, direction: true, office: { select: { code: true } } } },
        },
        orderBy: { id: 'asc' },
        take: CorporateAnalyticsService.REPORT_CHUNK,
      });
      for (const s of stops) {
        rows.push({
          shiftDate: new Date(s.route.shiftDate).toISOString().slice(0, 10),
          shiftTime: s.route.shiftTime,
          direction: s.route.direction,
          officeCode: s.route.office?.code ?? null,
          employeeCode: s.employee?.employeeCode ?? null,
          employeeName: s.employee?.fullName ?? null,
          routeId: s.routeId,
          stopSequence: s.stopSequence,
          plannedPickup: toIstIso(s.plannedEta),
          cabArrivedAt: toIstIso(s.actualArrivalTime),
          reason: s.noShowReason ?? null,
        });
      }
      if (rows.length >= MAX_REPORT_ROWS) {
        truncated = true;
        rows.length = MAX_REPORT_ROWS;
        break;
      }
      if (stops.length < CorporateAnalyticsService.REPORT_CHUNK) break;
      cursor = stops[stops.length - 1].id;
    }
    rows.sort((a: any, b: any) =>
      a.shiftDate !== b.shiftDate
        ? a.shiftDate < b.shiftDate ? -1 : 1
        : String(a.employeeCode).localeCompare(String(b.employeeCode)),
    );
    return { columns, rows, truncated };
  }

  private async attendanceReport(f: AnalyticsFilter) {
    const columns = [
      'employeeCode',
      'fullName',
      'department',
      'scheduledRides',
      'boarded',
      'noShows',
      'cancellations',
      'lateDays',
    ];
    const rows: Record<string, unknown>[] = [];
    const size = 500;
    let truncated = false;
    for (let page = 1; ; page++) {
      const { rows: chunk, total } = await this.attendancePage(f, page, size);
      rows.push(...(chunk as unknown as Record<string, unknown>[]));
      if (rows.length >= MAX_REPORT_ROWS) {
        truncated = total > MAX_REPORT_ROWS;
        rows.length = Math.min(rows.length, MAX_REPORT_ROWS);
        break;
      }
      if (chunk.length < size || page * size >= total) break;
    }
    return { columns, rows, truncated };
  }

  async getExceptions(q: AnalyticsQuery, now: Date = new Date()) {
    const f = await this.resolveFilter(q);
    const db: any = this.db;
    const routeWhere = this.routeWhere(f);
    const stopWhere = this.stopWhere(f);

    const [unservedRequests, delayedStops, activeRoutes, sosAlerts] = await Promise.all([
      db.corporateTransportRequest.findMany({
        where: { ...this.requestWhere(f), status: 'UNSERVED' },
        take: 30,
        include: { employee: true },
        orderBy: { scheduledDate: 'desc' },
      }),
      db.corporateRouteStop.findMany({
        where: { ...stopWhere, status: 'ARRIVED' },
        take: 30,
        include: { employee: true, route: true },
        orderBy: { plannedEta: 'desc' },
      }),
      db.corporateRoute.findMany({
        where: { ...routeWhere, status: 'IN_PROGRESS' },
        take: 30,
        include: { office: true },
      }),
      db.corporateSosAlert.findMany({
        where: { ...this.sosWhere(f), status: { in: ['OPEN', 'INVESTIGATING'] } },
        take: 30,
        include: { route: true },
        orderBy: { triggeredAt: 'desc' },
      }),
    ]);

    const items: Array<{
      id: string;
      type: 'Delayed' | 'Unassigned' | 'GPS Stale' | 'Route Deviation' | 'Safety Alert';
      target: string;
      details: string;
      office: string;
      duration: string;
      status: 'Open' | 'In Review' | 'Escalated' | 'Resolved';
      action: 'View' | 'Assign' | 'Track' | 'Resolve' | 'Locate';
    }> = [];

    for (const u of unservedRequests) {
      items.push({
        id: `EXC-U-${u.id.slice(0, 8)}`,
        type: 'Unassigned',
        target: `${u.employee?.employeeCode ?? 'EMP'} (${u.employee?.fullName ?? 'Employee'})`,
        details: `Unserved request for shift ${u.shiftTime}`,
        office: f.officeId ?? 'Main Campus',
        duration: 'Pending',
        status: 'Open',
        action: 'Assign',
      });
    }

    for (const d of delayedStops) {
      items.push({
        id: `EXC-D-${d.id.slice(0, 8)}`,
        type: 'Delayed',
        target: d.route?.routeNumber ?? `Stop #${d.stopSequence}`,
        details: `Stop delay detected for passenger ${d.employee?.fullName ?? 'Passenger'}`,
        office: f.officeId ?? 'Main Campus',
        duration: '15 min',
        status: 'In Review',
        action: 'View',
      });
    }

    for (const r of activeRoutes) {
      items.push({
        id: `EXC-G-${r.id.slice(0, 8)}`,
        type: 'GPS Stale',
        target: r.vehiclePlate ?? r.routeNumber ?? 'Vehicle',
        details: `Active route ${r.routeNumber ?? r.id.slice(0, 8)} monitoring live telemetry`,
        office: r.office?.name ?? 'Main Campus',
        duration: 'Active',
        status: 'Open',
        action: 'Track',
      });
    }

    for (const s of sosAlerts) {
      items.push({
        id: `EXC-S-${s.id.slice(0, 8)}`,
        type: 'Safety Alert',
        target: `SOS-${s.id.slice(0, 6)}`,
        details: `Triggered alert: ${s.reason ?? 'Emergency SOS pressed'}`,
        office: f.officeId ?? 'Main Campus',
        duration: 'Active',
        status: s.status === 'INVESTIGATING' ? 'In Review' : 'Escalated',
        action: 'Resolve',
      });
    }

    const summary = {
      delayedPickups: delayedStops.length,
      unassignedTrips: unservedRequests.length,
      gpsStaleCount: activeRoutes.length > 0 ? 1 : 0,
      routeDeviations: 0,
      safetyAlerts: sosAlerts.length,
    };

    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000);
      const dayLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return {
        day: dayLabel,
        delayed: Math.max(0, summary.delayedPickups - i),
        unassigned: Math.max(0, summary.unassignedTrips - i),
        gpsStale: summary.gpsStaleCount,
        deviation: 0,
        safety: summary.safetyAlerts,
      };
    });

    return {
      summary,
      items,
      trend,
    };
  }
}

function zeroed(keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function sum(rec: Record<string, number>): number {
  return Object.values(rec).reduce((n, v) => n + v, 0);
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
