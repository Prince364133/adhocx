import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { CorporateTripExecutionController } from '../src/domains/corporate/execution/corporate-trip-execution.controller';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { CorporateReplanningService } from '../src/domains/corporate/replanning/corporate-replanning.service';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import {
  evaluateCutoff,
  istWallClockToUtc,
  resolvePickupTime,
} from '../src/domains/corporate/replanning/cutoff-policy';
import { computeTimings, OFFICE_ARRIVAL_BUFFER_MINUTES } from '../src/domains/corporate/replanning/route-geometry';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';

/**
 * Corporate ETS cancel / reschedule re-planning.
 * Runs against an in-memory Prisma fake that enforces the real unique constraints
 * (routeId+stopSequence, transportRequestId), auto-bumps updatedAt, and rolls back
 * transactions with an undo log, plus an in-memory Redis lock fake.
 */

// ---------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------
type Row = Record<string, any>;
const MODELS = [
  'corporateTransportRequest',
  'corporateRoute',
  'corporateRouteStop',
  'corporateOffice',
  'corporateEmployee',
] as const;
type ModelName = (typeof MODELS)[number];

const DEFAULTS: Record<ModelName, Row> = {
  corporateTransportRequest: { status: 'APPROVED' },
  corporateRoute: { status: 'PLANNED', driverId: null, vehicleId: null },
  corporateRouteStop: { status: 'PENDING', dwellBufferSeconds: 300, transportRequestId: null, employeeId: null },
  corporateOffice: {},
  corporateEmployee: {},
};

// Note: structuredClone returns host-realm Dates under Jest's vm sandbox, so never rely on `instanceof Date`.
const isDate = (v: any): v is Date => Object.prototype.toString.call(v) === '[object Date]';
const clone = <T>(v: T): T => {
  if (isDate(v)) return new Date((v as any).getTime()) as any;
  if (Array.isArray(v)) return v.map(clone) as any;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as any;
  return v;
};
const eq = (a: any, b: any) => (isDate(a) || isDate(b) ? new Date(a).getTime() === new Date(b).getTime() : a === b);

function matches(row: Row, where: Row = {}, relation?: (key: string) => Row | null | undefined): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v && typeof v === 'object' && !isDate(v)) {
      // Relation filter, e.g. { employee: { officeId } }
      if (relation && !(k in row) && !('in' in v) && !('not' in v)) {
        const rel = relation(k);
        return !!rel && matches(rel, v);
      }
      if ('in' in v) return v.in.some((x: any) => eq(row[k], x));
      if ('not' in v) return !eq(row[k], v.not);
      if ('gte' in v || 'lte' in v) {
        const t = new Date(row[k]).getTime();
        return (v.gte === undefined || t >= new Date(v.gte).getTime()) && (v.lte === undefined || t <= new Date(v.lte).getTime());
      }
    }
    return eq(row[k], v);
  });
}

class FakePrisma {
  tables: Record<ModelName, Map<string, Row>> = Object.fromEntries(MODELS.map((m) => [m, new Map()])) as any;
  private clock = 0;
  txCount = 0;
  [key: string]: any;

  constructor() {
    for (const m of MODELS) this[m] = this.model(m, null);
  }

  private touch(): Date {
    this.clock = Math.max(Date.now(), this.clock + 1);
    return new Date(this.clock);
  }

  private checkUnique(): void {
    const seq = new Set<string>();
    const req = new Set<string>();
    for (const s of this.tables.corporateRouteStop.values()) {
      const k = `${s.routeId}#${s.stopSequence}`;
      if (seq.has(k)) throw new Error(`P2002 Unique constraint failed on (route_id, stop_sequence) ${k}`);
      seq.add(k);
      if (s.transportRequestId) {
        if (req.has(s.transportRequestId)) throw new Error(`P2002 Unique constraint failed on transport_request_id`);
        req.add(s.transportRequestId);
      }
    }
  }

  private relation(name: ModelName, row: Row, key: string): Row | null | undefined {
    if (name === 'corporateTransportRequest' && key === 'employee') return this.tables.corporateEmployee.get(row.employeeId);
    return undefined;
  }

  private hydrate(name: ModelName, row: Row, include?: Row): Row {
    const out = clone(row);
    if (!include) return out;
    if (name === 'corporateTransportRequest') {
      if (include.employee) out.employee = clone(this.tables.corporateEmployee.get(row.employeeId) ?? null);
      if (include.routeStop) {
        const stop = [...this.tables.corporateRouteStop.values()].find((s) => s.transportRequestId === row.id);
        out.routeStop = stop ? this.hydrate('corporateRouteStop', stop, include.routeStop.include) : null;
      }
    }
    if (name === 'corporateRoute' && include.stops) {
      out.stops = [...this.tables.corporateRouteStop.values()]
        .filter((s) => s.routeId === row.id)
        .sort((a, b) => a.stopSequence - b.stopSequence)
        .map(clone);
    }
    if (name === 'corporateRouteStop' && include.route) {
      out.route = clone(this.tables.corporateRoute.get(row.routeId) ?? null);
    }
    return out;
  }

