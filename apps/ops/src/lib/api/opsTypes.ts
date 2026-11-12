export interface CorporateTenantOption {
  id: string;
  code: string;
  name: string;
  legalEntityName?: string;
  gstin?: string | null;
  status: string;
  createdAt?: string;
  activeShiftsCount?: number;
  activeCabsCount?: number;
  inTransitCount?: number;
  onTimePunctualityPct?: number;
  delayedCount?: number;
  unassignedCount?: number;
  _count?: {
    offices?: number;
    employees?: number;
    routes?: number;
    rosters?: number;
    invoices?: number;
  };
  policies?: {
    id: string;
    version: number;
    defaultVehicleCategory: string;
    defaultCapacity: number;
    stopDwellMinutes?: number;
    officeArrivalBufferMinutes: number;
    approachLeadMinutes?: number;
    dispatchWindowMinutes?: number;
    dispatchRetryIntervalMinutes?: number;
    searchRadiusKm?: number;
    cancelCutoffHours: number;
    maxRideMinutes: number;
  }[];
  users?: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    corporateRole?: string | null;
    status?: string;
  }[];
  offices?: {
    id: string;
    code: string;
    name: string;
    addressText?: string;
    latitude: number;
    longitude: number;
  }[];
}

export interface OnboardCorporateCompanyResponse {
  tenant: CorporateTenantOption;
  office: {
    id: string;
    code: string;
    name: string;
    addressText: string;
    latitude: number;
    longitude: number;
  };
  policy: any;
  shiftTemplate?: any;
  adminUser: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    corporateRole?: string | null;
  };
  portalAccess: {
    loginPath: string;
    email?: string | null;
    phone?: string | null;
    passwordConfigured: boolean;
    corporateRole?: string | null;
  };
}

