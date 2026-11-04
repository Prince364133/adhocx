import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { CorporateTicketCategory, CorporateTicketPriority, CorporateTicketStatus, UserRole } from '@adhocx/contracts';
import { CorporateSafetyController } from '../src/domains/corporate/safety/corporate-safety.controller';
import { CorporateSafetyService } from '../src/domains/corporate/safety/corporate-safety.service';
import {
  CorporateSosEscalationScheduler,
  loadSosEscalationConfig,
} from '../src/domains/corporate/safety/corporate-sos-escalation.scheduler';
import { CorporateSupportTicketService } from '../src/domains/corporate/safety/corporate-support-ticket.service';
import { CorporateSupportTicketController } from '../src/domains/corporate/safety/corporate-support-ticket.controller';
import { CorporateRiderService } from '../src/domains/corporate/rider/corporate-rider.service';
import { CorporateRiderController } from '../src/domains/corporate/rider/corporate-rider.controller';
import { toLegacySchedule, toLegacyTripHistory } from '../src/domains/corporate/rider/corporate-rider-legacy.mapper';
import { CorporateTripExecutionController } from '../src/domains/corporate/execution/corporate-trip-execution.controller';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import {
  CORPORATE_RESOURCE_KEY,
  CORPORATE_TENANT_SCOPED_KEY,
} from '../src/common/decorators/corporate-resource.decorator';

// ---------------------------------------------------------------------------
// In-memory Prisma double: honours the where-clauses the code under test uses
// (equality, null, in, lte/gte, OR) and throws P2025 when a conditional update misses.
// ---------------------------------------------------------------------------

const clone = <T>(v: T): T => (v === undefined || v === null ? v : { ...(v as any) });

function matches(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'OR') return (cond as any[]).some((c) => matches(row, c));
    const value = row[key];
    if (cond === null) return value === null || value === undefined;
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (typeof cond === 'object') {
      if ('in' in cond) return cond.in.includes(value);
      if ('lte' in cond || 'gte' in cond) {
        if (!(value instanceof Date)) return false;
        if (cond.lte && value.getTime() > cond.lte.getTime()) return false;
        if (cond.gte && value.getTime() < cond.gte.getTime()) return false;
        return true;
      }
      return true; // relation filters are not modelled
    }
    return value === cond;
  });
}

const tick = () => new Promise((r) => setImmediate(r));

function applyData(row: any, data: any) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as any)) row[k] = (row[k] ?? 0) + (v as any).increment;
    else row[k] = v;
  }
}

const T1 = { id: 'tenant-1', code: 'T1', name: 'Acme', status: 'ACTIVE' };
const T2 = { id: 'tenant-2', code: 'T2', name: 'Globex', status: 'ACTIVE' };

