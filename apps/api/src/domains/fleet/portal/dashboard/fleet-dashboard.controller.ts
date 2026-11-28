import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetDashboardQueryDto } from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { CurrentFleetUser, FleetRequestContext } from '../guards/fleet.decorators';
import { FleetDashboardService } from './fleet-dashboard.service';

@ApiTags('Fleet Portal Dashboard')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard)
@Controller('fleet/dashboard')
export class FleetDashboardController {
  constructor(private readonly dashboardService: FleetDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get fleet-scoped dashboard KPIs, activity series, status breakdown, and recent activity' })
  async getDashboard(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetDashboardQueryDto,
  ) {
    return this.dashboardService.getDashboard(user.fleetId, query);
  }
}
