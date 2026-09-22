import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  InitiatePaymentDto,
  PaymentResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate vendor payment for a requirement' })
  @SwaggerResponse({ status: 201, type: PaymentResponseDto })
  async initiatePayment(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(user.id, dto);
  }

  @Get('wallet')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current vendor wallet overview, balance, and escrow holds' })
  async getWallet(@CurrentUser() user: AuthUserDto) {
    return this.paymentsService.getVendorWalletSummary(user.id);
  }

  @Post('wallet/top-up/create-order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create Razorpay Order for Wallet Top-Up' })
  async createTopUpOrder(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.paymentsService.createWalletTopUpOrder(user.id, dto);
  }

  @Post('wallet/top-up/order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create Razorpay Order for Wallet Top-Up (alias)' })
  async createTopUpOrderAlias(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.paymentsService.createWalletTopUpOrder(user.id, dto);
  }

  @Post('wallet/top-up/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify payment signature and credit vendor wallet' })
  async verifyTopUp(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.paymentsService.verifyWalletTopUp(user.id, dto);
  }

  @Post('wallet/top-up/record-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record top-up lifecycle event (cancelled by user, gateway failure)' })
  async recordTopUpStatus(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.paymentsService.recordTopUpStatus(user.id, dto);
  }

  @Get('admin/metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get aggregate platform payment metrics for Admin' })
  async getAdminMetrics() {
    return this.paymentsService.getAdminPaymentMetrics();
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all platform payments across all corporate vendors for Admin' })
  async getAllPaymentsAdmin(@Query() query: any) {
    return this.paymentsService.getAllAdminPayments(query);
  }

  @Get('wallet/transactions')

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get vendor wallet ledger transactions' })
  async getWalletTransactions(@CurrentUser() user: AuthUserDto) {
    return this.paymentsService.getVendorWalletTransactions(user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List payments for current vendor' })
  @SwaggerResponse({ status: 200, type: [PaymentResponseDto] })
  async getPayments(@CurrentUser() user: AuthUserDto) {
    return this.paymentsService.getPaymentsByVendor(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payment details by ID' })
  @SwaggerResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.paymentsService.getPayment(id, user.id);
  }

  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment provider webhook endpoint (Razorpay/Stripe/mock)' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-webhook-secret') webhookSecret?: string,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
  ) {
    return this.paymentsService.handleWebhook(provider, payload, razorpaySignature || webhookSecret);
  }
}
