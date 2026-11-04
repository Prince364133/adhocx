import { ExecutionContext, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CorporateTenantController } from '../src/domains/corporate/tenants/corporate-tenant.controller';
import { CorporateRosterController } from '../src/domains/corporate/rosters/corporate-roster.controller';
import { CorporateSchedulingController } from '../src/domains/corporate/scheduling/corporate-scheduling.controller';
import {
  CORPORATE_PERMISSION_KEY,
  CORPORATE_PERMISSIONS,
  CORPORATE_ROLE_PERMISSIONS,
  CorporateRole,
  effectiveCorporateRole,
} from '../src/domains/corporate/tenants/corporate-permissions';
import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { CorporateTenantUsersService } from '../src/domains/corporate/tenants/corporate-tenant-users.service';
import { CorporateOrgStructureService } from '../src/domains/corporate/tenants/corporate-org-structure.service';
import { FakeDb, fakeAudit } from './helpers/ws-f-fake-db';

const T1 = { id: 'tenant-1', code: 'ACME', name: 'Acme', status: 'ACTIVE' };
const OFFICE_A = 'office-a';
const OFFICE_B = 'office-b';

function guardDb() {
  return {
    corporateTenant: { findUnique: jest.fn(async ({ where }: any) => (where.id === T1.id ? T1 : null)) },
    corporateRoster: {
      findUnique: jest.fn(async ({ where }: any) =>
        ({ 'roster-a': { id: 'roster-a', tenantId: T1.id, officeId: OFFICE_A, tenant: T1 }, 'roster-b': { id: 'roster-b', tenantId: T1.id, officeId: OFFICE_B, tenant: T1 } } as any)[where.id] ?? null,
      ),
    },
  };
}

const ctx = (controller: any, method: string, req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => controller.prototype[method],
    getClass: () => controller,
  }) as unknown as ExecutionContext;

const req = (user: any, init: { params?: any; query?: any; body?: any } = {}) =>
  ({ user, params: {}, query: {}, body: {}, headers: {}, ...init }) as any;

const corpUser = (corporateRole: CorporateRole | null, extra: any = {}) => ({
  id: `u-${corporateRole ?? 'legacy'}`,
  role: corporateRole === CorporateRole.CORP_SUPER_ADMIN ? UserRole.CORPORATE_ADMIN : UserRole.CORPORATE_MANAGER,
  corporateTenantId: T1.id,
  ...(corporateRole ? { corporateRole } : {}),
  ...extra,
});

