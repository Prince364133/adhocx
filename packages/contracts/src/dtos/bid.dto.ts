import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BidStatus } from '../enums';

export class CreateBidDto {
  @IsString({ message: 'requirementId must be a valid string' })
  requirementId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Bid amount must be greater than 0' })
  bidAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'ETA minutes must be at least 1 minute' })
  etaMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AcceptBidDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BidQueryDto {
  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsEnum(BidStatus)
  status?: BidStatus;

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
}

export class BidResponseDto {
  id!: string;
  requirementId!: string;
  driverId!: string;
  bidAmount!: number;
  etaMinutes?: number;
  notes?: string;
  status!: BidStatus;
  createdAt!: string;
  updatedAt!: string;

  // Enriched driver card details for requester UI
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverTrustScore?: number;
  vehicleModel?: string;
  vehiclePlate?: string;
  isMasked?: boolean;
}
