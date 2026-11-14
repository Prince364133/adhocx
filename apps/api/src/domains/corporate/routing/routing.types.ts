export type VehicleCategory = string;

export interface RouteOptimizationOptions {
  tenantId: string;
  officeId: string;
  shiftDate: string; // YYYY-MM-DD
  /** @deprecated Send the direction-specific loginTime or logoutTime instead. */
  shiftTime?: string;
  loginTime?: string;
  logoutTime?: string;
  direction: 'LOGIN' | 'LOGOUT' | 'BOTH';
  vehicleCategory?: VehicleCategory;
  maxCapacity?: number;
  officeBufferMinutes?: number; // defaults to 10 minutes prior to shift login
  maxRideTimeMinutes?: number; // max in-cab time per employee, defaults to 120
  logoutReportingBufferMinutes?: number; // LOGOUT: cab at office this long before logout, defaults to 15
  stopDwellMinutes?: number; // employee pickup/drop dwell, 1-10 minutes
  routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
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
  dwellBufferSeconds: number;
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
  vehicleCategoryCounts: Record<string, number>;
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

export interface RouteOptimizationDirectionOutcome {
  direction: 'LOGIN' | 'LOGOUT';
  shiftTime: string;
  success: boolean;
  summary?: RouteOptimizationSummary;
  error?: string;
}

export interface RouteOptimizationBatchSummary {
  direction: 'BOTH';
  plans: RouteOptimizationDirectionOutcome[];
  totalRequestsEvaluated: number;
  routesCreated: number;
  vehicleCategoryCounts: Record<string, number>;
  passengersAssigned: number;
  unassignedRequests: number;
}

