/**
 * WS-D command centre: board (counts, at-risk, stale GPS, offer state), route detail and the
 * audited manual reassign (auto re-dispatch, direct offer, concurrency).
 */
import 'reflect-metadata';
import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@adhocx/contracts';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
} from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { CorporateRiderNotifier } from '../src/domains/corporate/execution/corporate-rider-notifier.service';
import { CorporateOperationsService } from '../src/domains/corporate/operations/corporate-operations.service';
import { CorporateOperationsController } from '../src/domains/corporate/operations/corporate-operations.controller';
import {
  classifyGpsFreshness,
  istToday,
  ReassignRouteDto,
  routeTelemetryKey,
} from '../src/domains/corporate/operations/operations.types';
import {
  collectKeys,
  FakeDb,
  FakeRedisService,
  makeAudit,
  makeNotifications,
} from './helpers/corporate-ws-d-fakes';
import { verifiedVehicle } from './helpers/corporate-driver-fixtures';

const DAY = new Date('2026-11-03T00:00:00.000Z');
/** 07:00 IST on 2026-11-03 */
const NOW = new Date('2026-11-03T01:30:00.000Z');
const min = (n: number) => new Date(NOW.getTime() + n * 60_000);

function seed(db: FakeDb) {
  db.insert('corporateTenant', { id: 't1', code: 'ACME', name: 'Acme', status: 'ACTIVE' });
  db.insert('corporateTenant', { id: 't2', code: 'GLBX', name: 'Globex', status: 'ACTIVE' });
  db.insert('corporateOffice', { id: 'o1', tenantId: 't1', code: 'HYD', name: 'HITEC', latitude: 17.44, longitude: 78.38 });
  db.insert('corporateOffice', { id: 'o2', tenantId: 't1', code: 'BLR', name: 'Whitefield', latitude: 12.97, longitude: 77.75 });
  db.insert('corporateOffice', { id: 'o9', tenantId: 't2', code: 'PNQ', name: 'Pune', latitude: 18.5, longitude: 73.8 });
  for (const [id, userId, status] of [
    ['drv-old', 'u-old', 'VERIFIED'],
    ['drv-new', 'u-new', 'VERIFIED'],
    ['drv-c', 'u-c', 'VERIFIED'],
    ['drv-unv', 'u-unv', 'PENDING'],
  ]) {
    db.insert('driver', {
      id,
      userId,
      fullName: `Driver ${id}`,
      phone: `+91${id.length}000`,
      verificationStatus: status,
      availabilityStatus: 'AVAILABLE',
      vehicleType: 'SEDAN',
    });
  }
  // Every driver owns a real VERIFIED Vehicle row (corporate eligibility ignores the inline vehicleType).
  // drv-unv stays ineligible because the driver itself is PENDING.
  for (const id of ['drv-old', 'drv-c', 'drv-unv']) {
    db.insert('vehicle', verifiedVehicle(id, 'SEDAN', { registrationNumber: `TS09${id.toUpperCase()}` }));
  }
  db.insert('vehicle', verifiedVehicle('drv-new', 'SEDAN', { id: 'veh-new', registrationNumber: 'TS09NEW', model: 'Dzire' }));
  for (let i = 1; i <= 3; i++) {
    db.insert('corporateEmployee', { id: `e${i}`, tenantId: 't1', officeId: 'o1', employeeCode: `E${i}`, fullName: `Emp ${i}`, phoneNumber: `9${i}`, email: `e${i}@x` });
  }
}

let routeSeq = 0;
function addRoute(db: FakeDb, over: Record<string, any> = {}) {
  const id = over.id ?? `route-${++routeSeq}`;
  db.insert('corporateRoute', {
    id,
    tenantId: 't1',
    officeId: 'o1',
    shiftDate: DAY,
    shiftTime: '09:00',
    direction: 'LOGIN',
    vehicleCategory: 'SEDAN',
    maxCapacity: 4,
    assignedPassengerCount: 3,
    targetPickup1Time: min(90),
    targetOfficeArrivalTime: min(150),
    estDistanceMeters: 18000,
    estDurationSeconds: 3600,
    status: 'PLANNED',
    driverId: null,
    vehicleId: null,
    updatedAt: NOW,
    ...over,
  });
  return id;
}

