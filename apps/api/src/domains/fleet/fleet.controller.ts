import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import {
  AuthUserDto,
  UserRole,
  CreateFleetDto,
  UpdateFleetDto,
  UpdateFleetStatusDto,
  AssignDriverFleetDto,
  TransferDriverFleetDto,
  RemoveDriverFleetDto,
  FleetQueryDto,
  DriverFleetQueryDto,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { FleetService } from './fleet.service';

@ApiTags('Admin Fleet Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPS)
@Controller('admin/fleets')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  @ApiOperation({ summary: 'List all fleets with pagination, search, status filter, and summary metrics' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of fleets' })
  async listFleets(@Query() query: FleetQueryDto) {
    return this.fleetService.listFleets(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new fleet with unique Fleet Code' })
  @SwaggerResponse({ status: 201, description: 'Fleet successfully created' })
  async createFleet(
    @Body() dto: CreateFleetDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.createFleet(dto, user?.id);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get unified platform fleet and driver summary metrics' })
  @SwaggerResponse({ status: 200, description: 'Fleet overview metrics' })
  async getFleetMetrics() {
    return this.fleetService.getFleetMetrics();
  }

  @Get('drivers')
  @ApiOperation({ summary: 'List driver-to-fleet associations across the platform with filtering' })
  @SwaggerResponse({ status: 200, description: 'List of drivers with fleet associations' })
  async listDriverFleetAssociations(@Query() query: DriverFleetQueryDto) {
    return this.fleetService.listDriverFleetAssociations(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed fleet profile including associated drivers, activity, and financials' })
  @SwaggerResponse({ status: 200, description: 'Fleet detail retrieved' })
  async getFleetById(@Param('id') id: string) {
    return this.fleetService.getFleetById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fleet profile metadata' })
  @SwaggerResponse({ status: 200, description: 'Fleet updated' })
  async updateFleet(
    @Param('id') id: string,
    @Body() dto: UpdateFleetDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.updateFleet(id, dto, user?.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a fleet' })
  @SwaggerResponse({ status: 200, description: 'Fleet status updated' })
  async updateFleetStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFleetStatusDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.updateFleetStatus(id, dto, user?.id);
  }

  @Post(':id/regenerate-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate unique Fleet Code and invalidate previous code' })
  @SwaggerResponse({ status: 200, description: 'Fleet Code regenerated' })
  async regenerateFleetCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.regenerateFleetCode(id, user?.id);
  }

  @Post('drivers/:driverId/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign an unassigned driver to a fleet' })
  @SwaggerResponse({ status: 200, description: 'Driver assigned to fleet' })
  async assignDriverToFleet(
    @Param('driverId') driverId: string,
    @Body() dto: AssignDriverFleetDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.assignDriverToFleet(driverId, dto, user?.id);
  }

  @Post('drivers/:driverId/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer a driver from one fleet to another active fleet' })
  @SwaggerResponse({ status: 200, description: 'Driver transferred to target fleet' })
  async transferDriverFleet(
    @Param('driverId') driverId: string,
    @Body() dto: TransferDriverFleetDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.transferDriverFleet(driverId, dto, user?.id);
  }

  @Post('drivers/:driverId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a driver from their current fleet' })
  @SwaggerResponse({ status: 200, description: 'Driver removed from fleet' })
  async removeDriverFromFleet(
    @Param('driverId') driverId: string,
    @Body() dto: RemoveDriverFleetDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.fleetService.removeDriverFromFleet(driverId, dto, user?.id);
  }
}
