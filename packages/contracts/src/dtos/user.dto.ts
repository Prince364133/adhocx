import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '../enums';

export class CreateUserProfileDto {
  @IsNotEmpty({ message: 'Company / Organization name is required' })
  @IsString()
  organizationName!: string;

  @IsNotEmpty({ message: 'Contact person name is required' })
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UserProfileDto {
  id!: string;
  userId!: string;
  organizationName!: string;
  fullName!: string;
  phone!: string;
  verificationStatus!: VerificationStatus;
  gstNumber?: string;
  address?: string;
  createdAt!: string;
  updatedAt!: string;
}