  private write(name: ModelName, undo: Row[] | null, id: string, next: Row | null) {
    const t = this.tables[name];
    if (undo) undo.push({ name, id, prev: t.has(id) ? clone(t.get(id)) : null });
    if (next) t.set(id, next);
    else t.delete(id);
  }

  private apply(row: Row, data: Row): Row {
    const next = { ...row };
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      next[k] = v && typeof v === 'object' && 'increment' in v ? next[k] + v.increment : clone(v);
    }
    if ('updatedAt' in row) next.updatedAt = this.touch();
    return next;
  }

  model(name: ModelName, undo: Row[] | null) {
    const t = () => this.tables[name];
    return {
      findUnique: async ({ where, include }: Row) => {
        const r = [...t().values()].find((x) => matches(x, where));
        return r ? this.hydrate(name, r, include) : null;
      },
      findFirst: async ({ where, include }: Row = {}) => {
        const r = [...t().values()].find((x) => matches(x, where));
        return r ? this.hydrate(name, r, include) : null;
      },
      findMany: async ({ where, include }: Row = {}) =>
        [...t().values()]
          .filter((x) => matches(x, where, (k) => this.relation(name, x, k)))
          .map((r) => this.hydrate(name, r, include)),
      count: async ({ where }: Row = {}) => [...t().values()].filter((x) => matches(x, where)).length,
      create: async ({ data }: Row) => {
        const now = this.touch();
        const row = { id: randomUUID(), ...DEFAULTS[name], createdAt: now, updatedAt: now, ...clone(data) };
        this.write(name, undo, row.id, row);
        this.checkUnique();
        return clone(row);
      },
      update: async ({ where, data }: Row) => {
        const r = [...t().values()].find((x) => matches(x, where));
        if (!r) throw new Error(`P2025 ${name} not found`);
        const next = this.apply(r, data);
        this.write(name, undo, r.id, next);
        this.checkUnique();
        return clone(next);
      },
      updateMany: async ({ where, data }: Row) => {
        const rows = [...t().values()].filter((x) => matches(x, where));
        for (const r of rows) this.write(name, undo, r.id, this.apply(r, data));
        this.checkUnique();
        return { count: rows.length };
      },
      delete: async ({ where }: Row) => {
        const r = [...t().values()].find((x) => matches(x, where));
        if (!r) throw new Error(`P2025 ${name} not found`);
        this.write(name, undo, r.id, null);
        return clone(r);
      },
    };
  }

  async $transaction(fn: any) {
    if (Array.isArray(fn)) return Promise.all(fn);
    this.txCount++;
    const undo: Row[] = [];
    const tx: Row = {};
    for (const m of MODELS) tx[m] = this.model(m, undo);
    try {
      return await fn(tx);
    } catch (err) {
      for (const u of undo.reverse()) {
        if (u.prev) this.tables[u.name as ModelName].set(u.id, u.prev);
        else this.tables[u.name as ModelName].delete(u.id);
      }
      throw err;
    }
  }
}

