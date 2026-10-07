import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OfferStatus, VehicleType } from '../enums';
import { GeoLocationDto } from './common.dto';

export class OfferResponseDto {
  id!: string;
  requirementId!: string;
  driverId!: string;
  vehicleType!: VehicleType;
  pickupLocation!: GeoLocationDto;
  dropLocation!: GeoLocationDto;
  reportingTime!: string;
  offeredRate!: number;
  status!: OfferStatus;
  expiresAt!: string;
  expiresInSeconds?: number;
  vendorOrganizationName?: string;
  /** Driver-filtered corporate zonal context (hub, zone, earnings line items). Never contains vendor amounts. */
  zonal?: Record<string, unknown>;
  createdAt!: string;
}

export class OfferQueryDto {
  @IsOptional()
  status?: OfferStatus;
}

export class AcceptOfferDto {
  @IsNotEmpty({ message: 'Offer ID is required' })
  @IsString()
  offerId!: string;
}

export class DeclineOfferDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
