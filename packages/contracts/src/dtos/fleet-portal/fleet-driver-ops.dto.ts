import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common.dto';

export class FleetPortalDriverQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class ValidateFleetCodeDto {
  @IsNotEmpty({ message: 'Fleet Code is required' })
  @IsString()
  fleetCode!: string;
}

export class ReassignFleetVehicleDto {
  @IsNotEmpty({ message: 'Vehicle registration plate is required' })
  @IsString()
  vehiclePlate!: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveFleetDriverDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FleetDriverSummaryDto {
  id!: string;
  fullName!: string;
  phone!: string;
  verificationStatus!: string;
  availabilityStatus!: string;
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleModel?: string;
  tripsInPeriod!: number;
  earningsInPeriod?: number;
}

export class FleetDriverDetailDto extends FleetDriverSummaryDto {
  email?: string;
  fleetAssignedAt?: string;
  trips!: Array<{
    id: string;
    status: string;
    pickupAddress: string;
    dropAddress: string;
    earnings?: number;
    startedAt?: string;
    completedAt?: string;
  }>;
  monthlyActivity!: Array<{
    month: string;
    trips: number;
    earnings?: number;
  }>;
  payouts!: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}
