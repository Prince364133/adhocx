import { RosterIngestionService } from '../src/domains/corporate/rosters/roster-ingestion.service';
import { RosterLifecycleService } from '../src/domains/corporate/rosters/roster-lifecycle.service';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { CorporateTenantPolicyService } from '../src/domains/corporate/tenants/corporate-tenant-policy.service';
import { CorporateAutoPlannerService } from '../src/domains/corporate/scheduling/corporate-auto-planner.service';
import { istWallClockToUtc } from '../src/domains/corporate/replanning/cutoff-policy';
import { buildRosterXlsx, FakeDb, FakeRedis, fakeAudit, RosterXlsxRow } from './helpers/ws-f-fake-db';

/**
 * Founder model, end to end with no human step after the upload:
 * HR uploads an Excel roster of 500 employees (day shift 08:00-17:00, night shift 20:00-02:00),
 * HR approves, Transport publishes, then the autonomous planner (two API instances) runs on its
 * interval across the whole day and creates the routes of every shift group before its cutoff.
 * Running the whole timeline again creates nothing.
 */
jest.setTimeout(180_000);

const TENANT = 'tenant-sim';
const OFFICE = { id: 'office-sim', tenantId: TENANT, code: 'HITEC', latitude: 17.4474, longitude: 78.3762, h3Res8Index: '8860a25997fffff' };
const ROSTER_DATE = '2026-11-10';
const HOUR = 3600_000;

