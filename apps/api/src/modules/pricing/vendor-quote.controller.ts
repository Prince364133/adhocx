import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UserRole, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { DistancePricingService } from './distance-pricing.service';
import { RequirementsService } from '../requirements/requirements.service';
import {
  VendorTripQuoteRequestDto,
  VendorTripQuoteResponseDto,
  VendorConfirmTripDto,
  CreateRequirementDto,
} from '@adhocx/contracts';

@ApiTags('Vendor Trip Quotes & Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, UserRole.ADMIN)
@Controller('vendor')
export class VendorQuoteController {
  constructor(
    private readonly distancePricing: DistancePricingService,
    private readonly requirementsService: RequirementsService,
  ) {}

  @Get('pricing/rate-card')
  @ApiOperation({ summary: 'Return active vendor-visible distance rate card directly from database' })
  async getVendorRateCard(@Query('vehicleCategory') vehicleCategory?: string) {
    return this.distancePricing.getActiveVendorRateCard(vehicleCategory || 'ALL');
  }

  @Post('trip-quotes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate vendor-visible quote from pickup, drop and vehicle category based on Google Maps road distance' })
  @SwaggerResponse({ status: 200, type: VendorTripQuoteResponseDto })
  async createQuote(
    @Body() dto: VendorTripQuoteRequestDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<VendorTripQuoteResponseDto> {
    return this.distancePricing.createVendorQuote(dto, user.id);
  }

  @Post('trips')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm valid quote and lock immutable pricing snapshot for trip booking' })
  async confirmTrip(
    @Body() dto: VendorConfirmTripDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    // The quote itself is the idempotency key: re-sending the same quoteId returns the booking it
    // already created; a different booking from the same quote is refused (409).
    const prior = await this.distancePricing.findBookingForQuote(dto.quoteId, user.id);
    const snapshot = prior ? null : await this.distancePricing.lockPricingSnapshotForBooking(dto.quoteId, user.id);
    const quote = snapshot?.quote;

    if (!prior && (!quote?.vehicleCategory || quote.vehicleCategory === 'ALL')) {
      throw new BadRequestException('Get the quote for a specific vehicle type before booking.');
    }

    const requirement = await this.requirementsService.createRequirement(user.id, {
      vehicleType: quote?.vehicleCategory ?? '',
      quantity: dto.quantity || 1,
      pickupLocation: {
        latitude: Number(quote?.pickupLat ?? 0),
        longitude: Number(quote?.pickupLng ?? 0),
        address: quote?.pickupAddress || undefined,
      },
      dropLocation: {
        latitude: Number(quote?.dropLat ?? 0),
        longitude: Number(quote?.dropLng ?? 0),
        address: quote?.dropAddress || undefined,
      },
      reportingTime: dto.reportingTime,
      notes: dto.notes,
      quoteId: dto.quoteId,
    } as CreateRequirementDto);

    // Vendor view: the vendor charge only (never the driver payout or spread).
    return {
      message: prior ? 'This quote was already booked; returning the existing booking.' : 'Trip booked at the quoted price.',
      requirementId: requirement.id,
      quoteId: dto.quoteId,
      vendorChargeRupees: requirement.ratePerVehicle,
      totalAmount: requirement.totalAmount,
      routeDistanceKm: snapshot ? Number((snapshot.distanceM / 1000).toFixed(1)) : undefined,
      ratePlanVersion: snapshot?.planVersion,
      status: requirement.status,
    };
  }
}
