import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CORPORATE_RESOURCE_KEY } from '../src/common/decorators/corporate-resource.decorator';
import { CorporateTenantController } from '../src/domains/corporate/tenants/corporate-tenant.controller';
import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { CORPORATE_PERMISSION_KEY, CorporateRole } from '../src/domains/corporate/tenants/corporate-permissions';

/**
 * GET /corporate/tenants/:id/employees/:employeeId/requests — commute history for the corporate
 * portal's employee detail screen. Read-only, tenant + office scoped, employees:read.
 */
const T1 = { id: 'tenant-1', code: 'ACME', name: 'Acme', status: 'ACTIVE' };
const T2 = { id: 'tenant-2', code: 'OTHR', name: 'Other', status: 'ACTIVE' };
const OFFICE_A = 'office-a';
const OFFICE_B = 'office-b';

const EMPLOYEES: Record<string, any> = {
  'emp-a': { id: 'emp-a', tenantId: T1.id, officeId: OFFICE_A },
  'emp-b': { id: 'emp-b', tenantId: T1.id, officeId: OFFICE_B },
  'emp-x': { id: 'emp-x', tenantId: T2.id, officeId: 'office-x' },
};

function makeDb() {
  return {
    corporateTenant: {
      findUnique: jest.fn(async ({ where }: any) => ({ [T1.id]: T1, [T2.id]: T2 } as any)[where.id] ?? null),
    },
    corporateEmployee: {
      findFirst: jest.fn(async ({ where }: any) => {
        const e = EMPLOYEES[where.id];
        if (!e || e.tenantId !== where.tenantId) return null;
        if (where.officeId?.in && !where.officeId.in.includes(e.officeId)) return null;
        return { ...e, office: null, locations: [], _count: { transportRequests: 0 } };
      }),
    },
    corporateTransportRequest: {
      findMany: jest.fn(async (_args: any): Promise<any[]> => [
        {
          id: 'req-1',
          rosterId: 'roster-1',
          scheduledDate: new Date('2026-11-04T00:00:00.000Z'),
          shiftTime: '08:00',
          direction: 'LOGIN',
          status: 'COMPLETED',
          routeStop: { id: 'stop-1', routeId: 'route-1', stopSequence: 1, status: 'BOARDED' },
        },
      ]),
    },
  };
}

const ctx = (method: string, req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (CorporateTenantController.prototype as any)[method],
    getClass: () => CorporateTenantController,
  }) as unknown as ExecutionContext;

const corpUser = (corporateRole: CorporateRole, extra: any = {}) => ({
  id: `u-${corporateRole}`,
  role: corporateRole === CorporateRole.CORP_SUPER_ADMIN ? UserRole.CORPORATE_ADMIN : UserRole.CORPORATE_MANAGER,
  corporateTenantId: T1.id,
  corporateRole,
  ...extra,
});

describe('Corporate portal: employee commute history endpoint', () => {
  let db: ReturnType<typeof makeDb>;
  let service: CorporateTenantService;

  beforeEach(() => {
    db = makeDb();
    service = new CorporateTenantService(db as any, { log: jest.fn() } as any, {} as any);
  });

  it('is declared tenant-scoped, read-only (GET) and requires employees:read', () => {
    const fn = (CorporateTenantController.prototype as any).listEmployeeRequests;
    expect(Reflect.getMetadata(ROLES_KEY, fn)).toEqual([
      UserRole.ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_MANAGER,
    ]);
    expect(Reflect.getMetadata(CORPORATE_RESOURCE_KEY, fn)).toEqual(expect.objectContaining({ kind: 'tenant', param: 'id' }));
    expect(Reflect.getMetadata(CORPORATE_PERMISSION_KEY, fn)).toBe('employees:read');
  });

  it('guard: own tenant allowed for HR / SAFETY / READ_ONLY; FINANCE (no employee PII) and cross-tenant are 403', async () => {
    const guard = new CorporateAccessGuard(new Reflector(), db as any);
    const can = async (user: any, tenantId = T1.id) => {
      try {
        await guard.canActivate(
          ctx('listEmployeeRequests', { user, params: { id: tenantId, employeeId: 'emp-a' }, query: {}, body: {}, headers: {} }),
        );
        return true;
      } catch (e) {
        if (e instanceof ForbiddenException) return false;
        throw e;
      }
    };
    expect(await can(corpUser(CorporateRole.HR))).toBe(true);
    expect(await can(corpUser(CorporateRole.SAFETY))).toBe(true);
    expect(await can(corpUser(CorporateRole.READ_ONLY))).toBe(true);
    expect(await can(corpUser(CorporateRole.FINANCE))).toBe(false);
    expect(await can(corpUser(CorporateRole.HR), T2.id)).toBe(false);
  });

  it('returns the employee requests newest first with stop timings and no OTP / pricing fields', async () => {
    const out = await service.listEmployeeRequests(T1.id, 'emp-a', null, {});
    expect(out.employeeId).toBe('emp-a');
    expect(out.items).toHaveLength(1);

    const args: any = db.corporateTransportRequest.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({ tenantId: T1.id, employeeId: 'emp-a' });
    expect(args.orderBy[0]).toEqual({ scheduledDate: 'desc' });
    expect(args.take).toBe(30);
    const selected = JSON.stringify(args.select);
    expect(selected).not.toMatch(/boardingOtp|Paise|payout|fare/i);
    expect(args.select.routeStop.select).toEqual(
      expect.objectContaining({ plannedEta: true, actualArrivalTime: true, status: true, noShowReason: true }),
    );
  });

  it('clamps limit to 1..100', async () => {
    await service.listEmployeeRequests(T1.id, 'emp-a', null, { limit: 5000 });
    expect(db.corporateTransportRequest.findMany.mock.calls[0]![0].take).toBe(100);
    await service.listEmployeeRequests(T1.id, 'emp-a', null, { limit: 0 });
    expect(db.corporateTransportRequest.findMany.mock.calls[1]![0].take).toBe(1);
  });

  it('employee of another tenant or outside the office scope is 404 and nothing is read', async () => {
    await expect(service.listEmployeeRequests(T1.id, 'emp-x', null)).rejects.toThrow(NotFoundException);
    await expect(service.listEmployeeRequests(T1.id, 'emp-b', [OFFICE_A])).rejects.toThrow(NotFoundException);
    expect(db.corporateTransportRequest.findMany).not.toHaveBeenCalled();

    await expect(service.listEmployeeRequests(T1.id, 'emp-b', [OFFICE_B])).resolves.toEqual(
      expect.objectContaining({ employeeId: 'emp-b' }),
    );
  });
});
