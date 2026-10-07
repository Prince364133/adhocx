import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportQueryDto {
  @ApiProperty({ description: 'Category of the support inquiry', example: 'Billing & Invoices' })
  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  category!: string;

  @ApiProperty({ description: 'Subject or brief title of query', example: 'Need GST invoice breakdown for March' })
  @IsNotEmpty({ message: 'Subject is required' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Detailed message or query explanation', example: 'We require monthly consolidated report...' })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Optional associated trip ID' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional({ description: 'Urgency priority level', default: 'NORMAL' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;
}
