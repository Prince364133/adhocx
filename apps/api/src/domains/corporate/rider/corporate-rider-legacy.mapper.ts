import { RiderScheduleResponse, RiderTripSummary } from './corporate-rider.types';

/**
 * Response shapes of the deprecated /corporate/trips/me/* routes (served by the employee mobile app
 * before /corporate/me/* existed). The data comes from CorporateRiderService; these mappers only
 * keep the old JSON contract stable until clients move to /corporate/me/*.
 */
export interface LegacyEmployeeScheduleResponse {
  employee: { id: string; code: string; fullName: string; office: string | null };
  schedule: Array<{
    requestId: string;
    scheduledDate: Date;
    shiftTime: string;
    direction: string;
    status: string;
    pickupPoint: { latitude: number; longitude: number } | null;
    dropoffPoint: { latitude: number; longitude: number } | null;
  }>;
}

export interface LegacyEmployeeTripHistoryItem {
  stopId: string;
  routeId: string;
  routeNumber: string;
  shiftDate: Date;
  shiftTime: string;
  direction: string;
  status: string;
  boardedAt: Date | null;
  office: string;
  driverName: string;
  vehiclePlate: string | null;
}

/** Stop statuses the legacy trip-history route returned (past trips only). */
export const LEGACY_TRIP_HISTORY_STATUSES = ['BOARDED', 'NO_SHOW', 'CANCELLED'] as const;

export const legacyRouteNumber = (routeId: string): string => `CR-${routeId.slice(0, 8).toUpperCase()}`;

export function toLegacySchedule(res: RiderScheduleResponse): LegacyEmployeeScheduleResponse {
  return {
    employee: {
      id: res.employee?.id ?? res.employeeId,
      code: res.employee?.code ?? '',
      fullName: res.employee?.fullName ?? '',
      office: res.employee?.officeName ?? null,
    },
    schedule: res.schedule.map((item) => ({
      requestId: item.requestId,
      scheduledDate: new Date(`${item.date}T00:00:00.000Z`),
      shiftTime: item.shiftTime,
      direction: item.direction,
      status: item.status,
      pickupPoint: item.pickupPoint ?? null,
      dropoffPoint: item.dropoffPoint ?? null,
    })),
  };
}

export function toLegacyTripHistory(trips: RiderTripSummary[]): LegacyEmployeeTripHistoryItem[] {
  return trips.map((t) => ({
    stopId: t.stopId,
    routeId: t.routeId,
    routeNumber: legacyRouteNumber(t.routeId),
    shiftDate: new Date(`${t.shiftDate}T00:00:00.000Z`),
    shiftTime: t.shiftTime,
    direction: t.direction,
    status: t.status,
    boardedAt: t.actualDepartureTime || t.actualArrivalTime || null,
    office: t.destinationAddress,
    driverName: t.driver?.fullName || 'Assigned Driver',
    vehiclePlate: t.vehicle?.plateNumber ?? null,
  }));
}
