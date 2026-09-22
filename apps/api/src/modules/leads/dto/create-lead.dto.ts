import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEnterpriseLeadDto {
  @ApiProperty({ description: 'Corporate entity / enterprise company name', example: 'Infosys Limited' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiProperty({ description: 'Primary contact representative full name', example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  contactName!: string;

  @ApiProperty({ description: 'Official work email address', example: 'rajesh.kumar@infosys.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Direct contact phone / mobile number', example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ description: 'Operating city / hub', default: 'Hyderabad' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Corporate fleet operational requirement details' })
  @IsString()
  @IsOptional()
  fleetRequirements?: string;

  @ApiPropertyOptional({ description: 'Estimated monthly fleet rides volume', example: '100-500' })
  @IsString()
  @IsOptional()
  monthlyTripsEstimate?: string;

  @ApiPropertyOptional({ description: 'Preferred commercial vehicle categories', example: '4-Seater Sedan, 7-Seater MUV' })
  @IsString()
  @IsOptional()
  preferredVehicles?: string;

  @ApiPropertyOptional({ description: 'Additional operational dispatch notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class SubscribeNewsletterDto {
  @ApiProperty({ description: 'Subscriber email address', example: 'lead@enterprise.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
