import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Res,
  BadRequestException,
  GoneException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CorporateBillingService } from './corporate-billing.service';
import {
  GenerateInvoiceBatchDto,
  CorporateInvoiceStatus,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporatePermission } from '../tenants/corporate-permissions';
import { CorporatePayoutService } from './corporate-payout.service';
import { CorporateInvoiceDisputeService } from './corporate-invoice-dispute.service';
import {
  CreatePayoutBatchRequestDto,
  RaiseInvoiceDisputeDto,
  ResolveInvoiceDisputeDto,
} from './corporate-billing-wire.types';
import { forCaller } from './corporate-response-guard';

export const PREPARE_BATCH_GONE_MESSAGE =
  'POST /corporate/billing/payouts/prepare-batch is retired. Create a batch with POST /corporate/billing/payouts/batches, ' +
  'have a different admin approve it (POST payouts/batches/:id/approve), then submit it (POST payouts/batches/:id/submit). ' +
  'A payout is PAID only when the payout provider confirms it.';

@ApiTags('Corporate ETS - Dual Financial Ledgers, Invoicing & Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/billing')
export class CorporateBillingController {
  constructor(
    private readonly billingService: CorporateBillingService,
    private readonly payouts: CorporatePayoutService,
    private readonly disputes: CorporateInvoiceDisputeService,
  ) {}

