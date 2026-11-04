/**
 * Response shapes of the corporate API, taken from the controllers / services under
 * apps/api/src/domains/corporate. Only the fields the portal renders are typed.
 * Money is integer paise serialised as a string.
 */

export type Direction = 'LOGIN' | 'LOGOUT';
export type GpsState = 'LIVE' | 'STALE' | 'OFFLINE';

export interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface AuthUser {
  id: string;
  role: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface OtpRequestResponse {
  requestId: string;
  expiresAt: string;
  retryAfterSeconds: number;
  message?: string;
}

export interface Office {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  addressText: string;
  latitude: string;
  longitude: string;
  _count?: { employees: number; routes: number };
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  legalEntityName?: string;
  gstin?: string | null;
  status: string;
  offices?: Office[];
  _count?: { employees: number; routes: number; rosters: number; invoices: number };
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsFilterEcho {
  tenantId: string;
  officeId: string | null;
  from: string;
  to: string;
  direction: Direction | null;
  shiftTime: string | null;
  timezone: string;
}

export interface Dashboard {
  asOf: string;
  filter: AnalyticsFilterEcho;
  trips: { total: number; byStatus: Record<string, number> };
  employeesServed: number;
  requests: { total: number; byStatus: Record<string, number>; cancelled: number; noShows: number; unserved: number };
  punctuality: {
    graceMinutes: number;
    boardedStops: number;
    measuredStops: number;
    excludedNoArrival: number;
    onTimePickups: number;
    latePickups: number;
    onTimePct: number | null;
    avgDelayMinutes: number | null;
  };
  seatUtilisation: { completedRoutes: number; assignedSeats: number; capacitySeats: number; pct: number | null };
  safety: { sosAlerts: number; byStatus: Record<string, number> };
}

export interface AttendanceRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string;
  department: string | null;
  scheduledRides: number;
  boarded: number;
  noShows: number;
  cancellations: number;
  lateDays: number;
}

export interface AttendancePage {
  asOf: string;
  filter: AnalyticsFilterEcho;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  items: AttendanceRow[];
}

// ── Employees ──────────────────────────────────────────────────────────────

export interface EmployeeLocation {
  id: string;
  addressText: string;
  landmark: string | null;
  latitude: string;
  longitude: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  officeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  department: string | null;
  costCenter: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  office?: { id: string; name: string; code: string } | null;
  locations?: EmployeeLocation[];
  _count?: { transportRequests: number };
}

export interface StopSummary {
  id: string;
  routeId: string;
  stopSequence: number;
  stopType?: string;
  plannedEta?: string;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
  status: string;
  noShowReason?: string | null;
}

export interface EmployeeRequest {
  id: string;
  rosterId: string | null;
  scheduledDate: string;
  shiftTime: string;
  direction: Direction;
  status: string;
  routeStop: StopSummary | null;
}

export interface EmployeeRequestsResponse {
  employeeId: string;
  limit: number;
  items: EmployeeRequest[];
}

// ── Rosters & scheduling ───────────────────────────────────────────────────

export interface RosterValidationError {
  rowNumber: number;
  field: string;
  invalidValue: unknown;
  message: string;
}

export interface RosterValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  loginRequestsCount: number;
  logoutRequestsCount: number;
  errors: RosterValidationError[];
}

export interface RosterUploadResult {
  rosterId: string;
  tenantId: string;
  officeId: string;
  rosterDate: string;
  version?: number;
  status?: string;
  totalEmployeesProcessed: number;
  loginRequestsCreated?: number;
  logoutRequestsCreated?: number;
  duplicateRequestsSkipped?: number;
  entriesCreated?: number;
}

export interface Roster {
  id: string;
  tenantId: string;
  officeId: string;
  rosterDate: string;
  shiftTime: string;
  direction: Direction;
  status: string;
  passengerCount: number;
  version: number;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  office?: { id: string; code: string; name: string; addressText?: string };
  _count?: { requests: number };
}

export interface RosterRequest {
  id: string;
  employeeId: string;
  scheduledDate: string;
  shiftTime: string;
  direction: Direction;
  status: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email?: string;
    phoneNumber?: string;
    gender?: string;
    department?: string | null;
  };
  routeStop?: StopSummary | null;
}

export interface ShiftTemplate {
  id: string;
  officeId: string;
  name: string;
  loginTime: string;
  logoutTime: string;
  weekdays?: number[];
  isOvernight: boolean;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  officeId: string | null;
  holidayDate: string;
  name: string;
  office?: { id: string; name: string } | null;
}

