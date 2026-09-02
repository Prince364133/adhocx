import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus, VehicleType } from '../enums';
import { GeoLocationDto } from './common.dto';

export class CreateRequirementDto {
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

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Rate per vehicle must be non-negative' })
  ratePerVehicle!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequirementResponseDto {
  id!: string;
  vendorId!: string;
  vehicleType!: VehicleType;
  quantity!: number;
  assignedQuantity!: number;
  pickupLocation!: GeoLocationDto;
  dropLocation!: GeoLocationDto;
  reportingTime!: string;
  ratePerVehicle!: number;
  totalAmount!: number;
  status!: RequirementStatus;
  notes?: string;
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
  assignedDrivers?: Array<{
    assignmentId: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    vehiclePlate?: string;
    tripStatus?: string;
  }>;
}

