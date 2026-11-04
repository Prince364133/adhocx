export const CORPORATE_MAX_DUTY_HOURS = 12;
export const CORPORATE_DRIVER_TURNAROUND_MINUTES = 30;
export const CORPORATE_ESCALATION_LEAD_MIN = 30;

export type DriverIneligibilityReason =
  | 'DRIVER_NOT_FOUND'
  | 'DRIVER_NOT_VERIFIED'
  | 'DRIVER_NOT_AVAILABLE'
  | 'NO_VERIFIED_VEHICLE'
  | 'MISSING_VEHICLE_TYPE'
  | 'VEHICLE_CATEGORY_MISMATCH'
  | 'INSUFFICIENT_SEAT_CAPACITY'
  | 'INSURANCE_EXPIRED'
  | 'DUTY_HOURS_EXCEEDED'
  | 'ROUTE_TIME_OVERLAP';

export interface DriverEligibilityResult {
  driverId: string;
  isEligible: boolean;
  rejectionReason?: DriverIneligibilityReason;
  matchedVehicleId?: string;
  dutyHoursLast24h?: number;
  /** ROUTE_TIME_OVERLAP: the committed route that clashes. */
  conflictingRouteId?: string;
}

export interface DriverDutySummary {
  routeId: string;
  tenantId: string;
  tenantName: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  vehicleCategory: string;
  status: string;
  targetPickup1Time: Date;
  targetOfficeArrivalTime: Date;
  estDistanceMeters: number;
  estDurationSeconds: number;
  passengerCount: number;
  stopsCount: number;
  stops: Array<{
    sequence: number;
    stopType: string;
    locationText: string;
    plannedEta: Date;
    status: string;
  }>;
}

export interface DriverActiveOfferResponse {
  hasActiveOffer: boolean;
  offer?: {
    id: string;
    routeId: string;
    tenantName: string;
    shiftDate: string;
    shiftTime: string;
    direction: 'LOGIN' | 'LOGOUT';
    passengerCount: number;
    totalDistanceMeters: number;
    targetPickup1Time: Date;
    farePaise: number;
    offerExpiresAt: Date;
    remainingSeconds: number;
    stopsCount: number;
    originAddress: string;
    destinationAddress: string;
  };
}

