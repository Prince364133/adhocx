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
