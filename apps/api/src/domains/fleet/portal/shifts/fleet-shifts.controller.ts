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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateFleetShiftDto,
  FleetAdminRole,
  UpdateFleetShiftDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext, FleetRoles } from '../guards/fleet.decorators';
import { FleetShiftsService } from './fleet-shifts.service';

@ApiTags('Fleet Portal Shifts (Feature-Flagged)')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/shifts')
export class FleetShiftsController {
  constructor(private readonly shiftsService: FleetShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List fleet driver shifts (when ENABLE_FLEET_SHIFTS=true)' })
  async list(@CurrentFleetUser() user: FleetRequestContext) {
    return this.shiftsService.listShifts(user.fleetId);
  }

  @Post()
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shift assignment with driver overlap check' })
  async create(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: CreateFleetShiftDto,
  ) {
    return this.shiftsService.createShift(user.fleetId, dto);
  }

  @Patch(':id')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'Update shift schedule or status' })
  async update(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFleetShiftDto,
  ) {
    return this.shiftsService.updateShift(user.fleetId, id, dto);
  }
}
