import { IsNotEmpty, IsOptional, IsString, IsEmail, IsIn } from 'class-validator';
import { PaginationQueryDto } from './common.dto';

export class CreateFleetDto {
  @IsNotEmpty({ message: 'Fleet name is required' })
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsNotEmpty({ message: 'Fleet owner name is required' })
  @IsString()
  ownerName!: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFleetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFleetStatusDto {
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignDriverFleetDto {
  @IsNotEmpty({ message: 'Target fleet ID is required' })
  @IsString()
  fleetId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferDriverFleetDto {
  @IsNotEmpty({ message: 'Target fleet ID is required' })
  @IsString()
  targetFleetId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveDriverFleetDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FleetQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export class DriverFleetQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  fleetId?: string;

  @IsOptional()
  @IsIn(['ALL', 'ASSIGNED', 'UNASSIGNED'])
  associationStatus?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
}
