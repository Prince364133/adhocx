import { IsNotEmpty, IsOptional, IsString, IsBoolean, Length } from 'class-validator';
import { UserRole } from '../enums';

export class RequestOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isRegister?: boolean;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}

export class RequestOtpResponseDto {
  requestId!: string;
  expiresAt!: string;
  retryAfterSeconds!: number;
  message?: string;
}

export class VerifyOtpDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone!: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isRegister?: boolean;

  @IsOptional()
  @IsString()
  fullName?: string;
}

export class AuthUserDto {
  id!: string;
  phone!: string;
  role!: UserRole;
  fullName?: string;
  isApproved!: boolean;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresAt!: string;
  user!: AuthUserDto;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsNotEmpty({ message: 'Refresh token is required for revocation' })
  @IsString()
  refreshToken!: string;
}

export class UpdateUserDto {
  @IsString()
  fullName?: string;
}

export class UserMeResponseDto {
  id!: string;
  phone!: string;
  role!: UserRole;
  fullName?: string;
  status!: string;
  vendorProfile?: {
    id: string;
    organizationName: string;
    verificationStatus: string;
  };
  driverProfile?: {
    id: string;
    verificationStatus: string;
    availabilityStatus: string;
    vehicleType?: string;
    walletBalance: number;
  };
  createdAt!: string;
}
