export interface RawCsvRow {
  employee_name?: string;
  name?: string;
  pickup_address?: string;
  pickup?: string;
  address?: string;
  office_address?: string;
  office?: string;
  destination?: string;
  required_arrival_date?: string;
  date?: string;
  required_arrival_time?: string;
  time?: string;
  gender?: string;
  phone_number?: string;
  phone?: string;
  mobile?: string;
  [key: string]: string | undefined;
}

export interface RowValidationError {
  rowIndex: number;
  employeeName: string;
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface CsvValidationReport {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  errors: RowValidationError[];
  warnings: RowValidationError[];
  distinctOffices: string[];
  distinctShiftTimes: string[];
}

export interface GeocodedPoint {
  lat: number;
  lng: number;
  formattedAddress: string;
  isSimulatedGeocode?: boolean;
}

export interface TestEmployee {
  id: string;
  name: string;
  phone: string;
  gender: string;
  pickupAddress: string;
  officeAddress: string;
  arrivalDate: string;
  arrivalTime: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  pickupSequence?: number;
  estimatedPickupTime?: string;
  directDistanceKm?: number;
  outOfRadius?: boolean;
  isSimulatedGeocode?: boolean;
}

export interface RouteOptionLeg {
  legIndex: number;
  fromLabel: string;
  fromAddress: string;
  toLabel: string;
  toAddress: string;
  distanceKm: number;
  durationMinutes: number;
}

export type CandidateType =
  | 'BEST_ROUTE'
  | 'ALTERNATIVE_ROUTE'
  | 'SHORTEST_DISTANCE'
  | 'FASTEST_JOURNEY'
  | 'BEST_ALTERNATIVE'
  | 'BALANCED_ALTERNATIVE';

export interface RouteScoreBreakdown {
  distanceScore: number;
  timeScore: number;
  detourScore: number;
  utilizationScore: number;
  costScore: number;
}

export interface RouteOption {
  index: number;
  candidateType: CandidateType;
  title: string;
  tag: string;
  summary: string;
  description: string;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  formattedDistance: string;
  formattedEta: string;
  encodedPolyline: string;
  decodedPath: Array<[number, number]>;
  isRealRoad: boolean; // true if returned by Google Routes API, false if offline local matrix
  avoidTolls: boolean;
  isShortest: boolean;
  isFastest: boolean;
  isRecommended?: boolean;
  isEquivalent?: boolean;
  equivalentToIndex?: number;
  googleMapsUrl: string;
  legs: RouteOptionLeg[];
  orderedStopIds: string[];
  orderedPassengers?: TestEmployee[];
  averageIdf?: number;
  maxIdf?: number;
  worstPassengerName?: string;
  safetyCompliant?: boolean;
  score: number; // 0 - 100 normalized multi-objective score
  scoreBreakdown: RouteScoreBreakdown;
  recommendationReason: string;
  deltaVsBest: {
    kmDelta: number;
    minDelta: number;
    pctDelta: number;
  };
  isDeduplicated?: boolean;
  deduplicationNote?: string;
}

export type VehicleCategorySelection = 'ALL' | 'SEDAN' | 'SUV';

export interface VehicleCategoryOption {
  vehicleType: 'SEDAN' | 'SUV';
  categoryLabel: string;
  maxSeats: number;
}

export const FLEET_VEHICLE_CATEGORIES: VehicleCategoryOption[] = [
  { vehicleType: 'SEDAN', categoryLabel: 'Sedan', maxSeats: 4 },
  { vehicleType: 'SUV', categoryLabel: 'SUV', maxSeats: 6 },
];

export type OptimizationProfile = 'BALANCED' | 'DISTANCE_PRIORITY' | 'TIME_PRIORITY';

export interface OptimizationProfileWeights {
  distanceWeight: number;
  timeWeight: number;
  detourWeight: number;
  utilizationWeight: number;
  costWeight: number;
}

export const PROFILE_WEIGHTS: Record<OptimizationProfile, OptimizationProfileWeights> = {
  BALANCED: {
    distanceWeight: 0.30,
    timeWeight: 0.30,
    detourWeight: 0.15,
    utilizationWeight: 0.15,
    costWeight: 0.10,
  },
  DISTANCE_PRIORITY: {
    distanceWeight: 0.55,
    timeWeight: 0.15,
    detourWeight: 0.10,
    utilizationWeight: 0.10,
    costWeight: 0.10,
  },
  TIME_PRIORITY: {
    distanceWeight: 0.15,
    timeWeight: 0.55,
    detourWeight: 0.15,
    utilizationWeight: 0.05,
    costWeight: 0.10,
  },
};

export interface ClusterAuditInfo {
  originalPassengerIds: string[];
  optimizedPassengerIds: string[];
  sequencingMethod: 'EXACT_PERMUTATION' | 'GREEDY_2OPT';
  totalEvaluatedSequences: number;
  directSumKm: number;
  optimizedRouteKm: number;
  distanceImprovementKm: number;
  distanceImprovementPct: number;
  avgDetourMinutes: number;
  vehicleUtilizationPct: number;
  localSolveTimeMs: number;
  externalApiTimeMs: number;
  isRealRoad: boolean;
  scoringProfileUsed: OptimizationProfile;
  isNightShift?: boolean;
  safetyCompliant?: boolean;
  escortRequired?: boolean;
  averageIdf?: number;
  maxIdf?: number;
  auditLogs: string[];
}

export interface OptimizedCabCluster {
  clusterId: string;
  cabIndex: number;
  vehicleCategory: 'SEDAN' | 'SUV';
  capacity: number;
  passengerCount: number;
  officeAddress: string;
  officeLat: number;
  officeLng: number;
  departure: string;
  arrival: string;
  distanceKm: number;
  driveMinutes: number;
  driverPayout: number;
  corporateRevenue: number;
  projectedMargin: number;
  isNightShift?: boolean;
  safetyCompliant?: boolean;
  escortRequired?: boolean;
  averageIdf?: number;
  maxIdf?: number;
  passengers: TestEmployee[];
  routeOptions: RouteOption[]; // 3 distinct evaluated candidates
  selectedRouteIndex: number;
  totalDirectKm: number;
  savedDistanceKm: number;
  savingsPercentage: number;
  auditInfo: ClusterAuditInfo;
}

export interface FleetKpiSummary {
  totalEmployees: number;
  totalCabs: number;
  sedanCount: number;
  suvCount: number;
  totalFleetKm: number;
  totalFleetDurationMinutes: number;
  avgEmployeeTripMinutes: number;
  avgEmployeeDetourMinutes: number;
  fleetVehicleUtilizationPct: number;
  totalDriverPayout: number;
  totalCorporateRevenue: number;
  totalProjectedMargin: number;
  totalDirectSumKm: number;
  totalDistanceSavedKm: number;
  totalDistanceSavedPct: number;
}

export interface OptimizationResult {
  success: boolean;
  source: 'GOOGLE_ROUTES_V2' | 'OPTIMIZED_ROAD_MATRIX';
  isRealRoad: boolean;
  profile: OptimizationProfile;
  totalEmployees: number;
  totalCabs: number;
  officeAddress: string;
  officeLat: number;
  officeLng: number;
  officeRadiusKm: number;
  maxTripKm: number;
  vehicleCategoryCounts: Record<string, number>;
  outOfRadiusCount: number;
  validationReport: CsvValidationReport;
  fleetKpis: FleetKpiSummary;
  clusters: OptimizedCabCluster[];
  summary: {
    totalCabs?: number;
    totalFleetKm?: number;
    totalOptimizedKm: number;
    totalDirectKm: number;
    totalDirectSumKm?: number;
    savedKm: number;
    savedDistanceKm?: number;
    savedPercentage: number;
    fleetSavingsPercentage?: number;
    avgTripDurationMinutes: number;
    totalDriverPayout: number;
    totalCorporateRevenue: number;
    totalProjectedMargin: number;
    computationTimeMs?: number;
    geocodingTimeMs?: number;
    routingTimeMs?: number;
  };
  timing: {
    totalTimeMs: number;
    geocodingTimeMs: number;
    clusteringTimeMs: number;
    sequencingTimeMs: number;
    routingTimeMs: number;
  };
  unassignedEmployees?: UnassignedEmployeeRecord[];
  fleetQuotaDeficit?: {
    requiredSedans: number;
    requiredSUVs: number;
    recommendedWaveTimeMinutes?: number;
  };
  giniDetourCoefficient?: number;
  safetyAuditSummary?: {
    jurisdiction: string;
    compliant: boolean;
    escortsAssigned: number;
    violations: string[];
  };
}

// ============================================================================
// ENTERPRISE REGULATORY SAFETY POLICY ARCHITECTURE
// ============================================================================

export type SupportedJurisdiction =
  | 'TELANGANA'
  | 'KARNATAKA'
  | 'MAHARASHTRA'
  | 'TAMIL_NADU'
  | 'NATIONAL_STANDARD';

export interface SafetyPolicyConfig {
  jurisdiction: SupportedJurisdiction;
  nightWindowStartHour: number; // e.g., 20 = 20:00 (8:00 PM)
  nightWindowEndHour: number;   // e.g., 6 = 06:00 (6:00 AM)
  enforceFirstPickupMaleLogin: boolean;
  enforceLastDropMaleLogout: boolean;
  mandatorySecurityEscortIfAllFemale: boolean;
  escortConsumesSeatCapacity: boolean;
  escortAvailable: boolean;
  requireLiveGpsSosTelemetry: boolean;
  legalReference?: string;
  policyNotes?: string;
}

export const DEFAULT_SAFETY_POLICIES: Record<SupportedJurisdiction, SafetyPolicyConfig> = {
  TELANGANA: {
    jurisdiction: 'TELANGANA',
    nightWindowStartHour: 20,
    nightWindowEndHour: 6,
    enforceFirstPickupMaleLogin: true,
    enforceLastDropMaleLogout: true,
    mandatorySecurityEscortIfAllFemale: true,
    escortConsumesSeatCapacity: true,
    escortAvailable: true,
    requireLiveGpsSosTelemetry: true,
    legalReference: 'Telangana Shops and Establishments Act, 1988 (Night Shift Exemption Order for IT/ITeS)',
    policyNotes: 'Mandatory GPS tracking, female night commute security escort when no male co-passenger, first pickup male on login.',
  },
  KARNATAKA: {
    jurisdiction: 'KARNATAKA',
    nightWindowStartHour: 20,
    nightWindowEndHour: 6,
    enforceFirstPickupMaleLogin: true,
    enforceLastDropMaleLogout: true,
    mandatorySecurityEscortIfAllFemale: true,
    escortConsumesSeatCapacity: true,
    escortAvailable: true,
    requireLiveGpsSosTelemetry: true,
    legalReference: 'Karnataka Shops and Commercial Establishments Act, 1961 - S.O. 741 (Section 25 Notification)',
    policyNotes: 'Vehicles must be GPS tracked, CCTV equipped or verified driver telemetry with route pre-authorization.',
  },
  MAHARASHTRA: {
    jurisdiction: 'MAHARASHTRA',
    nightWindowStartHour: 21,
    nightWindowEndHour: 6,
    enforceFirstPickupMaleLogin: false,
    enforceLastDropMaleLogout: true,
    mandatorySecurityEscortIfAllFemale: true,
    escortConsumesSeatCapacity: true,
    escortAvailable: true,
    requireLiveGpsSosTelemetry: true,
    legalReference: 'Maharashtra Shops and Establishments (Regulation of Employment and Conditions of Service) Rules, 2017',
    policyNotes: 'Night window starts at 21:30 in specific Pune/Mumbai municipal zones; escort required for all-female routes.',
  },
  TAMIL_NADU: {
    jurisdiction: 'TAMIL_NADU',
    nightWindowStartHour: 19,
    nightWindowEndHour: 6,
    enforceFirstPickupMaleLogin: true,
    enforceLastDropMaleLogout: true,
    mandatorySecurityEscortIfAllFemale: true,
    escortConsumesSeatCapacity: true,
    escortAvailable: true,
    requireLiveGpsSosTelemetry: true,
    legalReference: 'Tamil Nadu Shops and Establishments Act, 1947 - Section 20-A (Night Work by Women Workers)',
    policyNotes: 'Night window starts at 19:00 (7:00 PM); dedicated security escort deployment required.',
  },
  NATIONAL_STANDARD: {
    jurisdiction: 'NATIONAL_STANDARD',
    nightWindowStartHour: 20,
    nightWindowEndHour: 6,
    enforceFirstPickupMaleLogin: true,
    enforceLastDropMaleLogout: true,
    mandatorySecurityEscortIfAllFemale: true,
    escortConsumesSeatCapacity: true,
    escortAvailable: true,
    requireLiveGpsSosTelemetry: true,
    legalReference: 'Occupational Safety, Health and Working Conditions Code, 2020 (Central Rules Part X)',
    policyNotes: 'Universal baseline safety: female safe-drop sequence, armed/verified escort, verified driver KYC.',
  },
};

// ============================================================================
// HARD CONSTRAINTS & PHYSICAL FLEET INVENTORY
// ============================================================================

export interface OptimizationConstraints {
  maxRideMinutes: number;           // e.g. 60 min (hard cap)
  maxDetourRatio: number;           // e.g. 1.45 (IDF hard cap)
  maxTripKm: number;                // e.g. 50 km (hard cap)
  availableSedans?: number;         // Physical fleet quota (undefined = infinite)
  availableSUVs?: number;           // Physical fleet quota (undefined = infinite)
  arrivalEarlyBufferMinutes: number;// Earliest acceptable drop before shift
  arrivalLateBufferMinutes: number; // Latest acceptable drop before shift (buffer)
  stopDwellMinutes: number;         // Dwell time per pickup stop
}

export const DEFAULT_OPTIMIZATION_CONSTRAINTS: OptimizationConstraints = {
  maxRideMinutes: 60,
  maxDetourRatio: 1.45,
  maxTripKm: 50,
  arrivalEarlyBufferMinutes: 20,
  arrivalLateBufferMinutes: 10,
  stopDwellMinutes: 3,
};

export interface UnassignedEmployeeRecord {
  employeeId: string;
  employeeName: string;
  pickupAddress: string;
  reason:
    | 'FLEET_EXHAUSTED'
    | 'NO_FEASIBLE_CORRIDOR'
    | 'MAX_RIDE_DURATION_EXCEEDED'
    | 'MAX_DETOUR_EXCEEDED'
    | 'SAFETY_POLICY_UNMET'
    | 'OUT_OF_SERVICE_RADIUS';
  recommendation: string;
}

// ============================================================================
// ASYNCHRONOUS JOB LIFECYCLE & IDEMPOTENCY
// ============================================================================

export type JobLifecycleState =
  | 'QUEUED'
  | 'VALIDATING'
  | 'GEOCODING'
  | 'CLUSTERING'
  | 'LOCAL_SEARCH'
  | 'ROUTING'
  | 'VALIDATING_RESULTS'
  | 'AWAITING_APPROVAL'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING'
  | 'PARTIALLY_COMPLETED';

export interface OptimizationJobRecord {
  jobId: string;
  tenantId: string;
  idempotencyKey?: string;
  status: JobLifecycleState;
  progressPct: number;
  currentStepMessage: string;
  result?: OptimizationResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
  heartbeatAt?: number;
}

// ============================================================================
// DYNAMIC RE-OPTIMIZATION (DISRUPTION RECOVERY)
// ============================================================================

export type DisruptionType =
  | 'DRIVER_CANCELLATION'
  | 'VEHICLE_BREAKDOWN'
  | 'EMPLOYEE_NO_SHOW'
  | 'EMPLOYEE_ADDED'
  | 'TRAFFIC_INCIDENT_ROAD_CLOSURE';

export interface DisruptionEvent {
  disruptionId: string;
  type: DisruptionType;
  cabIndex?: number;
  employeeIds?: string[];
  newEmployee?: TestEmployee;
  incidentLocation?: { lat: number; lng: number };
  description: string;
  timestamp: string;
}

export interface ReoptimizationResult {
  disruptionId: string;
  type: DisruptionType;
  affectedCabIndices: number[];
  unaffectedCabIndices: number[];
  reassignedEmployees: Array<{
    employeeId: string;
    employeeName: string;
    fromCabIndex?: number;
    toCabIndex: number;
    newPickupTime: string;
    newSequence: number;
  }>;
  newCabsDeployed: number;
  updatedClusters: OptimizedCabCluster[];
  explanation: string;
  costDelta: number;
}

// ============================================================================
// EXPLAINABLE ALLOCATION & WHAT-IF SIMULATION
// ============================================================================

export interface ExplainableCabAllocation {
  cabIndex: number;
  vehicleCategory: 'SEDAN' | 'SUV';
  selectionReason: string;
  capacityUtilizationReason: string;
  detourEquityExplanation: string;
  safetyComplianceExplanation: string;
}

export interface WhatIfScenarioResult {
  scenarioName: string;
  vehicleSelection: VehicleCategorySelection;
  totalCabs: number;
  sedanCount: number;
  suvCount: number;
  totalCost: number;
  totalKm: number;
  avgIdf: number;
  unassignedCount: number;
  costDifferenceVsCurrent: number;
}
