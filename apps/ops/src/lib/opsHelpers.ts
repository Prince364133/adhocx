import type { CorporateRouteItem, RouteStop, SosAlertItem } from './api/opsTypes';

export const ACTIVE_SOS_STATUSES = [
  'NEW',
  'ACTIVE',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'ESCALATED',
  'RESPONDED',
] as const;

export const TERMINAL_SOS_STATUSES = ['RESOLVED', 'FALSE_ALARM'] as const;

export function isActiveSosStatus(status?: string | null): boolean {
  if (!status) return false;
  return (ACTIVE_SOS_STATUSES as readonly string[]).includes(String(status).toUpperCase());
}

export function isTerminalSosStatus(status?: string | null): boolean {
  if (!status) return false;
  return (TERMINAL_SOS_STATUSES as readonly string[]).includes(String(status).toUpperCase());
}

export function getSosTriggerLabel(alert: SosAlertItem): string {
  if (typeof alert.triggerType === 'string' && alert.triggerType.trim()) {
    return alert.triggerType.trim().replaceAll('_', ' ');
  }
  if (typeof alert.triggeredByRole === 'string' && alert.triggeredByRole.trim()) {
    return `SOS triggered by ${alert.triggeredByRole.trim().replaceAll('_', ' ')}`;
  }
  if (typeof alert.resolutionNotes === 'string' && alert.resolutionNotes.trim()) {
    return alert.resolutionNotes.trim();
  }
  const statusText = typeof alert.status === 'string' && alert.status.trim() ? alert.status.trim() : 'ACTIVE';
  return `Emergency SOS (${statusText})`;
}

export function getSosNextAction(alert: SosAlertItem): 'ACKNOWLEDGE' | 'ESCALATE' | null {
  const status = String(alert.status || '').toUpperCase();
  if (status === 'NEW' || status === 'ACTIVE') {
    return 'ACKNOWLEDGE';
  }
  if (status === 'ACKNOWLEDGED' || status === 'INVESTIGATING' || status === 'RESPONDED') {
    return 'ESCALATE';
  }
  return null;
}

function toFiniteCoord(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export interface NormalizedSosAlertDisplay {
  tenantId: string | null;
  tenantName: string;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  officeName: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinatesLabel: string;
  notes: string | null;
  severity: string;
  triggerLabel: string;
  reporterLabel: string;
  riderPhone: string | null;
}

export function getSosAlertDisplay(alert: SosAlertItem): NormalizedSosAlertDisplay {
  const tenantId = alert.tenantId ?? alert.route?.tenantId ?? alert.route?.tenant?.id ?? null;
  const tenantName = alert.route?.tenant?.name ?? alert.tenantName ?? 'Corporate Client';
  const driverName = alert.route?.driver?.fullName ?? alert.driverName ?? null;
  const driverPhone = alert.route?.driver?.phone ?? alert.driverPhone ?? null;
  const vehiclePlate = alert.route?.vehicle?.registrationNumber ?? alert.vehiclePlate ?? null;
  const officeName = alert.route?.office?.name ?? null;
  const latitude = toFiniteCoord(alert.latitude ?? alert.locationLat);
  const longitude = toFiniteCoord(alert.longitude ?? alert.locationLng);
  const coordinatesLabel =
    alert.addressText ||
    (latitude !== null && longitude !== null
      ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      : 'Coordinates unavailable');
  const notes = alert.resolutionNotes ?? alert.responderNotes ?? null;
  const status = String(alert.status || '').toUpperCase();
  const severity =
    alert.severity ??
    (status === 'ESCALATED' || status === 'NEW' || status === 'ACTIVE' ? 'CRITICAL_P0' : 'HIGH_P1');
  const triggerLabel = getSosTriggerLabel(alert);
  const reporterLabel =
    alert.riderName ||
    (alert.triggeredByRole ? `${String(alert.triggeredByRole).replaceAll('_', ' ')} Alert` : 'Employee Rider');
  const riderPhone = alert.riderPhone ?? null;

  return {
    tenantId,
    tenantName,
    driverName,
    driverPhone,
    vehiclePlate,
    officeName,
    latitude,
    longitude,
    coordinatesLabel,
    notes,
    severity,
    triggerLabel,
    reporterLabel,
    riderPhone,
  };
}

/**
 * Detects office hub stops across both LOGIN (DROPOFF at office) and LOGOUT (PICKUP at office) routes.
 */
export function isOfficeHubStop(
  stop: Pick<RouteStop, 'employeeId' | 'employee' | 'employeeName'>,
): boolean {
  return !stop.employeeId && !stop.employee && !stop.employeeName;
}

/**
 * Legal route-action status guards aligned with backend CorporateOperationsService rules
 * to prevent 409 Conflict responses from illegal state transitions.
 */
export function canReassignRoute(route: Pick<CorporateRouteItem, 'status'>): boolean {
  return route.status === 'ASSIGNED';
}

export function canCancelRoute(route: Pick<CorporateRouteItem, 'status'>): boolean {
  return route.status === 'PLANNED' || route.status === 'DISPATCHING' || route.status === 'ASSIGNED';
}

export function canEditRoute(route: Pick<CorporateRouteItem, 'status'>): boolean {
  return route.status === 'PLANNED' || route.status === 'DISPATCHING' || route.status === 'ASSIGNED';
}

export function canDeleteRoute(route: Pick<CorporateRouteItem, 'status' | 'driverId'>): boolean {
  return (route.status === 'PLANNED' || route.status === 'DISPATCHING') && !route.driverId;
}

/**
 * Validates a 10-digit Indian mobile number (accepts optional +91 / 91 / 0 prefix and separators).
 */
export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/[\s\-()+]/g, '');
  if (!/^\d+$/.test(digits)) return false;
  let local = digits;
  if (local.length === 12 && local.startsWith('91')) {
    local = local.slice(2);
  } else if (local.length === 11 && local.startsWith('0')) {
    local = local.slice(1);
  }
  return /^[6-9]\d{9}$/.test(local);
}