class FakeRedis {
  locks = new Map<string, string>();
  acquisitions: string[] = [];
  async acquireLockToken(key: string): Promise<string | null> {
    if (this.locks.has(key)) return null;
    const token = randomUUID();
    this.locks.set(key, token);
    this.acquisitions.push(key);
    return token;
  }
  async releaseLockToken(key: string, token: string): Promise<void> {
    if (this.locks.get(key) === token) this.locks.delete(key);
  }
  getClient() {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT = 'tenant-gti';
const OFFICE = { id: 'office-hitec', lat: 17.4435, lng: 78.3772 };
const DATE = '2026-11-03';
const SHIFT_DATE = new Date(`${DATE}T00:00:00.000Z`);
const KM = 0.009; // ~1 km of latitude

let db: FakePrisma;
let redis: FakeRedis;
let notifications: { emitEvent: jest.Mock };
let audit: { log: jest.Mock };
let exec: CorporateTripExecutionService;
let replanning: CorporateReplanningService;
let controller: CorporateTripExecutionController;
let empSeq = 0;

function seedEmployee(lat: number, lng: number, shiftTime: string, opts: { gender?: string } = {}) {
  const n = ++empSeq;
  const employee = {
    id: `emp-${n}`,
    tenantId: TENANT,
    officeId: OFFICE.id,
    employeeCode: `E${n}`,
    fullName: `Employee ${n}`,
    phoneNumber: '9000000000',
    gender: opts.gender ?? 'MALE',
  };
  db.tables.corporateEmployee.set(employee.id, employee);
  const now = new Date();
  const request = {
    id: `req-${n}`,
    tenantId: TENANT,
    employeeId: employee.id,
    scheduledDate: SHIFT_DATE,
    shiftTime,
    direction: 'LOGIN',
    pickupLat: lat,
    pickupLng: lng,
    dropoffLat: OFFICE.lat,
    dropoffLng: OFFICE.lng,
    h3PickupIndex: 'h3',
    status: 'APPROVED',
    idempotencyHash: `hash-${n}`,
    createdAt: now,
    updatedAt: now,
  };
  db.tables.corporateTransportRequest.set(request.id, request);
  return request;
}

/** Seeds a LOGIN route in solver format (pickups 1..n, office DROPOFF n+1) with consistent timings. */
function seedRoute(
  shiftTime: string,
  requests: Row[],
  opts: { status?: string; driverId?: string; maxCapacity?: number } = {},
) {
  const anchor = new Date(istWallClockToUtc(DATE, shiftTime).getTime() - OFFICE_ARRIVAL_BUFFER_MINUTES * 60_000);
  const pts = requests.map((r) => ({ lat: r.pickupLat, lng: r.pickupLng }));
  const t = computeTimings('LOGIN', pts, OFFICE, anchor);
  const now = new Date();
  const route = {
    id: randomUUID(),
    tenantId: TENANT,
    officeId: OFFICE.id,
    shiftDate: SHIFT_DATE,
    shiftTime,
    direction: 'LOGIN',
    vehicleCategory: 'SEDAN',
    maxCapacity: opts.maxCapacity ?? 4,
    assignedPassengerCount: requests.length,
    targetPickup1Time: t.targetPickup1Time,
    targetOfficeArrivalTime: t.targetOfficeArrivalTime,
    estDistanceMeters: t.estDistanceMeters,
    estDurationSeconds: t.estDurationSeconds,
    status: opts.status ?? 'PLANNED',
    driverId: opts.driverId ?? null,
    vehicleId: null,
    createdAt: now,
    updatedAt: now,
  };
  db.tables.corporateRoute.set(route.id, route);
  requests.forEach((r, i) => {
    const id = randomUUID();
    db.tables.corporateRouteStop.set(id, {
      id,
      routeId: route.id,
      stopSequence: i + 1,
      stopType: 'PICKUP',
      transportRequestId: r.id,
      employeeId: r.employeeId,
      latitude: r.pickupLat,
      longitude: r.pickupLng,
      plannedEta: t.passengerEtas[i],
      boardingOtp: String(1000 + i),
      dwellBufferSeconds: 300,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
    db.tables.corporateTransportRequest.get(r.id)!.status = opts.status === 'ASSIGNED' ? 'ASSIGNED' : 'PLANNED';
  });
  const officeStopId = randomUUID();
  db.tables.corporateRouteStop.set(officeStopId, {
    id: officeStopId,
    routeId: route.id,
    stopSequence: requests.length + 1,
    stopType: 'DROPOFF',
    transportRequestId: null,
    employeeId: null,
    latitude: OFFICE.lat,
    longitude: OFFICE.lng,
    plannedEta: anchor,
    boardingOtp: '------',
    dwellBufferSeconds: 0,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
  return route;
}

const route = (id: string) => db.tables.corporateRoute.get(id)!;
const stopsOf = (routeId: string) =>
  [...db.tables.corporateRouteStop.values()].filter((s) => s.routeId === routeId).sort((a, b) => a.stopSequence - b.stopSequence);
const stopOf = (reqId: string) => [...db.tables.corporateRouteStop.values()].find((s) => s.transportRequestId === reqId);
const request = (id: string) => db.tables.corporateTransportRequest.get(id)!;
const routesOf = (shiftTime: string) =>
  [...db.tables.corporateRoute.values()].filter((r) => r.shiftTime === shiftTime && r.status !== 'CANCELLED');

/** First pickup ETA of a request's current stop. */
const pickupOf = (reqId: string) => new Date(stopOf(reqId)!.plannedEta);
const minutes = (n: number) => n * 60_000;

const cancel = (reqId: string, now: Date, override?: Row) =>
  exec.handleRescheduleOrCancel(reqId, { employeeId: request(reqId).employeeId, action: 'CANCEL' }, { now, override: override as any });
const reschedule = (reqId: string, newShiftTime: string, now: Date, override?: Row) =>
  exec.handleRescheduleOrCancel(
    reqId,
    { employeeId: request(reqId).employeeId, action: 'RESCHEDULE', newShiftTime },
    { now, override: override as any },
  );

/** Validates every structural invariant of the route plan. */
function assertPlanValid() {
  const problems: string[] = [];
  for (const r of db.tables.corporateRoute.values()) {
    const stops = stopsOf(r.id);
    stops.forEach((s, i) => s.stopSequence !== i + 1 && problems.push(`route ${r.id} non-contiguous seq ${stops.map((x) => x.stopSequence)}`));
    if (r.status === 'CANCELLED') {
      if (stops.some((s) => s.status === 'PENDING')) problems.push(`cancelled route ${r.id} has PENDING stops`);
      continue;
    }
    const pax = stops.filter((s) => s.transportRequestId && s.status !== 'CANCELLED');
    if (pax.length > r.maxCapacity) problems.push(`route ${r.id} over capacity ${pax.length}/${r.maxCapacity}`);
    if (pax.length !== r.assignedPassengerCount) problems.push(`route ${r.id} count ${r.assignedPassengerCount} != ${pax.length}`);
    if (r.status === 'PLANNED') {
      if (pax.length === 0) problems.push(`planned route ${r.id} is empty`);
      if (stops.some((s) => s.status !== 'PENDING')) problems.push(`planned route ${r.id} has non-PENDING stops`);
      const last = stops[stops.length - 1];
      if (last.transportRequestId || last.stopType !== 'DROPOFF') problems.push(`route ${r.id} office stop not last`);
      for (let i = 1; i < stops.length; i++) {
        if (new Date(stops[i].plannedEta) < new Date(stops[i - 1].plannedEta)) problems.push(`route ${r.id} ETAs not monotonic`);
      }
    }
    for (const s of pax) {
      const q = db.tables.corporateTransportRequest.get(s.transportRequestId);
      if (!q) problems.push(`orphan stop ${s.id}`);
      else if (q.status === 'CANCELLED') problems.push(`stop ${s.id} for cancelled request ${q.id}`);
      else if (q.shiftTime !== r.shiftTime) problems.push(`request ${q.id} shift ${q.shiftTime} on route shift ${r.shiftTime}`);
    }
  }
  for (const s of db.tables.corporateRouteStop.values()) {
    if (!db.tables.corporateRoute.has(s.routeId)) problems.push(`stop ${s.id} on missing route`);
  }
  for (const q of db.tables.corporateTransportRequest.values()) {
    const s = stopOf(q.id);
    const live = s && s.status !== 'CANCELLED' && route(s.routeId).status !== 'CANCELLED';
    if (q.status === 'CANCELLED' && live) problems.push(`cancelled request ${q.id} still routed`);
    if (q.status === 'PLANNED' && !live) problems.push(`planned request ${q.id} has no live stop`);
  }
  expect(problems).toEqual([]);
}

/** Pickup point ~d km north of office plus small east offset (keeps a corridor geometry). */
const north = (km: number, eastKm = 0) => [OFFICE.lat + km * KM, OFFICE.lng + eastKm * KM] as const;

beforeEach(async () => {
  db = new FakePrisma();
  redis = new FakeRedis();
  notifications = { emitEvent: jest.fn() };
  audit = { log: jest.fn().mockResolvedValue(undefined) };
  db.tables.corporateOffice.set(OFFICE.id, { id: OFFICE.id, tenantId: TENANT, latitude: OFFICE.lat, longitude: OFFICE.lng });

  const moduleRef = await Test.createTestingModule({
    controllers: [CorporateTripExecutionController],
    providers: [
      CorporateTripExecutionService,
      CorporateReplanningService,
      RouteSolverService,
      { provide: DatabaseService, useValue: db },
      { provide: RedisService, useValue: redis },
      { provide: NotificationsService, useValue: notifications },
      { provide: AuditService, useValue: audit },
    ],
  })
    // Handlers are invoked directly here; access control is covered in corporate-access-control.spec.ts.
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .overrideGuard(CorporateAccessGuard).useValue({ canActivate: () => true })
    .compile();
  exec = moduleRef.get(CorporateTripExecutionService);
  replanning = moduleRef.get(CorporateReplanningService);
  controller = moduleRef.get(CorporateTripExecutionController);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('9-hour cutoff (Asia/Kolkata)', () => {
  it('Nest DI injects CorporateReplanningService into the execution service', () => {
    expect((exec as any).replanning).toBe(replanning);
  });

  it('07:00 IST pickup -> cutoff is 22:00 IST the previous evening, regardless of server TZ', () => {
    const pickup = istWallClockToUtc(DATE, '07:00');
    expect(pickup.toISOString()).toBe('2026-11-03T01:30:00.000Z');
    const ev = evaluateCutoff(pickup, 'STOP_PLANNED_ETA', new Date('2026-11-02T16:29:00.000Z'));
    expect(ev.cutoffAt.toISOString()).toBe('2026-11-02T16:30:00.000Z'); // 22:00 IST
    expect(ev.allowed).toBe(true);
    expect(evaluateCutoff(pickup, 'STOP_PLANNED_ETA', new Date('2026-11-02T16:31:00.000Z')).allowed).toBe(false);
  });

  it('anchors on the planned pickup ETA (not the login time) when the employee is routed', () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r]);
    const { pickupAt, source } = resolvePickupTime({ ...request(r.id), routeStop: { ...stopOf(r.id), route: route(stopOf(r.id)!.routeId) } } as any);
    expect(source).toBe('STOP_PLANNED_ETA');
    expect(pickupAt.getTime()).toBe(pickupOf(r.id).getTime());
    expect(pickupAt.getTime()).toBeLessThan(istWallClockToUtc(DATE, '08:00').getTime());
  });

  it('cancel at 9h01m before pickup is allowed', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9.5), '08:00')]);
    const now = new Date(pickupOf(r.id).getTime() - minutes(9 * 60 + 1));
    const res = await cancel(r.id, now);
    expect(res.status).toBe('CANCELLED');
    expect(res.replan.cutoff.overridden).toBe(false);
  });

  it('cancel at 8h59m before pickup is rejected and nothing changes', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const rt = seedRoute('08:00', [r, seedEmployee(...north(9.5), '08:00')]);
    const before = JSON.stringify(stopsOf(rt.id));
    const now = new Date(pickupOf(r.id).getTime() - minutes(8 * 60 + 59));
    await expect(cancel(r.id, now)).rejects.toThrow(/Modification locked: Rescheduling and cancellations must be submitted at least 9 hours/);
    expect(request(r.id).status).toBe('PLANNED');
    expect(JSON.stringify(stopsOf(rt.id))).toBe(before);
  });

