import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class FeatureFlagDto {
  id!: string;
  key!: string;
  name!: string;
  description?: string | null;
  category!: string;
  isEnabled!: boolean;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: string | Date;
  updatedAt!: string | Date;
}

export class CreateFeatureFlagDto {
  @IsNotEmpty({ message: 'Key is required' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/, { message: 'Key must be lowercase alphanumeric, underscores, or hyphens' })
  @MaxLength(60)
  key!: string;

  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string = 'GENERAL';

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = false;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ToggleFeatureFlagDto {
  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled!: boolean;

  @IsOptional()
  @IsString()
  platform?: 'android' | 'web' | 'all';
}