export interface RouteStop {
  id: string;
  stopSequence: number;
  stopType: 'PICKUP' | 'DROPOFF';
  latitude: number;
  longitude: number;
  addressText: string;
  employeeName?: string | null;
  employeePhone?: string | null;
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

export interface RouteDirectionLeg {
  legIndex?: number;
  fromStopId?: string;
  fromSequence?: number;
  fromType?: string;
  fromLabel: string;
  fromAddress?: string;
  fromLat?: number;
  fromLng?: number;
  fromPhone?: string | null;
  toStopId?: string;
  toSequence?: number;
  toType?: string;
  toLabel: string;
  toAddress?: string;
  toLat?: number;
  toLng?: number;
  toPhone?: string | null;
  dwellBufferSeconds?: number;
  distanceMeters: number;
  distanceKm?: number;
  durationSeconds?: number;
  trafficDurationSeconds?: number;
  trafficDurationMinutes?: number;
  dwellSeconds?: number;
  plannedArrivalAtFrom?: string;
  plannedDepartFrom?: string;
  estimatedArrivalAtTo?: string;
  etaAtTo?: string;
  encodedPolyline?: string;
}

export interface RouteDirectionsResult {
  routeId: string;
  trafficSource: 'GOOGLE_MAPS_LIVE_TRAFFIC' | 'ROAD_FACTOR_ESTIMATE';
  isRealRoad: boolean;
  totalDurationSeconds: number;
  totalDurationMinutes: number;
  totalDwellSeconds: number;
  totalTravelWithWaitMinutes: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  encodedPolyline: string;
  decodedPath: Array<{ lat: number; lng: number }>;
  pathTuples: Array<[number, number]>;
  legs: RouteDirectionLeg[];
  refreshedAt: string;
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
  dispatchStatus?: string;
  dispatchAttempts?: number;
  dispatchWindowStartedAt?: string | null;
  lastDispatchAttemptAt?: string | null;
  dispatchFailureReason?: string | null;
  encodedPolyline?: string;
  decodedPath?: [number, number][];
  legs?: RouteDirectionLeg[];
  directions?: RouteDirectionsResult;
  isRealTraffic?: boolean;
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
    legalEntityName?: string | null;
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
  PLANNED: number;
  DISPATCHING: number;
  ASSIGNED: number;
  IN_TRANSIT: number;
  COMPLETED: number;
  CANCELLED: number;
  total: number;
  atRisk: number;
}

export interface OpsBoardResponse {
  asOf: string;
  date: string;
  timezone: string;
  filter: { tenantId: string | null; officeId: string | null };
  page: number;
  pageSize: number;
  counts: OpsBoardSummary;
  routes: Record<
    'PLANNED' | 'DISPATCHING' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED',
    { total: number; items: CorporateRouteItem[]; hasMore: boolean }
  >;
  atRisk: { leadMinutes: number; items: (CorporateRouteItem & { minutesToPickup?: number; reason?: string })[] };
  staleGps: {
    summary: { LIVE: number; STALE: number; OFFLINE: number };
    items: CorporateRouteItem[];
  };
}

export interface OperationsAnalyticsDashboard {
  asOf: string;
  filter: { tenantId: string; from: string; to: string; shiftTime?: string | null; timezone: string };
  trips: { total: number; byStatus: Record<string, number> };
  employeesServed: number;
  requests: { total: number; byStatus: Record<string, number>; cancelled: number; noShows: number; unserved: number };
  punctuality: {
    measuredStops: number;
    onTimePickups: number;
    latePickups: number;
    onTimePct: number | null;
    avgDelayMinutes: number | null;
  };
  seatUtilisation: { completedRoutes: number; assignedSeats: number; capacitySeats: number; pct: number | null };
  dailyTrips: Array<{ date: string; scheduled: number; completed: number }>;
}

export interface LiveOperationsResponse {
  asOf: string;
  timezone: string;
  period: { from: string; to: string; days: number };
  summary: {
    companies: number;
    activeCompanies: number;
    activeRoutes: number;
    plannedRoutes: number;
    completedToday: number;
    atRiskRoutes: number;
    staleGpsRoutes: number;
    routes14Days: number;
  };
  trend: {
    date: string;
    total: number;
    completed: number;
    inProgress: number;
    planned: number;
  }[];
  companies: {
    id: string;
    code: string;
    name: string;
    status: string;
    activeEmployees: number;
    offices: number;
    routes14Days: number;
    routesToday: number;
    completed14Days: number;
    inProgress14Days: number;
  }[];
  routes: {
    items: CorporateRouteItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  activities: {
    id: string;
    action: string;
    entityName: string;
    entityId: string | null;
    actorRole: string | null;
    createdAt: string;
  }[];
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

export type OpsDriverVerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface OpsDriverTrustSummary {
  score: number | null;
  averageRating: number | null;
  ratingCount: number;
  totalTrips: number;
  acceptanceRate?: number | null;
  acceptedOffers?: number;
  declinedOffers?: number;
}

export interface OpsDriverDocumentStatus {
  type: string;
  uploaded: boolean;
  status: 'MISSING' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | string;
}

export interface OpsDriverProfile {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: OpsDriverVerificationStatus;
  availabilityStatus: string;
  vehicleType: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  createdAt: string;
  userStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | string;
  updatedAt?: string;
}

export interface OpsDriverListItem {
  driverId: string;
  userId: string;
  profile: OpsDriverProfile;
  verificationDocuments: OpsDriverDocumentStatus[];
  trustScore: OpsDriverTrustSummary;
}

export interface OpsDriverTripHistory {
  id: string;
  status: string;
  pickupAddress: string | null;
  dropAddress: string | null;
  reportingTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface OpsDriverCorporateRouteHistory {
  id: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT' | string;
  status: string;
  tenant: { id: string; name: string } | null;
  office: { id: string; name: string } | null;
}

export interface OpsDriverDetail extends OpsDriverListItem {
  profile: OpsDriverProfile & { userStatus: string; updatedAt: string };
  trustScore: OpsDriverTrustSummary & {
    acceptanceRate: number | null;
    acceptedOffers: number;
    declinedOffers: number;
  };
  history: {
    trips: OpsDriverTripHistory[];
    corporateRoutes: OpsDriverCorporateRouteHistory[];
  };
}

export interface OpsDriverListResponse {
  items: OpsDriverListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  direction?: 'LOGIN' | 'LOGOUT';
  office?: { name: string; lat: number; lng: number };
  requiredArrival?: string;
  requiredArrivalDateTime?: string;
  departureDateTime?: string;
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
  sedanRouteCount?: number;
  suvRouteCount?: number;
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
    reason: 'OUTSIDE_CATCHMENT' | 'EXCEEDS_MAX_TRIP' | 'OUTSIDE_CATCHMENT_AND_MAX_TRIP';
    /** Set by the Ops client when LOGIN and LOGOUT plans are merged for display. */
    direction?: 'LOGIN' | 'LOGOUT';
  }>;
  autoExcludedEmployees?: string[];
  bufferedDeadline: string;
  office: { name: string; lat: number; lng: number };
  offices?: Array<{ name: string; lat: number; lng: number }>;
  routes: CalculatedRoute[];
  totalKm?: number;
  totalDriverPayout?: number;
  expectedCorporateRevenue?: number;
  projectedMargin?: number;
}

export interface RoutePlanningDirectionOutcome {
  direction: 'LOGIN' | 'LOGOUT';
  success: boolean;
  plan?: RoutePlanningResult;
  error?: string;
}

export interface RoutePlanningBatchResult {
  direction: 'BOTH';
  plans: RoutePlanningDirectionOutcome[];
  employeeCount: number;
  cabCount: number;
  sedanRouteCount: number;
  suvRouteCount: number;
  totalKm: number;
}

export type RoutePlanningResponse = RoutePlanningResult | RoutePlanningBatchResult;

export type OpsSupportTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CORPORATE'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export interface OpsSupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  employeeId: string;
  category: string;
  priority: string;
  status: OpsSupportTicketStatus;
  subject: string;
  description: string;
  assignedTeam: string | null;
  assignedToUserId: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string } | null;
  employee?: { id: string; fullName: string; email: string } | null;
  comments?: Array<{ id: string; message: string; userId: string; visibility: 'PUBLIC' | 'INTERNAL'; createdAt: string }>;
  activities?: Array<{ id: string; description: string; visibility: 'PUBLIC' | 'INTERNAL'; createdAt: string }>;
  attachments?: Array<{ id: string; fileName: string; fileType: string; fileSize: number; url: string; createdAt: string }>;
}
