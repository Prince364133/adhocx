import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FleetAdminRole } from '../../enums';

export class FleetLoginDto {
  @IsNotEmpty({ message: 'Identifier (email or phone) is required' })
  @IsString()
  identifier!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;
}

export class FleetAuthUserDto {
  id!: string;
  fleetId!: string;
  fleetName!: string;
  fleetCode!: string;
  fullName!: string;
  email?: string;
  phone!: string;
  role!: FleetAdminRole;
  permissions!: string[];
}

export class FleetAuthResponseDto {
  accessToken!: string;
  refreshToken?: string;
  user!: FleetAuthUserDto;
}

export class UpdateFleetCodeStatusDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['ACTIVE', 'DISABLED'])
  status!: 'ACTIVE' | 'DISABLED';

  @IsOptional()
  @IsString()
  reason?: string;
}
