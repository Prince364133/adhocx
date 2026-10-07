export interface AdminMetrics {
  totalDrivers: number;
  verifiedDrivers: number;
  pendingDriversKyc: number;
  totalVendors: number;
  verifiedVendors: number;
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
  documentType: 'DL_FRONT' | 'DL_BACK' | 'RC_BOOK' | 'INSURANCE' | 'VEHICLE_PHOTO' | 'AADHAAR' | string;
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
  fulfillmentMode?: 'DIRECT_DISPATCH' | 'BIDDING';
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
  bidsCount?: number;
  createdAt: string;
  /** Stored zonal quote snapshot (admin view: includes `internal` driver payout and spread). */
  zonalQuote?: ZonalQuoteResponse;
}

export interface BidListItem {
  id: string;
  requirementId: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverTrustScore?: number;
  vehicleModel?: string;
  vehiclePlate?: string;
  bidAmount: number;
  etaMinutes?: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
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

export interface RateCard {
  id?: string;
  vehicleType: string;
  categoryLabel?: string;
  displayName?: string;
  seatingCapacity?: string;
  description?: string;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  perMinuteRate?: number;
  minimumFare?: number;
  deadheadThresholdKm?: number;
  deadheadPerKmRate?: number;
  nightChargeMultiplier?: number;
  surgeMultiplier: number;
  platformFeePercent?: number;
  platformFeePercentage?: number;
  driverSharePercent?: number;
  driverSharePercentage?: number;
  iconKey?: string;
  status?: string;
  updatedAt?: string;
}

export interface CreateRateCardPayload {
  vehicleType: string;
  categoryLabel: string;
  seatingCapacity: string;
  description: string;
  iconKey?: string;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  perMinuteRate?: number;
  driverSharePercent?: number;
  platformFeePercent?: number;
  surgeMultiplier?: number;
}

export interface SystemPolicyConfig {
  id?: string;
  commissionPercent: number;
  driverMonthlyFee?: number;
  driverTrialDays?: number;
  minWithdrawalAmount: number;
  convenienceFeePercent?: number;
  gstPercent?: number;
  updatedAt?: string;
}

export type ZonalHubId = 'HITEC_NANAKRAMGUDA' | 'KOKAPET';
export type ZonalDirection = 'INBOUND_TO_OFFICE' | 'OUTBOUND_FROM_OFFICE';
export type ZonalLocalityStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'INACTIVE';

export interface ZonalLocality {
  id: string;
  name: string;
  zoneId: string;
  zoneLabel: string;
  reviewStatus: ZonalLocalityStatus;
  bookable: boolean;
  aliases: string[];
  hasVerifiedPin: boolean;
  notes?: string;
}

export interface ZonalRateCardResponse {
  audience: 'VENDOR' | 'DRIVER';
  version: string;
  effectiveFrom: string;
  currency: string;
  hubs: { id: ZonalHubId; displayName: string; lat: number; lng: number }[];
  zones: { id: string; label: string }[];
  /** matrix[hubId][zoneId] = { sedan, suv, escortSedan?, escortSuv? } in INR */
  matrix: Record<string, Record<string, { sedan: number; suv: number; escortSedan?: number; escortSuv?: number }>>;
  localities: ZonalLocality[];
  notes: string[];
}

export interface ZonalQuoteRequest {
  officeHubId: ZonalHubId;
  direction: ZonalDirection;
  localityId: string;
  vehicleType: 'SEDAN' | 'SUV';
  hasEscort: boolean;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
}

export interface ZonalQuoteResponse {
  canAutoQuote: boolean;
  requiresOpsReview: boolean;
  reasonCode?: string;
  reason?: string;
  quoteId?: string;
  rateVersion?: string;
  officeHub: { id: string; displayName: string };
  locality: { id: string; name: string; zoneId: string; zoneLabel: string } | null;
  direction: ZonalDirection;
  vehicleType: string;
  hasEscort?: boolean;
  lineItems?: { code: string; label: string; amount: number }[];
  baseFare?: number;
  escortFee?: number;
  totalAmount?: number;
  expiresAt?: string;
  internal?: { driverRateVersion: string; driverEarning: number; platformSpread: number; escortPayable: number };
}

export interface ZonalRateCardVersion {
  id: string;
  audience: 'VENDOR' | 'DRIVER';
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  effectiveFrom: string;
  publishedAt: string | null;
  publishedBy: string | null;
  notes: string | null;
  rowCount: number;
  rows: { hubId: string; zoneId: string; vehicleType: string; baseAmountPaise: number; escortMaxPaise: number }[];
}

export interface UpdateZonalLocalityRequest {
  reviewStatus?: ZonalLocalityStatus;
  zoneId?: string;
  centerLat?: number;
  centerLng?: number;
  aliases?: string[];
  reason: string;
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
  period: string;
  totalRequirements: number;
  fulfilledRequirements: number;
  fulfillmentRatePercent: number;
  totalGrossBookingValue: number;
  platformRevenue: number;
  totalDriverPayouts: number;
  activeDrivers: number;
  activeVendors: number;
  averageTripRating: number;
  corridorAnalytics: CorridorAnalytics[];
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




