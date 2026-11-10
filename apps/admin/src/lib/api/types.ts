export interface AdminMetrics {
  totalDrivers: number;
  verifiedDrivers: number;
  pendingDriversKyc: number;
  totalVendors: number;
  verifiedVendors: number;
  totalUsers?: number;
  activeRequirements: number;
  activeTrips: number;
  completedTrips: number;
  pendingSettlements: number;
}

export interface DriverListItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  availabilityStatus?: string;
  walletBalance?: number;
  trustScore?: number;
  averageRating?: number;
  ratingCount?: number;
  totalTrips?: number;
  acceptanceRate?: number;
  consecutiveDeclines?: number;
  cooldownUntil?: string | null;
  rejectionReason?: string;
  currentLat?: number;
  currentLng?: number;
  currentLocationAddress?: string;
  dlNumber?: string;
  panNumber?: string;
  rcNumber?: string;
  profilePhotoUrl?: string;
  dlFrontUrl?: string;
  dlBackUrl?: string;
  rcDocUrl?: string;
  rcFrontUrl?: string;
  rcBackUrl?: string;
  insuranceDocUrl?: string;
  vehiclePhotoUrl?: string;
  aadharFrontUrl?: string;
  aadharBackUrl?: string;
  panDocUrl?: string;
  kycDocuments?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface DriverKycDocument {
  id: string;
  documentType: 'DL_FRONT' | 'DL_BACK' | 'RC_BOOK' | 'RC_FRONT' | 'RC_BACK' | 'INSURANCE' | 'VEHICLE_PHOTO' | 'AADHAAR' | string;
  title?: string;
  fileUrl: string;
  verified: boolean;
  notes?: string;
  uploadedAt?: string;
  createdAt?: string;
}

export interface DriverDetail extends DriverListItem {
  documents: DriverKycDocument[];
  tripsCount?: number;
}

export interface VendorListItem {
  id: string;
  companyName: string;
  organizationName?: string;
  contactPerson: string;
  fullName?: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  requirementsCount?: number;
  escrowBalance?: number;
  createdAt: string;
  updatedAt?: string;
}

export type UserListItem = VendorListItem;

export interface VerificationItem {
  id: string;
  entityType: 'DRIVER' | 'VENDOR';
  name: string;
  organizationName?: string;
  phone: string;
  email?: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  gstNumber?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  documents: DriverKycDocument[];
  submittedAt: string;
  updatedAt?: string;
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
  /** Locked distance-pricing snapshot (admin responses only). */
  pricing?: RequirementPricingSnapshot;
}

export interface RequirementPricingSnapshot {
  planVersion: string;
  distanceM: number;
  vendorPricePaise: number;
  driverPayoutPaise: number;
  grossSpreadPaise: number;
  quotedAt: string;
}

export interface DisputeListItem {
  id: string;
  tripId: string;
  reporterId: string;
  reporterName?: string;
  accusedId: string;
  accusedName?: string;
  reason: string;
  description?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolutionText?: string;
  createdAt: string;
  updatedAt: string;
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
  metadata?: any;
  createdAt: string;
}

