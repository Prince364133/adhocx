import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  FleetAdminRole,
  FleetPortalDriverQueryDto,
  ReassignFleetVehicleDto,
  RemoveFleetDriverDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext, FleetRoles } from '../guards/fleet.decorators';
import { FleetDriversService } from './fleet-drivers.service';

@ApiTags('Fleet Portal Drivers')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/drivers')
export class FleetDriversController {
  constructor(private readonly driversService: FleetDriversService) {}

  @Get()
  @ApiOperation({ summary: 'List paginated drivers belonging to the signed-in fleet' })
  async listDrivers(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetPortalDriverQueryDto,
  ) {
    return this.driversService.listDrivers(user.fleetId, query);
  }

  @Get(':driverId')
  @ApiOperation({ summary: 'Get fleet-scoped driver profile, 1:1 vehicle, trip history, earnings, and payouts' })
  async getDriverDetail(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('driverId', new ParseUUIDPipe()) driverId: string,
  ) {
    return this.driversService.getDriverDetail(user.fleetId, driverId);
  }

  @Patch(':driverId/vehicle')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'Update or reassign 1:1 assigned vehicle for a fleet driver' })
  async reassignVehicle(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('driverId', new ParseUUIDPipe()) driverId: string,
    @Body() dto: ReassignFleetVehicleDto,
  ) {
    return this.driversService.reassignVehicle(user, driverId, dto);
  }

  @Post(':driverId/remove')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove driver from fleet and free vehicle assignment' })
  async removeDriver(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('driverId', new ParseUUIDPipe()) driverId: string,
    @Body() body: RemoveFleetDriverDto,
  ) {
    return this.driversService.removeDriver(user, driverId, body?.notes);
  }
}
