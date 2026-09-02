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
