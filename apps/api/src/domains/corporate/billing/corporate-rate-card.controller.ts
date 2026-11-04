import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporatePermission } from '../tenants/corporate-permissions';
import { CorporateRateCardAdminService } from './corporate-rate-card-admin.service';
import {
  CreateCorporateRateCardDto,
  CreateDriverRateCardDto,
  RetireRateCardDto,
} from './corporate-billing-wire.types';
import { forCaller } from './corporate-response-guard';

/**
 * Versioned rate cards. Corporate (client) cards: ADMIN writes; the owning tenant's corporate
 * roles may read their own. Driver cards: ADMIN only, never visible to corporate roles.
 * No edit endpoint exists by design: a change is a new version.
 */
@ApiTags('Corporate ETS - Rate Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/billing/rate-cards')
export class CorporateRateCardController {
  constructor(private readonly rateCards: CorporateRateCardAdminService) {}

  @Post('corporate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new corporate rate card version (closes the previous version at effectiveFrom)' })
  @ApiResponse({ status: 201, description: 'Version created' })
  @ApiResponse({ status: 409, description: 'Would change the price of already-invoiced trips' })
  public async createCorporateCard(@Body() dto: CreateCorporateRateCardDto, @Req() req: any) {
    return this.rateCards.createCorporateCard(dto, req.user?.id);
  }

  @Get('corporate')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('invoices:read')
  @ApiOperation({ summary: "List corporate rate card versions (corporate roles: own tenant only)" })
  public async listCorporateCards(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('vehicleCategory') vehicleCategory?: string,
    @Query('at') at?: string,
    @Query('includeRetired') includeRetired?: string,
  ) {
    return forCaller(req, await this.rateCards.listCorporateCards(tenantId, { vehicleCategory, at, includeRetired }));
  }

  @Post('corporate/:id/retire')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retire a corporate rate card version (sets effectiveTo; history keeps its price)' })
  public async retireCorporateCard(@Param('id') id: string, @Body() dto: RetireRateCardDto, @Req() req: any) {
    return this.rateCards.retireCorporateCard(id, dto, req.user?.id);
  }

  @Post('driver')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new driver rate card version (cannot start in the past)' })
  public async createDriverCard(@Body() dto: CreateDriverRateCardDto, @Req() req: any) {
    return this.rateCards.createDriverCard(dto, req.user?.id);
  }

  @Get('driver')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List driver rate card versions (ADMIN only)' })
  public async listDriverCards(
    @Query('vehicleCategory') vehicleCategory?: string,
    @Query('at') at?: string,
    @Query('includeRetired') includeRetired?: string,
  ) {
    return this.rateCards.listDriverCards({ vehicleCategory, at, includeRetired });
  }

  @Post('driver/:id/retire')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retire a driver rate card version' })
  public async retireDriverCard(@Param('id') id: string, @Body() dto: RetireRateCardDto, @Req() req: any) {
    return this.rateCards.retireDriverCard(id, dto, req.user?.id);
  }
}
