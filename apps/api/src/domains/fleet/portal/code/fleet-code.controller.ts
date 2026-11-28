import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetAdminRole, UpdateFleetCodeStatusDto } from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext, FleetRoles } from '../guards/fleet.decorators';
import { FleetCodeService } from './fleet-code.service';

@ApiTags('Fleet Portal Code')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/code')
export class FleetCodeController {
  constructor(private readonly fleetCodeService: FleetCodeService) {}

  @Get()
  @ApiOperation({ summary: 'Get active Fleet Code and association status' })
  async getCode(@CurrentFleetUser() user: FleetRequestContext) {
    return this.fleetCodeService.getFleetCode(user.fleetId);
  }

  @Post('regenerate')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate unique Fleet Code (Fleet Owner only)' })
  async regenerateCode(@CurrentFleetUser() user: FleetRequestContext) {
    return this.fleetCodeService.regenerateFleetCode(user);
  }

  @Patch('status')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'Enable or disable Fleet Code for new driver onboarding (Fleet Owner only)' })
  async updateStatus(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: UpdateFleetCodeStatusDto,
  ) {
    return this.fleetCodeService.updateCodeStatus(user, dto);
  }
}
