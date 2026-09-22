import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UserRole, PricingTierDto, CreatePricingTierDto, UpdatePricingTierDto, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { PricingService } from './pricing.service';

@ApiTags('Pricing & Tariffs')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all marketplace vehicle rate cards and pricing tiers' })
  @SwaggerResponse({ status: 200, type: [PricingTierDto] })
  async getAllPricing() {
    return this.pricingService.getAllPricingTiers();
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get all marketplace vehicle rate cards and pricing tiers' })
  @SwaggerResponse({ status: 200, type: [PricingTierDto] })
  async getPricingTiers() {
    return this.pricingService.getAllPricingTiers();
  }

  @Post('admin/tiers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new vehicle category and rate card (Admin only)' })
  @SwaggerResponse({ status: 201, type: PricingTierDto })
  async createPricingTier(@Body() dto: CreatePricingTierDto, @CurrentUser() user?: AuthUserDto) {
    return this.pricingService.createPricingTier(dto, user?.fullName || user?.id || 'ADMIN');
  }

  @Delete('admin/tiers/:vehicleType')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete or deactivate a vehicle category (Admin only)' })
  async deletePricingTier(@Param('vehicleType') vehicleType: string) {
    return this.pricingService.deletePricingTier(vehicleType);
  }

  @Get('policy-config')
  @ApiOperation({ summary: 'Get global platform policy config (monthly fee, trial days, minimum withdrawal amount)' })
  async getPolicyConfig() {
    return this.pricingService.getPolicyConfig();
  }

  @Patch('admin/policy-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update global platform policy config (Admin only)' })
  async updatePolicyConfig(@Body() dto: any) {
    return this.pricingService.updatePolicyConfig(dto);
  }

  @Get(':vehicleType')
  @ApiOperation({ summary: 'Get rate card for specific vehicle type' })
  @SwaggerResponse({ status: 200, type: PricingTierDto })
  async getPricingTier(@Param('vehicleType') vehicleType: string) {
    return this.pricingService.getPricingTier(vehicleType);
  }

  @Patch('admin/:vehicleType')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update rate card and tariff schedule for a vehicle class (Admin only)' })
  @SwaggerResponse({ status: 200, type: PricingTierDto })
  async updatePricingTier(
    @Param('vehicleType') vehicleType: string,
    @Body() dto: UpdatePricingTierDto,
    @CurrentUser() user?: AuthUserDto,
  ) {
    return this.pricingService.updatePricingTier(vehicleType, {
      ...dto,
      updatedBy: user?.fullName || user?.id || 'ADMIN',
    } as any);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate trip fare estimate dynamically based on database rate cards' })
  async calculateTripFare(
    @Body()
    body: {
      vehicleType: string;
      distanceKm: number;
      durationMinutes?: number;
      quantity?: number;
    },
  ) {
    return this.pricingService.calculateTripFare(
      body.vehicleType,
      Number(body.distanceKm),
      Number(body.durationMinutes || 0),
      Number(body.quantity || 1),
    );
  }
}