  it('exactly 9h00m before pickup is still allowed (inclusive boundary)', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9.5), '08:00')]);
    const res = await cancel(r.id, new Date(pickupOf(r.id).getTime() - minutes(9 * 60)));
    expect(res.status).toBe('CANCELLED');
  });

  it('admin override bypasses the cutoff, is flagged and audited', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9.5), '08:00')]);
    const now = new Date(pickupOf(r.id).getTime() - minutes(8 * 60 + 59));
    const res = await cancel(r.id, now, { actorUserId: 'admin-1', reason: 'HR approved medical leave' });
    expect(res.status).toBe('CANCELLED');
    expect(res.replan.cutoff.overridden).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CORPORATE_CUTOFF_OVERRIDDEN', userId: 'admin-1' }));
  });

  it('override without actor/reason is rejected; employee endpoint never honours override fields in the body', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9.5), '08:00')]);
    await expect(cancel(r.id, new Date(), { actorUserId: 'admin-1' })).rejects.toThrow(/requires actorUserId and reason/);

    // Employee channel, 8h59m before pickup, smuggling override fields -> still locked.
    jest.useFakeTimers({ now: pickupOf(r.id).getTime() - minutes(8 * 60 + 59), doNotFake: ['setTimeout', 'setImmediate', 'nextTick'] });
    try {
      await expect(
        controller.rescheduleOrCancel(r.id, {
          employeeId: r.employeeId,
          action: 'CANCEL',
          override: { actorUserId: 'x', reason: 'y' },
        } as any),
      ).rejects.toThrow(/Modification locked/);
      // Admin channel succeeds.
      const res = await controller.adminRescheduleOrCancel(r.id, { action: 'CANCEL', actorUserId: 'admin-9', reason: 'ops' });
      expect(res.status).toBe('CANCELLED');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('cancel -> automatic route repair', () => {
  const EARLY = new Date('2026-11-02T06:30:00.000Z'); // 12:00 IST previous day

  it('cancelling a middle stop deletes it, re-sequences 1..n contiguously and recomputes pickup times', async () => {
    const reqs = [seedEmployee(...north(12), '08:00'), seedEmployee(...north(10, 1), '08:00'), seedEmployee(...north(8), '08:00'), seedEmployee(...north(6), '08:00')];
    const rt = seedRoute('08:00', reqs);
    const etaBefore = pickupOf(reqs[0].id);

    const res = await cancel(reqs[1].id, EARLY);
    expect(res.replan.removal).toMatchObject({ mode: 'RESEQUENCED', routeCancelled: false, remainingPassengers: 3 });

    const stops = stopsOf(rt.id);
    expect(stops.map((s) => s.stopSequence)).toEqual([1, 2, 3, 4]);
    expect(stops.map((s) => s.transportRequestId)).toEqual([reqs[0].id, reqs[2].id, reqs[3].id, null]);
    expect(stopOf(reqs[1].id)).toBeUndefined();

    const expected = computeTimings('LOGIN', [reqs[0], reqs[2], reqs[3]].map((r) => ({ lat: r.pickupLat, lng: r.pickupLng })), OFFICE, route(rt.id).targetOfficeArrivalTime);
    stops.slice(0, 3).forEach((s, i) => expect(new Date(s.plannedEta).getTime()).toBe(expected.passengerEtas[i].getTime()));
    expect(new Date(stops[0].plannedEta).getTime()).toBeGreaterThan(etaBefore.getTime()); // shorter route => later first pickup
    expect(route(rt.id)).toMatchObject({ assignedPassengerCount: 3, status: 'PLANNED' });
    expect(new Date(route(rt.id).targetPickup1Time).getTime()).toBe(expected.targetPickup1Time.getTime());
    expect(notifications.emitEvent).toHaveBeenCalledWith(`employee:${reqs[0].employeeId}`, 'CORPORATE_PICKUP_UPDATED', expect.anything());
    assertPlanValid();
  });

  it('last employee cancelling cancels the route so no cab is dispatched', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const rt = seedRoute('08:00', [r]);
    const res = await cancel(r.id, EARLY);
    expect(res.replan.removal).toMatchObject({ routeCancelled: true, routeStatusAfter: 'CANCELLED' });
    expect(route(rt.id).status).toBe('CANCELLED');
    expect(route(rt.id).assignedPassengerCount).toBe(0);
    expect(stopsOf(rt.id).every((s) => s.status === 'CANCELLED')).toBe(true);
    assertPlanValid();
  });

  it('dispatched (ASSIGNED) route: stop cancelled in place without reshuffle, driver notified', async () => {
    const reqs = [seedEmployee(...north(12), '08:00'), seedEmployee(...north(10), '08:00'), seedEmployee(...north(8), '08:00')];
    const rt = seedRoute('08:00', reqs, { status: 'ASSIGNED', driverId: 'drv-7' });
    const before = stopsOf(rt.id).map((s) => [s.id, s.stopSequence, new Date(s.plannedEta).getTime()]);

    const res = await cancel(reqs[1].id, EARLY);
    expect(res.replan.removal).toMatchObject({ mode: 'CANCELLED_IN_PLACE', routeCancelled: false, driverNotified: true });
    const after = stopsOf(rt.id);
    expect(after.map((s) => [s.id, s.stopSequence, new Date(s.plannedEta).getTime()])).toEqual(before);
    expect(after[1].status).toBe('CANCELLED');
    expect(route(rt.id)).toMatchObject({ status: 'ASSIGNED', assignedPassengerCount: 2 });
    expect(notifications.emitEvent).toHaveBeenCalledWith('driver:drv-7', 'CORPORATE_ROUTE_STOP_CANCELLED', expect.objectContaining({ routeId: rt.id }));
    assertPlanValid();
  });

  it('dispatched route losing its last passenger is cancelled and the driver told', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const rt = seedRoute('08:00', [r], { status: 'ASSIGNED', driverId: 'drv-8' });
    await cancel(r.id, EARLY);
    expect(route(rt.id).status).toBe('CANCELLED');
    expect(notifications.emitEvent).toHaveBeenCalledWith('driver:drv-8', 'CORPORATE_ROUTE_CANCELLED', expect.anything());
    assertPlanValid();
  });

  it('refuses once the pickup is in execution (stop BOARDED), even with override', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')], { status: 'IN_TRANSIT', driverId: 'drv-1' });
    stopOf(r.id)!.status = 'BOARDED';
    await expect(cancel(r.id, EARLY, { actorUserId: 'a', reason: 'b' })).rejects.toThrow(/already in execution/);
  });

  it('merges an under-filled pre-dispatch route into a sibling of the same shift', async () => {
    const a = [seedEmployee(...north(10), '08:00'), seedEmployee(...north(9.6, 0.3), '08:00')];
    const b = [seedEmployee(...north(10.4, 0.2), '08:00'), seedEmployee(...north(9.2), '08:00')];
    const ra = seedRoute('08:00', a);
    const rb = seedRoute('08:00', b);
    const otp = stopOf(a[1].id)!.boardingOtp;

    const res = await cancel(a[0].id, EARLY);
    expect(res.replan.merges).toEqual([{ fromRouteId: ra.id, intoRouteId: rb.id, movedPassengers: 1 }]);
    expect(route(ra.id).status).toBe('CANCELLED');
    expect(route(rb.id).assignedPassengerCount).toBe(3);
    expect(stopOf(a[1].id)).toMatchObject({ routeId: rb.id, boardingOtp: otp, status: 'PENDING' });
    expect(stopsOf(rb.id).map((s) => s.stopSequence)).toEqual([1, 2, 3, 4]);
    assertPlanValid();
  });

  it('does not merge into a dispatched sibling', async () => {
    const a = [seedEmployee(...north(10), '08:00'), seedEmployee(...north(9.6), '08:00')];
    const ra = seedRoute('08:00', a);
    const rb = seedRoute('08:00', [seedEmployee(...north(10.2), '08:00')], { status: 'ASSIGNED', driverId: 'd' });
    const res = await cancel(a[0].id, EARLY);
    expect(res.replan.merges).toEqual([]);
    expect(route(ra.id)).toMatchObject({ status: 'PLANNED', assignedPassengerCount: 1 });
    expect(route(rb.id).assignedPassengerCount).toBe(1);
    assertPlanValid();
  });
});

