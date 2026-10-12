import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus, VehicleType } from '../enums';
import { GeoLocationDto } from './common.dto';

export class StartTripDto {
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(4, 6, { message: 'OTP must be 4-6 digits' })
  otp!: string;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  currentLocation!: GeoLocationDto;
}

export class CompleteTripDto {
  @ValidateNested()
  @Type(() => GeoLocationDto)
  currentLocation!: GeoLocationDto;

  @IsOptional()
  @IsNumber()
  tollCharges?: number;

  @IsOptional()
  @IsNumber()
  parkingCharges?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelTripDto {
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @IsString()
  reason!: string;
}

export class TripLocationUpdateDto {
  @ValidateNested()
  @Type(() => GeoLocationDto)
  location!: GeoLocationDto;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;
}

export class TripResponseDto {
  id!: string;
  requirementId!: string;
  assignmentId!: string;
  vendorId!: string;
  driverId!: string;
  vehicleId?: string;
  vehicleType!: VehicleType;
  pickupLocation!: GeoLocationDto;
  dropLocation!: GeoLocationDto;
  reportingTime!: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  status!: TripStatus;
  driverRate!: number;
  tollCharges?: number;
  parkingCharges?: number;
  totalDriverEarnings!: number;
  currentLocation?: GeoLocationDto;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  driver?: any;
  createdAt!: string;
  updatedAt!: string;
}

export class TripQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  status?: TripStatus;
}

export class TripEventResponseDto {
  id!: string;
  tripId!: string;
  eventType!: string;
  latitude?: number;
  longitude?: number;
  metadata?: any;
  createdAt!: string;
}

export class TripDetailResponseDto extends TripResponseDto {
  vendorOrganizationName?: string;
  startOtp?: string;
  events?: TripEventResponseDto[];
}

