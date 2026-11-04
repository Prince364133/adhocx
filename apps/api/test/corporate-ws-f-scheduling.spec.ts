import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  evaluateCutoff,
  istWallClockToUtc,
  resolveCancelCutoffHours,
} from '../src/domains/corporate/replanning/cutoff-policy';
import { CorporateReplanningService } from '../src/domains/corporate/replanning/corporate-replanning.service';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { CorporateTenantPolicyService } from '../src/domains/corporate/tenants/corporate-tenant-policy.service';
import { RosterIngestionService } from '../src/domains/corporate/rosters/roster-ingestion.service';
import { RosterLifecycleService } from '../src/domains/corporate/rosters/roster-lifecycle.service';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { CorporateAutoPlannerService } from '../src/domains/corporate/scheduling/corporate-auto-planner.service';
import { CorporateShiftTemplateService } from '../src/domains/corporate/scheduling/corporate-shift-template.service';
import { addDays, isoWeekday, resolveLogoutDate } from '../src/domains/corporate/scheduling/shift-calendar';
import { buildRosterXlsx, FakeDb, FakeRedis, fakeAudit } from './helpers/ws-f-fake-db';

const TENANT = 'tenant-acme';
const OFFICE = { id: 'office-hyd', tenantId: TENANT, code: 'HYD', latitude: 17.4474, longitude: 78.3762, h3Res8Index: '8860a25997fffff' };
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

function seedTenant(db: FakeDb, status = 'ACTIVE') {
  db.corporateTenant.rows.set(TENANT, { id: TENANT, code: 'ACME', name: 'Acme', status });
  db.corporateOffice.rows.set(OFFICE.id, { ...OFFICE });
}

/** n APPROVED requests for one shift, employees spread around the office. */
function seedRequests(db: FakeDb, n: number, shiftDate: string, shiftTime: string, direction: 'LOGIN' | 'LOGOUT', prefix = 'e') {
  for (let i = 0; i < n; i++) {
    const id = `${prefix}-${shiftTime}-${direction}-${i}`;
    const lat = OFFICE.latitude + 0.02 + (i % 7) * 0.004;
    const lng = OFFICE.longitude + 0.01 + Math.floor(i / 7) * 0.004;
    db.corporateEmployee.rows.set(id, { id, tenantId: TENANT, officeId: OFFICE.id, employeeCode: id, fullName: id, gender: i % 3 ? 'MALE' : 'FEMALE' });
    db.corporateTransportRequest.rows.set(`req-${id}`, {
      id: `req-${id}`,
      tenantId: TENANT,
      employeeId: id,
      scheduledDate: day(shiftDate),
      shiftTime,
      direction,
      pickupLat: direction === 'LOGIN' ? lat : OFFICE.latitude,
      pickupLng: direction === 'LOGIN' ? lng : OFFICE.longitude,
      dropoffLat: direction === 'LOGIN' ? OFFICE.latitude : lat,
      dropoffLng: direction === 'LOGIN' ? OFFICE.longitude : lng,
      h3PickupIndex: OFFICE.h3Res8Index,
      status: 'APPROVED',
      idempotencyHash: `hash-${id}`,
    });
  }
}

function planner(db: FakeDb, redis?: FakeRedis, config: any = {}) {
  const audit = fakeAudit();
  return new CorporateAutoPlannerService(
    db as any,
    new RouteSolverService(db as any, audit as any),
    new CorporateTenantPolicyService(db as any, audit as any),
    audit as any,
    redis as any,
    { leadHours: 1, ...config },
  );
}

const policyRow = (db: FakeDb, cancelCutoffHours: number, effectiveFrom = new Date('2026-01-01T00:00:00Z'), version = 1) =>
  db.corporateTenantPolicy.rows.set(`pol-${version}`, {
    id: `pol-${version}`, tenantId: TENANT, version, effectiveFrom, cancelCutoffHours, maxRideMinutes: 120,
    defaultVehicleCategory: 'SEDAN', defaultCapacity: 4, escalationLeadMinutes: 30, officeArrivalBufferMinutes: 10,
    nightShiftStart: '20:00', nightShiftEnd: '06:00',
  });