describe('reschedule -> removal + insertion into the new shift', () => {
  const EARLY = new Date('2026-11-02T06:30:00.000Z');

  it('8:00 -> 9:00 joins an existing 9:00 route with spare capacity and acceptable detour', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const old = seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')]);
    const nine = seedRoute('09:00', [seedEmployee(...north(10.5), '09:00'), seedEmployee(...north(8.5), '09:00')]);

    const res = await reschedule(r.id, '09:00', EARLY);
    expect(res).toMatchObject({ status: 'PLANNED', shiftTime: '09:00' });
    expect(res.replan.insertion).toMatchObject({ routeId: nine.id, createdNewRoute: false, stopSequence: 2 });
    expect(stopOf(r.id)!.routeId).toBe(nine.id);
    expect(stopsOf(nine.id).map((s) => s.stopSequence)).toEqual([1, 2, 3, 4]);
    expect(route(nine.id).assignedPassengerCount).toBe(3);
    expect(route(old.id).assignedPassengerCount).toBe(1);
    expect(new Date(stopOf(r.id)!.plannedEta).getTime()).toBeLessThan(istWallClockToUtc(DATE, '09:00').getTime());
    assertPlanValid();
  });

  it('when every 9:00 route is full, a new SEDAN route is created', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')]);
    const full = seedRoute('09:00', [1, 2, 3, 4].map((i) => seedEmployee(...north(9 + i * 0.3), '09:00')));

    const res = await reschedule(r.id, '09:00', EARLY);
    expect(res.replan.insertion.createdNewRoute).toBe(true);
    const created = route(res.replan.insertion.routeId);
    expect(created).toMatchObject({ shiftTime: '09:00', vehicleCategory: 'SEDAN', maxCapacity: 4, assignedPassengerCount: 1, status: 'PLANNED' });
    expect(new Date(created.targetOfficeArrivalTime).getTime()).toBe(istWallClockToUtc(DATE, '09:00').getTime() - minutes(10));
    expect(stopsOf(created.id).map((s) => [s.stopSequence, s.stopType])).toEqual([[1, 'PICKUP'], [2, 'DROPOFF']]);
    expect(route(full.id).assignedPassengerCount).toBe(4);
    assertPlanValid();
  });

  it('respects sedan capacity 4: five reschedules into an empty shift produce routes of 4 + 1', async () => {
    const movers = [0, 1, 2, 3, 4].map((i) => seedEmployee(...north(10 + i * 0.2), '08:00'));
    seedRoute('08:00', movers.slice(0, 4));
    seedRoute('08:00', [movers[4], seedEmployee(...north(5), '08:00')]);
    for (const m of movers) await reschedule(m.id, '09:00', EARLY);
    const nine = routesOf('09:00');
    expect(nine.map((r) => r.assignedPassengerCount).sort()).toEqual([1, 4]);
    expect(nine.every((r) => r.assignedPassengerCount <= r.maxCapacity)).toBe(true);
    assertPlanValid();
  });

  it('a route with capacity but an unacceptable detour is skipped in favour of a new route', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')]);
    const farAway = seedRoute('09:00', [seedEmployee(OFFICE.lat - 12 * KM, OFFICE.lng, '09:00')]); // 12 km south
    const res = await reschedule(r.id, '09:00', EARLY);
    expect(res.replan.insertion.createdNewRoute).toBe(true);
    expect(route(farAway.id).assignedPassengerCount).toBe(1);
    assertPlanValid();
  });

  it('from a dispatched route: old stop cancelled in place + driver notified; never added to a dispatched 9:00 route', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const old = seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')], { status: 'ASSIGNED', driverId: 'drv-old' });
    const dispatched9 = seedRoute('09:00', [seedEmployee(...north(10.1), '09:00')], { status: 'ASSIGNED', driverId: 'drv-9' });

    const res = await reschedule(r.id, '09:00', EARLY);
    expect(res.replan.removal).toMatchObject({ mode: 'CANCELLED_IN_PLACE', driverNotified: true });
    expect(res.replan.insertion.createdNewRoute).toBe(true);
    expect(route(dispatched9.id).assignedPassengerCount).toBe(1);
    expect(stopsOf(dispatched9.id).some((s) => s.employeeId === r.employeeId)).toBe(false);
    const oldStop = stopsOf(old.id).find((s) => s.employeeId === r.employeeId)!;
    expect(oldStop).toMatchObject({ status: 'CANCELLED', transportRequestId: null, stopSequence: 1 });
    expect(notifications.emitEvent).toHaveBeenCalledWith('driver:drv-old', 'CORPORATE_ROUTE_STOP_CANCELLED', expect.objectContaining({ reason: 'EMPLOYEE_RESCHEDULED' }));
    assertPlanValid();
  });

  it('rescheduling to an earlier shift whose pickup is inside the 9h window is rejected atomically', async () => {
    const r = seedEmployee(...north(10), '09:00');
    const rt = seedRoute('09:00', [r, seedEmployee(...north(9), '09:00')]);
    // Allowed for the 09:00 pickup, but the 07:00 pickup (~06:2x IST) is within 9h.
    const now = new Date(pickupOf(r.id).getTime() - minutes(9 * 60 + 30));
    await expect(reschedule(r.id, '07:00', now)).rejects.toThrow(/new shift 07:00/);
    expect(request(r.id)).toMatchObject({ shiftTime: '09:00', status: 'PLANNED' });
    expect(route(rt.id).assignedPassengerCount).toBe(2);
    expect(routesOf('07:00')).toHaveLength(0);
  });
});

