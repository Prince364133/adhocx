import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateTrackingService, TrackingScope } from './corporate-tracking.service';

const TENANT_BOUND_ROLES = new Set<string>([UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE]);

/** Tenant-bound callers are pinned to the tenant in their token (guard already checked the route). */
export function trackingScopeOf(req: any): TrackingScope {
  const role = String(req?.user?.role ?? '').toUpperCase();
  return TENANT_BOUND_ROLES.has(role) ? { tenantId: req?.user?.corporateTenantId ?? null } : {};
}

@ApiTags('Corporate ETS - Tracking, Timeline & Playback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/trips')
export class CorporateTrackingController {
  constructor(private readonly tracking: CorporateTrackingService) {}

  @Get('routes/:id/tracking')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.DRIVER, UserRole.EMPLOYEE)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary:
      'Latest vehicle position with GPS freshness: gpsState LIVE (<=45s) / STALE (<=180s) / OFFLINE and lastFixAgeSec',
  })
  public async getTracking(@Param('id') routeId: string, @Req() req: any) {
    return this.tracking.getTracking(routeId, trackingScopeOf(req));
  }

  @Get('routes/:id/timeline')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Ordered trip events (start, arrive, board, no-show, offers, replans) and assignment history' })
  public async getTimeline(@Param('id') routeId: string, @Req() req: any) {
    return this.tracking.getTimeline(routeId, trackingScopeOf(req));
  }

  @Get('routes/:id/playback')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'GPS history ordered by device time; window <= 24h, paged by cursor (limit <= 5000)' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO-8601 or epoch ms (default: to - 6h)' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO-8601 or epoch ms (default: now)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Points per page (default 1000, max 5000)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'nextCursor from the previous page' })
  public async getPlayback(
    @Param('id') routeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: any,
  ) {
    return this.tracking.getPlayback(routeId, { from, to, limit, cursor }, trackingScopeOf(req));
  }
}
