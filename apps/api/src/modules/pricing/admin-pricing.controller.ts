import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UserRole, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { DistancePricingService } from './distance-pricing.service';
import {
  CreateDistancePricingPlanDto,
  UpdateDistancePricingSlabsDto,
  PublishPricingPlanDto,
  RetirePricingPlanDto,
  DistancePricingPlanDto,
  PricingAuditDto,
} from '@adhocx/contracts';

@ApiTags('Admin Pricing Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly distancePricing: DistancePricingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List distance-based pricing plans, versions, statuses and effective dates' })
  @SwaggerResponse({ status: 200, type: [DistancePricingPlanDto] })
  async listPlans(
    @Query('vehicleCategory') vehicleCategory?: string,
    @Query('status') status?: string,
  ) {
    return this.distancePricing.listPlans(vehicleCategory, status);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new draft distance pricing plan' })
  @SwaggerResponse({ status: 201, type: DistancePricingPlanDto })
  async createPlan(
    @Body() dto: CreateDistancePricingPlanDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.distancePricing.createDraftPlan(dto, {
      id: user.id,
      name: user.fullName || 'Admin',
    });
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get pricing plan details with all slabs, gross spreads and boundaries' })
  @SwaggerResponse({ status: 200, type: DistancePricingPlanDto })
  async getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.distancePricing.getPlanById(id);
  }

  @Put('plans/:id/slabs')
  @ApiOperation({ summary: 'Update draft distance slabs with full gap and overlap validation' })
  @SwaggerResponse({ status: 200, type: DistancePricingPlanDto })
  async updateSlabs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistancePricingSlabsDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.distancePricing.updateDraftSlabs(
      id,
      dto.slabs,
      { id: user.id, name: user.fullName || 'Admin' },
      dto.reason,
      { peakWindows: dto.peakWindows, config: dto.config },
    );
  }

  @Post('plans/:id/publish')
  @ApiOperation({ summary: 'Publish or schedule activation for a pricing plan version' })
  @SwaggerResponse({ status: 200, type: DistancePricingPlanDto })
  async publishPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishPricingPlanDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.distancePricing.publishPlan(id, dto, {
      id: user.id,
      name: user.fullName || 'Admin',
    });
  }

  @Post('plans/:id/retire')
  @ApiOperation({ summary: 'Deactivate: ACTIVE -> RETIRED (quotes for the category stop) or SCHEDULED -> DRAFT' })
  @SwaggerResponse({ status: 200, type: DistancePricingPlanDto })
  async retirePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetirePricingPlanDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.distancePricing.retirePlan(id, dto.reason, { id: user.id, name: user.fullName || 'Admin' });
  }

  @Get('audit')
  @ApiOperation({ summary: 'View pricing change audit trail history' })
  @SwaggerResponse({ status: 200, type: [PricingAuditDto] })
  async getAudit(@Query('planId') planId?: string) {
    return this.distancePricing.getAuditHistory(planId);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate distance-based rate resolution and margins for any distance or coordinates' })
  async simulate(
    @Body()
    body: {
      distanceKm?: number;
      distanceMeters?: number;
      pickup?: { lat: number; lng: number; address?: string };
      drop?: { lat: number; lng: number; address?: string };
      vehicleCategory?: string;
    },
  ) {
    return this.distancePricing.simulateCalculation(body);
  }
}

