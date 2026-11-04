import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@adhocx/contracts';

/**
 * Corporate portal roles (PRD CP-ADM-01). Stored on `users.corporate_role`.
 * A NULL column falls back to the legacy UserRole mapping below, so accounts created before
 * WS-F keep exactly their current access.
 */
export enum CorporateRole {
  CORP_SUPER_ADMIN = 'CORP_SUPER_ADMIN',
  HR = 'HR',
  TRANSPORT = 'TRANSPORT',
  FINANCE = 'FINANCE',
  SAFETY = 'SAFETY',
  READ_ONLY = 'READ_ONLY',
}

export const CORPORATE_ROLES: readonly CorporateRole[] = Object.values(CorporateRole);

/** Legacy UserRole -> corporate role (used when `corporateRole` is NULL). */
export const LEGACY_CORPORATE_ROLE: Readonly<Record<string, CorporateRole>> = {
  [UserRole.CORPORATE_ADMIN]: CorporateRole.CORP_SUPER_ADMIN,
  [UserRole.CORPORATE_MANAGER]: CorporateRole.TRANSPORT,
};

/** UserRole an invited corporate user gets, so the existing @Roles allow-lists keep working. */
export function userRoleForCorporateRole(role: CorporateRole): UserRole {
  return role === CorporateRole.CORP_SUPER_ADMIN ? UserRole.CORPORATE_ADMIN : UserRole.CORPORATE_MANAGER;
}

export const CORPORATE_PERMISSIONS = [
  'tenant:read',
  'offices:read',
  'offices:write',
  'employees:read',
  /** Create / edit employees and their home addresses (PII). */
  'employees:write',
  'users:read',
  'users:invite',
  'departments:read',
  'departments:write',
  'costcenters:read',
  'costcenters:write',
  'policy:read',
  'policy:write',
  'rosters:read',
  'rosters:write',
  'rosters:approve',
  'rosters:publish',
  'shifts:read',
  'shifts:write',
  'routes:read',
  'routes:write',
  'dispatch:read',
  'trips:read',
  'trips:write',
  'safety:read',
  'safety:write',
  'invoices:read',
  'billing:write',
  'reports:read',
] as const;

export type CorporatePermission = (typeof CORPORATE_PERMISSIONS)[number];

const READS = CORPORATE_PERMISSIONS.filter((p) => p.endsWith(':read')) as CorporatePermission[];

/**
 * Role -> permission matrix. Platform ADMIN bypasses it. Segregation of duties:
 * - HR owns people data and prepares rosters (upload + approve); TRANSPORT publishes and plans.
 * - FINANCE sees invoices / cost centers but no employee PII and no roster mutations.
 * - SAFETY sees employees, routes and trips and owns SOS / incidents.
 * - READ_ONLY can read everything and mutate nothing.
 */
export const CORPORATE_ROLE_PERMISSIONS: Readonly<Record<CorporateRole, ReadonlySet<CorporatePermission>>> = {
  [CorporateRole.CORP_SUPER_ADMIN]: new Set<CorporatePermission>(CORPORATE_PERMISSIONS),
  [CorporateRole.HR]: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'employees:read',
    'employees:write',
    'users:read',
    'departments:read',
    'departments:write',
    'costcenters:read',
    'policy:read',
    'rosters:read',
    'rosters:write',
    'rosters:approve',
    'shifts:read',
    'reports:read',
  ]),
  [CorporateRole.TRANSPORT]: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'offices:write',
    'employees:read',
    'employees:write',
    'departments:read',
    'costcenters:read',
    'policy:read',
    'rosters:read',
    'rosters:write',
    'rosters:approve',
    'rosters:publish',
    'shifts:read',
    'shifts:write',
    'routes:read',
    'routes:write',
    'dispatch:read',
    'trips:read',
    'trips:write',
    'safety:read',
    'reports:read',
  ]),
  [CorporateRole.FINANCE]: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'departments:read',
    'costcenters:read',
    'costcenters:write',
    'policy:read',
    'invoices:read',
    'reports:read',
  ]),
  [CorporateRole.SAFETY]: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'employees:read',
    'policy:read',
    'rosters:read',
    'shifts:read',
    'routes:read',
    'dispatch:read',
    'trips:read',
    'safety:read',
    'safety:write',
    'reports:read',
  ]),
  [CorporateRole.READ_ONLY]: new Set<CorporatePermission>(READS),
};

export function isCorporateRole(value: unknown): value is CorporateRole {
  return typeof value === 'string' && (CORPORATE_ROLES as readonly string[]).includes(value);
}

/**
 * Effective corporate role of an authenticated CORPORATE_ADMIN / CORPORATE_MANAGER:
 * the explicit `corporateRole` claim, else the legacy mapping. Unknown values resolve to
 * READ_ONLY (fail closed), never to a privileged role.
 */
export function effectiveCorporateRole(user: { role?: string; corporateRole?: unknown }): CorporateRole | null {
  const userRole = String(user?.role ?? '').trim().toUpperCase();
  if (!LEGACY_CORPORATE_ROLE[userRole]) return null;
  if (user.corporateRole === undefined || user.corporateRole === null || user.corporateRole === '') {
    return LEGACY_CORPORATE_ROLE[userRole];
  }
  return isCorporateRole(user.corporateRole) ? user.corporateRole : CorporateRole.READ_ONLY;
}

export function corporateRoleHas(role: CorporateRole, permission: CorporatePermission): boolean {
  return CORPORATE_ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Office scope of a corporate user. `null` = all offices of the tenant (empty list in the DB).
 */
export function corporateOfficeScope(user: { corporateOfficeIds?: unknown }): string[] | null {
  const ids = Array.isArray(user?.corporateOfficeIds)
    ? user.corporateOfficeIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
  return ids.length > 0 ? ids : null;
}

export const CORPORATE_PERMISSION_KEY = 'corporate:permission';

/**
 * Declares the corporate permission a handler needs. CorporateAccessGuard enforces it for
 * CORPORATE_ADMIN / CORPORATE_MANAGER callers (platform ADMIN bypasses; DRIVER / EMPLOYEE keep
 * their own ownership rules). Use together with @Roles + @CorporateResource / @CorporateTenantScoped.
 *
 *   @CorporatePermission('rosters:write')
 *
 * (`CorporatePermission` is both this decorator and the permission string type.)
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CorporatePermission = (permission: CorporatePermission) =>
  SetMetadata(CORPORATE_PERMISSION_KEY, permission);
