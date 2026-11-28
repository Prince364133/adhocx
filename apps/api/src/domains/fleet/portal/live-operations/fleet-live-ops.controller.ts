import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetLiveOpsQueryDto } from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext } from '../guards/fleet.decorators';
import { FleetLiveOpsService } from './fleet-live-ops.service';

@ApiTags('Fleet Portal Live Operations')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/live-operations')
export class FleetLiveOpsController {
  constructor(private readonly liveOpsService: FleetLiveOpsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active fleet drivers, active rides, and last-refreshed timestamp' })
  async getLiveOperations(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetLiveOpsQueryDto,
  ) {
    return this.liveOpsService.getLiveOperations(user.fleetId, query);
  }
}
