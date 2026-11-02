import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import {
  CORPORATE_RESOURCE_KEY,
  CORPORATE_TENANT_SCOPED_KEY,
  CorporateResourceMetadata,
} from '../decorators/corporate-resource.decorator';

const TENANT_SELECT = { id: true, code: true, name: true, status: true } as const;
const OWNED_SELECT = { id: true, tenantId: true, tenant: { select: TENANT_SELECT } } as const;

export interface CorporateTenantSummary {
  id: string;
  code: string;
  name: string;
  status: string;
}

/** Minimal projection of a corporate resource needed for an access decision. */
interface ResolvedResource {
  id: string;
  tenantId: string | null;
  tenant: CorporateTenantSummary | null;
  /** route / stop / sos: the assigned Driver row id and that driver's User id. */
  routeDriverId?: string | null;
  routeDriverUserId?: string | null;
  /** request / stop: the employee who owns it. */
  employeeId?: string | null;
  /** route (EMPLOYEE callers only): caller has a stop on this route. */
  employeeOnRoute?: boolean;
  /** driver: the User id that owns this Driver row. */
  driverUserId?: string | null;
}

const CORPORATE_TENANT_ROLES = new Set<string>([UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER]);

const isPresent = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

/**
 * Tenant id that a tenant-scoped handler must use. For corporate admins/managers
 * this is always the tenant from their token (the guard stored it on the request);
 * any client-supplied candidate that disagrees is rejected. Needed for multipart
 * handlers, whose body is only parsed (by the FileInterceptor) after guards ran.
 */
export function resolveScopedTenantId(request: any, ...candidates: Array<string | undefined | null>): string | undefined {
  const scope: string | undefined = request?.corporateTenantScope;
  if (scope) {
    for (const candidate of candidates) {
      if (isPresent(candidate) && String(candidate) !== scope) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }
    return scope;
  }
  return candidates.find(isPresent) ?? undefined;
}

/**
 * Declarative corporate access control. Runs after JwtAuthGuard + RolesGuard and
 * reads @CorporateResource / @CorporateTenantScoped metadata from the handler.
 *
 * - ADMIN: unrestricted (resource is still loaded so missing ids give 404).
 * - CORPORATE_ADMIN / CORPORATE_MANAGER: resource tenant must equal the
 *   `corporateTenantId` claim; tenant-scoped handlers get tenantId forced to it.
 *   A client-supplied tenant id never overrides the claim.
 * - DRIVER: only routes/stops assigned to the Driver row owned by the caller;
 *   offer endpoints require body.driverId to be the caller's own Driver row.
 * - EMPLOYEE: only their own transport request / stop, or a route they ride on.
 *
 * At most one database read per request (two for driver offer endpoints).
 * The resolved tenant is bound to `request.corporateTenant` for @CurrentTenant.
 */
