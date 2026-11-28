import { IsDateString, IsEnum, IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DriverAvailability, VerificationStatus } from '../enums';
import { GeoLocationDto } from './common.dto';

export class UpdateAvailabilityDto {
  @Transform(({ value, obj }) => {
    const raw = value || obj?.availabilityStatus || obj?.status;
    return typeof raw === 'string' ? raw.toUpperCase() : raw;
  })
  @IsEnum(DriverAvailability, { message: 'Invalid availability status' })
  status!: DriverAvailability;

  @IsOptional()
  @IsEnum(DriverAvailability, { message: 'Invalid availability status' })
  availabilityStatus?: DriverAvailability;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoLocationDto)
  currentLocation?: GeoLocationDto;
}

/**
 * Idle-driver location heartbeat (POST /drivers/location). Only GPS-quality fixes are used for
 * dispatch (docs/23): source GPS / LAST_KNOWN with accuracy within DISPATCH_MAX_LOCATION_ACCURACY_M.
 */
export class DriverLocationPingDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  /** Reported horizontal accuracy (metres). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  accuracyM?: number;

  @IsOptional()
  @IsIn(['GPS', 'LAST_KNOWN', 'NETWORK', 'IP'])
  source?: 'GPS' | 'LAST_KNOWN' | 'NETWORK' | 'IP';

  /** Device time of the fix (ISO-8601). Server time when absent. */
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class KycSubmissionDto {
  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  dlNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  rcNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  dlFrontUrl?: string;

  @IsOptional()
  @IsString()
  dlBackUrl?: string;

  @IsOptional()
  @IsString()
  rcDocUrl?: string;

  @IsOptional()
  @IsString()
  rcFrontUrl?: string;

  @IsOptional()
  @IsString()
  rcBackUrl?: string;

  @IsOptional()
  @IsString()
  insuranceDocUrl?: string;

  @IsOptional()
  @IsString()
  vehiclePhotoUrl?: string;

  @IsOptional()
  @IsString()
  aadharFrontUrl?: string;

  @IsOptional()
  @IsString()
  aadharBackUrl?: string;

  @IsOptional()
  @IsString()
  panDocUrl?: string;

  @IsOptional()
  documentUrls?: string[];

  @IsOptional()
  documents?: Array<{ documentType: string; url: string; title?: string }>;

  @IsOptional()
  vehicle?: Record<string, any>;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  modelYear?: string;

  @IsOptional()
  @IsString()
  vehicleYear?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}

export class DriverKycDocumentDto {
  id!: string;
  documentType!: string;
  title!: string;
  fileUrl!: string;
  verified!: boolean;
  uploadedAt!: string;
}

export class DriverProfileDto {
  id!: string;
  userId!: string;
  fullName!: string;
  phone!: string;
  referralCode?: string;
  verificationStatus!: VerificationStatus;
  availabilityStatus!: DriverAvailability;
  vehicleType?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  walletBalance?: number;
  isFleetDriver?: boolean;
  fleetId?: string;
  trustScore?: number;
  averageRating?: number;
  ratingCount?: number;
  totalTrips?: number;
  /** Rolling acceptance rate (%) over the last 50 counted offers. */
  acceptanceRate?: number;
  /** ISO timestamp until which the driver receives no new offers (anti-cherry-picking pause). */
  cooldownUntil?: string;
  rejectionReason?: string;
  currentLocation?: GeoLocationDto;
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
  driverId?: string;
  email?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  bankVerificationStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  bankVerificationReason?: string;
  upiId?: string;
  documents?: any;
  createdAt!: string;
  updatedAt!: string;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  modelYear?: string;

  @IsOptional()
  @IsString()
  vehicleYear?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  vehiclePhotoUrl?: string;

  @IsOptional()
  @IsString()
  dlFrontUrl?: string;

  @IsOptional()
  @IsString()
  dlBackUrl?: string;

  @IsOptional()
  @IsString()
  rcDocUrl?: string;

  @IsOptional()
  @IsString()
  rcFrontUrl?: string;

  @IsOptional()
  @IsString()
  rcBackUrl?: string;

  @IsOptional()
  @IsString()
  insuranceDocUrl?: string;

  @IsOptional()
  @IsString()
  aadharFrontUrl?: string;

  @IsOptional()
  @IsString()
  aadharBackUrl?: string;

  @IsOptional()
  @IsString()
  panDocUrl?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  upiId?: string;
}

export class UpdateBankDetailsDto {
  @IsString()
  bankAccountName!: string;

  @IsString()
  bankAccountNumber!: string;

  @IsString()
  bankIfsc!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  upiId?: string;
}

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  contentBase64?: string;

  @IsOptional()
  @IsString()
  documentType?: string;
}

export class UploadDocumentResponseDto {
  url!: string;
  filename!: string;
  size!: number;
  checksum!: string;
  documentType?: string;
}

export class TrustScoreMetricItemDto {
  score!: number;
  max!: number;
  percentage!: number;
  title!: string;
  description!: string;
  status!: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT';
}

export class TrustScoreHistoryItemDto {
  id!: string;
  delta!: string;
  type!: 'BONUS' | 'PENALTY' | 'MILESTONE' | 'TRIP_COMPLETE';
  title!: string;
  date!: string;
  tripId?: string;
}

export class DriverTrustScoreBreakdownDto {
  currentScore!: number;
  maxScore!: number;
  tier!: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  tierBenefits!: string[];
  isRookieProtected!: boolean;
  rookieTripsRemaining!: number;
  metrics!: {
    completionRate: TrustScoreMetricItemDto;
    customerRating: TrustScoreMetricItemDto;
    acceptanceRate: TrustScoreMetricItemDto;
    punctuality: TrustScoreMetricItemDto;
    loyaltyStreak: TrustScoreMetricItemDto;
  };
  scoreHistory!: TrustScoreHistoryItemDto[];
  improvementTips!: string[];
}

export class ValidateReferralDto {
  @IsString()
  identifier!: string;
}

export class ValidateReferralResponseDto {
  valid!: boolean;
  message!: string;
  referrer?: {
    id: string;
    fullName: string;
    phoneMasked?: string;
    vehicleType?: string;
  };
}

export class DriverReferralItemDto {
  id!: string;
  refereeDriverId?: string;
  refereeName!: string;
  refereePhoneMasked!: string;
  refereePhotoUrl?: string;
  status!: string;
  rewardRupees!: number;
  isClaimable!: boolean;
  createdAt!: string;
  refereeVerifiedAt?: string;
  claimedAt?: string;
  refereeCompletedRides?: number;
  milestoneRides?: number;
  ridesRemaining?: number;
  progressPercentage?: number;
  isKycVerified?: boolean;
}

export class DriverReferralDashboardDto {
  referralCode!: string;
  phone?: string;
  totalReferrals!: number;
  verifiedReferrals!: number;
  vaultLockedRupees!: number;
  claimableRupees!: number;
  claimedRupees!: number;
  completedRides!: number;
  milestoneRides!: number;
  milestoneReached!: boolean;
  ridesRemainingToMilestone!: number;
  currentTier!: 'BRONZE' | 'SILVER' | 'GOLD';
  currentRewardRupees!: number;
  nextTier?: 'SILVER' | 'GOLD';
  referralsToNextTier?: number;
  activeRefereesCount?: number;
  completedMilestonesCount?: number;
  referees!: DriverReferralItemDto[];
}

export class ClaimReferralResponseDto {
  success!: boolean;
  claimedAmountRupees!: number;
  newWalletBalance!: number;
  claimedReferralIds!: string[];
  message!: string;
}