// 08:00 IST LOGIN on 2026-11-10 = 02:30Z. Earliest pickup (10 min buffer + 120 min max ride) = 00:20Z.
// Default 9 h cutoff + 1 h lead => due from 2026-11-09T14:20Z.
const SHIFT_DATE = '2026-11-10';
const DUE_DEFAULT = Date.parse('2026-11-09T14:20:00Z');

describe('WS-F policy-driven cancel cutoff', () => {
  it('falls back to 9 h without a policy and reads the tenant policy (6 h) when present', async () => {
    const db = new FakeDb();
    expect(await resolveCancelCutoffHours(db as any, TENANT)).toBe(9);
    expect(await resolveCancelCutoffHours(undefined, TENANT)).toBe(9);
    policyRow(db, 6);
    expect(await resolveCancelCutoffHours(db as any, TENANT, new Date('2026-11-09T00:00:00Z'))).toBe(6);
    // A version that only becomes effective later does not apply yet.
    policyRow(db, 12, new Date('2026-12-01T00:00:00Z'), 2);
    expect(await resolveCancelCutoffHours(db as any, TENANT, new Date('2026-11-09T00:00:00Z'))).toBe(6);
    expect(await resolveCancelCutoffHours(db as any, TENANT, new Date('2026-12-02T00:00:00Z'))).toBe(12);
  });

  it('a 6 h tenant may cancel 7 h before pickup; the 9 h default would lock it', () => {
    const pickup = istWallClockToUtc('2026-11-10', '07:00'); // 01:30Z
    const now = new Date(pickup.getTime() - 7 * 3600_000);
    expect(evaluateCutoff(pickup, 'SHIFT_TIME', now, null, 6)).toMatchObject({ allowed: true, cutoffHours: 6 });
    expect(evaluateCutoff(pickup, 'SHIFT_TIME', now).allowed).toBe(false);
    expect(evaluateCutoff(pickup, 'SHIFT_TIME', now).cutoffHours).toBe(9);
  });

  it('trip execution cancel/reschedule applies the tenant cutoff end-to-end (6 h tenant: allowed at 7 h; 9 h tenant: locked)', async () => {
    const db = new FakeDb();
    seedTenant(db);
    seedRequests(db, 1, '2026-11-10', '07:00', 'LOGIN');
    const [reqId] = [...db.corporateTransportRequest.rows.keys()];
    const employeeId = db.corporateTransportRequest.rows.get(reqId)!.employeeId;
    const svc = new CorporateTripExecutionService(db as any, {} as any, {} as any, fakeAudit() as any);
    const now = new Date(istWallClockToUtc('2026-11-10', '07:00').getTime() - 7 * 3600_000);

    await expect(svc.handleRescheduleOrCancel(reqId, { employeeId, action: 'CANCEL' } as any, { now })).rejects.toThrow(/at least 9 hours/);
    policyRow(db, 6);
    const res = await svc.handleRescheduleOrCancel(reqId, { employeeId, action: 'CANCEL' } as any, { now });
    expect(res.status).toBe('CANCELLED');
  });

  it('policy versions: inherit omitted fields, validate ranges, never apply retroactively', async () => {
    const db = new FakeDb();
    seedTenant(db);
    const svc = new CorporateTenantPolicyService(db as any, fakeAudit() as any);
    const now = new Date('2026-11-03T10:00:00Z');
    expect((await svc.getEffectivePolicy(TENANT, now)).source).toBe('DEFAULT');
    const v1 = await svc.createPolicyVersion(TENANT, { cancelCutoffHours: 6, defaultCapacity: 6, defaultVehicleCategory: 'suv' }, 'u1', now);
    expect(v1).toMatchObject({ version: 1, cancelCutoffHours: 6, defaultVehicleCategory: 'SUV', maxRideMinutes: 120 });
    const later = new Date('2026-11-03T11:00:00Z');
    const v2 = await svc.createPolicyVersion(TENANT, { maxRideMinutes: 90, effectiveFrom: later }, 'u1', now);
    expect(v2).toMatchObject({ version: 2, cancelCutoffHours: 6, maxRideMinutes: 90, defaultCapacity: 6 });
    expect((await svc.getEffectivePolicy(TENANT, now)).version).toBe(1);
    expect((await svc.getEffectivePolicy(TENANT, later)).version).toBe(2);
    await expect(svc.createPolicyVersion(TENANT, { cancelCutoffHours: 100 }, 'u1', now)).rejects.toThrow(BadRequestException);
    await expect(svc.createPolicyVersion(TENANT, { effectiveFrom: '2026-10-01T00:00:00Z' }, 'u1', now)).rejects.toThrow(/past/);
  });
});

