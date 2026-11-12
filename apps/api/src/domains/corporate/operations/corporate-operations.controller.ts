import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthUserDto, ReactivateDriverDto, SuspendDriverDto, UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource } from '../../../common/decorators/corporate-resource.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorporateOperationsService } from './corporate-operations.service';
import { CorporateOpsDriversService } from './corporate-ops-drivers.service';
import { CancelRouteDto, ReassignRouteDto } from './operations.types';

/** Command centre (AdhocX operations). ADMIN only: it spans every tenant. */
@ApiTags('Corporate ETS - Command Centre Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/ops')
export class CorporateOperationsController {
  constructor(private readonly ops: CorporateOperationsService) {}

  @Get('board')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({
    summary:
      'Live board: route counts + paged lists by status for an IST day, at-risk (unassigned, pickup-1 within CORPORATE_ESCALATION_LEAD_MIN) queue, stale-GPS list and live offer state',
  })
  @ApiResponse({ status: 200, description: 'Command-centre board' })
  public async board(
    @Query('date') date?: string,
    @Query('tenantId') tenantId?: string,
    @Query('officeId') officeId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.getBoard({
      date,
      tenantId,
      officeId,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });
  }

  @Get('live-operations')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({
    summary: 'Cross-company live operations summary, 14-day route trend, company rollups, routes and recent activity',
  })
  @ApiResponse({ status: 200, description: 'Live operations dashboard data' })
  public liveOperations(
    @Query('routePage') routePage?: string,
    @Query('routePageSize') routePageSize?: string,
  ) {
    return this.ops.getLiveOperations(
      routePage !== undefined ? Number(routePage) : undefined,
      routePageSize !== undefined ? Number(routePageSize) : undefined,
    );
  }

  @Get('routes/:id/detail')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Full route with stops, live GPS position (with freshness) and offer state' })
  public async detail(@Param('id') routeId: string) {
    return this.ops.getRouteDetail(routeId);
  }

  @Post('routes/:id/reassign')
  @HttpCode(200)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary:
      'Reassign an ASSIGNED route: removes the driver, withdraws offers, sets DISPATCHING and re-dispatches automatically or offers to newDriverId. Audited; notifies old driver, employees and new driver.',
  })
  @ApiResponse({ status: 200, description: 'Route reassigned and back in dispatch' })
  @ApiResponse({ status: 409, description: 'Route not ASSIGNED, changed concurrently, or driver unavailable' })
  public async reassign(@Param('id') routeId: string, @Body() dto: ReassignRouteDto, @Req() req: any) {
    return this.ops.reassignRoute(routeId, dto, { id: req.user?.id, role: req.user?.role });
  }
}

/**
 * ADMIN route cancel, served at the trip path the command-centre portal uses
 * (`POST /corporate/trips/routes/:id/cancel`). Logic lives in the operations domain.
 */
@ApiTags('Corporate ETS - Command Centre Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/trips')
export class CorporateRouteCancellationController {
  constructor(private readonly ops: CorporateOperationsService) {}

  @Post('routes/:id/cancel')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary:
      'Cancel a route that has not started (PLANNED / DISPATCHING / ASSIGNED) with a mandatory reason. Withdraws the live offer, voids unpaid earnings, cancels open stops and their requests, notifies the driver and employees. Audited.',
  })
  @ApiResponse({ status: 200, description: 'Route cancelled' })
  @ApiResponse({ status: 400, description: 'Reason missing or too short' })
  @ApiResponse({ status: 409, description: 'Route already started, completed or cancelled, changed concurrently, or its earning is already batched' })
  public async cancel(@Param('id') routeId: string, @Body() dto: CancelRouteDto, @Req() req: any) {
    return this.ops.cancelRoute(routeId, dto, { id: req.user?.id, role: req.user?.role });
  }
}

@ApiTags('Corporate ETS - Command Centre Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/ops/drivers')
export class CorporateOpsDriversController {
  constructor(private readonly drivers: CorporateOpsDriversService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List drivers with verification and trust-score summaries' })
  @ApiResponse({ status: 200, description: 'Paged, searchable driver list' })
  public list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('availabilityStatus') availabilityStatus?: string,
  ) {
    return this.drivers.list({
      page: this.parseQueryInteger(page, 'page'),
      pageSize: this.parseQueryInteger(pageSize, 'pageSize'),
      search,
      verificationStatus,
      availabilityStatus,
    });
  }

  @Get(':driverId')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Get safe driver profile, verification statuses, trust score and trip/route history' })
  @ApiResponse({ status: 200, description: 'Driver details and the latest 50 trips/routes' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  public detail(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.drivers.detail(driverId);
  }

  @Post(':driverId/suspend')
  @HttpCode(200)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Suspend a verified driver; revoke existing sessions and audit the action' })
  @ApiResponse({ status: 200, description: 'Driver suspended' })
  @ApiResponse({ status: 400, description: 'Invalid driver verification state or missing reason' })
  public suspend(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: SuspendDriverDto,
    @CurrentUser() actor: AuthUserDto,
  ) {
    return this.drivers.suspend(driverId, actor.id, this.driverActorRole(actor.role), dto);
  }

  @Post(':driverId/reactivate')
  @HttpCode(200)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Reactivate a suspended driver; restore session access and audit the action' })
  @ApiResponse({ status: 200, description: 'Driver reactivated' })
  @ApiResponse({ status: 400, description: 'Driver is not suspended' })
  public reactivate(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: ReactivateDriverDto,
    @CurrentUser() actor: AuthUserDto,
  ) {
    return this.drivers.reactivate(driverId, actor.id, this.driverActorRole(actor.role), dto);
  }

  @Post(':driverId/deactivate')
  @HttpCode(200)
  @Roles(UserRole.OPS)
  @ApiOperation({ summary: 'Reversibly deactivate a driver user account without deleting driver history' })
  @ApiResponse({ status: 200, description: 'Driver user account deactivated; sessions revoked' })
  @ApiResponse({ status: 400, description: 'Driver account is not ACTIVE or reason is missing' })
  public deactivateAccount(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: SuspendDriverDto,
    @CurrentUser() actor: AuthUserDto,
  ) {
    return this.drivers.deactivateAccount(driverId, actor.id, dto);
  }

  @Post(':driverId/activate')
  @HttpCode(200)
  @Roles(UserRole.OPS)
  @ApiOperation({ summary: 'Restore a reversibly deactivated driver user account' })
  @ApiResponse({ status: 200, description: 'Driver user account activated' })
  @ApiResponse({ status: 400, description: 'Driver account is not DEACTIVATED' })
  public activateAccount(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: ReactivateDriverDto,
    @CurrentUser() actor: AuthUserDto,
  ) {
    return this.drivers.activateAccount(driverId, actor.id, dto);
  }

  private parseQueryInteger(value: string | undefined, field: string): number | undefined {
    if (value === undefined) return undefined;
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${field} must be an integer`);
    }
    return Number(value);
  }

  private driverActorRole(role: UserRole): 'ADMIN' | 'OPS' {
    if (role === UserRole.ADMIN || role === UserRole.OPS) return role;
    throw new ForbiddenException('Only ADMIN or OPS can change driver verification status');
  }
}
