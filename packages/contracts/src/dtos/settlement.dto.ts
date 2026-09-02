import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementStatus, LedgerEntryType } from '../enums';

export class WithdrawalRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal amount is ₹100' })
  amount!: number;

  @IsNotEmpty({ message: 'Bank account holder name is required' })
  @IsString()
  bankAccountName!: string;

  @IsNotEmpty({ message: 'Bank account number is required' })
  @IsString()
  bankAccountNumber!: string;

  @IsNotEmpty({ message: 'Bank IFSC code is required' })
  @IsString()
  bankIfsc!: string;
}

export class SettlementResponseDto {
  id!: string;
  driverId!: string;
  amount!: number;
  status!: SettlementStatus;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  transactionRef?: string;
  processedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}

export class AdminProcessSettlementDto {
  @IsEnum(SettlementStatus, { message: 'Status must be SETTLED or FAILED' })
  status!: SettlementStatus;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class LedgerEntryResponseDto {
  id!: string;
  accountType!: string;
  accountId!: string;
  entryType!: LedgerEntryType;
  amount!: number;
  balanceAfter!: number;
  referenceType!: string;
  referenceId!: string;
  description!: string;
  createdAt!: string;
}

export class DriverWalletSummaryDto {
  walletBalance!: number;
  totalEarned!: number;
  totalWithdrawn!: number;
  pendingSettlements!: number;
  recentLedgerEntries!: LedgerEntryResponseDto[];
}
