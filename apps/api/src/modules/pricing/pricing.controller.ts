import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UserRole, PricingTierDto, CreatePricingTierDto, UpdatePricingTierDto, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { PricingService } from './pricing.service';
import { ZonalPricingService } from './zonal-pricing.service';
import {
  CreateRateCardVersionDto,
  PublishRateCardVersionDto,
  UpdateLocalityDto,
  ZonalQuoteRequestDto,
} from './dto/zonal.dto';

@ApiTags('Pricing & Tariffs')
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly zonalPricing: ZonalPricingService,
  ) {}

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


  // ---------------------------------------------------------------------------
  // Corporate zonal rate card (Hyderabad, New Adok Rate Card 2026)
  // ---------------------------------------------------------------------------

  @Get('zonal/vendor-card')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Active vendor zonal rate card (28 rows) with locality guide' })
  async getVendorZonalCard() {
    return this.zonalPricing.getVendorRateCard();
  }

  @Get('zonal/driver-card')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Active driver zonal earnings card (28 rows) with locality guide' })
  async getDriverZonalCard() {
    return this.zonalPricing.getDriverRateCard();
  }

  @Get('zonal/localities')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Search the approved locality master (each result has a stable locality ID)' })
  async searchZonalLocalities(@Query('q') q?: string) {
    return this.zonalPricing.searchLocalities(q);
  }

  @Post('zonal/quote')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a server-stored corporate zonal quote (or an operations-review result)' })
  async createZonalQuote(@Body() dto: ZonalQuoteRequestDto, @CurrentUser() user: AuthUserDto) {
    return this.zonalPricing.createQuote(dto, { userId: user.id, role: user.role });
  }

  @Get('zonal/admin/versions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List vendor and driver rate card versions (Admin only)' })
  async listZonalVersions(@Query('audience') audience?: 'VENDOR' | 'DRIVER') {
    return this.zonalPricing.listVersions(audience === 'VENDOR' || audience === 'DRIVER' ? audience : undefined);
  }

  @Post('zonal/admin/versions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a DRAFT rate card version with all 28 rows (Admin only)' })
  async createZonalVersion(@Body() dto: CreateRateCardVersionDto, @CurrentUser() user: AuthUserDto) {
    return this.zonalPricing.createDraftVersion(dto, { userId: user.id, role: user.role });
  }

  @Post('zonal/admin/versions/:id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish a draft or roll back to a retired version (Admin only)' })
  async publishZonalVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishRateCardVersionDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.zonalPricing.publishVersion(id, dto.reason, { userId: user.id, role: user.role });
  }

  @Patch('zonal/admin/localities/:localityId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify a locality pin, change review status, zone or aliases (Admin only, audited)' })
  async updateZonalLocality(
    @Param('localityId') localityId: string,
    @Body() dto: UpdateLocalityDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.zonalPricing.updateLocality(localityId, dto, { userId: user.id, role: user.role });
  }
}
