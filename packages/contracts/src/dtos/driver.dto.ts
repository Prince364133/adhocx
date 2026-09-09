import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
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
  @IsNotEmpty({ message: 'Aadhaar / National ID number is required' })
  @IsString()
  idNumber!: string;

  @IsNotEmpty({ message: 'Driving license number is required' })
  @IsString()
  dlNumber!: string;

  @IsNotEmpty({ message: 'PAN number is required' })
  @IsString()
  panNumber!: string;

  @IsNotEmpty({ message: 'Vehicle RC number is required' })
  @IsString()
  rcNumber!: string;

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
  currentLocation?: GeoLocationDto;
  createdAt!: string;
  updatedAt!: string;
}

export class UploadDocumentDto {
  @IsNotEmpty({ message: 'Original filename is required' })
  @IsString()
  filename!: string;

  @IsNotEmpty({ message: 'MIME type is required' })
  @IsString()
  mimeType!: string;

  @IsNotEmpty({ message: 'Base64 encoded file content is required' })
  @IsString()
  contentBase64!: string;
}

export class UploadDocumentResponseDto {
  url!: string;
  filename!: string;
  size!: number;
  checksum!: string;
}