describe('concurrency & idempotency', () => {
  const EARLY = new Date('2026-11-02T06:30:00.000Z');

  it('two simultaneous cancels on one route leave a consistent contiguous sequence', async () => {
    const reqs = [12, 10, 8, 6].map((d) => seedEmployee(...north(d), '08:00'));
    const rt = seedRoute('08:00', reqs);
    const results = await Promise.all([cancel(reqs[0].id, EARLY), cancel(reqs[2].id, EARLY)]);
    expect(results.map((r) => r.status)).toEqual(['CANCELLED', 'CANCELLED']);
    expect(stopsOf(rt.id).map((s) => [s.stopSequence, s.transportRequestId])).toEqual([[1, reqs[1].id], [2, reqs[3].id], [3, null]]);
    expect(route(rt.id).assignedPassengerCount).toBe(2);
    expect(redis.locks.size).toBe(0);
    assertPlanValid();
  });

  it('all four passengers cancelling at once cancels the route exactly once', async () => {
    const reqs = [12, 10, 8, 6].map((d) => seedEmployee(...north(d), '08:00'));
    const rt = seedRoute('08:00', reqs);
    await Promise.all(reqs.map((r) => cancel(r.id, EARLY)));
    expect(route(rt.id)).toMatchObject({ status: 'CANCELLED', assignedPassengerCount: 0 });
    expect(stopsOf(rt.id)).toHaveLength(1);
    assertPlanValid();
  });

  it('double submit (sequential) is idempotent and does not touch routes again', async () => {
    const r = seedEmployee(...north(10), '08:00');
    const rt = seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')]);
    await cancel(r.id, EARLY);
    const snapshot = JSON.stringify(stopsOf(rt.id));
    const second = await cancel(r.id, new Date(pickupOf(stopsOf(rt.id)[0].transportRequestId).getTime() - minutes(60))); // even past cutoff
    expect(second).toMatchObject({ status: 'CANCELLED', replan: { idempotent: true } });
    expect(JSON.stringify(stopsOf(rt.id))).toBe(snapshot);

    const m = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [m]);
    await reschedule(m.id, '09:00', EARLY);
    const again = await reschedule(m.id, '09:00', EARLY);
    expect(again.replan.idempotent).toBe(true);
    expect(routesOf('09:00')).toHaveLength(1);
  });

  it('double submit (concurrent) applies once, the duplicate resolves idempotently', async () => {
    const r = seedEmployee(...north(10), '08:00');
    seedRoute('08:00', [r, seedEmployee(...north(9), '08:00')]);
    const [a, b] = await Promise.all([reschedule(r.id, '09:00', EARLY), reschedule(r.id, '09:00', EARLY)]);
    expect([a.replan.idempotent, b.replan.idempotent].sort()).toEqual([false, true]);
    expect(routesOf('09:00')).toHaveLength(1);
    expect(route(routesOf('09:00')[0].id).assignedPassengerCount).toBe(1);
    assertPlanValid();
  });

  it('route dispatched by another service mid-replan: guarded write aborts, retries, and falls back to in-place cancel', async () => {
    const reqs = [12, 10, 8].map((d) => seedEmployee(...north(d), '08:00'));
    const rt = seedRoute('08:00', reqs);
    const realTx = db.$transaction.bind(db);
    let raced = false;
    db.$transaction = async (fn: any) => {
      if (!raced) {
        raced = true; // dispatch flips PLANNED -> ASSIGNED between planning and commit
        await db.corporateRoute.update({ where: { id: rt.id }, data: { status: 'ASSIGNED', driverId: 'drv-race' } });
      }
      return realTx(fn);
    };
    const res = await cancel(reqs[1].id, EARLY);
    expect(res.replan.removal.mode).toBe('CANCELLED_IN_PLACE');
    expect(stopsOf(rt.id).map((s) => s.stopSequence)).toEqual([1, 2, 3, 4]);
    expect(stopOf(reqs[1].id)!.status).toBe('CANCELLED');
    expect(notifications.emitEvent).toHaveBeenCalledWith('driver:drv-race', 'CORPORATE_ROUTE_STOP_CANCELLED', expect.anything());
    assertPlanValid();
  });
});

