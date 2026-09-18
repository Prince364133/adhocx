import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatus, DriverAvailability, VehicleType } from '../enums';
import { PaginationQueryDto } from './common.dto';

export class AdminDriverQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(DriverAvailability)
  availabilityStatus?: DriverAvailability;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminVendorQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class VerifyDriverKycDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDriverKycDto {
  @IsNotEmpty({ message: 'Rejection reason is mandatory' })
  @IsString()
  reason!: string;
}

export class SuspendDriverDto {
  @IsNotEmpty({ message: 'Suspension reason is mandatory' })
  @IsString()
  reason!: string;
}

export class ReactivateDriverDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyVendorDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectVendorDto {
  @IsNotEmpty({ message: 'Rejection reason is mandatory' })
  @IsString()
  reason!: string;
}

export class AdminDriverDetailDto {
  id!: string;
  userId!: string;
  fullName!: string;
  phone!: string;
  verificationStatus!: VerificationStatus;
  availabilityStatus!: DriverAvailability;
  vehicleType?: VehicleType;
  vehicleModel?: string;
  vehiclePlate?: string;
  walletBalance!: number;
  documents?: {
    idNumber?: string;
    dlNumber?: string;
    panNumber?: string;
    rcNumber?: string;
    profilePhotoUrl?: string;
    dlFrontUrl?: string;
    dlBackUrl?: string;
    rcDocUrl?: string;
    insuranceDocUrl?: string;
  };
  rejectionReason?: string;
  createdAt!: string;
  updatedAt!: string;
}

export class AdminVendorDetailDto {
  id!: string;
  userId!: string;
  organizationName!: string;
  fullName!: string;
  phone!: string;
  gstNumber?: string;
  address?: string;
  verificationStatus!: VerificationStatus;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}

export class AdminAssignmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminAssignmentListItemDto {
  id!: string;
  requirementId!: string;
  driverId!: string;
  driverName!: string;
  driverPhone!: string;
  vehiclePlate!: string;
  vehicleType!: string;
  status!: string;
  assignedAt!: string;
}

export class AdminPaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminPaymentListItemDto {
  id!: string;
  vendorId!: string;
  vendorName!: string;
  requirementId!: string;
  amount!: number;
  status!: string;
  paymentMethod!: string;
  transactionRef!: string;
  gatewayFee!: number;
  netSettlement!: number;
  createdAt!: string;
}

export class AdminPaymentMetricsDto {
  totalVolume!: number;
  captured!: number;
  escrow!: number;
  refunded!: number;
}

export class PricingTierDto {
  id!: string;
  vehicleType!: string;
  categoryLabel!: string;
  seatingCapacity!: string;
  description!: string;
  baseFare!: number;
  baseKm!: number;
  perKmRate!: number;
  driverSharePercent!: number;
  platformFeePercent!: number;
  surgeMultiplier!: number;
  status!: 'ACTIVE' | 'INACTIVE';
  updatedAt!: string;
}

export class UpdatePricingTierDto {
  @IsOptional()
  baseFare?: number;

  @IsOptional()
  baseKm?: number;

  @IsOptional()
  perKmRate?: number;

  @IsOptional()
  driverSharePercent?: number;

  @IsOptional()
  platformFeePercent?: number;

  @IsOptional()
  surgeMultiplier?: number;

  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CorridorAnalyticsDto {
  route!: string;
  vehicleClass!: string;
  demands!: number;
  fulfilled!: number;
  avgFare!: number;
  fulfillmentRate!: number;
}

export class OperationalSlaItemDto {
  metric!: string;
  value!: string;
  sla!: string;
  status!: string;
  desc!: string;
}

export class OperationalReportDto {
  fulfillmentRate!: string;
  avgDriverResponse!: string;
  platformGmv!: string;
  tripCancellationRate!: string;
  categoryBreakdown!: Array<{
    category: string;
    rate: number;
    demands: number;
  }>;
  slaHealth!: OperationalSlaItemDto[];
  corridors!: CorridorAnalyticsDto[];
}

export class SupportTicketDto {
  id!: string;
  reporterName!: string;
  reporterRole!: 'DRIVER' | 'VENDOR' | 'USER';
  reporterPhone!: string;
  relatedTripId?: string;
  issueType!: string;
  description!: string;
  status!: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED';
  operatorNotes?: string;
  createdAt!: string;
}

export class ResolveSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  status!: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED';

  @IsOptional()
  @IsString()
  notes?: string;
}

