import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  AuthUserDto,
  UserRole,
  ValidateReferralDto,
  ValidateReferralResponseDto,
  DriverReferralDashboardDto,
  ClaimReferralResponseDto,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../../common';
import { ReferralsService } from './referrals.service';

@ApiTags('Driver Referrals')
@Controller('drivers/referral')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /**
   * Validate a referral code or phone number during onboarding / signup.
   * Publicly accessible so applicants can check referrer details before registration.
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate referral code or mobile number' })
  async validateReferrer(
    @Body() dto: ValidateReferralDto,
  ): Promise<ValidateReferralResponseDto> {
    return this.referralsService.validateReferrer(dto.identifier);
  }

  /**
   * Get driver's referral dashboard: statistics, 100-ride milestone, and referee list.
   */
  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get referral dashboard, milestone progress, and list of referees' })
  async getDashboard(
    @CurrentUser() user: AuthUserDto,
  ): Promise<DriverReferralDashboardDto> {
    return this.referralsService.getDashboard(user.id);
  }

  /**
   * Claim a single referral reward into the driver's withdrawal wallet.
   * Requires driver to have completed >= 100 trips milestone.
   */
  @Post('claim/:referralId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Claim single referral reward (Requires 100 completed rides)' })
  async claimReward(
    @CurrentUser() user: AuthUserDto,
    @Param('referralId', ParseUUIDPipe) referralId: string,
  ): Promise<ClaimReferralResponseDto> {
    return this.referralsService.claimReward(user.id, referralId);
  }

  /**
   * Bulk claim all unlocked referral rewards for the driver.
   * Requires driver to have completed >= 100 trips milestone.
   */
  @Post('claim-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk claim all eligible referral rewards' })
  async claimAllRewards(
    @CurrentUser() user: AuthUserDto,
  ): Promise<ClaimReferralResponseDto> {
    return this.referralsService.claimAllRewards(user.id);
  }
}
