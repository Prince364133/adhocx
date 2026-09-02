import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  DriverWalletSummaryDto,
  LedgerEntryResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { LedgerService } from './ledger.service';

@ApiTags('Driver Wallet & Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('driver')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('wallet')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get current driver wallet summary (balance, earnings, settlements)' })
  @SwaggerResponse({ status: 200, type: DriverWalletSummaryDto })
  async getWallet(@CurrentUser() user: AuthUserDto) {
    return this.ledgerService.getDriverWalletSummary(user.id);
  }

  @Get('ledger')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get driver immutable ledger transactions history' })
  @SwaggerResponse({ status: 200, type: [LedgerEntryResponseDto] })
  async getLedger(@CurrentUser() user: AuthUserDto) {
    const summary = await this.ledgerService.getDriverWalletSummary(user.id);
    return summary.recentLedgerEntries;
  }
}
