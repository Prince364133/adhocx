/**
 * UI mirror of apps/api/src/domains/corporate/tenants/corporate-permissions.ts.
 *
 * Used ONLY to hide / disable actions a role does not have. The API (CorporateAccessGuard) is the
 * authority: if this table drifts, the API still returns 403 and the screen shows its
 * "unauthorized" state. Keep it in sync with the API matrix.
 */

export type CorporateRole = 'CORP_SUPER_ADMIN' | 'HR' | 'TRANSPORT' | 'FINANCE' | 'SAFETY' | 'READ_ONLY';

export const CORPORATE_ROLES: CorporateRole[] = [
  'CORP_SUPER_ADMIN',
  'HR',
  'TRANSPORT',
  'FINANCE',
  'SAFETY',
  'READ_ONLY',
];

export const CORPORATE_ROLE_LABELS: Record<CorporateRole, string> = {
  CORP_SUPER_ADMIN: 'Super Admin',
  HR: 'HR Manager',
  TRANSPORT: 'Transport Manager',
  FINANCE: 'Finance Manager',
  SAFETY: 'Safety Officer',
  READ_ONLY: 'Read-only',
};

export const CORPORATE_PERMISSIONS = [
  'tenant:read',
  'tenant:write',
  'offices:read',
  'offices:write',
  'employees:read',
  'employees:write',
  'users:read',
  'users:invite',
  'departments:read',
  'departments:write',
  'costcenters:read',
  'costcenters:write',
  'policy:read',
  'policy:write',
  'invoices:read',
  'billing:write',
  'reports:read',
] as const;

export type CorporatePermission = (typeof CORPORATE_PERMISSIONS)[number];

const READS = CORPORATE_PERMISSIONS.filter((p) => p.endsWith(':read')) as CorporatePermission[];

const MATRIX: Record<CorporateRole, ReadonlySet<CorporatePermission>> = {
  CORP_SUPER_ADMIN: new Set<CorporatePermission>(CORPORATE_PERMISSIONS),
  HR: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'employees:read',
    'employees:write',
    'users:read',
    'departments:read',
    'departments:write',
    'costcenters:read',
    'policy:read',
    'reports:read',
  ]),
  TRANSPORT: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'offices:write',
    'employees:read',
    'employees:write',
    'departments:read',
    'costcenters:read',
    'policy:read',
    'reports:read',
  ]),
  FINANCE: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'departments:read',
    'costcenters:read',
    'costcenters:write',
    'policy:read',
    'invoices:read',
    'billing:write',
    'reports:read',
  ]),
  SAFETY: new Set<CorporatePermission>([
    'tenant:read',
    'offices:read',
    'employees:read',
    'policy:read',
    'reports:read',
  ]),
  READ_ONLY: new Set<CorporatePermission>(READS),
};

const LEGACY: Record<string, CorporateRole> = {
  CORPORATE_ADMIN: 'CORP_SUPER_ADMIN',
  CORPORATE_MANAGER: 'TRANSPORT',
};

function isCorporateRole(v: unknown): v is CorporateRole {
  return typeof v === 'string' && (CORPORATE_ROLES as string[]).includes(v);
}

/** Same resolution as effectiveCorporateRole() in the API: unknown values fail closed to READ_ONLY. */
export function effectiveCorporateRole(userRole: string | undefined, corporateRole: unknown): CorporateRole | null {
  const legacy = LEGACY[String(userRole ?? '').toUpperCase()];
  if (!legacy) return null;
  if (corporateRole === undefined || corporateRole === null || corporateRole === '') return legacy;
  return isCorporateRole(corporateRole) ? corporateRole : 'READ_ONLY';
}

export function roleHas(role: CorporateRole | null, permission: CorporatePermission): boolean {
  return !!role && MATRIX[role].has(permission);
}
