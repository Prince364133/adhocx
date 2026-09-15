import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CouponDiscountType, CouponApplicableContext } from '../enums';

export class CreateCouponDto {
  @IsNotEmpty({ message: 'Coupon code is required' })
  @IsString()
  code!: string;

  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Discount type is required' })
  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Discount value must be a number' })
  @Min(0.01, { message: 'Discount value must be greater than zero' })
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsEnum(CouponApplicableContext)
  applicableTo?: CouponApplicableContext = CouponApplicableContext.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimitTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimitPerUser?: number = 1;

  @IsNotEmpty({ message: 'Valid from date is required' })
  @IsDateString()
  validFrom!: string;

  @IsNotEmpty({ message: 'Valid until date is required' })
  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsEnum(CouponApplicableContext)
  applicableTo?: CouponApplicableContext;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usageLimitTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usageLimitPerUser?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @IsNotEmpty({ message: 'Coupon code is required' })
  @IsString()
  code!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Order amount must be greater than zero' })
  amount!: number;

  @IsOptional()
  @IsEnum(CouponApplicableContext)
  context?: CouponApplicableContext = CouponApplicableContext.ALL;
}

export class CouponValidationResponseDto {
  valid!: boolean;
  couponId?: string;
  code?: string;
  title?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  discountAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
  message?: string;
}

export class CouponResponseDto {
  id!: string;
  code!: string;
  title!: string;
  description?: string | null;
  discountType!: CouponDiscountType;
  discountValue!: number;
  maxDiscountAmount?: number | null;
  minOrderAmount!: number;
  applicableTo!: CouponApplicableContext;
  usageLimitTotal?: number | null;
  usageLimitPerUser!: number;
  usedCount!: number;
  validFrom!: string;
  validUntil!: string;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
  redemptionsCount?: number;
  totalDiscountDisbursed?: number;
}

export class CouponRedemptionResponseDto {
  id!: string;
  couponId!: string;
  userId!: string;
  userName?: string;
  userPhone?: string;
  referenceType!: string;
  referenceId!: string;
  orderAmount!: number;
  discountAmount!: number;
  finalAmount!: number;
  redeemedAt!: string;
}

export class CouponMetricsDto {
  totalCoupons!: number;
  activeCoupons!: number;
  totalRedemptions!: number;
  totalDiscountDisbursed!: number;
}
