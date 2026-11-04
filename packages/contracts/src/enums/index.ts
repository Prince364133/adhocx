export enum UserRole {
  VENDOR = 'VENDOR',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
  CORPORATE_ADMIN = 'CORPORATE_ADMIN',
  CORPORATE_MANAGER = 'CORPORATE_MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum DriverAvailability {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  HATCHBACK = 'HATCHBACK',
  TEMPO_TRAVELLER = 'TEMPO_TRAVELLER',
  BUS = 'BUS',
  TATA_ACE = 'TATA_ACE',
  PICKUP_TRUCK = 'PICKUP_TRUCK',
}

export type VehicleClass = VehicleType | string;

export enum FulfillmentMode {
  DIRECT_DISPATCH = 'DIRECT_DISPATCH',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum RequirementStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  DISPATCHING = 'DISPATCHING',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FULFILLED = 'FULFILLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_DRIVER_AVAILABLE = 'NO_DRIVER_AVAILABLE',
}

export enum OfferStatus {
  CREATED = 'CREATED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TripStatus {
  ASSIGNED = 'ASSIGNED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum LedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum CouponApplicableContext {
  WALLET_TOPUP = 'WALLET_TOPUP',
  REQUIREMENT_BOOKING = 'REQUIREMENT_BOOKING',
  ALL = 'ALL',
}

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  TRIP_OFFER = 'TRIP_OFFER',
  TRIP_ASSIGNED = 'TRIP_ASSIGNED',
  TRIP_STATUS = 'TRIP_STATUS',
  REQUIREMENT_UPDATE = 'REQUIREMENT_UPDATE',
  KYC_UPDATE = 'KYC_UPDATE',
  WALLET_UPDATE = 'WALLET_UPDATE',
  MARKETING_PROMO = 'MARKETING_PROMO',
  BROADCAST = 'BROADCAST',
}

// ==========================================
// CORPORATE MANAGED ETS ENUMS
// ==========================================

export enum CorporateTenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum CorporateTransportDirection {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum CorporateGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum CorporateRosterStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum CorporateRequestStatus {
  APPROVED = 'APPROVED',
  PLANNED = 'PLANNED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  UNSERVED = 'UNSERVED',
}

export enum CorporateRouteStatus {
  PLANNED = 'PLANNED',
  DISPATCHING = 'DISPATCHING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CorporateStopStatus {
  PENDING = 'PENDING',
  ARRIVED = 'ARRIVED',
  BOARDED = 'BOARDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export enum CorporateInvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export enum CorporateDriverEarningStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
}

export enum CorporateSosStatus {
  NEW = 'NEW',
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  ESCALATED = 'ESCALATED',
  RESPONDED = 'RESPONDED',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM',
}

export enum CorporateTicketCategory {
  CAB_DELAY = 'CAB_DELAY',
  DRIVER_BEHAVIOR = 'DRIVER_BEHAVIOR',
  ROUTE_ISSUE = 'ROUTE_ISSUE',
  BILLING = 'BILLING',
  LOST_ITEM = 'LOST_ITEM',
  VEHICLE_CONDITION = 'VEHICLE_CONDITION',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  OTHER = 'OTHER',
}

export enum CorporateTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CorporateTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CorporatePayoutBatchStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}