// ── Routes & tracking ──────────────────────────────────────────────────────

export interface RouteListItem {
  id: string;
  tenantId: string;
  officeId: string;
  shiftDate: string;
  shiftTime: string;
  direction: Direction;
  vehicleCategory: string;
  maxCapacity: number;
  assignedPassengerCount: number;
  targetPickup1Time: string;
  targetOfficeArrivalTime: string;
  estDistanceMeters: number;
  estDurationSeconds: number;
  status: string;
  atRisk?: boolean;
  office?: { id: string; code: string; name: string };
  driver?: { id: string; fullName: string | null; phone: string | null } | null;
  vehicle?: { id: string; registrationNumber: string; model: string | null; vehicleType: string | null } | null;
  _count?: { stops: number };
}

export interface RouteStop extends StopSummary {
  stopType: string;
  plannedEta: string;
  latitude: string;
  longitude: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    gender?: string;
    phoneNumber?: string;
    department?: string | null;
  } | null;
  transportRequest?: { id: string; status: string } | null;
}

export interface RouteDetail extends RouteListItem {
  office?: { id: string; code: string; name: string; addressText?: string };
  stops: RouteStop[];
}

export interface RouteTracking {
  routeId: string;
  routeStatus: string;
  gpsState: GpsState;
  lastFixAgeSec: number | null;
  isLive: boolean;
  position: {
    lat: number;
    lng: number;
    speedKph: number | null;
    heading: number | null;
    accuracyM: number | null;
    recordedAt: string;
  } | null;
  source: 'CACHE' | 'HISTORY' | 'NONE';
  asOf: string;
}

export interface TimelineItem {
  kind: 'TRIP_EVENT' | 'ASSIGNMENT';
  id: string;
  at: string;
  type: string;
  stopId?: string | null;
  actorRole?: string | null;
  payload?: unknown;
}

export interface RouteTimeline {
  routeId: string;
  items: TimelineItem[];
  truncated: boolean;
}

// ── Safety & support ───────────────────────────────────────────────────────

export interface SosAlert {
  id: string;
  routeId: string;
  stopId: string | null;
  triggeredByRole: string;
  latitude: string;
  longitude: string;
  status: string;
  escalationLevel: number;
  autoEscalated: boolean;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  route?: {
    id: string;
    direction: Direction;
    shiftDate: string;
    shiftTime: string;
    driver?: { id: string; fullName: string | null; phone: string | null } | null;
    office?: { id: string; name: string } | null;
  } | null;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  employeeId: string;
  routeId: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  resolutionNotes: string | null;
  slaMinutes: number;
  resolvedAt: string | null;
  createdAt: string;
}

// ── Billing ────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotalPaise: string;
  gstPaise: string;
  totalAmountPaise: string;
  status: string;
  createdAt: string;
  _count?: { lines: number };
}

export interface InvoiceLine {
  id: string;
  routeId: string;
  lineType: string;
  billableDistanceMeters: number;
  amountPaise: string;
  rateCardVersion: number | null;
  noShowCount: number;
  noShowPaise: string | null;
  route?: {
    id: string;
    shiftDate: string;
    shiftTime: string;
    direction: Direction;
    estDistanceMeters: number;
    assignedPassengerCount: number;
  } | null;
}

export interface InvoiceDetail extends Invoice {
  lines: InvoiceLine[];
}

export interface InvoiceDispute {
  id: string;
  invoiceId: string;
  invoiceLineId: string | null;
  reason: string;
  claimedAmountPaise: string;
  approvedAmountPaise: string | null;
  status: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  creditNote?: CreditNote | null;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  disputeId: string;
  creditNoteNumber: string;
  subtotalPaise: string;
  gstPaise: string;
  totalPaise: string;
  reason: string;
  issuedAt: string;
}

export interface CorporateRateCard {
  id: string;
  vehicleCategory: string;
  version: number;
  baseFarePaise: string;
  baseDistanceMeters: number;
  perKmPaise: string;
  perExtraStopPaise: string;
  perHourPaise: string | null;
  minimumPaise: string;
  noShowPaise: string;
  cancellationPaise: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  retiredAt: string | null;
  inEffect?: boolean;
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface CorporateUser {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  corporateTenantId: string;
  corporateRole: string | null;
  corporateOfficeIds: string[];
  createdAt: string;
}
