import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus, VehicleType, FulfillmentMode } from '../enums';
import { GeoLocationDto } from './common.dto';

export class CreateRequirementDto {
  @IsOptional()
  @IsEnum(FulfillmentMode, { message: 'Invalid fulfillment mode' })
  fulfillmentMode?: FulfillmentMode = FulfillmentMode.DIRECT_DISPATCH;

  @IsEnum(VehicleType, { message: 'Invalid vehicle type' })
  vehicleType!: VehicleType;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  pickupLocation!: GeoLocationDto;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  dropLocation!: GeoLocationDto;

  @IsDateString({}, { message: 'reportingTime must be a valid ISO date string' })
  reportingTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Rate per vehicle must be non-negative' })
  ratePerVehicle?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Suggested budget must be non-negative' })
  suggestedBudget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Server-stored corporate zonal quote ID (POST /pricing/zonal/quote). Prices the trip from the quote snapshot. */
  @IsOptional()
  @IsUUID('4', { message: 'zonalQuoteId must be a valid quote ID' })
  zonalQuoteId?: string;
}

export class RequirementResponseDto {
  id!: string;
  vendorId!: string;
  fulfillmentMode!: FulfillmentMode;
  vehicleType!: VehicleType;
  quantity!: number;
  assignedQuantity!: number;
  pickupLocation!: GeoLocationDto;
  dropLocation!: GeoLocationDto;
  reportingTime!: string;
  ratePerVehicle?: number;
  suggestedBudget?: number;
  totalAmount!: number;
  status!: RequirementStatus;
  notes?: string;
  /** Audience-filtered zonal quote snapshot (vendors never receive driver payout or margin). */
  zonalQuote?: Record<string, unknown>;
  createdAt!: string;
  updatedAt!: string;
}

export class CancelRequirementDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequirementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}

export class RequirementDetailResponseDto extends RequirementResponseDto {
  remainingQuantity!: number;
  offersCount!: number;
  bidsCount?: number;
  bids?: Array<any>;
  offers?: Array<{
    id: string;
    requirementId: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    driverRating: number;
    driverTrustScore: number;
    vehicleType?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    /** Omitted for vendors on corporate zonal trips (driver payout is internal). */
    offeredRate?: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    respondedAt?: string;
  }>;
  searchStartedAt?: string;
  searchEndedAt?: string | null;
  searchDurationMinutes?: number;
  driversApproachedCount?: number;
  assignedDrivers?: Array<{
    assignmentId: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    vehiclePlate?: string;
    tripStatus?: string;
    tripId?: string;
    startOtp?: string;
  }>;
}

export class RequirementSummaryDto {
  totalRequirements!: number;
  totalVehiclesRequired!: number;
  totalVehiclesFulfilled!: number;
  assignedCount!: number;
  searchingCount!: number;
  completedCount!: number;
}

