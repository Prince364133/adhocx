import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard, resolveScopedTenantId } from '../src/common/guards/corporate-access.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import {
  CORPORATE_DRIVER_SELF_KEY,
  CORPORATE_RESOURCE_KEY,
  CORPORATE_TENANT_SCOPED_KEY,
} from '../src/common/decorators/corporate-resource.decorator';
import { CorporateTenantController } from '../src/domains/corporate/tenants/corporate-tenant.controller';
import { CorporateBillingController } from '../src/domains/corporate/billing/corporate-billing.controller';
import { CorporateDispatchController } from '../src/domains/corporate/dispatch/corporate-dispatch.controller';
import { CorporateTripExecutionController } from '../src/domains/corporate/execution/corporate-trip-execution.controller';
import { CorporateRosterController } from '../src/domains/corporate/rosters/corporate-roster.controller';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { CorporateSafetyController } from '../src/domains/corporate/safety/corporate-safety.controller';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const T1 = { id: 'tenant-1', code: 'ACME', name: 'Acme', status: 'ACTIVE' };
const T2 = { id: 'tenant-2', code: 'GLOBEX', name: 'Globex', status: 'ACTIVE' };

const admin = { id: 'u-admin', role: UserRole.ADMIN };
const corpAdmin1 = { id: 'u-ca1', role: UserRole.CORPORATE_ADMIN, corporateTenantId: T1.id };
const manager1 = { id: 'u-cm1', role: UserRole.CORPORATE_MANAGER, corporateTenantId: T1.id };
const driverA = { id: 'u-drv-a', role: UserRole.DRIVER };
const employeeE1 = {
  id: 'u-emp-1',
  role: UserRole.EMPLOYEE,
  corporateTenantId: T1.id,
  corporateEmployeeId: 'emp-1',
};

/** route-1: tenant 1, assigned to driver-a (owned by u-drv-a). route-2: tenant 2, driver-b. */
const ROUTES: Record<string, any> = {
  'route-1': { id: 'route-1', tenantId: T1.id, driverId: 'driver-a', tenant: T1, driver: { userId: 'u-drv-a' } },
  'route-2': { id: 'route-2', tenantId: T2.id, driverId: 'driver-b', tenant: T2, driver: { userId: 'u-drv-b' } },
};
const STOPS: Record<string, any> = {
  'stop-1': { id: 'stop-1', routeId: 'route-1', employeeId: 'emp-1', route: ROUTES['route-1'] },
  'stop-2': { id: 'stop-2', routeId: 'route-1', employeeId: 'emp-2', route: ROUTES['route-1'] },
};
const REQUESTS: Record<string, any> = {
  'req-1': { id: 'req-1', tenantId: T1.id, employeeId: 'emp-1', tenant: T1 },
  'req-2': { id: 'req-2', tenantId: T1.id, employeeId: 'emp-2', tenant: T1 },
  'req-9': { id: 'req-9', tenantId: T2.id, employeeId: 'emp-9', tenant: T2 },
};
const INVOICES: Record<string, any> = {
  'inv-1': { id: 'inv-1', tenantId: T1.id, tenant: T1 },
  'inv-2': { id: 'inv-2', tenantId: T2.id, tenant: T2 },
};
const DRIVERS: Record<string, any> = {
  'driver-a': { id: 'driver-a', userId: 'u-drv-a' },
  'driver-b': { id: 'driver-b', userId: 'u-drv-b' },
};
const TENANTS: Record<string, any> = { [T1.id]: T1, [T2.id]: T2 };