function makeDb() {
  const sos = new Map<string, any>();
  const tickets = new Map<string, any>();
  const employees = new Map<string, any>([
    ['emp-1', { id: 'emp-1', userId: 'user-emp-1', tenantId: T1.id, employeeCode: 'E1', fullName: 'Asha', isActive: true }],
    ['emp-2', { id: 'emp-2', userId: 'user-emp-2', tenantId: T1.id, employeeCode: 'E2', fullName: 'Ravi', isActive: true }],
    ['emp-9', { id: 'emp-9', userId: 'user-emp-9', tenantId: T2.id, employeeCode: 'E9', fullName: 'Zoe', isActive: true }],
  ]);
  const route = { id: 'route-1', tenantId: T1.id, tenant: T1, driverId: null, driver: null };
  let ticketSeq = 0;

  const db: any = {
    sos,
    tickets,
    corporateTenant: {
      findUnique: jest.fn(async ({ where }: any) => [T1, T2].find((t) => t.id === where.id) ?? null),
    },
    corporateSosAlert: {
      findUnique: jest.fn(async ({ where }: any) => {
        const a = sos.get(where.id);
        return a ? { ...a, route } : null;
      }),
      findMany: jest.fn(async ({ where, take }: any) => {
        await tick();
        return [...sos.values()]
          .filter((a) => matches(a, where))
          .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
          .slice(0, take ?? Infinity)
          .map((a) => ({ ...a, route }));
      }),
      update: jest.fn(async ({ where, data }: any) => {
        await tick();
        const a = sos.get(where.id);
        if (!a || !matches(a, where)) throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
        applyData(a, data);
        return clone(a);
      }),
    },
    corporateSupportTicket: {
      create: jest.fn(async ({ data }: any) => {
        const t = { id: `tck-${++ticketSeq}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        tickets.set(t.id, t);
        return clone(t);
      }),
      findMany: jest.fn(async ({ where }: any) => [...tickets.values()].filter((t) => matches(t, where)).map(clone)),
      findUnique: jest.fn(async ({ where }: any) => {
        const t = tickets.get(where.id);
        return t ? { ...t, tenant: [T1, T2].find((x) => x.id === t.tenantId) } : null;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        await tick();
        const t = tickets.get(where.id);
        if (!t || !matches(t, where)) return { count: 0 };
        applyData(t, data);
        return { count: 1 };
      }),
    },
    corporateEmployee: {
      findUnique: jest.fn(async ({ where }: any) => clone(employees.get(where.id)) ?? null),
    },
  };
  return db;
}

function addAlert(db: any, alert: Partial<any> & { id: string }) {
  db.sos.set(alert.id, {
    routeId: 'route-1',
    tenantId: T1.id,
    status: 'NEW',
    acknowledgedAt: null,
    escalatedAt: null,
    escalationLevel: 0,
    autoEscalated: false,
    resolutionNotes: null,
    createdAt: new Date(),
    ...alert,
  });
}

function makeRedisLocks() {
  const locks = new Map<string, string>();
  return {
    locks,
    acquireLockToken: jest.fn(async (key: string) => {
      if (locks.has(key)) return null;
      const token = `tok-${Math.random()}`;
      locks.set(key, token);
      return token;
    }),
    releaseLockToken: jest.fn(async (key: string, token: string) => {
      if (locks.get(key) === token) locks.delete(key);
    }),
  };
}

function ctx(controller: any, method: string, req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => controller.prototype[method],
    getClass: () => controller,
  } as unknown as ExecutionContext;
}
const req = (user: any, init: { params?: any; query?: any; body?: any } = {}) =>
  ({ user, params: {}, query: {}, body: {}, headers: {}, ...init }) as any;

const ADMIN = { id: 'admin-1', role: UserRole.ADMIN };
const CORP_ADMIN_T1 = { id: 'corp-1', role: UserRole.CORPORATE_ADMIN, corporateTenantId: T1.id };
const EMP_1 = { id: 'user-emp-1', role: UserRole.EMPLOYEE, corporateTenantId: T1.id, corporateEmployeeId: 'emp-1' };

const meta = (c: any, m: string, key: string) => Reflect.getMetadata(key, c.prototype[m]);

// ---------------------------------------------------------------------------

describe('wire/safety-support: SOS lifecycle, escalation scheduler, support tickets, rider aliases', () => {
  let db: ReturnType<typeof makeDb>;
  let notifications: any;
  let audit: any;
  let safety: CorporateSafetyService;
  let sosController: CorporateSafetyController;

  beforeEach(() => {
    db = makeDb();
    notifications = { emitEvent: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    safety = new CorporateSafetyService(db, notifications, audit);
    sosController = new CorporateSafetyController(safety);
  });

  // =========================================================================
  describe('1. SOS lifecycle endpoints', () => {
    const LIFECYCLE = ['acknowledgeAlert', 'investigateAlert', 'escalateAlert', 'closeAlert', 'resolveAlert'];

    it('every lifecycle endpoint is ADMIN-only, guarded, scoped to the sos resource and routed as POST alerts/:id/<action>', () => {
      const classGuards = Reflect.getMetadata(GUARDS_METADATA, CorporateSafetyController);
      expect(classGuards).toEqual([JwtAuthGuard, RolesGuard, CorporateAccessGuard]);
      const paths: string[] = [];
      for (const m of LIFECYCLE) {
        expect(meta(CorporateSafetyController, m, ROLES_KEY)).toEqual([UserRole.ADMIN]);
        expect(meta(CorporateSafetyController, m, CORPORATE_RESOURCE_KEY)).toEqual(
          expect.objectContaining({ kind: 'sos', param: 'id', from: 'params' }),
        );
        paths.push(meta(CorporateSafetyController, m, 'path'));
      }
      expect(paths).toEqual([
        'alerts/:id/acknowledge',
        'alerts/:id/investigate',
        'alerts/:id/escalate',
        'alerts/:id/close',
        'alerts/:id/resolve',
      ]);
      // A corporate admin is stopped by the role gate before any lookup.
      const reflector = new Reflector();
      expect(() =>
        new RolesGuard(reflector).canActivate(ctx(CorporateSafetyController, 'escalateAlert', req(CORP_ADMIN_T1))),
      ).toThrow(ForbiddenException);
    });

    it('CorporateAccessGuard returns 404 for an unknown alert id', async () => {
      const guard = new CorporateAccessGuard(new Reflector(), db);
      await expect(
        guard.canActivate(ctx(CorporateSafetyController, 'acknowledgeAlert', req(ADMIN, { params: { id: 'nope' } }))),
      ).rejects.toThrow(NotFoundException);
    });

    it('POST acknowledge: NEW -> ACKNOWLEDGED, assigns the commander and audits with notes', async () => {
      addAlert(db, { id: 'sos-1' });
      const res = await sosController.acknowledgeAlert('sos-1', { notes: 'On it', adminName: 'Cmdr Rao' }, req(ADMIN));
      expect(res).toEqual(
        expect.objectContaining({ status: 'ACKNOWLEDGED', assignedToAdminId: 'admin-1', assignedAdminName: 'Cmdr Rao' }),
      );
      expect(res.acknowledgedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_SOS_ACKNOWLEDGED',
          userId: 'admin-1',
          entityId: 'sos-1',
          metadata: expect.objectContaining({ fromStatus: 'NEW', notes: 'On it' }),
        }),
      );
    });

    it('POST investigate: ACKNOWLEDGED -> INVESTIGATING with notes, audited', async () => {
      addAlert(db, { id: 'sos-1', status: 'ACKNOWLEDGED', acknowledgedAt: new Date() });
      const res = await sosController.investigateAlert('sos-1', { notes: 'Calling driver' }, req(ADMIN));
      expect(res.status).toBe('INVESTIGATING');
      expect(res.resolutionNotes).toBe('Calling driver');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CORPORATE_SOS_INVESTIGATING', metadata: expect.objectContaining({ fromStatus: 'ACKNOWLEDGED' }) }),
      );
    });

    it('POST escalate: requires notes, INVESTIGATING -> ESCALATED and raises the escalation level', async () => {
      addAlert(db, { id: 'sos-1', status: 'INVESTIGATING', acknowledgedAt: new Date(), escalationLevel: 1 });
      await expect(sosController.escalateAlert('sos-1', { notes: '  ' }, req(ADMIN))).rejects.toThrow(BadRequestException);
      const res = await sosController.escalateAlert('sos-1', { notes: 'Driver unreachable' }, req(ADMIN));
      expect(res.status).toBe('ESCALATED');
      expect(res.escalationLevel).toBe(2);
      expect(res.escalatedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CORPORATE_SOS_ESCALATED', metadata: expect.objectContaining({ escalationLevel: 2 }) }),
      );
    });

    it('POST close (RESOLVED default / FALSE_ALARM) and the legacy /resolve alias both close an open alert', async () => {
      addAlert(db, { id: 'sos-a', status: 'ESCALATED' });
      addAlert(db, { id: 'sos-b', status: 'NEW' });
      addAlert(db, { id: 'sos-c', status: 'ACKNOWLEDGED' });

      const a = await sosController.closeAlert('sos-a', { notes: 'Commuter home safe' }, req(ADMIN));
      expect(a).toEqual(expect.objectContaining({ status: 'RESOLVED', resolutionNotes: 'Commuter home safe', resolvedById: 'admin-1' }));
      const b = await sosController.closeAlert('sos-b', { notes: 'Pocket press', outcome: 'FALSE_ALARM' }, req(ADMIN));
      expect(b.status).toBe('FALSE_ALARM');
      await expect(sosController.closeAlert('sos-c', {}, req(ADMIN))).rejects.toThrow(BadRequestException);
      await expect(sosController.closeAlert('sos-c', { notes: 'x', outcome: 'NEW' as any }, req(ADMIN))).rejects.toThrow(
        BadRequestException,
      );

      const c = await sosController.resolveAlert(
        'sos-c',
        { alertId: 'sos-c', status: 'RESOLVED' as any, resolutionNotes: 'Resolved via alias' },
        req(ADMIN),
      );
      expect(c.status).toBe('RESOLVED');
      expect(audit.log.mock.calls.filter(([e]: any) => e.action === 'CORPORATE_SOS_RESOLVED')).toHaveLength(3);
    });

    it('illegal transitions return 409 and leave the alert untouched', async () => {
      addAlert(db, { id: 'new', status: 'NEW' });
      addAlert(db, { id: 'acked', status: 'ACKNOWLEDGED', acknowledgedAt: new Date() });
      addAlert(db, { id: 'esc-acked', status: 'ESCALATED', acknowledgedAt: new Date() });
      addAlert(db, { id: 'done', status: 'RESOLVED' });
      addAlert(db, { id: 'false', status: 'FALSE_ALARM' });

      const cases: Array<[string, () => Promise<unknown>]> = [
        ['investigate before acknowledge', () => sosController.investigateAlert('new', {}, req(ADMIN))],
        ['acknowledge twice', () => sosController.acknowledgeAlert('acked', {}, req(ADMIN))],
        ['re-acknowledge an acknowledged escalation', () => sosController.acknowledgeAlert('esc-acked', {}, req(ADMIN))],
        ['escalate an escalated alert', () => sosController.escalateAlert('esc-acked', { notes: 'again' }, req(ADMIN))],
        ['close a resolved alert', () => sosController.closeAlert('done', { notes: 'dup' }, req(ADMIN))],
        ['acknowledge a false alarm', () => sosController.acknowledgeAlert('false', {}, req(ADMIN))],
        ['escalate a resolved alert', () => sosController.escalateAlert('done', { notes: 'late' }, req(ADMIN))],
      ];
      for (const [name, run] of cases) {
        const outcome = await run().then(
          () => `${name}: resolved`,
          (err) => (err instanceof ConflictException ? 'conflict' : `${name}: ${err?.constructor?.name}`),
        );
        expect(outcome).toBe('conflict');
      }
      expect(db.sos.get('new').status).toBe('NEW');
      expect(db.sos.get('done').status).toBe('RESOLVED');
      expect(db.corporateSosAlert.update).not.toHaveBeenCalled();
    });

    it('two commanders acknowledging at once: exactly one wins, the other gets 409', async () => {
      addAlert(db, { id: 'sos-1' });
      const results = await Promise.allSettled([
        sosController.acknowledgeAlert('sos-1', { adminName: 'A' }, req({ ...ADMIN, id: 'admin-a' })),
        sosController.acknowledgeAlert('sos-1', { adminName: 'B' }, req({ ...ADMIN, id: 'admin-b' })),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(ConflictException);
      expect(audit.log.mock.calls.filter(([e]: any) => e.action === 'CORPORATE_SOS_ACKNOWLEDGED')).toHaveLength(1);
    });
  });

  // =========================================================================
  describe('2. SOS escalation scheduler', () => {
    const SLA = 120;
    const T0 = Date.parse('2026-11-04T18:00:00.000Z');

    it('config: env defaults (15000 ms poll, 120 s SLA), env overrides, and disabled under jest', () => {
      const saved = { ...process.env };
      try {
        delete process.env.CORPORATE_SOS_ESCALATION_POLL_MS;
        delete process.env.CORPORATE_SOS_ACK_SLA_SEC;
        delete process.env.CORPORATE_SOS_ESCALATION_ENABLED;
        const defaults = loadSosEscalationConfig();
        expect(defaults).toEqual(expect.objectContaining({ pollIntervalMs: 15000, ackSlaSeconds: 120, enabled: false }));

        process.env.CORPORATE_SOS_ESCALATION_POLL_MS = '5000';
        process.env.CORPORATE_SOS_ACK_SLA_SEC = '60';
        process.env.CORPORATE_SOS_ESCALATION_ENABLED = 'true';
        expect(loadSosEscalationConfig()).toEqual(expect.objectContaining({ pollIntervalMs: 5000, ackSlaSeconds: 60, enabled: true }));
      } finally {
        process.env = saved;
      }
    });

    it('onModuleInit schedules an unref-ed interval only when enabled; onModuleDestroy clears it', async () => {
      const setSpy = jest.spyOn(global, 'setInterval');
      try {
        const off = new CorporateSosEscalationScheduler(safety, makeRedisLocks() as any, { enabled: false });
        off.onModuleInit();
        expect(setSpy).not.toHaveBeenCalled();

        const on = new CorporateSosEscalationScheduler(safety, makeRedisLocks() as any, { enabled: true, pollIntervalMs: 15000 });
        on.onModuleInit();
        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy.mock.calls[0][1]).toBe(15000);
        const clearSpy = jest.spyOn(global, 'clearInterval');
        await on.onModuleDestroy();
        expect(clearSpy).toHaveBeenCalledTimes(1);
        clearSpy.mockRestore();
      } finally {
        setSpy.mockRestore();
      }
    });

    it('each tick takes and releases the Redis lock; a held lock skips the run without escalating', async () => {
      addAlert(db, { id: 'sos-1', createdAt: new Date(T0 - (SLA + 5) * 1000) });
      const redis = makeRedisLocks();
      const scheduler = new CorporateSosEscalationScheduler(safety, redis as any, { enabled: false, ackSlaSeconds: SLA });

      redis.locks.set(CorporateSosEscalationScheduler.TICK_LOCK_KEY, 'other-instance');
      const skipped = await scheduler.tick(T0);
      expect(skipped).toEqual({ skipped: true, escalatedIds: [] });
      expect(db.sos.get('sos-1').status).toBe('NEW');

      redis.locks.clear();
      const ran = await scheduler.tick(T0);
      expect(ran).toEqual({ skipped: false, escalatedIds: ['sos-1'] });
      expect(redis.acquireLockToken).toHaveBeenLastCalledWith(CorporateSosEscalationScheduler.TICK_LOCK_KEY, expect.any(Number));
      expect(redis.locks.size).toBe(0); // released
    });

    it('two instances ticking at once: only the lock holder escalates', async () => {
      addAlert(db, { id: 'sos-1', createdAt: new Date(T0 - 200_000) });
      addAlert(db, { id: 'sos-2', createdAt: new Date(T0 - 300_000) });
      const redis = makeRedisLocks(); // shared Redis
      const a = new CorporateSosEscalationScheduler(safety, redis as any, { enabled: false, ackSlaSeconds: SLA });
      const b = new CorporateSosEscalationScheduler(safety, redis as any, { enabled: false, ackSlaSeconds: SLA });
      const [ra, rb] = await Promise.all([a.tick(T0), b.tick(T0)]);
      expect([ra.skipped, rb.skipped].sort()).toEqual([false, true]);
      expect([...ra.escalatedIds, ...rb.escalatedIds].sort()).toEqual(['sos-1', 'sos-2']);
      expect(db.sos.get('sos-1').escalationLevel).toBe(1);
      expect(db.sos.get('sos-2').escalationLevel).toBe(1);
    });

    it('one escalation per SLA breach: level increments once per elapsed window and stops after acknowledgement', async () => {
      addAlert(db, { id: 'sos-1', createdAt: new Date(T0) });
      const scheduler = new CorporateSosEscalationScheduler(safety, makeRedisLocks() as any, { enabled: false, ackSlaSeconds: SLA });

      expect((await scheduler.tick(T0 + 119_000)).escalatedIds).toEqual([]); // inside SLA
      expect((await scheduler.tick(T0 + 121_000)).escalatedIds).toEqual(['sos-1']);
      expect(db.sos.get('sos-1')).toEqual(expect.objectContaining({ status: 'ESCALATED', autoEscalated: true, escalationLevel: 1 }));

      // Polls every 15 s inside the same window do nothing.
      for (const dt of [136_000, 151_000, 226_000]) {
        expect((await scheduler.tick(T0 + dt)).escalatedIds).toEqual([]);
      }
      expect((await scheduler.tick(T0 + 241_000)).escalatedIds).toEqual(['sos-1']);
      expect(db.sos.get('sos-1').escalationLevel).toBe(2);

      await safety.acknowledgeSosAlert('sos-1', 'admin-1', 'Cmdr');
      expect((await scheduler.tick(T0 + 600_000)).escalatedIds).toEqual([]);
      expect(db.sos.get('sos-1').escalationLevel).toBe(2);

      const autoAudits = audit.log.mock.calls.filter(([e]: any) => e.action === 'CORPORATE_SOS_AUTO_ESCALATED');
      expect(autoAudits.map(([e]: any) => e.metadata.escalationLevel)).toEqual([1, 2]);
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        `corporate:${T1.id}:sos`,
        'CORPORATE_SOS_AUTO_ESCALATED',
        expect.objectContaining({ alertId: 'sos-1', escalationLevel: 2 }),
      );
    });

    it('even without the lock, concurrent passes escalate a breach exactly once (compare-and-set on level)', async () => {
      addAlert(db, { id: 'sos-1', createdAt: new Date(T0 - 500_000) });
      const [x, y] = await Promise.all([
        safety.checkAndAutoEscalateAlerts(SLA, new Date(T0)),
        safety.checkAndAutoEscalateAlerts(SLA, new Date(T0)),
      ]);
      expect([...x, ...y]).toEqual(['sos-1']);
      expect(db.sos.get('sos-1').escalationLevel).toBe(1);
    });
  });

  // =========================================================================
  describe('3. Support tickets (corporate/support/tickets)', () => {
    let tickets: CorporateSupportTicketService;
    let controller: CorporateSupportTicketController;
    let guard: CorporateAccessGuard;

    const seed = async (employeeId: string, tenantId: string) =>
      tickets.createTicket({ id: employeeId, tenantId }, {
        category: CorporateTicketCategory.CAB_DELAY,
        subject: `Late cab ${employeeId}`,
        description: 'Cab 20 min late',
      });

    beforeEach(() => {
      tickets = new CorporateSupportTicketService(db, notifications, audit);
      controller = new CorporateSupportTicketController(tickets);
      guard = new CorporateAccessGuard(new Reflector(), db);
    });

    it('route metadata: guarded controller; create/list tenant-scoped for corporate roles; status change ADMIN-only; get by id is resource-scoped incl. EMPLOYEE', () => {
      expect(Reflect.getMetadata('path', CorporateSupportTicketController)).toBe('corporate/support/tickets');
      expect(Reflect.getMetadata(GUARDS_METADATA, CorporateSupportTicketController)).toEqual([
        JwtAuthGuard,
        RolesGuard,
        CorporateAccessGuard,
      ]);
      for (const m of ['createTicket', 'listTickets']) {
        expect(meta(CorporateSupportTicketController, m, CORPORATE_TENANT_SCOPED_KEY)).toBe(true);
        expect(meta(CorporateSupportTicketController, m, ROLES_KEY)).toEqual(
          expect.arrayContaining([UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER]),
        );
      }
      expect(meta(CorporateSupportTicketController, 'updateStatus', ROLES_KEY)).toEqual([UserRole.ADMIN]);
      expect(meta(CorporateSupportTicketController, 'getTicket', ROLES_KEY)).toContain(UserRole.EMPLOYEE);
      expect(meta(CorporateSupportTicketController, 'getTicket', CORPORATE_RESOURCE_KEY)).toEqual(
        expect.objectContaining({ kind: 'ticket', param: 'id' }),
      );
    });

    it('tenant isolation on create: corporate admin may raise tickets only for employees of their tenant', async () => {
      // Spoofed tenantId in the body is rejected by the guard.
      const spoof = req(CORP_ADMIN_T1, { body: { tenantId: T2.id, employeeId: 'emp-9' } });
      await expect(guard.canActivate(ctx(CorporateSupportTicketController, 'createTicket', spoof))).rejects.toThrow(ForbiddenException);

      // Without tenantId the guard forces T1; an employee of T2 is then refused by the service.
      const cross = req(CORP_ADMIN_T1, {
        body: { employeeId: 'emp-9', category: CorporateTicketCategory.OTHER, subject: 's', description: 'd' },
      });
      await guard.canActivate(ctx(CorporateSupportTicketController, 'createTicket', cross));
      expect(cross.body.tenantId).toBe(T1.id);
      await expect(controller.createTicket(cross.body, cross)).rejects.toThrow(ForbiddenException);

      const own = req(CORP_ADMIN_T1, {
        body: { employeeId: 'emp-2', category: CorporateTicketCategory.SAFETY_CONCERN, priority: CorporateTicketPriority.HIGH, subject: 'Rash driving', description: 'Speeding' },
      });
      await guard.canActivate(ctx(CorporateSupportTicketController, 'createTicket', own));
      const created = await controller.createTicket(own.body, own);
      expect(created).toEqual(expect.objectContaining({ tenantId: T1.id, employeeId: 'emp-2', status: 'OPEN', slaMinutes: 60 }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CORPORATE_SUPPORT_TICKET_CREATED', userId: 'corp-1' }));
    });

    it('tenant isolation on list and get: corporate roles see only their tenant, ADMIN sees all, employees only their own ticket', async () => {
      const t1a = await seed('emp-1', T1.id);
      const t1b = await seed('emp-2', T1.id);
      const t2 = await seed('emp-9', T2.id);

      const listReq = req(CORP_ADMIN_T1, { query: {} });
      await guard.canActivate(ctx(CorporateSupportTicketController, 'listTickets', listReq));
      const corpList = await controller.listTickets(listReq, listReq.query.tenantId);
      expect(corpList.map((t) => t.id).sort()).toEqual([t1a.id, t1b.id].sort());

      const crossList = req(CORP_ADMIN_T1, { query: { tenantId: T2.id } });
      await expect(guard.canActivate(ctx(CorporateSupportTicketController, 'listTickets', crossList))).rejects.toThrow(ForbiddenException);

      const adminReq = req(ADMIN);
      await guard.canActivate(ctx(CorporateSupportTicketController, 'listTickets', adminReq));
      expect(await controller.listTickets(adminReq)).toHaveLength(3);
      expect((await controller.listTickets(adminReq, T2.id)).map((t) => t.id)).toEqual([t2.id]);

      const get = (user: any, id: string) =>
        guard.canActivate(ctx(CorporateSupportTicketController, 'getTicket', req(user, { params: { id } })));
      await expect(get(EMP_1, t1a.id)).resolves.toBe(true);
      await expect(get(EMP_1, t1b.id)).rejects.toThrow(ForbiddenException); // colleague's ticket
      await expect(get(CORP_ADMIN_T1, t2.id)).rejects.toThrow(ForbiddenException); // other tenant
      await expect(get(ADMIN, 'missing')).rejects.toThrow(NotFoundException);
      expect((await controller.getTicket(t1a.id)).id).toBe(t1a.id);
    });

    it('state machine OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED; skips, reversals and unknown statuses are rejected', async () => {
      const t = await seed('emp-1', T1.id);
      const move = (status: any, notes?: string) => controller.updateStatus(t.id, { status, notes }, req(ADMIN));

      await expect(move(CorporateTicketStatus.RESOLVED)).rejects.toThrow(ConflictException); // skip
      await expect(move('REOPENED')).rejects.toThrow(BadRequestException);

      expect((await move(CorporateTicketStatus.IN_PROGRESS, 'Calling vendor')).status).toBe('IN_PROGRESS');
      expect(db.tickets.get(t.id)).toEqual(expect.objectContaining({ assignedToUserId: 'admin-1', adminNotes: 'Calling vendor' }));
      await expect(move(CorporateTicketStatus.OPEN)).rejects.toThrow(ConflictException); // reversal

      const resolved = await move(CorporateTicketStatus.RESOLVED, 'Driver counselled');
      expect(resolved).toEqual(expect.objectContaining({ status: 'RESOLVED', resolutionNotes: 'Driver counselled', resolvedByUserId: 'admin-1' }));
      expect(db.tickets.get(t.id).resolvedAt).toBeInstanceOf(Date);

      expect((await move(CorporateTicketStatus.CLOSED)).status).toBe('CLOSED');
      await expect(move(CorporateTicketStatus.CLOSED)).rejects.toThrow(ConflictException); // terminal
      const transitions = audit.log.mock.calls
        .filter(([e]: any) => e.action === 'CORPORATE_SUPPORT_TICKET_STATUS_CHANGED')
        .map(([e]: any) => `${e.metadata.fromStatus}->${e.metadata.toStatus}`);
      expect(transitions).toEqual(['OPEN->IN_PROGRESS', 'IN_PROGRESS->RESOLVED', 'RESOLVED->CLOSED']);
    });

    it('concurrent status changes: one wins, the other gets 409 (compare-and-set on status)', async () => {
      const t = await seed('emp-1', T1.id);
      const results = await Promise.allSettled([
        tickets.transitionStatus(t.id, CorporateTicketStatus.IN_PROGRESS, { userId: 'admin-a', role: 'ADMIN' }),
        tickets.transitionStatus(t.id, CorporateTicketStatus.IN_PROGRESS, { userId: 'admin-b', role: 'ADMIN' }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    });

    it('rider /corporate/me/tickets reuses the shared ticket service (same rows the support desk sees)', async () => {
      db.corporateEmployee.findFirst = jest.fn(async () => ({ id: 'emp-1', tenantId: T1.id, locations: [] }));
      const rider = new CorporateRiderService(db, {} as any, notifications, audit, tickets);
      const created = await rider.createSupportTicket('user-emp-1', {
        category: CorporateTicketCategory.CAB_DELAY,
        priority: CorporateTicketPriority.CRITICAL,
        subject: 'No cab',
        description: 'Cab never arrived',
      });
      expect(created).toEqual(expect.objectContaining({ tenantId: T1.id, employeeId: 'emp-1', slaMinutes: 30 }));
      expect((await rider.getRiderSupportTickets('user-emp-1')).map((t) => t.id)).toEqual([created.id]);
      expect((await tickets.listTickets({ tenantId: T1.id })).map((t) => t.id)).toEqual([created.id]);
    });
  });

  // =========================================================================
  describe('4. Deprecated /corporate/trips/me/* aliases delegate to the rider API', () => {
    const scheduleRes: any = {
      employeeId: 'emp-1',
      employee: { id: 'emp-1', code: 'E1', fullName: 'Asha', officeName: 'Hitec Office' },
      startDate: '2026-11-05',
      endDate: '2026-11-12',
      totalRides: 1,
      schedule: [
        {
          date: '2026-11-06',
          shiftTime: '09:00',
          direction: 'LOGIN',
          status: 'ROUTED',
          requestId: 'req-1',
          pickupAddress: 'Home',
          officeAddress: 'Office',
          canCancel: true,
          canReschedule: true,
          pickupPoint: { latitude: 17.45, longitude: 78.38 },
          dropoffPoint: { latitude: 17.44, longitude: 78.38 },
        },
      ],
    };
    const tripsRes: any[] = [
      {
        stopId: 'stop-1',
        routeId: 'abcdef12-3456',
        shiftDate: '2026-11-03',
        shiftTime: '09:00',
        direction: 'LOGIN',
        status: 'BOARDED',
        actualArrivalTime: new Date('2026-11-03T03:00:00Z'),
        actualDepartureTime: new Date('2026-11-03T03:02:00Z'),
        destinationAddress: 'Hitec Office',
        driver: { id: 'drv-1', fullName: 'Ramesh' },
        vehicle: { id: 'veh-1', plateNumber: 'TS09UB4410', model: 'Dzire', category: 'SEDAN' },
      },
    ];
    const nextRes: any = { hasActiveTrip: true, stopId: 'stop-2', routeNumber: 'CR-ABCDEF12', boardingOtp: '4829' };

    let rider: any;
    let exec: CorporateTripExecutionController;

    beforeEach(() => {
      rider = {
        getRiderSchedule: jest.fn(async () => scheduleRes),
        getRiderTrips: jest.fn(async () => tripsRes),
        getRiderNextTrip: jest.fn(async () => nextRes),
      };
      exec = new CorporateTripExecutionController({} as CorporateTripExecutionService, rider as CorporateRiderService);
    });

    it('next-trip alias returns exactly what GET /corporate/me/trips/next returns', async () => {
      const riderController = new CorporateRiderController(rider);
      expect(meta(CorporateRiderController, 'getNextTrip', 'path')).toBe('trips/next');
      const canonical = await riderController.getNextTrip({ user: { id: 'user-emp-1' } });
      const alias = await exec.getMyNextTrip({ user: { id: 'user-emp-1' } });
      expect(alias).toEqual(canonical);
      expect(rider.getRiderNextTrip).toHaveBeenCalledWith('user-emp-1');
    });

    it('schedule and trips aliases are the rider data mapped to the legacy shape', async () => {
      const schedule = await exec.getMySchedule({ user: { id: 'user-emp-1' } });
      expect(rider.getRiderSchedule).toHaveBeenCalledWith('user-emp-1');
      expect(schedule).toEqual(toLegacySchedule(scheduleRes));
      expect(schedule).toEqual({
        employee: { id: 'emp-1', code: 'E1', fullName: 'Asha', office: 'Hitec Office' },
        schedule: [
          {
            requestId: 'req-1',
            scheduledDate: new Date('2026-11-06T00:00:00.000Z'),
            shiftTime: '09:00',
            direction: 'LOGIN',
            status: 'ROUTED',
            pickupPoint: { latitude: 17.45, longitude: 78.38 },
            dropoffPoint: { latitude: 17.44, longitude: 78.38 },
          },
        ],
      });

      const trips = await exec.getMyTrips({ user: { id: 'user-emp-1' } });
      expect(rider.getRiderTrips).toHaveBeenCalledWith('user-emp-1', 20, 0, { stopStatuses: ['BOARDED', 'NO_SHOW', 'CANCELLED'] });
      expect(trips).toEqual(toLegacyTripHistory(tripsRes));
      expect(trips[0]).toEqual(
        expect.objectContaining({ routeNumber: 'CR-ABCDEF12', driverName: 'Ramesh', vehiclePlate: 'TS09UB4410', office: 'Hitec Office' }),
      );
    });

    it('aliases are deprecated in Swagger, the duplicate execution-service methods are gone, and employees pass the guard bound to their tenant', async () => {
      for (const m of ['getMySchedule', 'getMyNextTrip', 'getMyTrips']) {
        expect(meta(CorporateTripExecutionController, m, DECORATORS.API_OPERATION)).toEqual(
          expect.objectContaining({ deprecated: true }),
        );
      }
      for (const m of ['getEmployeeSchedule', 'getEmployeeNextTrip', 'getEmployeeTripHistory']) {
        expect((CorporateTripExecutionService.prototype as any)[m]).toBeUndefined();
      }

      const guard = new CorporateAccessGuard(new Reflector(), db);
      const r = req(EMP_1, { query: {} });
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'getMyTrips', r))).resolves.toBe(true);
      expect(r.query.tenantId).toBe(T1.id);
      const noProfile = req({ id: 'u-x', role: UserRole.EMPLOYEE, corporateTenantId: T1.id });
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'getMyTrips', noProfile))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
