import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsString({ message: 'tripId must be a valid string' })
  tripId!: string;

  @IsOptional()
  @IsString({ message: 'revieweeId must be a valid string' })
  revieweeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ReviewResponseDto {
  id!: string;
  tripId!: string;
  reviewerId!: string;
  revieweeId!: string;
  driverId?: string;
  rating!: number;
  feedback?: string;
  createdAt!: string;

  reviewerName?: string;
  revieweeName?: string;
}

export class ReviewQueryDto {
  @IsOptional()
  @IsString()
  driverId?: string;

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
