import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { VehicleType, UserRole, PricingTierDto, UpdatePricingTierDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles } from '../../common';
import { PricingService } from './pricing.service';

@ApiTags('Pricing & Tariffs')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'Get all marketplace vehicle rate cards and pricing tiers' })
  @SwaggerResponse({ status: 200, type: [PricingTierDto] })
  getPricingTiers() {
    return this.pricingService.getAllPricingTiers();
  }

  @Get(':vehicleType')
  @ApiOperation({ summary: 'Get rate card for specific vehicle type' })
  @SwaggerResponse({ status: 200, type: PricingTierDto })
  getPricingTier(@Param('vehicleType') vehicleType: VehicleType) {
    return this.pricingService.getPricingTier(vehicleType);
  }

  @Patch('admin/:vehicleType')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update rate card and tariff schedule for a vehicle class (Admin only)' })
  @SwaggerResponse({ status: 200, type: PricingTierDto })
  updatePricingTier(
    @Param('vehicleType') vehicleType: VehicleType,
    @Body() dto: UpdatePricingTierDto,
  ) {
    return this.pricingService.updatePricingTier(vehicleType, dto as any);
  }
}