describe('WS-F overnight shifts and shift templates', () => {
  it(`logout 02:00 for a 20:00 login belongs to the next IST date (TZ=${process.env.TZ ?? 'local'})`, () => {
    expect(resolveLogoutDate('2026-11-10', '20:00', '02:00')).toBe('2026-11-11');
    expect(resolveLogoutDate('2026-11-10', '08:00', '17:00')).toBe('2026-11-10');
    expect(resolveLogoutDate('2026-12-31', '22:00', '06:00')).toBe('2027-01-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(isoWeekday('2026-11-08')).toBe(7); // Sunday
    expect(isoWeekday('2026-11-09')).toBe(1); // Monday
    // Logout-only row: overnight only if an overnight template of the office ends then (on that weekday).
    const tpl = [{ loginTime: '20:00', logoutTime: '02:00', isOvernight: true, weekdays: [1, 2, 3, 4, 5] }];
    expect(resolveLogoutDate('2026-11-10', undefined, '02:00', tpl)).toBe('2026-11-11');
    expect(resolveLogoutDate('2026-11-08', undefined, '02:00', tpl)).toBe('2026-11-08');
    // The resulting IST instant is independent of the server TZ.
    expect(istWallClockToUtc('2026-11-11', '02:00').toISOString()).toBe('2026-11-10T20:30:00.000Z');
  });

  it('roster upload (default and draft) stores the overnight LOGOUT on the next date with a matching idempotency hash', async () => {
    const db = new FakeDb();
    seedTenant(db);
    const ingestion = new RosterIngestionService(db as any, fakeAudit() as any);
    const xlsx = await buildRosterXlsx([
      { employeeId: 'N1', officeCode: 'HYD', rosterDate: '2026-11-10', loginTime: '20:00', logoutTime: '02:00', latitude: 17.47, longitude: 78.36 },
      { employeeId: 'D1', officeCode: 'HYD', rosterDate: '2026-11-10', loginTime: '08:00', logoutTime: '17:00', latitude: 17.46, longitude: 78.35 },
    ]);
    await ingestion.ingestAndPublishRoster(TENANT, xlsx, 'u1');
    const logout = (code: string) =>
      [...db.corporateTransportRequest.rows.values()].find(
        (r) => r.direction === 'LOGOUT' && db.corporateEmployee.rows.get(r.employeeId)!.employeeCode === code,
      )!;
    expect(new Date(logout('N1').scheduledDate).toISOString().slice(0, 10)).toBe('2026-11-11');
    expect(new Date(logout('D1').scheduledDate).toISOString().slice(0, 10)).toBe('2026-11-10');

    const draft = await ingestion.ingestDraftRoster(TENANT, xlsx, 'u1');
    const entries = [...db.corporateRosterEntry.rows.values()].filter((e) => e.rosterId === draft.rosterId);
    const n1 = entries.find((e) => e.direction === 'LOGOUT' && e.shiftTime === '02:00')!;
    expect(n1.scheduledDate.toISOString().slice(0, 10)).toBe('2026-11-11');
    expect(n1.shiftDate.toISOString().slice(0, 10)).toBe('2026-11-10');
    expect(n1.idempotencyHash).toBe(logout('N1').idempotencyHash);
  });

  it('shift templates derive the overnight flag and reject contradictions / bad weekdays', async () => {
    const db = new FakeDb();
    seedTenant(db);
    const svc = new CorporateShiftTemplateService(db as any, fakeAudit() as any);
    const night = await svc.createShiftTemplate(TENANT, { officeId: OFFICE.id, name: 'Night', loginTime: '20:00', logoutTime: '02:00' });
    expect(night.isOvernight).toBe(true);
    expect(night.weekdays).toEqual([1, 2, 3, 4, 5]);
    await expect(
      svc.createShiftTemplate(TENANT, { officeId: OFFICE.id, name: 'Bad', loginTime: '09:00', logoutTime: '18:00', isOvernight: true }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.createShiftTemplate(TENANT, { officeId: OFFICE.id, name: 'Bad2', loginTime: '09:00', logoutTime: '18:00', weekdays: [0] }),
    ).rejects.toThrow(BadRequestException);
    await expect(svc.createShiftTemplate(TENANT, { officeId: OFFICE.id, name: 'Night', loginTime: '21:00', logoutTime: '03:00' })).rejects.toThrow(ConflictException);
  });
});

describe('WS-F roster lifecycle DRAFT -> APPROVED -> PUBLISHED', () => {
  let db: FakeDb;
  let ingestion: RosterIngestionService;
  let lifecycle: RosterLifecycleService;
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      employeeId: `E${i}`, officeCode: 'HYD', rosterDate: '2026-11-10', loginTime: '08:00', logoutTime: '17:00',
      latitude: 17.46 + i * 0.001, longitude: 78.35,
    }));

  beforeEach(() => {
    db = new FakeDb();
    seedTenant(db);
    ingestion = new RosterIngestionService(db as any, fakeAudit() as any);
    lifecycle = new RosterLifecycleService(db as any, fakeAudit() as any);
  });

  it('draft upload creates entries but no demand; publish before approve is 409', async () => {
    const draft = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows(3)), 'u-hr');
    expect(draft).toMatchObject({ status: 'DRAFT', version: 1, entriesCreated: 6 });
    expect(db.corporateTransportRequest.rows.size).toBe(0);
    await expect(lifecycle.publish(draft.rosterId, { id: 'u-tr' })).rejects.toThrow(ConflictException);
  });

  it('approve then publish generates demand once; repeated approve/publish is idempotent and audited actors are kept', async () => {
    const draft = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows(3)), 'u-hr');
    const a1 = await lifecycle.approve(draft.rosterId, { id: 'u-hr' });
    const a2 = await lifecycle.approve(draft.rosterId, { id: 'u-other' });
    expect([a1.idempotent, a2.idempotent]).toEqual([false, true]);
    expect(a2.approvedById).toBe('u-hr');

    const [p1, p2] = await Promise.all([lifecycle.publish(draft.rosterId, { id: 'u-tr' }), lifecycle.publish(draft.rosterId, { id: 'u-tr' })]);
    const results = [p1, p2].sort((x, y) => Number(x.idempotent) - Number(y.idempotent));
    expect(results[0]).toMatchObject({ idempotent: false, requestsCreated: 6 });
    expect(results[1]).toMatchObject({ idempotent: true, requestsCreated: 0 });
    expect(db.corporateTransportRequest.rows.size).toBe(6);
    expect(db.corporateRoster.rows.get(draft.rosterId)).toMatchObject({ status: 'PUBLISHED', publishedById: 'u-tr', approvedById: 'u-hr', uploadedById: 'u-hr' });
    await expect(lifecycle.approve(draft.rosterId, { id: 'u-hr' })).rejects.toThrow(ConflictException);
  });

  it('a newer version repeating the same commutes adds only new demand (idempotencyHash)', async () => {
    const v1 = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows(3)), 'u');
    await lifecycle.approve(v1.rosterId);
    await lifecycle.publish(v1.rosterId);
    const v2 = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows(4)), 'u');
    expect(v2.version).toBe(2);
    await lifecycle.approve(v2.rosterId);
    const p = await lifecycle.publish(v2.rosterId);
    expect(p).toMatchObject({ entries: 8, requestsCreated: 2, duplicatesSkipped: 6 });
    expect(db.corporateTransportRequest.rows.size).toBe(8);
  });

  it('holiday shift days generate no demand on publish', async () => {
    db.corporateHoliday.rows.set('h1', { id: 'h1', tenantId: TENANT, officeId: null, holidayDate: day('2026-11-10'), name: 'Festival' });
    const draft = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows(2)), 'u');
    await lifecycle.approve(draft.rosterId);
    expect(await lifecycle.publish(draft.rosterId)).toMatchObject({ requestsCreated: 0, holidaySkipped: 4 });
  });
});