@Injectable()
export class CorporateAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.id || !user.role) {
      throw new UnauthorizedException('Authentication required');
    }
    const role = String(user.role).trim().toUpperCase();

    const handler = context.getHandler();
    const resource = this.reflector.get<CorporateResourceMetadata | undefined>(CORPORATE_RESOURCE_KEY, handler);
    const tenantScoped = this.reflector.get<boolean | undefined>(CORPORATE_TENANT_SCOPED_KEY, handler);

    if (tenantScoped) {
      await this.applyTenantScope(request, role, user);
    }

    if (resource) {
      const id = this.readResourceId(request, resource);
      if (!id) {
        throw new BadRequestException(`${resource.param} is required`);
      }
      const resolved = await this.resolve(resource, id, request, role, user);
      if (!resolved) {
        throw new NotFoundException(`Corporate ${resource.kind} ${id} not found`);
      }
      await this.authorize(resource, resolved, request, role, user);
      if (resolved.tenant) {
        request.corporateTenant = resolved.tenant;
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Tenant-scoped list / create endpoints
  // ---------------------------------------------------------------------------

  private async applyTenantScope(request: any, role: string, user: any): Promise<void> {
    if (role === UserRole.ADMIN) {
      return;
    }
    if (!CORPORATE_TENANT_ROLES.has(role)) {
      throw new ForbiddenException('Access denied: tenant-scoped corporate endpoint');
    }
    const claimTenantId = this.requireTenantClaim(user);

    const candidates = [
      request.headers?.['x-corporate-tenant-id'],
      request.query?.tenantId,
      request.body && typeof request.body === 'object' ? request.body.tenantId : undefined,
    ];
    for (const candidate of candidates) {
      if (isPresent(candidate) && String(candidate) !== claimTenantId) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    const tenant = await this.db.corporateTenant.findUnique({
      where: { id: claimTenantId },
      select: TENANT_SELECT,
    });
    if (!tenant) {
      throw new ForbiddenException('Corporate tenant of this account no longer exists');
    }
    this.assertTenantActive(tenant);

    // Force the tenant id the handler will read to the caller's own tenant.
    if (request.query && typeof request.query === 'object') {
      request.query.tenantId = claimTenantId;
    } else {
      request.query = { tenantId: claimTenantId };
    }
    if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
      request.body.tenantId = claimTenantId;
    }
    request.corporateTenantScope = claimTenantId;
    request.corporateTenant = tenant;
  }

  // ---------------------------------------------------------------------------
  // Resource resolution (one minimal select per request)
  // ---------------------------------------------------------------------------

  private readResourceId(request: any, meta: CorporateResourceMetadata): string | undefined {
    const source = meta.from === 'body' ? request.body : meta.from === 'query' ? request.query : request.params;
    const value = source?.[meta.param];
    return isPresent(value) ? String(value) : undefined;
  }

  private async resolve(
    meta: CorporateResourceMetadata,
    id: string,
    request: any,
    role: string,
    user: any,
  ): Promise<ResolvedResource | null> {
    const routeAccessSelect = {
      tenantId: true,
      driverId: true,
      tenant: { select: TENANT_SELECT },
      driver: { select: { userId: true } },
    } as const;

    switch (meta.kind) {
      case 'route': {
        const employeeId: string | undefined = role === UserRole.EMPLOYEE ? user.corporateEmployeeId : undefined;
        const route: any = await this.db.corporateRoute.findUnique({
          where: { id },
          select: {
            id: true,
            ...routeAccessSelect,
            ...(employeeId
              ? { stops: { where: { employeeId }, select: { id: true }, take: 1 } }
              : {}),
          },
        });
        if (!route) return null;
        return {
          id: route.id,
          tenantId: route.tenantId,
          tenant: route.tenant ?? null,
          routeDriverId: route.driverId,
          routeDriverUserId: route.driver?.userId ?? null,
          employeeOnRoute: Array.isArray(route.stops) && route.stops.length > 0,
        };
      }
      case 'stop': {
        const stop: any = await this.db.corporateRouteStop.findUnique({
          where: { id },
          select: { id: true, routeId: true, employeeId: true, route: { select: routeAccessSelect } },
        });
        if (!stop) return null;
        // Nested /routes/:id/stops/:stopId — the stop must belong to that route.
        const parentRouteId = meta.param !== 'id' ? request.params?.id : undefined;
        if (parentRouteId && stop.routeId !== parentRouteId) return null;
        return {
          id: stop.id,
          tenantId: stop.route?.tenantId ?? null,
          tenant: stop.route?.tenant ?? null,
          routeDriverId: stop.route?.driverId ?? null,
          routeDriverUserId: stop.route?.driver?.userId ?? null,
          employeeId: stop.employeeId,
        };
      }
      case 'sos': {
        const alert: any = await this.db.corporateSosAlert.findUnique({
          where: { id },
          select: { id: true, route: { select: routeAccessSelect } },
        });
        if (!alert) return null;
        return {
          id: alert.id,
          tenantId: alert.route?.tenantId ?? null,
          tenant: alert.route?.tenant ?? null,
          routeDriverId: alert.route?.driverId ?? null,
          routeDriverUserId: alert.route?.driver?.userId ?? null,
        };
      }
      case 'request': {
        const req: any = await this.db.corporateTransportRequest.findUnique({
          where: { id },
          select: { id: true, tenantId: true, employeeId: true, tenant: { select: TENANT_SELECT } },
        });
        return req ? { id: req.id, tenantId: req.tenantId, tenant: req.tenant ?? null, employeeId: req.employeeId } : null;
      }
      case 'roster':
        return this.tenantOwned(await this.db.corporateRoster.findUnique({ where: { id }, select: OWNED_SELECT }));
      case 'invoice':
        return this.tenantOwned(await this.db.corporateInvoice.findUnique({ where: { id }, select: OWNED_SELECT }));
      case 'office':
        return this.tenantOwned(await this.db.corporateOffice.findUnique({ where: { id }, select: OWNED_SELECT }));
      case 'employee': {
        const emp: any = await this.db.corporateEmployee.findUnique({ where: { id }, select: OWNED_SELECT });
        return emp ? { ...this.tenantOwned(emp)!, employeeId: emp.id } : null;
      }
      case 'tenant': {
        const tenant: any = await this.db.corporateTenant.findUnique({ where: { id }, select: TENANT_SELECT });
        return tenant ? { id: tenant.id, tenantId: tenant.id, tenant } : null;
      }
      case 'driver': {
        const driver: any = await this.db.driver.findUnique({ where: { id }, select: { id: true, userId: true } });
        return driver ? { id: driver.id, tenantId: null, tenant: null, driverUserId: driver.userId } : null;
      }
      default:
        throw new ForbiddenException(`Unsupported corporate resource ${(meta as any).kind}`);
    }
  }

  private tenantOwned(row: any): ResolvedResource | null {
    return row ? { id: row.id, tenantId: row.tenantId, tenant: row.tenant ?? null } : null;
  }

  // ---------------------------------------------------------------------------
  // Authorization rules
  // ---------------------------------------------------------------------------

  private async authorize(
    meta: CorporateResourceMetadata,
    res: ResolvedResource,
    request: any,
    role: string,
    user: any,
  ): Promise<void> {
    if (role === UserRole.ADMIN) {
      return;
    }

    if (CORPORATE_TENANT_ROLES.has(role)) {
      const claimTenantId = this.requireTenantClaim(user);
      if (!res.tenantId || res.tenantId !== claimTenantId) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
      if (res.tenant) this.assertTenantActive(res.tenant);
      return;
    }

    if (role === UserRole.DRIVER) {
      return this.authorizeDriver(meta, res, request, user);
    }

    if (role === UserRole.EMPLOYEE) {
      return this.authorizeEmployee(meta, res, request, user);
    }

    throw new ForbiddenException('Access denied');
  }

  private async authorizeDriver(
    meta: CorporateResourceMetadata,
    res: ResolvedResource,
    request: any,
    user: any,
  ): Promise<void> {
    if (meta.kind === 'driver') {
      if (res.driverUserId !== user.id) {
        throw new ForbiddenException('Drivers may only access their own records');
      }
      return;
    }

    if (meta.kind !== 'route' && meta.kind !== 'stop') {
      throw new ForbiddenException('Access denied');
    }

    const body = request.body && typeof request.body === 'object' ? request.body : undefined;

    if (meta.driverMode === 'offer') {
      // Route is not assigned yet: the acting driver must be the caller.
      const own: any = await this.db.driver.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!own) {
        throw new ForbiddenException('No driver profile linked to this account');
      }
      if (isPresent(body?.driverId) && String(body.driverId) !== own.id) {
        throw new ForbiddenException('driverId does not match the authenticated driver');
      }
      if (body) body.driverId = own.id;
      return;
    }

    if (!res.routeDriverUserId || res.routeDriverUserId !== user.id) {
      throw new ForbiddenException('Route is not assigned to this driver');
    }
    if (isPresent(body?.driverId) && String(body.driverId) !== res.routeDriverId) {
      throw new ForbiddenException('driverId does not match the authenticated driver');
    }
  }

  private authorizeEmployee(
    meta: CorporateResourceMetadata,
    res: ResolvedResource,
    request: any,
    user: any,
  ): void {
    const ownEmployeeId: string | undefined = user.corporateEmployeeId;
    if (!ownEmployeeId) {
      throw new ForbiddenException('No corporate employee profile linked to this account');
    }
    if (user.corporateTenantId && res.tenantId && res.tenantId !== user.corporateTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    switch (meta.kind) {
      case 'request': {
        if (res.employeeId !== ownEmployeeId) {
          throw new ForbiddenException('Transport request does not belong to this employee');
        }
        const body = request.body && typeof request.body === 'object' ? request.body : undefined;
        if (isPresent(body?.employeeId) && String(body.employeeId) !== ownEmployeeId) {
          throw new ForbiddenException('employeeId does not match the authenticated employee');
        }
        if (body) body.employeeId = ownEmployeeId;
        return;
      }
      case 'stop':
        if (res.employeeId !== ownEmployeeId) {
          throw new ForbiddenException('Stop does not belong to this employee');
        }
        return;
      case 'route':
        if (!res.employeeOnRoute) {
          throw new ForbiddenException('Employee is not on this route');
        }
        return;
      default:
        throw new ForbiddenException('Access denied');
    }
  }

  private requireTenantClaim(user: any): string {
    const claim = user.corporateTenantId;
    if (!claim) {
      throw new ForbiddenException('Account is not linked to a corporate tenant');
    }
    return String(claim);
  }

  private assertTenantActive(tenant: CorporateTenantSummary): void {
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(`Corporate tenant ${tenant.name} is ${tenant.status}`);
    }
  }
}
