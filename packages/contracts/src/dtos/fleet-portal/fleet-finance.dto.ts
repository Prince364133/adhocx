import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FleetPayoutStatus } from '../../enums';
import { PaginationQueryDto } from '../common.dto';

export class FleetEarningsQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class FleetEarningsResponseDto {
  totalEarnings!: number;
  deductions?: number;
  netAmount!: number;
  pendingAmount?: number;
  monthlySummary!: Array<{
    month: string;
    grossEarnings: number;
    trips: number;
  }>;
  driverBreakdown!: Array<{
    driverId: string;
    driverName: string;
    trips: number;
    earnings: number;
  }>;
}

export class FleetPayoutQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class RequestFleetPayoutDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Payout amount must be greater than zero' })
  amount!: number;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FleetPayoutRecordDto {
  id!: string;
  referenceCode!: string;
  amount!: number;
  currency!: string;
  status!: FleetPayoutStatus;
  rejectionReason?: string;
  periodStart?: string;
  periodEnd?: string;
  settledAt?: string;
  createdAt!: string;
}

export class FleetShortfallRecordDto {
  id!: string;
  periodStart!: string;
  periodEnd!: string;
  minimumTripsRequired!: number;
  actualTripsOffered!: number;
  shortfallTrips!: number;
  compensationAmount?: number;
  status!: string;
  notes?: string;
  createdAt!: string;
}
