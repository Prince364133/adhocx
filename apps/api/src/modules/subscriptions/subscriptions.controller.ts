import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Driver Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('my-status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current driver subscription & trial status' })
  async getMyStatus(@CurrentUser() user: AuthUserDto) {
    return this.subscriptionsService.getDriverSubscriptionStatus(user.id);
  }

  @Get('status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current driver subscription & trial status (alias)' })
  async getStatus(@CurrentUser() user: AuthUserDto) {
    return this.subscriptionsService.getDriverSubscriptionStatus(user.id);
  }

  @Post('create-order')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Create Razorpay order for driver subscription payment' })
  async createSubscriptionOrder(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: { couponCode?: string },
  ) {
    return this.subscriptionsService.createSubscriptionOrder(user.id, dto);
  }

  @Post('order')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Create Razorpay order for driver subscription payment (alias)' })
  async createOrder(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: { couponCode?: string },
  ) {
    return this.subscriptionsService.createSubscriptionOrder(user.id, dto);
  }

  @Post('verify')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Verify Razorpay payment and activate driver subscription' })
  async verifySubscriptionPayment(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.subscriptionsService.verifySubscriptionPayment(user.id, dto);
  }

  @Post('pay-from-wallet')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Pay subscription renewal directly from driver withdrawal wallet' })
  async payFromWallet(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: { couponCode?: string },
  ) {
    return this.subscriptionsService.paySubscriptionFromWallet(user.id, dto);
  }

  @Post('renew-wallet')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Pay subscription renewal directly from driver withdrawal wallet (alias)' })
  async renewWallet(
    @CurrentUser() user: AuthUserDto,
    @Body() dto?: { couponCode?: string },
  ) {
    return this.subscriptionsService.paySubscriptionFromWallet(user.id, dto || {});
  }
}
