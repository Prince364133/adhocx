import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FleetIncentiveEligibility,
  FleetIncentiveStatus,
  FleetIncentiveType,
} from '../../enums';

export class CreateFleetIncentiveDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEnum(FleetIncentiveType)
  type!: FleetIncentiveType;

  @IsEnum(FleetIncentiveEligibility)
  eligibilityScope!: FleetIncentiveEligibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleDriverIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetTrips?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredDurationMinutes?: number;

  @IsOptional()
  @IsString()
  timeWindowStart?: string;

  @IsOptional()
  @IsString()
  timeWindowEnd?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  rewardAmount!: number;

  @IsNotEmpty()
  @IsString()
  startsAt!: string;

  @IsNotEmpty()
  @IsString()
  endsAt!: string;
}

export class UpdateFleetIncentiveDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(FleetIncentiveStatus)
  status?: FleetIncentiveStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  rewardAmount?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;
}

export class FleetIncentiveDto {
  id!: string;
  fleetId!: string;
  name!: string;
  type!: FleetIncentiveType;
  eligibilityScope!: FleetIncentiveEligibility;
  eligibleDriverIds!: string[];
  targetTrips?: number;
  requiredDurationMinutes?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  rewardAmount!: number;
  startsAt!: string;
  endsAt!: string;
  status!: FleetIncentiveStatus;
  createdAt!: string;
}

export class FleetIncentiveProgressDto {
  incentiveId!: string;
  driverId!: string;
  driverName!: string;
  completedCount!: number;
  activeMinutes!: number;
  qualified!: boolean;
  qualifiedAt?: string;
  updatedAt!: string;
}
