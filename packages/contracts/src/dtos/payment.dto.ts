import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../enums';

export class InitiatePaymentDto {
  @IsNotEmpty({ message: 'Requirement ID is required' })
  @IsString()
  requirementId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than zero' })
  amount!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string = 'ONLINE_UPI';
}

export class PaymentResponseDto {
  id!: string;
  requirementId!: string;
  vendorId!: string;
  amount!: number;
  status!: PaymentStatus;
  paymentMethod?: string;
  transactionRef?: string;
  createdAt!: string;
  updatedAt!: string;
}

export class PaymentWebhookDto {
  @IsNotEmpty()
  @IsString()
  event!: string;

  @IsNotEmpty()
  @IsString()
  paymentId!: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class WalletTopUpOrderDto {
  @Type(() => Number)
  @IsNumber()
  @Min(100, { message: 'Minimum top-up amount is ₹100' })
  amount!: number;
}

export class WalletTopUpOrderResponseDto {
  orderId!: string;
  amount!: number;
  currency!: string;
  keyId!: string;
}

export class WalletTopUpVerifyDto {
  @IsNotEmpty()
  @IsString()
  razorpayOrderId!: string;

  @IsNotEmpty()
  @IsString()
  razorpayPaymentId!: string;

  @IsNotEmpty()
  @IsString()
  razorpaySignature!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;
}

export class UserWalletSummaryDto {
  walletBalance!: number;
  escrowBalance!: number;
  totalSpent!: number;
  currency!: string;
}

