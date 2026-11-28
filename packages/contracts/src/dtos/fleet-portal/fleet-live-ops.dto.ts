import { IsOptional, IsString } from 'class-validator';

export class FleetLiveOpsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  driverId?: string;
}

export class FleetLiveOpsRideDto {
  tripId!: string;
  driverId!: string;
  driverName!: string;
  vehiclePlate?: string;
  vehicleType?: string;
  status!: string;
  pickupAddress!: string;
  dropAddress!: string;
  startedAt?: string;
  lastUpdatedAt!: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    recordedAt: string;
    isStale: boolean;
  };
}

export class FleetLiveOpsResponseDto {
  lastRefreshedAt!: string;
  locationStaleAfterSeconds!: number;
  summary!: {
    driversAvailable: number;
    driversOnTrip: number;
    activeRides: number;
  };
  rides!: FleetLiveOpsRideDto[];
}
