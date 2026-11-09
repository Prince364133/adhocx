import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  UserRole,
  AuthUserDto,
  VehicleCategoryDto,
  CreateVehicleCategoryDto,
  UpdateVehicleCategoryDto,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { PricingService } from './pricing.service';

/**
 * Vehicle category catalogue and platform policy settings.
 *
 * Trip prices are not served here. Vendors get quotes from POST /vendor/trip-quotes and their rate
 * card from GET /vendor/pricing/rate-card; drivers get payouts from /driver/...; admins manage
 * prices in /admin/pricing. (The old /pricing/calculate, /pricing/zonal/* and the public
 * /pricing/distance/* rate cards are removed.)
 */
@ApiTags('Vehicle Categories & Platform Policy')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Vehicle categories (catalogue only, no prices)' })
  @SwaggerResponse({ status: 200, type: [VehicleCategoryDto] })
  async getAllPricing() {
    return this.pricingService.getAllPricingTiers();
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Vehicle categories (catalogue only, no prices)' })
  @SwaggerResponse({ status: 200, type: [VehicleCategoryDto] })
  async getPricingTiers() {
    return this.pricingService.getAllPricingTiers();
  }

  @Post('admin/tiers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a vehicle category (Admin only)' })
  @SwaggerResponse({ status: 201, type: VehicleCategoryDto })
  async createPricingTier(@Body() dto: CreateVehicleCategoryDto, @CurrentUser() user?: AuthUserDto) {
    return this.pricingService.createPricingTier(dto, user?.fullName || user?.id || 'ADMIN');
  }

  @Delete('admin/tiers/:vehicleType')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a vehicle category (Admin only)' })
  async deletePricingTier(@Param('vehicleType') vehicleType: string) {
    return this.pricingService.deletePricingTier(vehicleType);
  }

  @Get('policy-config')
  @ApiOperation({ summary: 'Platform policy (driver monthly fee, trial days, minimum withdrawal)' })
  async getPolicyConfig() {
    return this.pricingService.getPolicyConfig();
  }

  @Patch('admin/policy-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update platform policy (Admin only)' })
  async updatePolicyConfig(@Body() dto: any) {
    return this.pricingService.updatePolicyConfig(dto);
  }

  @Get(':vehicleType')
  @ApiOperation({ summary: 'One vehicle category' })
  @SwaggerResponse({ status: 200, type: VehicleCategoryDto })
  async getPricingTier(@Param('vehicleType') vehicleType: string) {
    return this.pricingService.getPricingTier(vehicleType);
  }

  @Patch('admin/:vehicleType')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Edit a vehicle category (Admin only)' })
  @SwaggerResponse({ status: 200, type: VehicleCategoryDto })
  async updatePricingTier(
    @Param('vehicleType') vehicleType: string,
    @Body() dto: UpdateVehicleCategoryDto,
    @CurrentUser() user?: AuthUserDto,
  ) {
    return this.pricingService.updatePricingTier(vehicleType, {
      ...dto,
      updatedBy: user?.fullName || user?.id || 'ADMIN',
    });
  }
}
