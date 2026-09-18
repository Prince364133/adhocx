import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DriverAvailability, VerificationStatus, VehicleType } from '../enums';
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

export class KycSubmissionDto {
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
  verificationStatus!: VerificationStatus;
  availabilityStatus!: DriverAvailability;
  vehicleType?: VehicleType;
  vehicleModel?: string;
  vehiclePlate?: string;
  walletBalance!: number;
  trustScore?: number;
  averageRating?: number;
  ratingCount?: number;
  totalTrips?: number;
  rejectionReason?: string;
  currentLocation?: GeoLocationDto;
  dlFrontUrl?: string;
  dlBackUrl?: string;
  rcDocUrl?: string;
  insuranceDocUrl?: string;
  vehiclePhotoUrl?: string;
  aadharFrontUrl?: string;
  aadharBackUrl?: string;
  panDocUrl?: string;
  documents?: DriverKycDocumentDto[];
  createdAt!: string;
  updatedAt!: string;
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

