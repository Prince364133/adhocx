import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  MessageEvent,
  Optional,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateTrackingService, TrackingScope } from './corporate-tracking.service';
import { RedisPubSubService } from '../../../redis/redis-pubsub.service';
import { TelemetryChannels } from './tracking.types';
import { TelemetryStreamContext, TelemetryStreamHub } from './telemetry-stream-hub';
import { StreamTicketService } from '../../../redis/stream-ticket.service';

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
  constructor(
    private readonly tracking: CorporateTrackingService,
    pubsub: RedisPubSubService,
    @Optional() hub?: TelemetryStreamHub,
    @Optional() private readonly tickets?: StreamTicketService,
  ) {
    this.hub = hub ?? new TelemetryStreamHub(pubsub);
  }

  private readonly hub: TelemetryStreamHub;

  @Get('routes/:id/tracking')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary:
      'Latest vehicle position with GPS freshness: gpsState LIVE (<=45s) / STALE (<=180s) / OFFLINE and lastFixAgeSec',
  })
  public async getTracking(@Param('id') routeId: string, @Req() req: any) {
    return this.tracking.getTracking(routeId, trackingScopeOf(req));
  }

  @Get('routes/:id/timeline')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Ordered trip events (start, arrive, board, no-show, offers, replans) and assignment history' })
  public async getTimeline(@Param('id') routeId: string, @Req() req: any) {
    return this.tracking.getTimeline(routeId, trackingScopeOf(req));
  }

  @Get('routes/:id/playback')
  @Roles(UserRole.ADMIN, UserRole.OPS)
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

  @Get('routes/fleet/live')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional company scope for OPS fleet analytics' })
  @ApiOperation({ summary: 'Latest known position of every active cab in scope (hydrates the live map)' })
  getFleetSnapshot(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const scope = trackingScopeOf(req);
    return this.tracking.getFleetSnapshot(scope.tenantId ? scope : tenantId ? { tenantId } : scope);
  }

  @Post('live-stream-tickets')
  @HttpCode(201)
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary:
      'Single-use ticket (valid 30 s) for opening a live-stream EventSource: GET .../live-stream?ticket=… . Keeps the access token out of URLs and logs',
  })
  async issueStreamTicket(@Req() req: any): Promise<{ ticket: string; expiresAt: string }> {
    if (!this.tickets) throw new ServiceUnavailableException('Live stream tickets are unavailable');
    // Tickets are bought with a real access token (Authorization header), never with another ticket.
    if (!req?.accessToken) throw new UnauthorizedException('A bearer access token is required');
    return this.tickets.issue(req.user ?? {}, req.accessToken);
  }

  @Sse('routes/fleet/live-stream')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional company scope for OPS fleet updates' })
  @ApiOperation({
    summary:
      'Live stream (SSE) of every active cab in scope: `fixes` events carry a JSON array (newest fix per route, flushed every ~500 ms); `heartbeat` every 25 s; `reauth` then close when the token expires',
  })
  streamFleetTelemetry(@Req() req: any, @Query('tenantId') tenantId?: string): Observable<MessageEvent> {
    const scope = trackingScopeOf(req);
    // Tenant-bound callers only ever get their tenant's channel (none at all without a tenant).
    if ('tenantId' in scope && !scope.tenantId) throw new ForbiddenException('No corporate tenant on this account');
    const requestedTenantId = scope.tenantId ?? tenantId;
    const channel = requestedTenantId ? TelemetryChannels.tenantFleet(requestedTenantId) : TelemetryChannels.opsFleet;
    return this.hub.openFleetStream(channel, streamContext(req));
  }

  @Sse('routes/:id/live-stream')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Live stream (SSE) of fixes for one route: one `message` event per fix; `heartbeat`; `reauth` then close on token expiry' })
  streamRouteTelemetry(@Req() req: any, @Param('id') routeId: string): Observable<MessageEvent> {
    // The guard has already checked access to this route; the tenant picks the (batched) channel.
    const channel = this.tracking.getRouteTenantId(routeId, trackingScopeOf(req)).then((t) => TelemetryChannels.tenantFleet(t));
    return this.hub.openRouteStream(channel, streamContext(req), routeId);
  }
}

function streamContext(req: any): TelemetryStreamContext {
  return {
    userId: req?.user?.id ?? req?.user?.sub ?? null,
    tokenExpSec: req?.user?.exp ?? null,
    res: req?.res,
    tokenHash: req?.streamTokenHash ?? null,
  };
}
