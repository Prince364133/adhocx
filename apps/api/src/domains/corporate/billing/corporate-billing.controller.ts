import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CorporateBillingService } from './corporate-billing.service';
import {
  GenerateInvoiceBatchDto,
  DriverPayoutBatchDto,
  CorporateInvoiceStatus,
} from '@adhocx/contracts';

@ApiTags('Corporate ETS - Dual Financial Ledgers, Invoicing & Payouts')
@Controller('v1/corporate/billing')
export class CorporateBillingController {
  constructor(private readonly billingService: CorporateBillingService) {}

  @Post('invoices/generate-batch')
  @ApiOperation({
    summary:
      'Generate consolidated B2B GST tax invoice batch for corporate client (5% or 18% GST, integer paise)',
  })
  @ApiResponse({ status: 201, description: 'Invoice generated' })
  public async generateInvoiceBatch(
    @Body() dto: GenerateInvoiceBatchDto,
    @Req() req: any,
  ) {
    if (!dto.tenantId || !dto.billingPeriodStart || !dto.billingPeriodEnd) {
      throw new BadRequestException('tenantId, billingPeriodStart, and billingPeriodEnd are required');
    }
    return this.billingService.generateInvoiceBatch(dto, req.user?.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List corporate invoices with pagination and status filters' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  public async listInvoices(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: CorporateInvoiceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.listInvoices(tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get full invoice breakdown with individual route line items' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  public async getInvoiceById(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }

  @Post('payouts/prepare-batch')
  @ApiOperation({
    summary:
      'Aggregate UNPAID driver commute earnings, deduct 1% TDS (Sec 194C), and produce IMPS/RazorpayX batch payout payload',
  })
  @ApiResponse({ status: 201, description: 'Payout batch prepared' })
  public async preparePayoutBatch(
    @Body() dto: DriverPayoutBatchDto,
    @Req() req: any,
  ) {
    return this.billingService.prepareDriverPayoutBatch(dto, req.user?.id);
  }

  @Get('drivers/:driverId/earnings')
  @ApiOperation({ summary: 'Get driver corporate commute earnings summary with TDS breakdown' })
  @ApiResponse({ status: 200, description: 'Driver earnings summary' })
  public async getDriverEarningsSummary(@Param('driverId') driverId: string) {
    return this.billingService.getDriverEarningsSummary(driverId);
  }
}
