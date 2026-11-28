import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  FleetAdminRole,
  FleetEarningsQueryDto,
  FleetPayoutQueryDto,
  RequestFleetPayoutDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import {
  CurrentFleetUser,
  FleetPermissions,
  FleetRequestContext,
  FleetRoles,
} from '../guards/fleet.decorators';
import { FleetFinanceService } from './fleet-finance.service';

@ApiTags('Fleet Portal Earnings & Payouts')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet')
export class FleetFinanceController {
  constructor(private readonly financeService: FleetFinanceService) {}

  @Get('earnings')
  @FleetPermissions('VIEW_EARNINGS')
  @ApiOperation({ summary: 'Get fleet earnings summary, monthly summary, and driver-wise breakdown' })
  async getEarnings(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetEarningsQueryDto,
  ) {
    return this.financeService.getEarnings(user.fleetId, query);
  }

  @Get('earnings/export')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'Download fleet earnings CSV statement' })
  async exportEarnings(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetEarningsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.financeService.exportEarningsCsv(user.fleetId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fleet-earnings-statement.csv"');
    res.status(200).send(csv);
  }

  @Get('payouts')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'List fleet payout requests and statuses' })
  async listPayouts(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetPayoutQueryDto,
  ) {
    return this.financeService.listPayouts(user.fleetId, query);
  }

  @Post('payouts')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request payout from eligible fleet earnings (Fleet Owner only)' })
  async requestPayout(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: RequestFleetPayoutDto,
  ) {
    return this.financeService.requestPayout(user, dto);
  }

  @Get('shortfall-claims')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @ApiOperation({ summary: 'List minimum-trip shortfall compensation records for this fleet' })
  async listShortfallClaims(@CurrentFleetUser() user: FleetRequestContext) {
    return this.financeService.listShortfallClaims(user.fleetId);
  }
}
