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
  CreateFleetIncentiveDto,
  FleetAdminRole,
  UpdateFleetIncentiveDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext, FleetRoles } from '../guards/fleet.decorators';
import { FleetIncentivesService } from './fleet-incentives.service';

@ApiTags('Fleet Portal Incentives')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/incentives')
export class FleetIncentivesController {
  constructor(private readonly incentivesService: FleetIncentivesService) {}

  @Get()
  @ApiOperation({ summary: 'List target-based and time-based fleet incentives' })
  async list(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.incentivesService.listIncentives(user.fleetId, { status, type });
  }

  @Post()
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a target-based or time-based driver incentive' })
  async create(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: CreateFleetIncentiveDto,
  ) {
    return this.incentivesService.createIncentive(user, dto);
  }

  @Patch(':id')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'Edit, activate, pause, or end an incentive' })
  async update(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFleetIncentiveDto,
  ) {
    return this.incentivesService.updateIncentive(user, id, dto);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'View driver-wise incentive participation and completion status' })
  async getProgress(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.incentivesService.getIncentiveProgress(user.fleetId, id);
  }
}
