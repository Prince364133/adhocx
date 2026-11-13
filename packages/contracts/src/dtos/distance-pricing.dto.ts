import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
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

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A peak window in IST wall-clock time, [start, end). start > end crosses midnight. */
export class PeakHourWindowDto {
  @Matches(HHMM, { message: 'start must be HH:mm (00:00-23:59)' })
  start!: string;

  @Matches(HHMM, { message: 'end must be HH:mm (00:00-23:59)' })
  end!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;
}

/** Slab-generator settings the admin UI restores; display only, never used to price a trip. */
export class RateCardConfigDto {
  @IsOptional() @IsNumber() @Min(0.1) @Max(100)
  vendorStepKm?: number;

  @IsOptional() @IsNumber() @Min(0.1) @Max(100)
  driverStepKm?: number;

  @IsOptional() @IsNumber() @Min(0.1) @Max(1000)
  maxDistanceKm?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(200)
  vendorPeakSurchargePercent?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(200)
  driverPeakSurchargePercent?: number;
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
  @IsInt()
  @Min(1)
  vendorPeakPricePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  driverPeakPayoutPaise?: number;

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

  /** Omit to keep (or, for a new draft, inherit) the windows; [] turns peak pricing off. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PeakHourWindowDto)
  peakWindows?: PeakHourWindowDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RateCardConfigDto)
  config?: RateCardConfigDto;
}

export class UpdateDistancePricingSlabsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingSlabInputDto)
  slabs!: CreatePricingSlabInputDto[];

  /** Omit to keep (or, for a new draft, inherit) the windows; [] turns peak pricing off. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PeakHourWindowDto)
  peakWindows?: PeakHourWindowDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RateCardConfigDto)
  config?: RateCardConfigDto;

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
  vendorPeakPricePaise?: number;
  driverPeakPayoutPaise?: number;
  grossSpreadPaise!: number;
  grossMarginPercent!: number;
  vendorPriceRupees!: number;
  driverPayoutRupees!: number;
  vendorPeakPriceRupees?: number;
  driverPeakPayoutRupees?: number;
  peakGrossSpreadPaise?: number;
  peakGrossSpreadRupees?: number;
  peakGrossMarginPercent?: number;
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
  displayName?: string | null;
  status!: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'RETIRED';
  effectiveFrom!: string;
  effectiveTo?: string | null;
  createdBy?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
  peakWindows?: PeakHourWindowDto[];
  config?: RateCardConfigDto | null;
  escortFeePaise?: number;
  escortFeeRupees?: number;
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

  @IsOptional()
  @IsBoolean()
  hasEscort?: boolean;

  /** ISO-8601 pickup instant (with offset). Decides peak vs non-peak; defaults to now. */
  @IsOptional()
  @IsISO8601({ strict: true })
  pickupTime?: string;
}

export class VendorTripQuoteResponseDto {
  quoteId!: string;
  routeDistanceM!: number;
  displayedKm!: number;
  vendorPricePaise!: number;
  vendorPriceRupees!: number;
  baseVendorPricePaise?: number;
  baseVendorPriceRupees?: number;
  hasEscort?: boolean;
  escortFarePaise?: number;
  escortFareRupees?: number;
  planVersion!: string;
  routeSummary?: string;
  expiresAt!: string;
  pickupAddress?: string;
  dropAddress?: string;
  canAutoQuote!: boolean;
  errorMessage?: string;
  isPeak?: boolean;
  activeWindowLabel?: string;
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
