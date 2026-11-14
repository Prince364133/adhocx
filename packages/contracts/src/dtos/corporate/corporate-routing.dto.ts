import { CorporateTransportDirection, CorporateStopStatus } from '../../enums';

export interface RouteOptimizationRequestDto {
  tenantId: string;
  officeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftTime: string; // HH:mm
  direction: CorporateTransportDirection;
  vehicleCategory?: string;
  maxCapacity?: number;
  officeBufferMinutes?: number;
}

export interface OptimizedStopDto {
  stopSequence: number;
  stopType: 'PICKUP' | 'DROPOFF';
  transportRequestId?: string;
  employeeId?: string;
  employeeCode?: string;
  fullName?: string;
  gender?: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
  addressText: string;
  plannedEta: Date;
  boardingOtp: string;
  dwellBufferSeconds: number;
  status: CorporateStopStatus;
}

export interface RouteOptimizationSummaryDto {
  tenantId: string;
  officeId: string;
  shiftDate: string;
  shiftTime: string;
  direction: CorporateTransportDirection;
  totalRequestsEvaluated: number;
  routesCreated: number;
  passengersAssigned: number;
  unassignedRequests: number;
  averagePassengersPerRoute: number;
  estimatedTotalDistanceMeters: number;
  routes: {
    id: string;
    routeIndex: number;
    vehicleCategory: string;
    passengerCount: number;
    maxCapacity: number;
    pickup1Time: Date;
    officeArrivalTime: Date;
    distanceMeters: number;
    durationSeconds: number;
  }[];
}
