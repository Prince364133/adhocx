import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UserRole, AuthUserDto, DriverTripPayoutDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { DistancePricingService } from './distance-pricing.service';

@ApiTags('Driver Trip Earnings & Rate Card')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER, UserRole.ADMIN)
@Controller('driver')
export class DriverQuoteController {
  constructor(private readonly distancePricing: DistancePricingService) {}

  @Get('pricing/rate-card')
  @ApiOperation({ summary: 'Return active driver-visible distance rate card directly from database' })
  async getDriverRateCard(@Query('vehicleCategory') vehicleCategory?: string) {
    return this.distancePricing.getActiveDriverRateCard(vehicleCategory || 'ALL');
  }

  @Get('trips/:id')
  @ApiOperation({ summary: 'Return driver-visible payout and route details (vendor charges and margin strictly protected)' })
  @SwaggerResponse({ status: 200, type: DriverTripPayoutDto })
  async getDriverTripDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserDto,
  ): Promise<DriverTripPayoutDto> {
    return this.distancePricing.getDriverTripDetails(id, user.id, user.role === UserRole.ADMIN);
  }
}