describe(`WS-F simulation: 500-employee roster -> approve -> publish -> autonomous planning (TZ=${process.env.TZ ?? 'local'})`, () => {
  const db = new FakeDb();
  const audit = fakeAudit();
  const sharedRedis = new FakeRedis();
  const solver = new RouteSolverService(db as any, audit as any);
  const policies = new CorporateTenantPolicyService(db as any, audit as any);
  const instances = [
    new CorporateAutoPlannerService(db as any, solver, policies, audit as any, sharedRedis as any, { leadHours: 1 }),
    new CorporateAutoPlannerService(db as any, solver, policies, audit as any, new FakeRedis(sharedRedis.store) as any, { leadHours: 1 }),
  ];
  const ingestion = new RosterIngestionService(db as any, audit as any);
  const lifecycle = new RosterLifecycleService(db as any, audit as any);
  let rosterId = '';

  /** Both instances tick every 30 min from `fromIso` to `toIso`; returns routes created and groups planned. */
  async function runTimeline(fromIso: string, toIso: string) {
    let routes = 0;
    const planned: { key: string; at: number; shiftAt: number }[] = [];
    for (let t = Date.parse(fromIso); t <= Date.parse(toIso); t += HOUR / 2) {
      const results = await Promise.all(instances.map((p) => p.tick(t)));
      expect(results.filter((r) => !r.skipped)).toHaveLength(1); // the tick lock lets exactly one instance scan
      for (const r of results) {
        routes += r.routesCreated;
        for (const g of r.groupsPlanned) {
          planned.push({
            key: `${g.shiftDate} ${g.shiftTime} ${g.direction}`,
            at: t,
            shiftAt: istWallClockToUtc(g.shiftDate, g.shiftTime).getTime(),
          });
        }
      }
    }
    return { routes, planned };
  }

  beforeAll(() => {
    db.corporateTenant.rows.set(TENANT, { id: TENANT, code: 'SIM', name: 'Sim Corp', status: 'ACTIVE' });
    db.corporateOffice.rows.set(OFFICE.id, { ...OFFICE, isActive: true }); // schema default; FakeDb applies no defaults
  });

  it('step 1: uploads the 500-employee roster as a DRAFT version (no demand yet)', async () => {
    const rows: RosterXlsxRow[] = Array.from({ length: 500 }, (_, i) => {
      const night = i >= 250;
      const ring = 0.01 + (i % 25) * 0.003;
      const angle = (i * 137.5 * Math.PI) / 180;
      return {
        employeeId: `SIM${String(i).padStart(4, '0')}`,
        officeCode: 'HITEC',
        rosterDate: ROSTER_DATE,
        loginTime: night ? '20:00' : '08:00',
        logoutTime: night ? '02:00' : '17:00',
        latitude: Number((OFFICE.latitude + ring * Math.sin(angle)).toFixed(6)),
        longitude: Number((OFFICE.longitude + ring * Math.cos(angle)).toFixed(6)),
        gender: i % 4 === 0 ? 'FEMALE' : 'MALE',
      };
    });
    const draft = await ingestion.ingestDraftRoster(TENANT, await buildRosterXlsx(rows), 'u-hr');
    rosterId = draft.rosterId;
    expect(draft).toMatchObject({ status: 'DRAFT', totalEmployeesProcessed: 500, entriesCreated: 1000 });
    expect(db.corporateEmployee.rows.size).toBe(500);
    expect(db.corporateTransportRequest.rows.size).toBe(0);
  });

  it('step 2: HR approves, Transport publishes: 1000 requests, overnight logouts dated the next day; re-publish is a no-op', async () => {
    await lifecycle.approve(rosterId, { id: 'u-hr', corporateRole: 'HR' });
    const published = await lifecycle.publish(rosterId, { id: 'u-transport', corporateRole: 'TRANSPORT' });
    expect(published).toMatchObject({ idempotent: false, requestsCreated: 1000, holidaySkipped: 0 });
    expect((await lifecycle.publish(rosterId, { id: 'u-transport' })).requestsCreated).toBe(0);

    const byGroup = new Map<string, number>();
    for (const r of db.corporateTransportRequest.rows.values()) {
      const key = `${new Date(r.scheduledDate).toISOString().slice(0, 10)} ${r.shiftTime} ${r.direction}`;
      byGroup.set(key, (byGroup.get(key) ?? 0) + 1);
    }
    expect(Object.fromEntries(byGroup)).toEqual({
      '2026-11-10 08:00 LOGIN': 250,
      '2026-11-10 17:00 LOGOUT': 250,
      '2026-11-10 20:00 LOGIN': 250,
      '2026-11-11 02:00 LOGOUT': 250,
    });
  });

  it('step 3: the auto-planner (2 instances, 30 min interval) plans every shift group once, inside its window', async () => {
    const { routes, planned } = await runTimeline('2026-11-09T06:00:00Z', '2026-11-11T00:00:00Z');
    expect(new Set(planned.map((p) => p.key))).toEqual(
      new Set(['2026-11-10 08:00 LOGIN', '2026-11-10 17:00 LOGOUT', '2026-11-10 20:00 LOGIN', '2026-11-11 02:00 LOGOUT']),
    );
    expect(planned).toHaveLength(4);
    for (const p of planned) {
      // Planned before the 9 h cutoff of the earliest pickup and before the shift itself.
      expect(p.at).toBeLessThan(p.shiftAt - 9 * HOUR);
    }

    const routeRows = [...db.corporateRoute.rows.values()];
    expect(routes).toBe(routeRows.length);
    expect(routeRows.length).toBeGreaterThanOrEqual(4 * Math.ceil(250 / 4));
    expect(routeRows.every((r) => r.assignedPassengerCount >= 1 && r.assignedPassengerCount <= r.maxCapacity && r.maxCapacity === 4)).toBe(true);
    expect(routeRows.filter((r) => r.shiftTime === '02:00').every((r) => r.shiftDate.toISOString().startsWith('2026-11-11'))).toBe(true);

    const requests = [...db.corporateTransportRequest.rows.values()];
    expect(requests.every((r) => r.status === 'PLANNED')).toBe(true);
    const stops = [...db.corporateRouteStop.rows.values()].filter((s) => s.transportRequestId);
    expect(stops).toHaveLength(1000);
    expect(new Set(stops.map((s) => s.transportRequestId)).size).toBe(1000);
  });

  it('step 4: running the planner again over the same timeline creates no new routes', async () => {
    const before = db.corporateRoute.rows.size;
    const { routes, planned } = await runTimeline('2026-11-09T06:00:00Z', '2026-11-11T00:00:00Z');
    expect(routes).toBe(0);
    expect(planned).toHaveLength(0);
    expect(db.corporateRoute.rows.size).toBe(before);
  });
});