export interface SettlementListItem {
  id: string;
  driverId: string;
  driverName?: string;
  amount: number;
  status: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  transactionRef?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AuditLogItem extends Record<string, any> {
  id: string;
  actorId?: string;
  actorPhone?: string;
  actorRole?: string;
  action: string;
  entityName: string;
  entityId?: string;
  payload?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface CouponListItem {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  applicableTo: 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL';
  usageLimitTotal?: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  redemptionsCount?: number;
  totalDiscountDisbursed?: number;
}

export interface CouponRedemptionItem {
  id: string;
  couponId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  referenceType: string;
  referenceId: string;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt: string;
}

export interface CouponMetrics {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountDisbursed: number;
}

export interface CreateCouponPayload {
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  applicableTo?: 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL';
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export interface UpdateCouponPayload {
  title?: string;
  description?: string;
  discountType?: 'PERCENTAGE' | 'FLAT';
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  applicableTo?: 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL';
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage?: string | null;
  authorName: string;
  authorRole?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  views: number;
  readTime: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  coverImage?: string;
  authorName?: string;
  authorRole?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  readTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {}

export interface BlogMetrics {
  total: number;
  published: number;
  drafts: number;
  totalViews: number;
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
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'ACTIVE' | 'COMPLETED' | string;
  assignedRate?: number;
  pickupAddress?: string;
  dropAddress?: string;
  reportingTime?: string;
  assignedAt?: string;
  offeredAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface AdminPaymentItem {
  id: string;
  vendorId: string;
  vendorName?: string;
  requirementId?: string;
  amount: number;
  currency: string;
  type: 'ESCROW_HOLD' | 'ESCROW_RELEASE' | 'DIRECT' | 'PENALTY' | 'REFUND' | 'TOP_UP' | string;
  status: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED' | 'FAILED' | string;
  paymentGateway: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentMetrics {
  totalEscrowVolume: number;
  activeEscrowHolds: number;
  settledVolume: number;
  pendingTransactions: number;
}

/** Vehicle category catalogue entry. Prices are not here: they come from distance pricing plans. */
export interface VehicleCategory {
  id?: string;
  vehicleType: string;
  categoryLabel: string;
  seatingCapacity: string;
  maxSeats?: number;
  description?: string;
  iconKey?: string | null;
  isActive?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface CreateVehicleCategoryPayload {
  vehicleType: string;
  categoryLabel: string;
  seatingCapacity: string;
  description?: string;
  iconKey?: string;
}

export interface UpdateVehicleCategoryPayload {
  categoryLabel?: string;
  seatingCapacity?: string;
  description?: string;
  iconKey?: string;
  isActive?: boolean;
}

export interface SystemPolicyConfig {
  id?: string;
  commissionPercent: number;
  driverMonthlyFee?: number;
  driverTrialDays?: number;
  minWithdrawalAmount: number;
  escortFee?: number;
  convenienceFeePercent?: number;
  gstPercent?: number;
  updatedAt?: string;
}

export interface CorridorAnalytics {
  corridor: string;
  pickupCity: string;
  dropCity: string;
  totalTrips: number;
  totalRevenue: number;
  avgDriverRate: number;
  avgFulfillmentTimeMinutes: number;
  topVehicleType: string;
}

export interface OperationalReportData {
  period?: string;
  totalRequirements?: number;
  fulfilledRequirements?: number;
  fulfillmentRate?: string;
  fulfillmentRatePercent?: number;
  totalGrossBookingValue?: number;
  platformGmv?: string;
  platformRevenue?: number;
  totalDriverPayouts?: number;
  activeDrivers?: number;
  activeVendors?: number;
  averageTripRating?: number;
  tripCancellationRate?: string;
  avgDriverResponse?: string;
  categoryBreakdown?: Array<{ category: string; rate: number; demands: number }>;
  slaHealth?: Array<{ metric: string; value: string; sla: string; desc: string }>;
  corridorAnalytics?: CorridorAnalytics[];
}

export interface SupportTicketItem {
  id: string;
  ticketNumber?: string;
  userId?: string;
  reporterName: string;
  reporterRole: 'DRIVER' | 'VENDOR' | 'USER' | string;
  reporterPhone: string;
  relatedTripId?: string;
  issueType: string;
  description: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | string;
  operatorNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationCampaignItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  targetRole?: string;
  targetFilter?: {
    role?: string;
    availability?: string;
    verificationStatus?: string;
    vehicleTypes?: string[];
    city?: string;
    userIds?: string[];
    phones?: string[];
  };
  totalTargeted: number;
  successCount: number;
  failureCount: number;
  status: 'SENT' | 'FAILED' | 'SCHEDULED' | string;
  sentBy?: string;
  createdAt: string;
}

export interface NotificationMetrics {
  totalDelivered: number;
  totalCampaigns: number;
  activeDevicesCount: number;
  devicesByPlatform: {
    android: number;
    ios: number;
    web: number;
  };
  deliverySuccessRate: number;
  inAppNotificationsCount: number;
}

export interface AudienceFilter {
  role?: string;
  availability?: string;
  verificationStatus?: string;
  vehicleTypes?: string[];
  city?: string;
  userIds?: string[];
  phones?: string[];
  topic?: string;
}

export interface BroadcastPushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high';
  filter?: AudienceFilter;
  data?: Record<string, string>;
  dryRun?: boolean;
}

export interface TestPushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  targetToken?: string;
  targetUserId?: string;
  targetPhone?: string;
  data?: Record<string, string>;
}

export interface InAppNotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  imageUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AudienceEstimateResult {
  matchingUsers: number;
  matchingDevices: number;
  platformBreakdown: {
    android: number;
    ios: number;
    web: number;
  };
}





// ---------------------------------------------------------------------------
// Corporate ETS finance, support and safety (shapes mirror apps/api responses; money is integer
// paise serialised as strings)
// ---------------------------------------------------------------------------

/** SUBMITTED = created by the maker, waiting for a different admin (checker) to approve. */
export type CorporatePayoutBatchStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED';
/** PAID is only ever set from a signed payout-provider confirmation. */
export type CorporatePayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED';

interface CorporatePayoutBatchBase {
  id: string;
  batchNumber: string;
  idempotencyKey: string;
  status: CorporatePayoutBatchStatus;
  totalDrivers: number;
  totalRoutes: number;
  grossPaise: string;
  tdsPaise: string;
  netPayoutPaise: string;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  submittedByUserId: string | null;
  processedAt: string | null;
  provider: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporatePayoutBatchListItem extends CorporatePayoutBatchBase {
  payoutStatusCounts: Partial<Record<CorporatePayoutStatus, number>>;
}

export interface CorporatePayoutRow {
  id: string;
  batchId: string;
  driverId: string;
  driver: { id: string; fullName: string | null; phone: string | null } | null;
  kind: 'PAYOUT' | 'REVERSAL';
  reversalOfId: string | null;
  idempotencyKey: string;
  status: CorporatePayoutStatus;
  grossPaise: string;
  tdsPaise: string;
  netPaise: string;
  earningIds: string[];
  attemptCount: number;
  providerPayoutId: string | null;
  providerReference: string | null;
  failureReason: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  reversedAt: string | null;
}

export interface CorporatePayoutBatch extends CorporatePayoutBatchBase {
  payouts: CorporatePayoutRow[];
}

export interface CorporatePayoutReconciliation {
  from: string;
  to: string;
  generatedAt: string;
  payoutsChecked: number;
  confirmationsChecked: number;
  clean: boolean;
  mismatches: {
    payoutId: string;
    batchId: string;
    driverId: string;
    idempotencyKey: string;
    payoutStatus: CorporatePayoutStatus;
    payoutNetPaise: string;
    providerStatus: string | null;
    providerEventId?: string;
    providerAmountPaise?: string | null;
    reason: 'PAID_WITHOUT_CONFIRMATION' | 'STATUS_MISMATCH' | 'AMOUNT_MISMATCH';
  }[];
  unmatchedConfirmations: {
    eventId: string;
    provider: string;
    idempotencyKey: string | null;
    providerPayoutId: string | null;
    status: string;
    amountPaise: string | null;
    receivedAt: string;
  }[];
}

interface CorporateRateCardBase {
  id: string;
  vehicleCategory: string;
  version: number;
  baseDistanceMeters: number;
  perKmPaise: string;
  perHourPaise: string | null;
  minimumPaise: string;
  noShowPaise: string;
  cancellationPaise: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  retiredAt: string | null;
  createdAt: string;
  /** The version the billing / dispatch selection rule picks right now. */
  inEffect: boolean;
}

export interface CorporateClientRateCard extends CorporateRateCardBase {
  tenantId: string;
  baseFarePaise: string;
  perExtraStopPaise: string;
}

export interface CorporateDriverRateCard extends CorporateRateCardBase {
  basePayoutPaise: string;
  tollReimbursementPaise: string;
  createdByUserId: string | null;
  retiredByUserId: string | null;
}

export interface CreateCorporateClientRateCardInput {
  tenantId: string;
  vehicleCategory: string;
  baseFarePaise: string;
  baseDistanceMeters?: number;
  perKmPaise: string;
  perExtraStopPaise?: string;
  perHourPaise?: string | null;
  minimumPaise?: string;
  noShowPaise?: string;
  cancellationPaise?: string;
  effectiveFrom: string;
}

export interface CreateCorporateDriverRateCardInput {
  vehicleCategory: string;
  basePayoutPaise: string;
  baseDistanceMeters?: number;
  perKmPaise: string;
  tollReimbursementPaise?: string;
  perHourPaise?: string | null;
  minimumPaise?: string;
  noShowPaise?: string;
  cancellationPaise?: string;
  effectiveFrom: string;
}

export interface CorporateCreditNote {
  id: string;
  tenantId: string;
  invoiceId: string;
  disputeId: string;
  creditNoteNumber: string;
  subtotalPaise: string;
  gstPaise: string;
  totalPaise: string;
  reason: string;
  issuedByUserId: string;
  issuedAt: string;
}

export interface CorporateInvoiceDispute {
  id: string;
  tenantId: string;
  invoiceId: string;
  invoiceLineId: string | null;
  raisedByUserId: string;
  reason: string;
  claimedAmountPaise: string;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  approvedAmountPaise: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  creditNote?: CorporateCreditNote | null;
}

export type CorporateTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type CorporateTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CorporateSupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  employeeId: string;
  routeId: string | null;
  stopId: string | null;
  category: string;
  priority: CorporateTicketPriority;
  status: CorporateTicketStatus;
  subject: string;
  description: string;
  adminNotes: string | null;
  resolutionNotes: string | null;
  assignedToUserId: string | null;
  slaMinutes: number;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CorporateSosStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'RESPONDED'
  | 'RESOLVED'
  | 'FALSE_ALARM';

export interface CorporateSosAlert {
  id: string;
  tenantId: string | null;
  routeId: string;
  stopId: string | null;
  triggeredById: string;
  triggeredByRole: string;
  latitude: string | number;
  longitude: string | number;
  batteryPct: number | null;
  audioUrl: string | null;
  status: CorporateSosStatus;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  autoEscalated: boolean;
  escalationLevel: number;
  assignedToAdminId: string | null;
  assignedAdminName: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  route?: {
    id: string;
    tenantId: string;
    direction: string;
    shiftDate: string;
    shiftTime: string;
    driver: { id: string; fullName: string; phone: string | null } | null;
    tenant: { id: string; name: string; code: string } | null;
    office: { id: string; name: string } | null;
  };
}

// ==========================================
// DYNAMIC DISTANCE-BASED PRICING TYPES (PRD v1.0)
// ==========================================

export interface DistancePricingSlab {
  id: string;
  planId: string;
  minDistanceMExclusive: number;
  maxDistanceMInclusive: number;
  vendorPricePaise: number;
  driverPayoutPaise: number;
  grossSpreadPaise: number;
  grossMarginPercent: number;
  vendorPriceRupees: number;
  driverPayoutRupees: number;
  grossSpreadRupees: number;
  minKm: number;
  maxKm: number;
  displayRange: string;
  active: boolean;
  sortOrder: number;
}

export interface DistancePricingPlan {
  id: string;
  vehicleCategory: string;
  version: string;
  name?: string | null;
  status: 'DRAFT' | 'PUBLISHING' | 'ACTIVE' | 'SCHEDULED' | 'RETIRED';
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdBy?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  slabs: DistancePricingSlab[];
  slabCount?: number;
}

export interface CreatePricingSlabInput {
  minDistanceMExclusive: number;
  maxDistanceMInclusive: number;
  vendorPricePaise: number;
  driverPayoutPaise: number;
  active?: boolean;
}

export interface CreateDistancePricingPlanPayload {
  vehicleCategory?: string;
  /** Omit to let the server assign the next version for the category. */
  version?: string;
  name?: string;
  cloneFromPlanId?: string;
  slabs?: CreatePricingSlabInput[];
}

export interface PricingAuditItem {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValueJson?: any;
  newValueJson?: any;
  reason?: string | null;
  timestamp: string;
}

export interface DistanceSimulationResult {
  distanceMeters: number;
  displayedKm: number;
  planId: string;
  planVersion: string;
  vehicleCategory: string;
  slabId: string;
  slabRange: string;
  vendorPricePaise: number;
  vendorPriceRupees: number;
  driverPayoutPaise: number;
  driverPayoutRupees: number;
  grossSpreadPaise: number;
  grossSpreadRupees: number;
  grossMarginPercent: number;
}

// =============================================================================
// DIGIO KYC / KYB VERIFICATION TYPES
// =============================================================================

export interface DigioVerificationItem {
  id: string;
  verificationType: string;
  category: string;
  status: string;
  verified: boolean;
  identifier?: string | null;
  uniqueRequestId: string;
  digioRequestId?: string | null;
  verifiedName?: string | null;
  matchScore?: number | null;
  complianceOk?: boolean | null;
  complianceNotes?: string | null;
  errorMessage?: string | null;
  summary?: Record<string, any> | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DigioComplianceAlert {
  severity: 'BLOCKER' | 'WARNING';
  code: string;
  message: string;
}

export interface DigioEntityVerificationsResponse {
  configured: boolean;
  driverId?: string;
  vendorId?: string;
  latestByType: Record<string, DigioVerificationItem>;
  complianceAlerts?: DigioComplianceAlert[];
  history: DigioVerificationItem[];
}

export interface DigioAdminDriverSuiteResult {
  driverId: string;
  executedChecks: string[];
  results: Record<string, DigioVerificationItem>;
  errors: Record<string, string>;
  complianceAlerts?: DigioComplianceAlert[];
}


