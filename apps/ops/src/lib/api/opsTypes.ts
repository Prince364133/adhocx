export interface CorporateTenantOption {
  id: string;
  code: string;
  name: string;
  status: string;
  activeShiftsCount?: number;
  activeCabsCount?: number;
  inTransitCount?: number;
  onTimePunctualityPct?: number;
  delayedCount?: number;
  unassignedCount?: number;
  offices?: {
    id: string;
    code: string;
    name: string;
    addressText?: string;
    latitude: number;
    longitude: number;
  }[];
}

export interface RouteStop {
  id: string;
  stopSequence: number;
  stopType: 'PICKUP' | 'DROPOFF';
  latitude: number;
  longitude: number;
  addressText: string;
  plannedEta: string;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  boardingOtp?: string;
  dwellBufferSeconds: number;
  status: 'PENDING' | 'ARRIVED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  noShowReason?: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    gender: string;
    phoneNumber: string;
    department?: string;
  };
}

export interface CorporateRouteItem {
  id: string;
  tenantId: string;
  officeId?: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  vehicleCategory: string;
  maxCapacity: number;
  assignedPassengerCount: number;
  targetPickup1Time: string;
  targetOfficeArrivalTime: string;
  startedAt?: string;
  completedAt?: string;
  estDistanceMeters?: number;
  estDurationSeconds?: number;
  status: 'PLANNED' | 'DISPATCHING' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  driverId?: string;
  vehicleId?: string;
  driver?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    registrationNumber: string;
    model: string;
  };
  office?: {
    id: string;
    code: string;
    name: string;
    addressText?: string;
    latitude?: number;
    longitude?: number;
  };
  tenant?: {
    id: string;
    code: string;
    name: string;
  };
  stops?: RouteStop[];
  _count?: {
    stops: number;
  };
  liveGps?: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
    updatedAt: string;
    freshnessSeconds: number;
    isStale: boolean;
  };
  gps?: {
    latitude?: number;
    longitude?: number;
    heading?: number;
    speedMps?: number;
    lastSeenAt: string | null;
    ageSeconds: number | null;
    freshness: 'LIVE' | 'STALE' | 'OFFLINE';
  } | null;
  isAtRisk?: boolean;
  delayMinutes?: number;
}

export interface OpsBoardSummary {
  totalRoutes: number;
  planned: number;
  dispatching: number;
  assigned: number;
  inTransit: number;
  completed: number;
  cancelled: number;
  atRiskCount: number;
  staleGpsCount: number;
}

export interface OpsBoardResponse {
  summary: OpsBoardSummary;
  routes: CorporateRouteItem[];
  atRisk: CorporateRouteItem[];
  staleGps: CorporateRouteItem[];
}

export interface RequirementListItem {
  id: string;
  vendorName: string;
  fulfillmentMode?: 'DIRECT_DISPATCH';
  vehicleType: string;
  quantity: number;
  assignedQuantity: number;
  pickupAddress: string;
  dropAddress: string;
  reportingTime: string;
  status: string;
  vendorRate?: number;
  ratePerVehicle?: number;
  suggestedBudget?: number;
  createdAt: string;
  pricing?: RequirementPricingSnapshot;
  zonalQuote?: {
    locality?: { name?: string; zoneLabel?: string } | null;
    officeHub?: { displayName?: string };
    vehicleType?: string;
    rateVersion?: string;
    direction?: string;
    totalAmount?: number;
    internal?: {
      driverRateVersion?: string;
      driverEarning?: number;
      platformSpread?: number;
      escortPayable?: number;
    };
  };
}

export interface RequirementPricingSnapshot {
  planVersion: string;
  distanceM: number;
  vendorPricePaise: number;
  driverPayoutPaise: number;
  grossSpreadPaise: number;
  quotedAt: string;
}

export interface AssignmentItem {
  id: string;
  requirementId: string;
  driverId: string;
  tripId?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  status: string;
  assignedRate?: number;
  pickupAddress?: string;
  dropAddress?: string;
  reportingTime?: string;
  assignedAt?: string;
  offeredAt?: string;
  createdAt: string;
}

export interface TripListItem {
  id: string;
  requirementId: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  pickupAddress: string;
  dropAddress: string;
  status: string;
  driverRate: number;
  tollCharges?: number;
  parkingCharges?: number;
  totalDriverEarnings?: number;
  reportingTime: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TripEvent {
  id: string;
  tripId: string;
  eventType: string;
  latitude: number;
  longitude: number;
  metadata?: { description?: string; [key: string]: unknown };
  createdAt: string;
}

export interface RouteWaypointsResponse {
  routeId: string;
  direction: 'LOGIN' | 'LOGOUT';
  status: string;
  stops: Array<{
    stopId: string;
    stopSequence: number;
    stopType: 'PICKUP' | 'DROPOFF';
    status: string;
    latitude: number;
    longitude: number;
    addressText: string;
    employeeName?: string;
    plannedEta: string;
  }>;
  officeHub: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    addressText: string;
  };
}
export interface SosAlertItem {
  id: string;
  routeId: string;
  tripId?: string;
  riderId?: string;
  driverId?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  severity: 'CRITICAL_P0' | 'HIGH_P1' | 'MEDIUM_P2';
  triggerType: 'PANIC_BUTTON' | 'ROUTE_DEVIATION' | 'MANUAL_DISPATCHER';
  locationLat: number;
  locationLng: number;
  addressText?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  responderNotes?: string;
  riderName?: string;
  riderPhone?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  tenantName?: string;
}

export interface AvailableDriverOption {
  id: string;
  fullName: string;
  phone: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleCategory: string;
  distanceKm: number;
  isYellowPlateVerified: boolean;
  currentDutyHours: number;
}

export interface PlannedRouteStop {
  sequence: number;
  name: string;
  address: string;
  matchedAddress: string;
  lat: number;
  lng: number;
  eta: string;
  dwellUntil: string;
  nextStop: string;
  travelToNextMinutes: number;
  distanceToNextKm: number;
  arrivalAtNext: string;
  officeDistanceKm: number;
  outOfRadius: boolean;
  boardingOtp?: string;
}

export interface PlannedRouteSegment {
  from: string;
  to: string;
  depart: string;
  arrive: string;
  minutes: number;
  distanceKm: number;
}

export interface CalculatedRoute {
  cab: number;
  cabType?: string;
  driverPayout?: number;
  corporateRevenue?: number;
  projectedMargin?: number;
  driverStart: string;
  sequence: string;
  stops: PlannedRouteStop[];
  segments: PlannedRouteSegment[];
  departure: string;
  arrival: string;
  distanceKm: number;
  driveMinutes: number;
  status: 'Meets deadline' | 'Misses deadline';
  bufferStatus: 'Meets buffer' | 'Misses buffer';
  timeSource: string;
  path: [number, number][]; // [lat, lng] array
}

export interface RoutePlanningResult {
  employeeCount: number;
  cabCount: number;
  officeRadiusKm: number;
  maxTripKm?: number;
  outOfRadiusCount: number;
  excludedByDistanceCount?: number;
  excludedByDistance?: Array<{
    name: string;
    address: string;
    matchedAddress?: string;
    lat: number;
    lng: number;
    officeDistanceKm: number;
  }>;
  bufferedDeadline: string;
  office: { name: string; lat: number; lng: number };
  routes: CalculatedRoute[];
  totalKm?: number;
  totalDriverPayout?: number;
  expectedCorporateRevenue?: number;
  projectedMargin?: number;
}