describe('WS-F autonomous planner', () => {
  it('plans nothing before pickup - (cutoff + lead), plans at the window, and a second run creates nothing', async () => {
    const db = new FakeDb();
    seedTenant(db);
    seedRequests(db, 10, SHIFT_DATE, '08:00', 'LOGIN');
    const p = planner(db, new FakeRedis());

    const early = await p.tick(DUE_DEFAULT - 60_000);
    expect(early).toMatchObject({ skipped: false, routesCreated: 0, notDue: 1 });
    const due = await p.tick(DUE_DEFAULT + 60_000);
    expect(due.routesCreated).toBe(3); // 10 riders, sedan capacity 4
    expect(due.groupsPlanned[0]).toMatchObject({ mode: 'INITIAL', passengersAssigned: 10, officeId: OFFICE.id });
    const again = await p.tick(DUE_DEFAULT + 120_000);
    expect(again.routesCreated).toBe(0);
    expect(db.corporateRoute.rows.size).toBe(3);
  });

  it('a 6 h-cutoff tenant is planned later than the 9 h default', async () => {
    const db = new FakeDb();
    seedTenant(db);
    policyRow(db, 6);
    seedRequests(db, 4, SHIFT_DATE, '08:00', 'LOGIN');
    const p = planner(db, new FakeRedis());
    expect((await p.tick(DUE_DEFAULT + 60_000)).routesCreated).toBe(0);
    expect((await p.tick(DUE_DEFAULT + 3 * 3600_000 + 60_000)).routesCreated).toBe(1);
  });

  it('two instances ticking at once: exactly one plans (tick lock), the other is skipped; no duplicate routes', async () => {
    const db = new FakeDb();
    seedTenant(db);
    seedRequests(db, 12, SHIFT_DATE, '08:00', 'LOGIN');
    const sharedRedis = new FakeRedis();
    const a = planner(db, sharedRedis);
    const b = planner(db, new FakeRedis(sharedRedis.store));
    const [ra, rb] = await Promise.all([a.tick(DUE_DEFAULT + 60_000), b.tick(DUE_DEFAULT + 60_000)]);
    expect([ra.skipped, rb.skipped].sort()).toEqual([false, true]);
    expect(ra.routesCreated + rb.routesCreated).toBe(3);
    // After the lock is released the other instance runs, but finds nothing left to plan.
    expect((await b.tick(DUE_DEFAULT + 90_000)).routesCreated).toBe(0);
    expect(db.corporateRoute.rows.size).toBe(3);
  });

  it('skips a group whose replanning shift lock is held (cancel/reschedule in progress) and plans it on the next tick', async () => {
    const db = new FakeDb();
    seedTenant(db);
    seedRequests(db, 4, SHIFT_DATE, '08:00', 'LOGIN');
    const redis = new FakeRedis();
    const key = CorporateReplanningService.shiftLockKey(TENANT, SHIFT_DATE, '08:00', 'LOGIN');
    const token = (await redis.acquireLockToken(key, 30))!;
    const p = planner(db, redis);
    expect(await p.tick(DUE_DEFAULT + 60_000)).toMatchObject({ busy: 1, routesCreated: 0 });
    await redis.releaseLockToken(key, token);
    expect((await p.tick(DUE_DEFAULT + 90_000)).routesCreated).toBe(1);
  });

  it('requests approved after routes exist are planned incrementally; started shifts and suspended tenants are left alone', async () => {
    const db = new FakeDb();
    seedTenant(db);
    seedRequests(db, 4, SHIFT_DATE, '08:00', 'LOGIN');
    const p = planner(db);
    expect((await p.tick(DUE_DEFAULT + 60_000)).routesCreated).toBe(1);
    seedRequests(db, 2, SHIFT_DATE, '08:00', 'LOGIN', 'late');
    const inc = await p.tick(DUE_DEFAULT + 120_000);
    expect(inc.groupsPlanned[0]).toMatchObject({ mode: 'INCREMENTAL', routesCreated: 1, passengersAssigned: 2 });

    seedRequests(db, 2, SHIFT_DATE, '08:00', 'LOGIN', 'too-late');
    expect(await p.tick(Date.parse('2026-11-10T03:00:00Z'))).toMatchObject({ expired: 1, routesCreated: 0 });

    const db2 = new FakeDb();
    seedTenant(db2, 'SUSPENDED');
    seedRequests(db2, 4, SHIFT_DATE, '08:00', 'LOGIN');
    expect((await planner(db2).tick(DUE_DEFAULT + 60_000)).routesCreated).toBe(0);
  });
});