function addAssignedRoute(db: FakeDb, id = 'r-asg') {
  addRoute(db, { id, status: 'ASSIGNED', driverId: 'drv-old', vehicleId: null });
  for (let i = 1; i <= 3; i++) {
    db.insert('corporateRouteStop', {
      id: `${id}-s${i}`,
      routeId: id,
      stopSequence: i,
      stopType: 'PICKUP',
      employeeId: `e${i}`,
      latitude: 17.4 + i / 100,
      longitude: 78.4,
      plannedEta: min(90 + i * 7),
      boardingOtp: `12${i}4`,
      status: 'PENDING',
    });
  }
  db.insert('corporateRouteStop', {
    id: `${id}-s4`, routeId: id, stopSequence: 4, stopType: 'DROPOFF', employeeId: null, latitude: 17.44, longitude: 78.38, plannedEta: min(150), boardingOtp: '0000', status: 'PENDING',
  });
  db.insert('corporateDriverEarning', {
    id: `earn-${id}`, driverId: 'drv-old', routeId: id, routeFarePaise: BigInt(66000), totalEarnedPaise: BigInt(66000), payoutStatus: 'UNPAID', payoutBatchId: null,
  });
  return id;
}

function build() {
  const db = new FakeDb();
  seed(db);
  const redis = new FakeRedisService();
  const notifications = makeNotifications();
  const audit = makeAudit();
  const locations = { findNearbyDrivers: jest.fn(async () => [{ driverId: 'drv-c' }, { driverId: 'drv-old' }]) };
  const rider = new CorporateRiderNotifier(db as any, redis as any, notifications as any);
  const dispatch = new CorporateDispatchService(db as any, redis as any, notifications as any, audit as any, locations as any, undefined, rider);
  const ops = new CorporateOperationsService(db as any, redis as any, notifications as any, audit as any, dispatch, rider);
  return { db, redis, notifications, audit, locations, rider, dispatch, ops, client: redis.client };
}

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  delete process.env.CORPORATE_ESCALATION_LEAD_MIN;
});

