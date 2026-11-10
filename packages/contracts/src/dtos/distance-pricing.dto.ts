import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeoPointDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isOffice?: boolean;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreatePricingSlabInputDto {
  @IsInt()
  @Min(0)
  minDistanceMExclusive!: number;

  @IsInt()
  @Min(1)
  maxDistanceMInclusive!: number;

  @IsInt()
  @Min(1)
  vendorPricePaise!: number;

  @IsInt()
  @Min(1)
  driverPayoutPaise!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class CreateDistancePricingPlanDto {
  @IsOptional()
  @IsString()
  vehicleCategory?: string = 'ALL';

  /** Optional: the next free version number for the category is used when omitted. */
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'cloneFromPlanId must be a valid UUID' })
  cloneFromPlanId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingSlabInputDto)
  slabs?: CreatePricingSlabInputDto[];
}

export class UpdateDistancePricingSlabsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingSlabInputDto)
  slabs!: CreatePricingSlabInputDto[];

  /** Why the rates change (stored in the pricing audit trail). */
  @IsOptional()
  @IsString()
  reason?: string;
}

/** Retire an ACTIVE plan (quotes for its category stop until another plan is active) or cancel a SCHEDULED one. */
export class RetirePricingPlanDto {
  @IsNotEmpty({ message: 'A reason is mandatory for the audit trail' })
  @IsString()
  reason!: string;
}

export class PublishPricingPlanDto {
  @IsOptional()
  @IsDateString({}, { message: 'effectiveFrom must be a valid ISO date string' })
  effectiveFrom?: string;

  @IsNotEmpty({ message: 'A reason for publishing or activating this rate plan is mandatory for audit trail' })
  @IsString()
  reason!: string;
}

export class DistancePricingSlabDto {
  id!: string;
  planId!: string;
  minDistanceMExclusive!: number;
  maxDistanceMInclusive!: number;
  vendorPricePaise!: number;
  driverPayoutPaise!: number;
  grossSpreadPaise!: number;
  grossMarginPercent!: number;
  vendorPriceRupees!: number;
  driverPayoutRupees!: number;
  grossSpreadRupees!: number;
  minKm!: number;
  maxKm!: number;
  displayRange!: string;
  active!: boolean;
  sortOrder!: number;
}

export class DistancePricingPlanDto {
  id!: string;
  vehicleCategory!: string;
  version!: string;
  name?: string | null;
  status!: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'RETIRED';
  effectiveFrom!: string;
  effectiveTo?: string | null;
  createdBy?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
  slabs!: DistancePricingSlabDto[];
  slabCount?: number;
}

export class PricingAuditDto {
  id!: string;
  actorId?: string | null;
  actorName?: string | null;
  action!: string;
  entityType!: string;
  entityId!: string;
  oldValueJson?: any;
  newValueJson?: any;
  reason?: string | null;
  timestamp!: string;
}

export class VendorTripQuoteRequestDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup?: GeoPointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  drop?: GeoPointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickupLocation?: GeoPointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  dropLocation?: GeoPointDto;

  @IsOptional()
  @IsString()
  vehicleCategory?: string = 'ALL';
}

export class VendorTripQuoteResponseDto {
  quoteId!: string;
  routeDistanceM!: number;
  displayedKm!: number;
  vendorPricePaise!: number;
  vendorPriceRupees!: number;
  planVersion!: string;
  routeSummary?: string;
  expiresAt!: string;
  pickupAddress?: string;
  dropAddress?: string;
  canAutoQuote!: boolean;
  errorMessage?: string;
}

export class VendorConfirmTripDto {
  @IsNotEmpty({ message: 'quoteId is required' })
  @IsUUID('4', { message: 'quoteId must be a valid UUID' })
  quoteId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsDateString({}, { message: 'reportingTime must be a valid ISO date string' })
  reportingTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class DriverTripPayoutDto {
  tripId!: string;
  driverPayoutPaise!: number;
  driverPayoutRupees!: number;
  /** null for trips booked before the distance engine (no recorded route distance). */
  routeDistanceM!: number | null;
  displayedKm!: number | null;
  pickupAddress!: string;
  dropAddress!: string;
  reportingTime!: string;
  status!: string;
}


// ---------------------------------------------------------------------------
// Vehicle category catalogue (no prices: prices come from distance pricing plans)
// ---------------------------------------------------------------------------

export class VehicleCategoryDto {
  id!: string;
  vehicleType!: string;
  categoryLabel!: string;
  seatingCapacity!: string;
  maxSeats!: number;
  description!: string;
  iconKey?: string | null;
  isActive!: boolean;
  updatedAt!: string;
  updatedBy?: string | null;
}

export class CreateVehicleCategoryDto {
  @IsNotEmpty()
  @IsString()
  vehicleType!: string;

  @IsNotEmpty()
  @IsString()
  categoryLabel!: string;

  @IsNotEmpty()
  @IsString()
  seatingCapacity!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconKey?: string;
}

export class UpdateVehicleCategoryDto {
  @IsOptional()
  @IsString()
  categoryLabel?: string;

  @IsOptional()
  @IsString()
  seatingCapacity?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
