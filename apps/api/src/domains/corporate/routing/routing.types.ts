export type VehicleCategory = 'SEDAN' | 'SUV';

export interface RouteOptimizationOptions {
  tenantId: string;
  officeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftTime: string; // HH:mm (e.g. '08:00', '09:00', '17:00', '18:00')
  direction: 'LOGIN' | 'LOGOUT';
  vehicleCategory?: VehicleCategory; // defaults to 'SEDAN' (4 pax)
  maxCapacity?: number; // 4 for SEDAN, 6 for SUV
  officeBufferMinutes?: number; // defaults to 10 minutes prior to shift login
  maxRideTimeMinutes?: number; // max in-cab time per employee, defaults to 120
  logoutReportingBufferMinutes?: number; // LOGOUT: cab at office this long before logout, defaults to 15
}

export interface OptimizedStopResult {
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
  dwellBufferSeconds: number; // 300s
}

export interface OptimizedRouteResult {
  routeIndex: number;
  vehicleCategory: VehicleCategory;
  maxCapacity: number;
  passengerCount: number;
  targetPickup1Time: Date;
  targetOfficeArrivalTime: Date;
  estDistanceMeters: number;
  estDurationSeconds: number;
  stops: OptimizedStopResult[];
}

export interface RouteOptimizationSummary {
  tenantId: string;
  officeId: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  totalRequestsEvaluated: number;
  routesCreated: number;
  passengersAssigned: number;
  unassignedRequests: number;
  averagePassengersPerRoute: number;
  estimatedTotalDistanceMeters: number;
  /** Where travel times came from: GOOGLE | CACHE | HAVERSINE | MIXED */
  travelTimeSource?: string;
  /** Constraint exceptions the planner could not resolve (ride time, night escort). */
  warnings?: string[];
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

