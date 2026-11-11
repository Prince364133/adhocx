import type { CorporateRouteItem, CorporateTenantOption } from './api/opsTypes';
import type { RouteWorkspaceCompany, RouteWorkspaceEmployee, RouteWorkspaceRoute } from './mockRouteWorkspace';
import { toWorkspaceCompany } from './mockRouteWorkspace';

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function timestamp(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
}

function timestampTime(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Awaiting data';
}

export function toOpsWorkspaceCompany(tenant: CorporateTenantOption): RouteWorkspaceCompany {
  return toWorkspaceCompany(tenant);
}

export function toOpsWorkspaceRoute(
  route: CorporateRouteItem,
  company: RouteWorkspaceCompany,
): RouteWorkspaceRoute {
  const stops = route.stops ?? [];
  const officeStop = [...stops].reverse().find((stop) => !stop.employee);
  const employeeStops = stops.filter((stop) => Boolean(stop.employee));
  const employees: RouteWorkspaceEmployee[] = employeeStops.map((stop) => {
    const plannedEta = timestamp(stop.plannedEta) ?? '';
    return {
      id: stop.id,
      employeeCode: stop.employee?.employeeCode ?? stop.employee?.id ?? stop.id,
      fullName: stop.employee?.fullName ?? 'Employee',
      phone: stop.employee?.phoneNumber,
      gender: stop.employee?.gender,
      department: stop.employee?.department,
      pickupAddress: stop.addressText,
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      pickupEta: plannedEta ? timestampTime(plannedEta) : 'Awaiting data',
      stopType: stop.stopType,
      pickupStatus: stop.status,
    };
  });

  const officeLatitude = finiteNumber(officeStop?.latitude) ?? finiteNumber(route.office?.latitude) ?? company.latitude;
  const officeLongitude = finiteNumber(officeStop?.longitude) ?? finiteNumber(route.office?.longitude) ?? company.longitude;

  return {
    id: route.id,
    tenantId: route.tenantId,
    tenantCode: company.code,
    tenantName: company.name,
    routeCode: route.id.slice(0, 8).toUpperCase(),
    shiftDate: timestamp(route.shiftDate)?.slice(0, 10) ?? String(route.shiftDate).slice(0, 10),
    shiftTime: route.shiftTime,
    direction: route.direction,
    vehicleCategory: route.vehicleCategory,
    capacity: route.maxCapacity,
    distanceKm: (finiteNumber(route.estDistanceMeters) ?? 0) / 1000,
    durationMinutes: Math.round((finiteNumber(route.estDurationSeconds) ?? 0) / 60),
    plannedDurationMinutes: Math.round((finiteNumber(route.estDurationSeconds) ?? 0) / 60),
    status: route.status,
    plannedArrivalAt: timestamp(route.targetOfficeArrivalTime),
    actualArrivalAt: timestamp(officeStop?.actualArrivalTime),
    startedAt: timestamp(route.startedAt),
    completedAt: timestamp(route.completedAt),
    driverName: route.driver?.fullName ?? 'Not assigned',
    driverPhone: route.driver?.phone ?? '',
    vehiclePlate: route.vehicle?.registrationNumber ?? 'Not assigned',
    officeAddress: officeStop?.addressText ?? route.office?.addressText ?? route.office?.name ?? company.officeAddress,
    officeLatitude,
    officeLongitude,
    employees,
    source: 'API',
  };
}