describe('WS-F corporate roles, permission matrix and office scope', () => {
  let guard: CorporateAccessGuard;
  beforeEach(() => {
    guard = new CorporateAccessGuard(new Reflector(), guardDb() as any);
  });

  const can = async (user: any, controller: any, method: string, init: any = { params: { id: T1.id } }) => {
    try {
      await guard.canActivate(ctx(controller, method, req(user, init)));
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) return false;
      throw e;
    }
  };

  // Each role: one allowed and one denied endpoint, through the real guard + real controller metadata.
  const MATRIX: Array<[CorporateRole, string, string]> = [
    [CorporateRole.CORP_SUPER_ADMIN, 'inviteUser', '(none)'],
    [CorporateRole.HR, 'updateEmployee', 'createPolicyVersion'],
    [CorporateRole.TRANSPORT, 'createOffice', 'inviteUser'],
    [CorporateRole.FINANCE, 'listCostCenters', 'updateEmployee'],
    [CorporateRole.SAFETY, 'listEmployees', 'createDepartment'],
    [CorporateRole.READ_ONLY, 'listEmployees', 'updateEmployee'],
  ];

  it.each(MATRIX)('%s: allowed %s, denied %s (tenant controller)', async (role, allowed, denied) => {
    expect(await can(corpUser(role), CorporateTenantController, allowed)).toBe(true);
    if (denied !== '(none)') expect(await can(corpUser(role), CorporateTenantController, denied)).toBe(false);
  });

  it('roster lifecycle: HR may approve but not publish; TRANSPORT may publish; FINANCE and READ_ONLY cannot upload', async () => {
    const roster = { params: { id: 'roster-a' } };
    expect(await can(corpUser(CorporateRole.HR), CorporateRosterController, 'approveRoster', roster)).toBe(true);
    expect(await can(corpUser(CorporateRole.HR), CorporateRosterController, 'publishRoster', roster)).toBe(false);
    expect(await can(corpUser(CorporateRole.TRANSPORT), CorporateRosterController, 'publishRoster', roster)).toBe(true);
    expect(await can(corpUser(CorporateRole.FINANCE), CorporateRosterController, 'uploadRoster', {})).toBe(false);
    expect(await can(corpUser(CorporateRole.READ_ONLY), CorporateRosterController, 'uploadRoster', {})).toBe(false);
    expect(await can(corpUser(CorporateRole.READ_ONLY), CorporateRosterController, 'listRosters', {})).toBe(true);
  });

  it('READ_ONLY has no mutation permission and FINANCE has invoices but no employee PII edit', () => {
    const ro = CORPORATE_ROLE_PERMISSIONS[CorporateRole.READ_ONLY];
    expect([...ro].every((p) => p.endsWith(':read'))).toBe(true);
    expect(ro.size).toBe(CORPORATE_PERMISSIONS.filter((p) => p.endsWith(':read')).length);
    const fin = CORPORATE_ROLE_PERMISSIONS[CorporateRole.FINANCE];
    expect(fin.has('invoices:read')).toBe(true);
    expect(fin.has('employees:write')).toBe(false);
    expect(fin.has('employees:read')).toBe(false);
    expect(CORPORATE_ROLE_PERMISSIONS[CorporateRole.CORP_SUPER_ADMIN].size).toBe(CORPORATE_PERMISSIONS.length);
  });

  it('legacy roles map: CORPORATE_ADMIN -> CORP_SUPER_ADMIN, CORPORATE_MANAGER -> TRANSPORT; unknown role fails closed', async () => {
    expect(effectiveCorporateRole({ role: UserRole.CORPORATE_ADMIN })).toBe(CorporateRole.CORP_SUPER_ADMIN);
    expect(effectiveCorporateRole({ role: UserRole.CORPORATE_MANAGER })).toBe(CorporateRole.TRANSPORT);
    expect(effectiveCorporateRole({ role: UserRole.CORPORATE_MANAGER, corporateRole: 'ROOT' })).toBe(CorporateRole.READ_ONLY);
    expect(effectiveCorporateRole({ role: UserRole.EMPLOYEE })).toBeNull();

    const legacyManager = { id: 'm', role: UserRole.CORPORATE_MANAGER, corporateTenantId: T1.id };
    expect(await can(legacyManager, CorporateRosterController, 'publishRoster', { params: { id: 'roster-a' } })).toBe(true);
    expect(await can(legacyManager, CorporateTenantController, 'inviteUser')).toBe(false);
    const legacyAdmin = { id: 'a', role: UserRole.CORPORATE_ADMIN, corporateTenantId: T1.id };
    expect(await can(legacyAdmin, CorporateTenantController, 'inviteUser')).toBe(true);
  });

  it('platform ADMIN bypasses the corporate permission matrix', async () => {
    expect(await can({ id: 'x', role: UserRole.ADMIN }, CorporateTenantController, 'createPolicyVersion')).toBe(true);
  });

  it('office scope: out-of-scope officeId in query/params and out-of-scope roster resources are 403', async () => {
    const scoped = corpUser(CorporateRole.TRANSPORT, { corporateOfficeIds: [OFFICE_A] });
    expect(await can(scoped, CorporateTenantController, 'listEmployees', { params: { id: T1.id }, query: { officeId: OFFICE_A } })).toBe(true);
    expect(await can(scoped, CorporateTenantController, 'listEmployees', { params: { id: T1.id }, query: { officeId: OFFICE_B } })).toBe(false);
    expect(await can(scoped, CorporateTenantController, 'getOfficeById', { params: { id: T1.id, officeId: OFFICE_B } })).toBe(false);
    expect(await can(scoped, CorporateRosterController, 'getRosterById', { params: { id: 'roster-a' } })).toBe(true);
    expect(await can(scoped, CorporateRosterController, 'publishRoster', { params: { id: 'roster-b' } })).toBe(false);

    const r = req(scoped, { params: { id: T1.id } });
    await guard.canActivate(ctx(CorporateTenantController, 'listEmployees', r));
    expect(r.corporateOfficeScope).toEqual([OFFICE_A]);
    expect(r.corporateRole).toBe(CorporateRole.TRANSPORT);
  });

  it('office scope filters employee and roster lists and hides out-of-scope employees (404)', async () => {
    const db = new FakeDb();
    db.corporateTenant.rows.set(T1.id, { ...T1 });
    for (const [id, officeId] of [['e1', OFFICE_A], ['e2', OFFICE_A], ['e3', OFFICE_B]]) {
      db.corporateEmployee.rows.set(id, { id, tenantId: T1.id, officeId, fullName: id, isActive: true });
    }
    const svc = new CorporateTenantService(db as any, fakeAudit() as any, {} as any);
    const scoped = await svc.listEmployees(T1.id, { officeScope: [OFFICE_A] });
    expect(scoped.items.map((e: any) => e.id).sort()).toEqual(['e1', 'e2']);
    expect((await svc.listEmployees(T1.id, {})).items).toHaveLength(3);
    await expect(svc.getEmployeeById(T1.id, 'e3', [OFFICE_A])).rejects.toThrow(NotFoundException);
    await expect(svc.listEmployees(T1.id, { officeId: OFFICE_B, officeScope: [OFFICE_A] })).rejects.toThrow(ForbiddenException);

    db.corporateRoster.rows.set('r-a', { id: 'r-a', tenantId: T1.id, officeId: OFFICE_A, rosterDate: new Date(), shiftTime: '08:00' });
    db.corporateRoster.rows.set('r-b', { id: 'r-b', tenantId: T1.id, officeId: OFFICE_B, rosterDate: new Date(), shiftTime: '08:00' });
    const controller = new CorporateRosterController({} as any, {} as any, db as any, {} as any);
    const rosters = await controller.listRosters(T1.id, undefined, undefined, { corporateOfficeScope: [OFFICE_A] });
    expect(rosters.map((r: any) => r.id)).toEqual(['r-a']);
  });

  it('every non-ADMIN-only handler of the tenants, rosters and scheduling controllers declares @CorporatePermission', () => {
    const missing: string[] = [];
    for (const c of [CorporateTenantController, CorporateRosterController, CorporateSchedulingController]) {
      for (const name of Object.getOwnPropertyNames(c.prototype)) {
        const fn = (c.prototype as any)[name];
        if (name === 'constructor' || typeof fn !== 'function' || Reflect.getMetadata(METHOD_METADATA, fn) === undefined) continue;
        const roles: string[] = Reflect.getMetadata(ROLES_KEY, fn) ?? [];
        if (roles.every((r) => r === UserRole.ADMIN)) continue;
        if (!Reflect.getMetadata(CORPORATE_PERMISSION_KEY, fn)) missing.push(`${c.name}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('WS-F corporate user invite + org structure', () => {
  let db: FakeDb;
  let users: CorporateTenantUsersService;
  const superAdmin = { id: 'u-sa', role: UserRole.CORPORATE_ADMIN, corporateRole: 'CORP_SUPER_ADMIN' };

  beforeEach(() => {
    db = new FakeDb();
    db.corporateTenant.rows.set(T1.id, { ...T1 });
    db.corporateOffice.rows.set(OFFICE_A, { id: OFFICE_A, tenantId: T1.id, code: 'A' });
    db.corporateOffice.rows.set(OFFICE_B, { id: OFFICE_B, tenantId: T1.id, code: 'B' });
    users = new CorporateTenantUsersService(db as any, fakeAudit() as any);
  });

  it('invites a FINANCE user scoped to one office; the user row maps to CORPORATE_MANAGER and is tenant-linked', async () => {
    const u = await users.inviteUser(T1.id, { fullName: 'Priya Finance', email: 'Priya@Acme.com', corporateRole: 'finance', officeIds: [OFFICE_A] }, superAdmin);
    expect(u).toMatchObject({ role: UserRole.CORPORATE_MANAGER, corporateRole: 'FINANCE', corporateTenantId: T1.id, corporateOfficeIds: [OFFICE_A], email: 'priya@acme.com' });
    expect((u as any).passwordHash).toBeUndefined();
    const sa = await users.inviteUser(T1.id, { fullName: 'Second Admin', phone: '98765 43210', corporateRole: 'CORP_SUPER_ADMIN' }, { id: 'p', role: UserRole.ADMIN });
    expect(sa.role).toBe(UserRole.CORPORATE_ADMIN);
    expect(sa.corporateOfficeIds).toEqual([]);
  });

  it('rejects an invalid role, foreign offices, a duplicate email, and a scoped admin granting "all offices"', async () => {
    await expect(users.inviteUser(T1.id, { fullName: 'X Y', email: 'x@a.com', corporateRole: 'GOD' }, superAdmin)).rejects.toThrow(BadRequestException);
    await expect(users.inviteUser(T1.id, { fullName: 'X Y', email: 'x@a.com', corporateRole: 'HR', officeIds: ['office-zzz'] }, superAdmin)).rejects.toThrow(BadRequestException);
    await users.inviteUser(T1.id, { fullName: 'X Y', email: 'x@a.com', corporateRole: 'HR' }, superAdmin);
    await expect(users.inviteUser(T1.id, { fullName: 'X Z', email: 'X@a.com', corporateRole: 'HR' }, superAdmin)).rejects.toThrow(ConflictException);
    const scopedAdmin = { ...superAdmin, corporateOfficeIds: [OFFICE_A] };
    await expect(users.inviteUser(T1.id, { fullName: 'All Offices', email: 'all@a.com', corporateRole: 'HR' }, scopedAdmin)).rejects.toThrow(ForbiddenException);
    await expect(users.inviteUser(T1.id, { fullName: 'Office B', email: 'b@a.com', corporateRole: 'HR', officeIds: [OFFICE_B] }, scopedAdmin)).rejects.toThrow(ForbiddenException);
    await expect(users.inviteUser(T1.id, { fullName: 'Office A', email: 'oa@a.com', corporateRole: 'HR', officeIds: [OFFICE_A] }, scopedAdmin)).resolves.toBeDefined();
  });

  it('departments: code unique per tenant, employees with matching text are linked through the FK', async () => {
    db.corporateEmployee.rows.set('e1', { id: 'e1', tenantId: T1.id, department: 'engineering', departmentId: null });
    db.corporateEmployee.rows.set('e2', { id: 'e2', tenantId: T1.id, department: 'Sales', departmentId: null });
    const org = new CorporateOrgStructureService(db as any, fakeAudit() as any);
    const dept = await org.create('department', T1.id, { code: 'eng', name: 'Engineering' });
    expect(dept.code).toBe('ENG');
    expect(dept.linkedEmployees).toBe(1);
    expect(db.corporateEmployee.rows.get('e1')!.departmentId).toBe(dept.id);
    expect(db.corporateEmployee.rows.get('e2')!.departmentId).toBeNull();
    await expect(org.create('department', T1.id, { code: 'ENG', name: 'Dup' })).rejects.toThrow(ConflictException);
    // Same code in a cost-center table and in another tenant is fine.
    await expect(org.create('costCenter', T1.id, { code: 'ENG', name: 'Eng CC' })).resolves.toBeDefined();
  });
});
