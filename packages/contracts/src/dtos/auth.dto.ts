import { IsNotEmpty, IsOptional, IsString, IsBoolean, Length, IsEmail } from 'class-validator';
import { UserRole } from '../enums';

export class RequestOtpDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  channel?: 'SMS' | 'EMAIL';

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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

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

export class SocialAuthDto {
  @IsNotEmpty({ message: 'Provider is required (GOOGLE or APPLE)' })
  @IsString()
  provider!: 'GOOGLE' | 'APPLE';

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Phone number or email is required' })
  @IsString()
  identifier!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Phone number or email is required' })
  @IsString()
  identifier!: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp!: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @Length(6, 100, { message: 'Password must be at least 6 characters' })
  password!: string;
}

export class SetPasswordDto {
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Length(6, 100, { message: 'Password must be at least 6 characters' })
  password!: string;
}

export class AuthUserDto {
  id!: string;
  phone?: string;
  email?: string;
  role!: UserRole;
  fullName?: string;
  photoUrl?: string;
  isApproved!: boolean;
  hasPassword?: boolean;
  isOnboarded?: boolean;
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
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class UserMeResponseDto {
  id!: string;
  phone?: string;
  email?: string;
  role!: UserRole;
  fullName?: string;
  photoUrl?: string;
  status!: string;
  hasPassword?: boolean;
  isOnboarded?: boolean;
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
    rejectionReason?: string;
  };
  createdAt!: string;
}
