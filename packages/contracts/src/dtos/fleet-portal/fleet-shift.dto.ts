import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FleetShiftStatus } from '../../enums';

export class CreateFleetShiftDto {
  @IsNotEmpty()
  @IsString()
  driverId!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  shiftStart!: string;

  @IsNotEmpty()
  @IsString()
  shiftEnd!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFleetShiftDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  shiftStart?: string;

  @IsOptional()
  @IsString()
  shiftEnd?: string;

  @IsOptional()
  @IsEnum(FleetShiftStatus)
  status?: FleetShiftStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FleetShiftDto {
  id!: string;
  fleetId!: string;
  driverId!: string;
  driverName?: string;
  vehiclePlate?: string;
  title!: string;
  shiftStart!: string;
  shiftEnd!: string;
  status!: FleetShiftStatus;
  notes?: string;
  createdAt!: string;
}
