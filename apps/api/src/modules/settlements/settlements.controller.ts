import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  WithdrawalRequestDto,
  SettlementResponseDto,
  AdminProcessSettlementDto,
  SettlementStatus,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { SettlementsService } from './settlements.service';

@ApiTags('Settlements & Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('withdraw')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver requests wallet withdrawal payout to bank' })
  @SwaggerResponse({ status: 201, type: SettlementResponseDto })
  async requestWithdrawal(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: WithdrawalRequestDto,
  ) {
    return this.settlementsService.requestWithdrawal(user.id, dto);
  }

  @Get()
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get settlements (driver sees own, admin sees all)' })
  @SwaggerResponse({ status: 200, type: [SettlementResponseDto] })
  async getSettlements(
    @CurrentUser() user: AuthUserDto,
    @Query('status') status?: SettlementStatus,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.settlementsService.listAllSettlements(status);
    }
    return this.settlementsService.getDriverSettlements(user.id);
  }

  @Post(':id/process')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin processes settlement payout (mark SETTLED or FAILED with auto-refund)' })
  @SwaggerResponse({ status: 200, type: SettlementResponseDto })
  async processSettlement(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: AdminProcessSettlementDto,
  ) {
    return this.settlementsService.processSettlement(id, admin.id, dto);
  }
}