function makeDb() {
  const byId = (table: Record<string, any>) => jest.fn(async ({ where }: any) => table[where.id] ?? null);
  return {
    corporateRoute: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const r = ROUTES[where.id];
        if (!r) return null;
        // Emulate the employee "am I on this route" sub-select.
        if (select?.stops) {
          const empId = select.stops.where.employeeId;
          return { ...r, stops: Object.values(STOPS).filter((s: any) => s.routeId === r.id && s.employeeId === empId) };
        }
        return r;
      }),
    },
    corporateRouteStop: { findUnique: byId(STOPS) },
    corporateTransportRequest: { findUnique: byId(REQUESTS) },
    corporateInvoice: { findUnique: byId(INVOICES) },
    corporateRoster: { findUnique: jest.fn(async () => null) },
    corporateOffice: { findUnique: jest.fn(async () => null) },
    corporateEmployee: { findUnique: jest.fn(async () => null) },
    corporateSosAlert: { findUnique: jest.fn(async () => null) },
    corporateTenant: { findUnique: byId(TENANTS) },
    driver: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.id ? DRIVERS[where.id] ?? null : Object.values(DRIVERS).find((d: any) => d.userId === where.userId) ?? null,
      ),
    },
  };
}

function ctx(controller: any, method: string, req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => controller.prototype[method],
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

function req(user: any, init: { params?: any; query?: any; body?: any; headers?: any } = {}) {
  return { user, params: {}, query: {}, body: {}, headers: {}, ...init } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Corporate access control', () => {
  let db: ReturnType<typeof makeDb>;
  let reflector: Reflector;
  let guard: CorporateAccessGuard;

  beforeEach(() => {
    db = makeDb();
    reflector = new Reflector();
    guard = new CorporateAccessGuard(reflector, db as any);
  });

  describe('authentication & role gate (full guard chain)', () => {
    const SECRET = 'test-access-secret';
    const jwt = new JwtService({ secret: SECRET });
    const config: any = { get: () => SECRET };

    async function runChain(controller: any, method: string, request: any) {
      const c = ctx(controller, method, request);
      await new JwtAuthGuard(jwt, config).canActivate(c);
      new RolesGuard(reflector).canActivate(c);
      return guard.canActivate(c);
    }

    it('rejects a missing or forged bearer token with 401 before touching the database', async () => {
      const r = req(undefined, { params: { id: 'inv-1' } });
      await expect(runChain(CorporateBillingController, 'getInvoiceById', r)).rejects.toThrow(UnauthorizedException);
      expect(db.corporateInvoice.findUnique).not.toHaveBeenCalled();

      const forged = await new JwtService({ secret: 'other' }).signAsync({ id: 'x', role: 'ADMIN' });
      const forgedReq = req(undefined, { headers: { authorization: `Bearer ${forged}` }, params: { id: 'inv-1' } });
      await expect(runChain(CorporateBillingController, 'getInvoiceById', forgedReq)).rejects.toThrow(UnauthorizedException);
    });

    it('accepts a valid corporate-admin token end-to-end and binds the tenant from the corporateTenantId claim', async () => {
      const token = await jwt.signAsync({ id: corpAdmin1.id, role: corpAdmin1.role, corporateTenantId: T1.id });
      const r = req(undefined, { headers: { authorization: `Bearer ${token}` }, params: { id: 'inv-1' } });
      await expect(runChain(CorporateBillingController, 'getInvoiceById', r)).resolves.toBe(true);
      expect(r.corporateTenant).toEqual(T1);
    });

    it('denies roles outside the endpoint allow-list with 403 (employee -> force start-now, corporate admin -> tenant onboarding)', async () => {
      const empToken = await jwt.signAsync({ ...employeeE1 });
      await expect(
        runChain(CorporateDispatchController, 'forceStartDispatch',
          req(undefined, { headers: { authorization: `Bearer ${empToken}` }, params: { id: 'route-1' } })),
      ).rejects.toThrow(ForbiddenException);

      const caToken = await jwt.signAsync({ ...corpAdmin1 });
      await expect(
        runChain(CorporateTenantController, 'createTenant',
          req(undefined, { headers: { authorization: `Bearer ${caToken}` }, body: { code: 'NEW' } })),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        runChain(CorporateTripExecutionController, 'adminRescheduleOrCancel',
          req(undefined, { headers: { authorization: `Bearer ${caToken}` }, params: { id: 'req-1' } })),
      ).rejects.toThrow(ForbiddenException);
    });

    // Drivers carry no corporate tenant claim; these handlers self-scope by the caller's Driver row.
    const DRIVER_SELF_HANDLERS: Array<[any, string]> = [
      [CorporateDispatchController, 'getMyActiveOffer'],
      [CorporateDispatchController, 'getDriverOffers'],
      [CorporateDispatchController, 'getDriverDuties'],
      [CorporateTripExecutionController, 'getDriverActiveRoute'],
      [CorporateTripExecutionController, 'getDriverRoutes'],
    ];

    it.each(DRIVER_SELF_HANDLERS)('lets a real DRIVER token through the full chain on %p.%s', async (controller, method) => {
      const token = await jwt.signAsync({ ...driverA });
      const r = req(undefined, { headers: { authorization: `Bearer ${token}` } });
      await expect(runChain(controller, method, r)).resolves.toBe(true);
    });

    it.each(DRIVER_SELF_HANDLERS)('denies a DRIVER-role token with no linked driver profile on %p.%s', async (controller, method) => {
      const token = await jwt.signAsync({ id: 'u-drv-ghost', role: UserRole.DRIVER });
      const r = req(undefined, { headers: { authorization: `Bearer ${token}` } });
      await expect(runChain(controller, method, r)).rejects.toThrow(ForbiddenException);
    });

    it.each(DRIVER_SELF_HANDLERS)('still denies EMPLOYEE and CORPORATE_ADMIN on driver handler %p.%s', async (controller, method) => {
      for (const u of [employeeE1, corpAdmin1]) {
        const token = await jwt.signAsync({ ...u });
        const r = req(undefined, { headers: { authorization: `Bearer ${token}` } });
        await expect(runChain(controller, method, r)).rejects.toThrow(ForbiddenException);
      }
    });

    it('access guard itself rejects a request with no authenticated user (401)', async () => {
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getInvoiceById', req(undefined, { params: { id: 'inv-1' } }))))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ADMIN', () => {
    it('bypasses tenant isolation and binds the resource tenant', async () => {
      const r = req(admin, { params: { id: 'inv-2' } });
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getInvoiceById', r))).resolves.toBe(true);
      expect(r.corporateTenant).toEqual(T2);
    });

    it('may target any tenant on tenant-scoped lists without extra DB reads', async () => {
      const r = req(admin, { query: { tenantId: T2.id } });
      await expect(guard.canActivate(ctx(CorporateRoutingController, 'listRoutes', r))).resolves.toBe(true);
      expect(r.query.tenantId).toBe(T2.id);
      expect(db.corporateTenant.findUnique).not.toHaveBeenCalled();
    });

    it('still gets 404 for a missing resource', async () => {
      await expect(guard.canActivate(ctx(CorporateBillingController, 'downloadInvoicePdf', req(admin, { params: { id: 'nope' } }))))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('CORPORATE_ADMIN / CORPORATE_MANAGER', () => {
    it('may read their own tenant invoice with a single minimal select', async () => {
      const r = req(manager1, { params: { id: 'inv-1' } });
      await expect(guard.canActivate(ctx(CorporateBillingController, 'downloadInvoicePdf', r))).resolves.toBe(true);
      expect(db.corporateInvoice.findUnique).toHaveBeenCalledTimes(1);
      expect(db.corporateInvoice.findUnique.mock.calls[0][0]).toEqual(
        expect.objectContaining({ where: { id: 'inv-1' }, select: expect.objectContaining({ tenantId: true }) }),
      );
    });

    it("gets 403 on another tenant's invoice, route and tenant profile", async () => {
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getInvoiceById', req(corpAdmin1, { params: { id: 'inv-2' } }))))
        .rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx(CorporateRoutingController, 'getRouteById', req(corpAdmin1, { params: { id: 'route-2' } }))))
        .rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx(CorporateTenantController, 'listEmployees', req(corpAdmin1, { params: { id: T2.id } }))))
        .rejects.toThrow(ForbiddenException);
    });

    it('gets 404 for a missing resource', async () => {
      await expect(guard.canActivate(ctx(CorporateTenantController, 'getTenantById', req(corpAdmin1, { params: { id: 'tenant-x' } }))))
        .rejects.toThrow(NotFoundException);
    });

    it('has tenantId forced to the claim tenant on list endpoints when none is supplied', async () => {
      const r = req(manager1);
      await expect(guard.canActivate(ctx(CorporateBillingController, 'listInvoices', r))).resolves.toBe(true);
      expect(r.query.tenantId).toBe(T1.id);
      expect(r.corporateTenant).toEqual(T1);
    });

    it('rejects a cross-tenant id supplied in the query, body or header with 403 (never trusts it over the claim)', async () => {
      const attempts = [
        { query: { tenantId: T2.id } },
        { body: { tenantId: T2.id, officeId: 'o', shiftDate: '2026-11-10', shiftTime: '08:00', direction: 'LOGIN' } },
        { headers: { 'x-corporate-tenant-id': T2.id } },
      ];
      for (const init of attempts) {
        await expect(guard.canActivate(ctx(CorporateRoutingController, 'optimizeRoutes', req(corpAdmin1, init))))
          .rejects.toThrow(ForbiddenException);
      }
      expect(db.corporateTenant.findUnique).not.toHaveBeenCalled();
    });

    it('accepts a matching body tenantId and keeps it pinned to the claim', async () => {
      const r = req(corpAdmin1, { body: { tenantId: T1.id, officeId: 'o' } });
      await expect(guard.canActivate(ctx(CorporateRoutingController, 'optimizeRoutes', r))).resolves.toBe(true);
      expect(r.body.tenantId).toBe(T1.id);
    });

    it('re-checks multipart tenant ids after body parsing (roster upload)', () => {
      const r: any = { corporateTenantScope: T1.id };
      expect(resolveScopedTenantId(r, undefined, undefined)).toBe(T1.id);
      expect(resolveScopedTenantId(r, T1.id, undefined)).toBe(T1.id);
      expect(() => resolveScopedTenantId(r, T2.id, undefined)).toThrow(ForbiddenException);
      // ADMIN (no scope on request) keeps the explicit tenant.
      expect(resolveScopedTenantId({}, T2.id, T1.id)).toBe(T2.id);
    });

    it('rejects an account with no tenant link, and a suspended tenant', async () => {
      const unlinked = { id: 'u-ca-x', role: UserRole.CORPORATE_ADMIN };
      await expect(guard.canActivate(ctx(CorporateRosterController, 'listRosters', req(unlinked))))
        .rejects.toThrow(ForbiddenException);

      db.corporateTenant.findUnique.mockResolvedValueOnce({ ...T1, status: 'SUSPENDED' });
      await expect(guard.canActivate(ctx(CorporateRosterController, 'listRosters', req(corpAdmin1))))
        .rejects.toThrow(/SUSPENDED/);
    });

    it('may reschedule (cutoff enforced) for their own tenant employees only', async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'rescheduleOrCancel',
        req(corpAdmin1, { params: { id: 'req-2' }, body: { employeeId: 'emp-2', action: 'CANCEL' } })))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'rescheduleOrCancel',
        req(corpAdmin1, { params: { id: 'req-9' }, body: { employeeId: 'emp-9', action: 'CANCEL' } })))).rejects.toThrow(ForbiddenException);
    });

    it('cannot read driver earnings (not a tenant resource)', async () => {
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getDriverEarningsSummary', req(corpAdmin1, { params: { driverId: 'driver-a' } }))))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('DRIVER', () => {
    it('may act on a route assigned to them', async () => {
      const r = req(driverA, { params: { id: 'route-1' }, body: { driverId: 'driver-a' } });
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'startRoute', r))).resolves.toBe(true);
      expect(r.corporateTenant).toEqual(T1);
    });

    it("gets 403 on someone else's route and stop", async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'ingestTelemetry', req(driverA, { params: { id: 'route-2' } }))))
        .rejects.toThrow(ForbiddenException);
      const otherDriver = { id: 'u-drv-b', role: UserRole.DRIVER };
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'verifyOtp',
        req(otherDriver, { params: { id: 'route-1', stopId: 'stop-1' } })))).rejects.toThrow(ForbiddenException);
    });

    it('gets 403 when the body driverId is not the assigned (own) driver', async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'startRoute',
        req(driverA, { params: { id: 'route-1' }, body: { driverId: 'driver-b' } })))).rejects.toThrow(ForbiddenException);
    });

    it('gets 404 for a stop that does not belong to the route in the path', async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'arriveAtStop',
        req(driverA, { params: { id: 'route-2', stopId: 'stop-1' } })))).rejects.toThrow(NotFoundException);
    });

    it('offer accept/reject: body driverId must be their own Driver row (injected when omitted)', async () => {
      const own = req(driverA, { params: { id: 'route-2' }, body: {} });
      await expect(guard.canActivate(ctx(CorporateDispatchController, 'acceptOffer', own))).resolves.toBe(true);
      expect(own.body.driverId).toBe('driver-a');

      await expect(guard.canActivate(ctx(CorporateDispatchController, 'rejectOffer',
        req(driverA, { params: { id: 'route-2' }, body: { driverId: 'driver-b' } })))).rejects.toThrow(ForbiddenException);
    });

    it('may read only their own corporate earnings', async () => {
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getDriverEarningsSummary', req(driverA, { params: { driverId: 'driver-a' } }))))
        .resolves.toBe(true);
      await expect(guard.canActivate(ctx(CorporateBillingController, 'getDriverEarningsSummary', req(driverA, { params: { driverId: 'driver-b' } }))))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('EMPLOYEE', () => {
    it('may reschedule their own request; employeeId is bound from the token', async () => {
      const r = req(employeeE1, { params: { id: 'req-1' }, body: { action: 'CANCEL' } });
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'rescheduleOrCancel', r))).resolves.toBe(true);
      expect(r.body.employeeId).toBe('emp-1');
    });

    it("gets 403 on someone else's request, or when spoofing employeeId in the body", async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'rescheduleOrCancel',
        req(employeeE1, { params: { id: 'req-2' }, body: { action: 'CANCEL' } })))).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'rescheduleOrCancel',
        req(employeeE1, { params: { id: 'req-1' }, body: { action: 'CANCEL', employeeId: 'emp-2' } })))).rejects.toThrow(ForbiddenException);
    });

    it("may fetch only their own boarding QR", async () => {
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'getBoardingQr',
        req(employeeE1, { params: { id: 'route-1', stopId: 'stop-1' } })))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(CorporateTripExecutionController, 'getBoardingQr',
        req(employeeE1, { params: { id: 'route-1', stopId: 'stop-2' } })))).rejects.toThrow(ForbiddenException);
    });

    it('may trigger SOS only on a route they are on; missing routeId is 400', async () => {
      await expect(guard.canActivate(ctx(CorporateSafetyController, 'triggerSos',
        req(employeeE1, { body: { routeId: 'route-1', latitude: 1, longitude: 2 } })))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(CorporateSafetyController, 'triggerSos',
        req(employeeE1, { body: { routeId: 'route-2', latitude: 1, longitude: 2 } })))).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx(CorporateSafetyController, 'triggerSos',
        req(employeeE1, { body: { latitude: 1, longitude: 2 } })))).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // Metadata sweep: no corporate endpoint may ship without guards + @Roles.
  // -------------------------------------------------------------------------
  describe('metadata sweep over every corporate controller', () => {
    const corporateDir = path.join(__dirname, '../src/domains/corporate');

    function findControllerFiles(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return findControllerFiles(full);
        return e.name.endsWith('.controller.ts') ? [full] : [];
      });
    }

    function discoverControllers(): any[] {
      return findControllerFiles(corporateDir).flatMap((file) =>
         
        Object.values(require(file)).filter(
          (exp: any) => typeof exp === 'function' && Reflect.getMetadata(PATH_METADATA, exp) !== undefined,
        ),
      );
    }

    function routeHandlers(controller: any): string[] {
      return Object.getOwnPropertyNames(controller.prototype).filter(
        (name) =>
          name !== 'constructor' &&
          typeof controller.prototype[name] === 'function' &&
          Reflect.getMetadata(METHOD_METADATA, controller.prototype[name]) !== undefined,
      );
    }

    it('discovers every corporate controller on disk', () => {
      const discovered = discoverControllers();
      expect(discovered).toEqual(
        expect.arrayContaining([
          CorporateTenantController,
          CorporateBillingController,
          CorporateDispatchController,
          CorporateTripExecutionController,
          CorporateRosterController,
          CorporateRoutingController,
          CorporateSafetyController,
        ]),
      );
      expect(discovered.flatMap(routeHandlers).length).toBeGreaterThanOrEqual(45);
    });

    it('every route handler has JwtAuthGuard + RolesGuard + CorporateAccessGuard, @Roles, and resource/tenant scoping for non-admin roles', () => {
      const problems: string[] = [];
      for (const controller of discoverControllers()) {
        if (controller.name === 'CorporateRiderController') continue; // Rider self-service API has dedicated test suite: corporate-ws-c-rider.spec.ts
        // Payout provider callback: HMAC-signed, deliberately no JWT (the caller is the provider). Its
        // guard-free shape and 401-on-bad-signature are asserted in corporate-wire-billing.spec.ts.
        if (controller.name === 'CorporatePayoutWebhookController') continue;
        const classGuards: any[] = Reflect.getMetadata(GUARDS_METADATA, controller) || [];
        for (const handler of routeHandlers(controller)) {
          const fn = controller.prototype[handler];
          const where = `${controller.name}.${handler}`;
          const guards = [...classGuards, ...(Reflect.getMetadata(GUARDS_METADATA, fn) || [])];
          for (const g of [JwtAuthGuard, RolesGuard, CorporateAccessGuard]) {
            if (!guards.includes(g)) problems.push(`${where}: missing ${g.name}`);
          }
          const roles: string[] | undefined = Reflect.getMetadata(ROLES_KEY, fn);
          if (!roles || roles.length === 0) {
            problems.push(`${where}: missing @Roles`);
            continue;
          }
          const nonAdmin = roles.some((r) => r !== UserRole.ADMIN);
          // Driver self-scope is only acceptable when no corporate/employee role can reach the handler.
          const driverSelf = Reflect.getMetadata(CORPORATE_DRIVER_SELF_KEY, fn) === true;
          if (driverSelf && roles.some((r) => r !== UserRole.ADMIN && r !== UserRole.DRIVER)) {
            problems.push(`${where}: @CorporateDriverSelfScoped on a handler open to non-driver roles`);
          }
          const scoped =
            Reflect.getMetadata(CORPORATE_RESOURCE_KEY, fn) !== undefined ||
            Reflect.getMetadata(CORPORATE_TENANT_SCOPED_KEY, fn) === true ||
            driverSelf;
          // The roster template is a blank, data-free spreadsheet: role-gated but not tenant data.
          const exempt = where === 'CorporateRosterController.downloadTemplate';
          if (nonAdmin && !scoped && !exempt) {
            problems.push(`${where}: non-admin roles without @CorporateResource / @CorporateTenantScoped`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('privileged operations are ADMIN-only', () => {
      const rolesOf = (c: any, m: string) => Reflect.getMetadata(ROLES_KEY, c.prototype[m]);
      expect(rolesOf(CorporateTripExecutionController, 'adminRescheduleOrCancel')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateDispatchController, 'forceStartDispatch')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateTenantController, 'createTenant')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateTenantController, 'listTenants')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateTenantController, 'updateTenant')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateBillingController, 'previewPayoutBatch')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateBillingController, 'createPayoutBatch')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateBillingController, 'approvePayoutBatch')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateBillingController, 'submitPayoutBatch')).toEqual([UserRole.ADMIN]);
      expect(rolesOf(CorporateSafetyController, 'resolveAlert')).toEqual([UserRole.ADMIN]);
    });
  });
});
