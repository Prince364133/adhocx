import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DisputeStatus } from '../enums';

export class CreateDisputeDto {
  @IsString({ message: 'tripId must be a valid string' })
  tripId!: string;

  @IsOptional()
  @IsString({ message: 'accusedId must be a valid string' })
  accusedId?: string;

  @IsString({ message: 'reason is required' })
  reason!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus, { message: 'Invalid dispute status' })
  status!: DisputeStatus;

  @IsString({ message: 'resolutionText is required' })
  resolutionText!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

export class DisputeQueryDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  tripId?: string;

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

export class DisputeResponseDto {
  id!: string;
  tripId!: string;
  reporterId!: string;
  accusedId!: string;
  reason!: string;
  description?: string;
  status!: DisputeStatus;
  resolutionText?: string;
  createdAt!: string;
  updatedAt!: string;

  reporterName?: string;
  accusedName?: string;
}
