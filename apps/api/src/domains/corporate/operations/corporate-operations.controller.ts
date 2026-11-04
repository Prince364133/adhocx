import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateOperationsService } from './corporate-operations.service';
import { CancelRouteDto, ReassignRouteDto } from './operations.types';

/** Command centre (AdhocX operations). ADMIN only: it spans every tenant. */
@ApiTags('Corporate ETS - Command Centre Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/ops')
export class CorporateOperationsController {
  constructor(private readonly ops: CorporateOperationsService) {}

  @Get('board')
  @Roles(UserRole.ADMIN)
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

  @Get('routes/:id/detail')
  @Roles(UserRole.ADMIN)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Full route with stops, live GPS position (with freshness) and offer state' })
  public async detail(@Param('id') routeId: string) {
    return this.ops.getRouteDetail(routeId);
  }

  @Post('routes/:id/reassign')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
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
