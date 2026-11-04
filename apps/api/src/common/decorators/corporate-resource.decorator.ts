import { SetMetadata } from '@nestjs/common';

export type CorporateResourceKind =
  | 'route'
  | 'stop'
  | 'request'
  | 'roster'
  | 'invoice'
  | 'office'
  | 'employee'
  | 'tenant'
  | 'sos'
  | 'ticket'
  | 'driver';

export interface CorporateResourceOptions {
  /** Where the resource id is read from. Defaults to the route params. */
  from?: 'params' | 'body' | 'query';
  /**
   * DRIVER semantics for route/stop resources:
   * - 'assigned' (default): the route must be assigned to the calling driver.
   * - 'offer': the route is not assigned yet (offer accept/reject); instead the
   *   `driverId` in the body must be the calling driver's own Driver row.
   */
  driverMode?: 'assigned' | 'offer';
}

export interface CorporateResourceMetadata extends Required<Pick<CorporateResourceOptions, 'from'>> {
  kind: CorporateResourceKind;
  param: string;
  driverMode: 'assigned' | 'offer';
}

export const CORPORATE_RESOURCE_KEY = 'corporate:resource';
export const CORPORATE_TENANT_SCOPED_KEY = 'corporate:tenant-scoped';

/**
 * Declares which corporate resource a handler operates on. CorporateAccessGuard
 * loads that resource (one minimal select), returns 404 if it does not exist and
 * enforces tenant / driver-assignment / employee-ownership rules for the caller.
 */
export const CorporateResource = (
  kind: CorporateResourceKind,
  param = 'id',
  options: CorporateResourceOptions = {},
) =>
  SetMetadata(CORPORATE_RESOURCE_KEY, {
    kind,
    param,
    from: options.from ?? 'params',
    driverMode: options.driverMode ?? 'assigned',
  } satisfies CorporateResourceMetadata);

/**
 * Marks a list/create handler that takes `tenantId` in the query or body.
 * For CORPORATE_ADMIN / CORPORATE_MANAGER the guard forces `tenantId` to the
 * tenant in their token and rejects any different client-supplied value
 * (query, body or X-Corporate-Tenant-ID header). EMPLOYEE is bound to the tenant
 * of their employee profile the same way. ADMIN may target any tenant.
 */
export const CorporateTenantScoped = () => SetMetadata(CORPORATE_TENANT_SCOPED_KEY, true);

export const CORPORATE_DRIVER_SELF_KEY = 'corporate:driver-self';

/**
 * Marks a driver "my data" handler (offer inbox, duties, active route) that resolves the
 * caller's own Driver row from req.user.id. Drivers carry no corporate tenant claim, so
 * @CorporateTenantScoped would reject them. The guard allows ADMIN, and DRIVER only when a
 * Driver profile is linked to the account; every other role is denied.
 */
export const CorporateDriverSelfScoped = () => SetMetadata(CORPORATE_DRIVER_SELF_KEY, true);
