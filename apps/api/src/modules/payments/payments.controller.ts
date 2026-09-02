import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  InitiatePaymentDto,
  PaymentResponseDto,
  PaymentWebhookDto,
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
    @Body() payload: PaymentWebhookDto,
    @Headers('x-webhook-secret') webhookSecret?: string,
  ) {
    return this.paymentsService.handleWebhook(provider, payload, webhookSecret);
  }
}
