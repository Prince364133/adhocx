import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HUB_IDS, ZONE_IDS, ZONAL_VEHICLE_CLASSES } from '../zonal-pricing.constants';

export const TRIP_DIRECTIONS = ['INBOUND_TO_OFFICE', 'OUTBOUND_FROM_OFFICE'] as const;

export class ZonalQuoteRequestDto {
  @IsIn(HUB_IDS, { message: `officeHubId must be one of ${HUB_IDS.join(', ')}` })
  officeHubId!: string;

  @IsIn(TRIP_DIRECTIONS, { message: 'direction must be INBOUND_TO_OFFICE (office drop) or OUTBOUND_FROM_OFFICE (office pickup)' })
  direction!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  localityId!: string;

  @IsString()
  @IsNotEmpty()
  vehicleType!: string;

  @IsOptional()
  @IsBoolean()
  hasEscort?: boolean;

  @Type(() => Number)
  @IsLatitude()
  pickupLat!: number;

  @Type(() => Number)
  @IsLongitude()
  pickupLng!: number;

  @Type(() => Number)
  @IsLatitude()
  dropLat!: number;

  @Type(() => Number)
  @IsLongitude()
  dropLng!: number;
}

export class RateCardRowInputDto {
  @IsIn(HUB_IDS)
  hubId!: string;

  @IsIn(ZONE_IDS)
  zoneId!: string;

  @IsIn(ZONAL_VEHICLE_CLASSES)
  vehicleType!: string;

  @Type(() => Number)
  @IsInt({ message: 'baseAmountPaise must be an integer number of paise' })
  @Min(0)
  baseAmountPaise!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'escortMaxPaise must be an integer number of paise' })
  @Min(0)
  escortMaxPaise?: number;
}

export class CreateRateCardVersionDto {
  @IsIn(['VENDOR', 'DRIVER'])
  audience!: 'VENDOR' | 'DRIVER';

  @IsString()
  @Matches(/^[0-9]{4}\.[0-9]+$/, { message: 'version must look like 2026.2' })
  version!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsArray()
  @ArrayMinSize(28)
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => RateCardRowInputDto)
  rows!: RateCardRowInputDto[];

  @IsString()
  @MinLength(10, { message: 'An audit reason of at least 10 characters is required' })
  @MaxLength(500)
  reason!: string;
}

export class PublishRateCardVersionDto {
  @IsString()
  @MinLength(10, { message: 'An audit reason of at least 10 characters is required' })
  @MaxLength(500)
  reason!: string;
}

export class UpdateLocalityDto {
  @IsOptional()
  @IsIn(['VERIFIED', 'PENDING_REVIEW', 'INACTIVE'])
  reviewStatus?: 'VERIFIED' | 'PENDING_REVIEW' | 'INACTIVE';

  @IsOptional()
  @IsIn(ZONE_IDS)
  zoneId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  centerLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  centerLng?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  aliases?: string[];

  @IsString()
  @MinLength(10, { message: 'An audit reason of at least 10 characters is required' })
  @MaxLength(500)
  reason!: string;
}