  @Post('invoices/generate-batch')
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List corporate invoices with pagination and status filters' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  public async listInvoices(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: CorporateInvoiceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return forCaller(
      req,
      await this.billingService.listInvoices(tenantId, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('invoice', 'id')
  @ApiOperation({ summary: 'Get full invoice breakdown with individual route line items' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  public async getInvoiceById(@Param('id') id: string, @Req() req?: any) {
    return forCaller(req, await this.billingService.getInvoiceById(id));
  }

  @Get('invoices/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('invoice', 'id')
  @ApiOperation({ summary: 'Download B2B GST tax invoice PDF document complying with Sec 31 CGST Act' })
  @ApiResponse({ status: 200, description: 'Binary PDF tax invoice stream' })
  public async downloadInvoicePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.billingService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${id}.pdf"`,
      'Content-Length': buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Post('payouts/prepare-batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'RETIRED (410 Gone). Use POST payouts/batches -> /approve (different admin) -> /submit.',
    deprecated: true,
  })
  @ApiResponse({ status: 410, description: 'Endpoint retired; use payouts/batches' })
  public preparePayoutBatch(): never {
    throw new GoneException({
      statusCode: 410,
      error: 'Gone',
      message: PREPARE_BATCH_GONE_MESSAGE,
      replacement: {
        create: 'POST /corporate/billing/payouts/batches',
        approve: 'POST /corporate/billing/payouts/batches/:id/approve',
        submit: 'POST /corporate/billing/payouts/batches/:id/submit',
      },
    });
  }

  public retiredPreparePayoutBatch(): never {
    return this.preparePayoutBatch();
  }

  @Get('payouts/preview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Read-only preview of unpaid earnings per driver with 1% TDS (writes nothing)' })
  public async previewPayoutBatch(@Query('driverIds') driverIds?: string, @Query('cutoffDate') cutoffDate?: string) {
    return this.billingService.previewDriverPayoutBatch({
      driverIds: driverIds ? driverIds.split(',').map((d) => d.trim()).filter(Boolean) : undefined,
      cutoffDate,
    } as { driverIds?: string[]; cutoffDate?: string });
  }

  @Get('drivers/:driverId/earnings')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('driver', 'driverId')
  @ApiOperation({ summary: 'Get driver corporate commute earnings summary with TDS breakdown' })
  @ApiResponse({ status: 200, description: 'Driver earnings summary' })
  public async getDriverEarningsSummary(@Param('driverId') driverId: string) {
    return this.billingService.getDriverEarningsSummary(driverId);
  }

  // ---------------------------------------------------------------------------
  // Invoice disputes & credit notes (additive corrections; an issued invoice is never edited)
  // ---------------------------------------------------------------------------

  @Post('invoices/:id/disputes')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('invoice', 'id')
  @CorporatePermission('billing:write')
  @ApiOperation({ summary: 'Dispute an issued invoice (corporate roles: own tenant invoices only)' })
  @ApiResponse({ status: 201, description: 'Dispute opened' })
  public async raiseDispute(@Param('id') id: string, @Body() dto: RaiseInvoiceDisputeDto, @Req() req: any) {
    return forCaller(req, await this.disputes.raiseDispute(id, dto, req.user?.id));
  }

  @Get('disputes')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('invoices:read')
  @ApiOperation({ summary: 'List invoice disputes (tenant-scoped)' })
  public async listDisputes(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return forCaller(req, await this.disputes.listDisputes(tenantId, { status, invoiceId }));
  }

  @Post('disputes/:id/accept')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Accept a dispute and issue an immutable credit note (ADMIN)' })
  public async acceptDispute(@Param('id') id: string, @Body() dto: ResolveInvoiceDisputeDto, @Req() req: any) {
    return this.disputes.acceptDispute(id, dto, req.user?.id);
  }

  @Post('disputes/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a dispute with a reason (ADMIN)' })
  public async rejectDispute(@Param('id') id: string, @Body() dto: ResolveInvoiceDisputeDto, @Req() req: any) {
    return this.disputes.rejectDispute(id, dto, req.user?.id);
  }

  @Get('credit-notes')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('invoices:read')
  @ApiOperation({ summary: 'List credit notes (tenant-scoped)' })
  public async listCreditNotes(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return forCaller(req, await this.disputes.listCreditNotes(tenantId, { invoiceId }));
  }

  // ---------------------------------------------------------------------------
  // Payout batches: maker -> checker -> provider submit -> signed confirmation
  // ---------------------------------------------------------------------------

  @Post('payouts/batches')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a payout batch from UNPAID earnings (maker step); one payout row per driver' })
  @ApiResponse({ status: 201, description: 'Batch created, awaiting checker approval' })
  public async createPayoutBatch(@Body() dto: CreatePayoutBatchRequestDto, @Req() req: any) {
    const key = dto?.idempotencyKey ?? req.headers?.['idempotency-key'];
    if (key !== undefined && (typeof key !== 'string' || key.length < 8 || key.length > 64)) {
      throw new BadRequestException('idempotencyKey must be 8-64 characters');
    }
    const batch = await this.billingService.createPayoutBatch(
      { driverIds: dto?.driverIds, cutoffDate: dto?.cutoffDate },
      req.user?.id,
      key,
    );
    return this.payouts.getBatch(batch.id);
  }

  @Get('payouts/batches')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List payout batches with per-status payout counts' })
  public async listPayoutBatches(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.listPayoutBatches({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('payouts/batches/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Payout batch with its per-driver payouts' })
  public async getPayoutBatch(@Param('id') id: string) {
    return this.payouts.getBatch(id);
  }

  @Post('payouts/batches/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a payout batch (checker must differ from maker, else 403)' })
  @ApiResponse({ status: 403, description: 'Maker-checker violation' })
  public async approvePayoutBatch(@Param('id') id: string, @Req() req: any) {
    await this.billingService.approvePayoutBatch(id, req.user?.id);
    return this.payouts.getBatch(id);
  }

  @Post('payouts/batches/:id/submit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Send an APPROVED batch to the payout provider (or retry its FAILED payouts with the same idempotency keys). Never marks PAID.',
  })
  public async submitPayoutBatch(@Param('id') id: string, @Req() req: any) {
    return this.payouts.submitBatch(id, req.user?.id);
  }

  @Get('reconciliations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Payout reconciliation: payouts whose status differs from the provider, and unmatched confirmations',
  })
  public async getReconciliation(@Query('from') from?: string, @Query('to') to?: string) {
    return this.payouts.getReconciliation(from, to);
  }
}
