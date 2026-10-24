import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { VerificationStatus } from '../enums';

export class CreateUserProfileDto {
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsNotEmpty({ message: 'Contact person name is required' })
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsBoolean()
  isBillingAddressSame?: boolean;

  @IsOptional()
  @IsString()
  monthlyTrips?: string;

  @IsOptional()
  @IsString()
  spocDesignation?: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsOptional()
  @IsString()
  alternateEmail?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  operationalCampus?: string;
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

  brandName?: string;
  businessType?: string;
  website?: string;
  panNumber?: string;
  city?: string;
  state?: string;
  pincode?: string;
  billingAddress?: string;
  isBillingAddressSame?: boolean;
  monthlyTrips?: string;
  spocDesignation?: string;
  alternatePhone?: string;
  alternateEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  operationalCampus?: string;
}