describe('WS-D operations board', () => {
  it('defaults to the IST calendar day, independent of server TZ', () => {
    expect(istToday(new Date('2026-11-02T18:29:59Z'))).toBe('2026-11-02');
    expect(istToday(new Date('2026-11-02T18:30:00Z'))).toBe('2026-11-03');
  });

  it('counts and pages routes by status for the day, honouring tenant and office filters', async () => {
    const { db, ops } = build();
    for (let i = 0; i < 3; i++) addRoute(db, { status: 'PLANNED' });
    addRoute(db, { status: 'ASSIGNED', driverId: 'drv-c' });
    addRoute(db, { status: 'COMPLETED' });
    addRoute(db, { status: 'CANCELLED', officeId: 'o2' });
    addRoute(db, { status: 'PLANNED', shiftDate: new Date('2026-11-04T00:00:00Z') });
    addRoute(db, { status: 'PLANNED', tenantId: 't2', officeId: 'o9' });

    const board: any = await ops.getBoard({ date: '2026-11-03', tenantId: 't1', pageSize: 2 }, NOW);
    expect(board.counts).toMatchObject({ PLANNED: 3, DISPATCHING: 0, ASSIGNED: 1, IN_TRANSIT: 0, COMPLETED: 1, CANCELLED: 1, total: 6 });
    expect(board.routes.PLANNED.items).toHaveLength(2);
    expect(board.routes.PLANNED.hasMore).toBe(true);

    const office: any = await ops.getBoard({ date: '2026-11-03', tenantId: 't1', officeId: 'o2' }, NOW);
    expect(office.counts.total).toBe(1);
    expect(office.counts.CANCELLED).toBe(1);

    const def: any = await ops.getBoard({}, new Date('2026-11-02T19:00:00Z'));
    expect(def.date).toBe('2026-11-03');
    expect(def.counts.total).toBe(7);
    await expect(ops.getBoard({ date: '2026-13-01' }, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds a cross-company live dashboard from grouped route data and bounded audit activity', async () => {
    const { db, ops } = build();
    addRoute(db, { id: 'recent-complete', shiftDate: new Date('2026-10-22T00:00:00.000Z'), status: 'COMPLETED' });
    addRoute(db, { id: 'today-active', tenantId: 't2', officeId: 'o9', status: 'IN_TRANSIT' });
    addRoute(db, { id: 'today-planned', status: 'PLANNED' });
    addRoute(db, { id: 'outside-window', shiftDate: new Date('2026-10-20T00:00:00.000Z'), status: 'COMPLETED' });
    db.insert('corporateEmployee', {
      id: 'e-active',
      tenantId: 't2',
      officeId: 'o9',
      employeeCode: 'ACTIVE-1',
      fullName: 'Active employee',
      isActive: true,
    });
    db.insert('auditLog', {
      id: 'audit-recent',
      action: 'CORPORATE_ROUTE_CREATED',
      entityName: 'CORPORATE_ROUTE',
      entityId: 'today-planned',
      actorRole: 'OPS',
      createdAt: min(-1),
      payload: { mustNotBeReturned: true },
    });
    db.insert('auditLog', {
      id: 'audit-unrelated',
      action: 'PAYMENT_UPDATED',
      entityName: 'PAYMENT',
      entityId: 'payment-1',
      createdAt: min(-2),
    });
    db.insert('auditLog', {
      id: 'audit-old',
      action: 'CORPORATE_ROUTE_CREATED',
      entityName: 'CORPORATE_ROUTE',
      entityId: 'old-route',
      createdAt: new Date('2026-10-20T12:00:00.000Z'),
    });

    const result = await ops.getLiveOperations(1, 2, NOW);
    expect(result.period).toEqual({ from: '2026-10-21', to: '2026-11-03', days: 14 });
    expect(result.summary).toMatchObject({
      companies: 2,
      activeCompanies: 2,
      activeRoutes: 1,
      plannedRoutes: 1,
      completedToday: 0,
      routes14Days: 3,
    });
    expect(result.trend).toHaveLength(14);
    expect(result.trend[0]).toMatchObject({ date: '2026-10-21', total: 0 });
    expect(result.trend[1]).toMatchObject({ date: '2026-10-22', total: 1, completed: 1 });
    expect(result.trend[13]).toMatchObject({ date: '2026-11-03', total: 2, inProgress: 1, planned: 1 });
    expect(result.companies.find((company) => company.id === 't2')).toMatchObject({
      routes14Days: 1,
      routesToday: 1,
      inProgress14Days: 1,
      activeEmployees: 1,
      offices: 1,
    });
    expect(result.routes).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(result.routes.items).toHaveLength(2);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      id: 'audit-recent',
      action: 'CORPORATE_ROUTE_CREATED',
      actorRole: 'OPS',
    });
    expect(result.activities[0]).not.toHaveProperty('payload');
    expect(result.activities[0]).not.toHaveProperty('ipAddress');
  });

  it('computes the at-risk queue from data (unassigned, pickup-1 within the escalation lead)', async () => {
    const { db, ops } = build();
    const soon = addRoute(db, { status: 'PLANNED', targetPickup1Time: min(20) });
    const dispatchingSoon = addRoute(db, { status: 'DISPATCHING', targetPickup1Time: min(29) });
    const later = addRoute(db, { status: 'PLANNED', targetPickup1Time: min(40) });
    addRoute(db, { status: 'ASSIGNED', driverId: 'drv-c', targetPickup1Time: min(10) });
    const overdue = addRoute(db, { status: 'DISPATCHING', targetPickup1Time: min(-15) });
    addRoute(db, { status: 'PLANNED', targetPickup1Time: min(-7 * 60) }); // stale, beyond look-back

    const board: any = await ops.getBoard({ date: '2026-11-03' }, NOW);
    expect(board.atRisk.leadMinutes).toBe(30);
    expect(board.atRisk.items.map((r: any) => r.id)).toEqual([overdue, soon, dispatchingSoon]);
    expect(board.atRisk.items[0]).toMatchObject({ reason: 'UNASSIGNED_PICKUP_PASSED', minutesToPickup: -15 });
    expect(board.atRisk.items[1]).toMatchObject({ reason: 'UNASSIGNED_PICKUP_IMMINENT', minutesToPickup: 20 });
    expect(board.atRisk.items[2].offer).toMatchObject({ state: 'SEARCHING' });

    process.env.CORPORATE_ESCALATION_LEAD_MIN = '60';
    const wider: any = await ops.getBoard({ date: '2026-11-03' }, NOW);
    expect(wider.atRisk.items.map((r: any) => r.id)).toContain(later);
  });

  it('classifies GPS freshness at the 45 s / 180 s thresholds', () => {
    expect(classifyGpsFreshness(0)).toBe('LIVE');
    expect(classifyGpsFreshness(45)).toBe('LIVE');
    expect(classifyGpsFreshness(46)).toBe('STALE');
    expect(classifyGpsFreshness(180)).toBe('STALE');
    expect(classifyGpsFreshness(181)).toBe('OFFLINE');
    expect(classifyGpsFreshness(null)).toBe('OFFLINE');
  });

  it('lists IN_TRANSIT routes with stale or missing GPS from the telemetry Redis key, oldest first', async () => {
    const { db, ops, client } = build();
    const ages: Record<string, number | null> = {};
    for (const [label, age] of [['live', 10], ['stale', 100], ['offline', 300], ['none', null]] as const) {
      const id = addRoute(db, { id: `it-${label}`, status: 'IN_TRANSIT', driverId: 'drv-c' });
      ages[id] = age;
      if (age !== null) {
        await client.set(routeTelemetryKey(id), JSON.stringify({ latitude: 17.4, longitude: 78.4, speedMps: 8, recordedAt: new Date(NOW.getTime() - age * 1000) }));
      }
    }
    const board: any = await ops.getBoard({ date: '2026-11-03' }, NOW);
    expect(board.staleGps.summary).toEqual({ LIVE: 1, STALE: 1, OFFLINE: 2 });
    expect(board.staleGps.items.map((r: any) => [r.id, r.gps.freshness])).toEqual([
      ['it-none', 'OFFLINE'],
      ['it-offline', 'OFFLINE'],
      ['it-stale', 'STALE'],
    ]);
    const live = board.routes.IN_TRANSIT.items.find((r: any) => r.id === 'it-live');
    expect(live.gps).toMatchObject({ freshness: 'LIVE', ageSeconds: 10, latitude: 17.4, speedMps: 8 });
  });

  it('shows the live offer state of each DISPATCHING route without the fare', async () => {
    const { db, ops, client } = build();
    const offered = addRoute(db, { status: 'DISPATCHING' });
    const busy = addRoute(db, { status: 'DISPATCHING' });
    const noSupply = addRoute(db, { status: 'DISPATCHING' });
    const expiring = addRoute(db, { status: 'DISPATCHING' });
    await client.set(
      CorporateDispatchKeys.offer(offered),
      JSON.stringify({ routeId: offered, driverId: 'drv-c', farePaise: 66000, offerExpiresAt: new Date(NOW.getTime() + 42_000) }),
    );
    await client.sadd(CorporateDispatchKeys.rejected(offered), 'drv-x');
    await client.set(CorporateDispatchKeys.unserved(busy), 'BUSY');
    await client.set(CorporateDispatchKeys.unserved(noSupply), 'NO_SUPPLY');
    await client.set(CorporateDispatchKeys.offerDriver(expiring), 'drv-new');

    const board: any = await ops.getBoard({ date: '2026-11-03' }, NOW);
    const byId = Object.fromEntries(board.routes.DISPATCHING.items.map((r: any) => [r.id, r.offer]));
    expect(byId[offered]).toMatchObject({ state: 'OFFERED', driverId: 'drv-c', driverName: 'Driver drv-c', secondsRemaining: 42, rejectedDriverCount: 1 });
    expect(byId[busy].state).toBe('RETRY_ALL_BUSY');
    expect(byId[noSupply].state).toBe('RETRY_NO_SUPPLY');
    expect(byId[expiring]).toMatchObject({ state: 'OFFER_EXPIRING', driverId: 'drv-new' });
    expect([...collectKeys(board)].filter((k) => /fare|payout|paise|otp/i.test(k))).toEqual([]);
  });

  it('returns route detail with stops, live position and offer state, but no boarding OTP', async () => {
    const { db, ops, client } = build();
    const id = addAssignedRoute(db);
    await client.set(routeTelemetryKey(id), JSON.stringify({ latitude: 17.41, longitude: 78.41, recordedAt: new Date(NOW.getTime() - 60_000) }));
    const detail: any = await ops.getRouteDetail(id, NOW);
    expect(detail.route.stops).toHaveLength(4);
    expect(detail.route.stops[0].employee).toMatchObject({ employeeCode: 'E1' });
    expect(detail.livePosition).toMatchObject({ freshness: 'STALE', ageSeconds: 60 });
    expect(detail.offer).toBeNull();
    expect([...collectKeys(detail)]).not.toContain('boardingOtp');
    await expect(ops.getRouteDetail('nope', NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WS-D manual reassign', () => {
  it('unassigns the driver, withdraws the earning, audits the reason, notifies everyone and re-dispatches automatically', async () => {
    const { db, ops, notifications, audit, client } = build();
    const id = addAssignedRoute(db);
    // A stale offer hold of the old driver must be withdrawn too.
    await client.set(CorporateDispatchKeys.offerDriver(id), 'drv-old');
    await client.set(CorporateDispatchKeys.driverHold('drv-old'), id);

    const res: any = await ops.reassignRoute(id, { reason: 'Driver reported vehicle breakdown' }, { id: 'u-admin', role: 'ADMIN' });

    expect(res).toMatchObject({ status: 'DISPATCHING', previousDriverId: 'drv-old', mode: 'AUTO_DISPATCH' });
    expect(res.dispatch).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'drv-c' });
    const route = db.tables.corporateRoute.get(id)!;
    expect(route).toMatchObject({ status: 'DISPATCHING', driverId: null, vehicleId: null });
    // Earnings are never deleted: the old driver's row stays, VOIDED, with when and why.
    const earningsAfter = db.all('corporateDriverEarning').filter((e) => e.routeId === id);
    expect(earningsAfter).toHaveLength(1);
    expect(earningsAfter[0]).toMatchObject({ id: `earn-${id}`, payoutStatus: 'VOIDED', voidedAt: expect.any(Date), payoutBatchId: null });
    expect(earningsAfter[0].voidReason).toContain('Driver reported vehicle breakdown');
    expect(earningsAfter.filter((e) => e.payoutStatus !== 'VOIDED')).toHaveLength(0);
    expect(await client.get(CorporateDispatchKeys.driverHold('drv-old'))).toBeNull();
    expect(await client.smembers(CorporateDispatchKeys.rejected(id))).toContain('drv-old');

    const entry = audit.logs.find((l) => l.action === 'CORPORATE_ROUTE_REASSIGNED');
    expect(entry).toMatchObject({ userId: 'u-admin', entityId: id, metadata: { reason: 'Driver reported vehicle breakdown', previousDriverId: 'drv-old', mode: 'AUTO_DISPATCH' } });
    expect(entry.metadata.withdrawnEarnings).toEqual([{ id: `earn-${id}`, routeFarePaise: '66000', totalEarnedPaise: '66000' }]);

    const ev = (ch: string, name: string) => notifications.events.filter((e) => e.channel === ch && e.event === name);
    expect(ev('driver:drv-old', 'CORPORATE_ROUTE_UNASSIGNED')).toHaveLength(1);
    expect(notifications.pushes.some((p) => p.userId === 'u-old' && p.payload.data.action === 'CORPORATE_ROUTE_UNASSIGNED')).toBe(true);
    for (const e of ['e1', 'e2', 'e3']) {
      const n = ev(`employee:${e}`, 'CORPORATE_CAB_REPLACED');
      expect(n).toHaveLength(1);
      expect(n[0].payload.message).not.toContain('breakdown'); // internal reason stays internal
    }
    expect(ev('driver:drv-c', 'CORPORATE_ROUTE_OFFER')).toHaveLength(1);
  });

  it('offers directly to newDriverId; the driver accepts through the normal accept path and employees get the new cab', async () => {
    const { db, ops, dispatch, rider, notifications, client } = build();
    const id = addAssignedRoute(db);
    await rider.notifyRouteAssigned(id); // original assignment notice (sets the ASSIGNED dedupe keys)
    expect(notifications.events.filter((e) => e.event === 'CAB_ASSIGNED')).toHaveLength(3);

    const res: any = await ops.reassignRoute(id, { reason: 'Customer escalation', newDriverId: 'drv-new' }, { id: 'u-admin' });
    expect(res.mode).toBe('DIRECT_OFFER');
    expect(res.dispatch).toMatchObject({ status: 'OFFERED', offeredToDriverId: 'drv-new' });
    const offer = JSON.parse((await client.get(CorporateDispatchKeys.offer(id)))!);
    expect(offer).toMatchObject({ driverId: 'drv-new', farePaise: 66000 });
    expect(notifications.events.some((e) => e.channel === 'driver:drv-new' && e.event === 'CORPORATE_ROUTE_OFFER')).toBe(true);
    expect(notifications.pushes.some((p) => p.userId === 'u-new')).toBe(true);

    await dispatch.acceptRouteOffer(id, 'drv-new');
    expect(db.tables.corporateRoute.get(id)).toMatchObject({ status: 'ASSIGNED', driverId: 'drv-new', vehicleId: 'veh-new' });
    const earnings = db.all('corporateDriverEarning').filter((e) => e.routeId === id);
    const live = earnings.filter((e) => e.payoutStatus !== 'VOIDED');
    expect(live.map((e) => [e.driverId, Number(e.routeFarePaise)])).toEqual([['drv-new', 66000]]);
    // The replaced driver's earning is kept, voided (never deleted).
    expect(earnings.filter((e) => e.payoutStatus === 'VOIDED').map((e) => e.driverId)).toEqual(['drv-old']);
    // Second ASSIGNED notice reaches employees because the reassignment cleared the dedupe marker.
    const assigned = notifications.events.filter((e) => e.event === 'CAB_ASSIGNED');
    expect(assigned).toHaveLength(6);
    expect(assigned[5].payload.driverId).toBe('drv-new');
  });

  it('rejects routes that are not ASSIGNED, unknown routes and bad reasons', async () => {
    const { db, ops } = build();
    const planned = addRoute(db, { status: 'DISPATCHING' });
    await expect(ops.reassignRoute(planned, { reason: 'test reason' })).rejects.toBeInstanceOf(ConflictException);
    await expect(ops.reassignRoute('missing', { reason: 'test reason' })).rejects.toBeInstanceOf(NotFoundException);
    const id = addAssignedRoute(db);
    await expect(ops.reassignRoute(id, { reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(ops.reassignRoute(id, { reason: 'x'.repeat(501) })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.tables.corporateRoute.get(id)!.status).toBe('ASSIGNED');
  });

  it('validates the requested driver: not the same, verified, free in that window and not holding another offer', async () => {
    const { db, ops, client } = build();
    const id = addAssignedRoute(db);
    await expect(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-old' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-unv' })).rejects.toBeInstanceOf(ConflictException);
    await expect(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-none' })).rejects.toBeInstanceOf(NotFoundException);

    const clash = addRoute(db, { status: 'ASSIGNED', driverId: 'drv-new', targetPickup1Time: min(100) });
    await expect(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-new' })).rejects.toThrow(clash);
    db.tables.corporateRoute.get(clash)!.status = 'COMPLETED';

    await client.set(CorporateDispatchKeys.driverHold('drv-new'), 'other-route');
    await expect(ops.reassignRoute(id, { reason: 'swap', newDriverId: 'drv-new' })).rejects.toThrow(/live offer/);
    expect(db.tables.corporateRoute.get(id)).toMatchObject({ status: 'ASSIGNED', driverId: 'drv-old' });
  });

  it('refuses when the old driver earning is already in a payout batch', async () => {
    const { db, ops } = build();
    const id = addAssignedRoute(db);
    Object.assign(db.tables.corporateDriverEarning.get(`earn-${id}`)!, { payoutStatus: 'PROCESSING', payoutBatchId: 'b1' });
    await expect(ops.reassignRoute(id, { reason: 'swap' })).rejects.toThrow(/payout batch/);
    expect(db.tables.corporateRoute.get(id)!.status).toBe('ASSIGNED');
  });

  it('race: two concurrent reassigns of the same route, exactly one wins', async () => {
    const { db, ops, audit, notifications } = build();
    const id = addAssignedRoute(db);
    const results = await Promise.allSettled([
      ops.reassignRoute(id, { reason: 'ops desk A' }, { id: 'u-a' }),
      ops.reassignRoute(id, { reason: 'ops desk B' }, { id: 'u-b' }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(ConflictException);
    expect(audit.logs.filter((l) => l.action === 'CORPORATE_ROUTE_REASSIGNED')).toHaveLength(1);
    expect(notifications.events.filter((e) => e.event === 'CORPORATE_ROUTE_UNASSIGNED')).toHaveLength(1);
    expect(notifications.events.filter((e) => e.event === 'CORPORATE_CAB_REPLACED')).toHaveLength(3);
    expect(db.tables.corporateRoute.get(id)!.status).toBe('DISPATCHING');
  });

  it('falls back to the scheduler queue when the dispatch lock is busy', async () => {
    const { db, ops, redis } = build();
    const id = addAssignedRoute(db);
    await redis.acquireLockToken(`corporate:dispatch:lock:${id}`, 30);
    const res: any = await ops.reassignRoute(id, { reason: 'lock busy' });
    expect(res.dispatch.status).toBe('QUEUED');
    expect(redis.zadd).toHaveBeenCalledWith(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, expect.any(Number), id);
  });

  it('validates the reassign body DTO', async () => {
    const errs = async (body: any) => (await validate(plainToInstance(ReassignRouteDto, body))).map((e) => e.property);
    expect(await errs({ reason: 'Vehicle breakdown' })).toEqual([]);
    expect(await errs({})).toContain('reason');
    expect(await errs({ reason: 'ok reason', newDriverId: 'not-a-uuid' })).toContain('newDriverId');
  });

  it('every command-centre read and write endpoint requires ADMIN or OPS', () => {
    for (const m of ['board', 'liveOperations', 'detail', 'reassign']) {
      expect(Reflect.getMetadata(ROLES_KEY, (CorporateOperationsController.prototype as any)[m])).toEqual([UserRole.ADMIN, UserRole.OPS]);
    }
  });
});