describe('overnight simulation', () => {
  it('500 employees, solver-planned; 10% cancel + 5% reschedule overnight (partly concurrent) -> every route stays valid', async () => {
    // Deterministic PRNG
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const reqs: Row[] = [];
    for (let i = 0; i < 500; i++) {
      const angle = rnd() * 2 * Math.PI;
      const distKm = 2 + rnd() * 13;
      reqs.push(seedEmployee(OFFICE.lat + Math.sin(angle) * distKm * KM, OFFICE.lng + Math.cos(angle) * distKm * KM, i % 2 ? '09:00' : '08:00', { gender: rnd() < 0.3 ? 'FEMALE' : 'MALE' }));
    }
    const solver = (await Test.createTestingModule({
      providers: [RouteSolverService, { provide: DatabaseService, useValue: db }, { provide: AuditService, useValue: audit }],
    }).compile()).get(RouteSolverService);
    for (const shiftTime of ['08:00', '09:00']) {
      const summary = await solver.optimizeAndCreateRoutes({ tenantId: TENANT, officeId: OFFICE.id, shiftDate: DATE, shiftTime, direction: 'LOGIN' });
      expect(summary.passengersAssigned).toBe(250);
    }
    const routesBefore = routesOf('08:00').length + routesOf('09:00').length;
    assertPlanValid();

    // Shuffle and pick 50 cancels + 25 reschedules (disjoint).
    const shuffled = [...reqs].sort(() => rnd() - 0.5);
    const ops = [
      ...shuffled.slice(0, 50).map((r) => () => cancel(r.id, new Date('2026-11-02T14:00:00.000Z'))),
      ...shuffled.slice(50, 75).map((r) => () => reschedule(r.id, r.shiftTime === '08:00' ? '09:00' : '08:00', new Date('2026-11-02T14:00:00.000Z'))),
    ].sort(() => rnd() - 0.5);

    // 7:30 PM IST overnight window; run in concurrent batches of 8.
    let merges = 0;
    for (let i = 0; i < ops.length; i += 8) {
      const results = await Promise.all(ops.slice(i, i + 8).map((op) => op()));
      merges += results.reduce((n, r) => n + (r.replan.merges?.length ?? 0), 0);
    }

    assertPlanValid();
    const live = [...db.tables.corporateRoute.values()].filter((r) => r.status !== 'CANCELLED');
    const pax = live.reduce((n, r) => n + r.assignedPassengerCount, 0);
    expect(pax).toBe(450);
    expect([...db.tables.corporateTransportRequest.values()].filter((q) => q.status === 'CANCELLED')).toHaveLength(50);
    expect(live.every((r) => r.assignedPassengerCount >= 1 && r.assignedPassengerCount <= r.maxCapacity)).toBe(true);
    expect(redis.locks.size).toBe(0);
    // Re-planning should not explode the fleet: at most one new route per reschedule.
    expect(live.length).toBeLessThanOrEqual(routesBefore + 25);
    expect(merges).toBeGreaterThan(0); // deterministic seed: under-filled routes were consolidated
  }, 60_000);
});
