import { IsOptional, IsString } from 'class-validator';

export class FleetDashboardQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class FleetDashboardKpiDto {
  totalDrivers!: number;
  activeDrivers!: number;
  driversOnTrip!: number;
  tripsToday!: number;
  completedTrips!: number;
  cancelledTrips!: number;
  periodEarnings!: number;
}

export class FleetActivityPointDto {
  date!: string;
  trips!: number;
  completed!: number;
  cancelled!: number;
}

export class FleetStatusBreakdownDto {
  status!: string;
  count!: number;
}

export class FleetRecentActivityDto {
  id!: string;
  type!: string;
  message!: string;
  occurredAt!: string;
  entityId?: string;
}

export class FleetDashboardResponseDto {
  fleetId!: string;
  fleetName!: string;
  fleetCode!: string;
  codeStatus!: string;
  kpis!: FleetDashboardKpiDto;
  activitySeries!: FleetActivityPointDto[];
  statusBreakdown!: FleetStatusBreakdownDto[];
  recentActivity!: FleetRecentActivityDto[];
}
