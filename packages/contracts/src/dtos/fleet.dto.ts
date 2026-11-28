import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FleetAdminRole,
  FleetPayoutStatus,
  FleetSupportTicketStatus,
} from '../enums';
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

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Portal owner password must be at least 8 characters' })
  portalPassword?: string;
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

export class CreateFleetAdminUserDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName!: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsEnum(FleetAdminRole)
  role?: FleetAdminRole;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateFleetAdminUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsEnum(FleetAdminRole)
  role?: FleetAdminRole;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class AdminFleetPayoutQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  fleetId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ProcessFleetPayoutDto {
  @IsEnum(FleetPayoutStatus)
  status!: FleetPayoutStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateFleetShortfallDto {
  @IsNotEmpty({ message: 'Period start date is required' })
  @IsString()
  periodStart!: string;

  @IsNotEmpty({ message: 'Period end date is required' })
  @IsString()
  periodEnd!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumTripsRequired!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualTripsOffered!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compensationAmount?: number;

  @IsOptional()
  @IsIn(['RECORDED', 'APPROVED', 'SETTLED', 'WAIVED'])
  status?: 'RECORDED' | 'APPROVED' | 'SETTLED' | 'WAIVED';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminFleetSupportQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  fleetId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminReplyFleetSupportDto {
  @IsNotEmpty({ message: 'Reply body is required' })
  @IsString()
  body!: string;
}

export class AdminUpdateFleetSupportStatusDto {
  @IsEnum(FleetSupportTicketStatus)
  status!: FleetSupportTicketStatus;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
