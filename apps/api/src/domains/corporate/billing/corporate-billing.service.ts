import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  GenerateInvoiceBatchDto,
  DriverPayoutBatchDto,
  CorporateInvoiceStatus,
} from '@adhocx/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class CorporateBillingService {
  private readonly logger = new Logger(CorporateBillingService.name);

  // Corporate Commute Fare Matrix (in integer paise - Zero Floating Point Arithmetic)
  private readonly DEFAULT_BASE_FARE_PAISE = 40000n; // ₹400 base fare
  private readonly DEFAULT_RATE_PER_KM_PAISE = 2500n; // ₹25/km

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generates a consolidated B2B GST tax invoice batch for a corporate client.
   * Aggregates unbilled completed routes, calculates subtotal, GST (5% / 18%) in integer paise,
   * and persists invoice and individual route line items atomically.
   */
  public async generateInvoiceBatch(
    dto: GenerateInvoiceBatchDto,
    actorUserId?: string,
  ) {
    const tenant = await this.db.corporateTenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Corporate tenant ${dto.tenantId} not found`);
    }

    const startDate = new Date(dto.billingPeriodStart);
    const endDate = new Date(dto.billingPeriodEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid billing period dates provided');
    }
    if (startDate > endDate) {
      throw new BadRequestException('billingPeriodStart cannot be after billingPeriodEnd');
    }

    const gstRatePct = dto.gstRatePct === 18 ? 18n : 5n; // Indian GST: 5% or 18%

    // Find all completed routes for this tenant in period that are NOT yet invoiced
    const existingLines = await this.db.corporateInvoiceLine.findMany({
      select: { routeId: true },
    });
    const invoicedRouteIds = new Set(existingLines.map((l) => l.routeId));

    const candidateRoutes = await this.db.corporateRoute.findMany({
      where: {
        tenantId: dto.tenantId,
        status: 'COMPLETED',
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        office: true,
      },
    });

    const unbilledRoutes = candidateRoutes.filter((r) => !invoicedRouteIds.has(r.id));

    if (unbilledRoutes.length === 0) {
      throw new BadRequestException(
        `No unbilled completed routes found for tenant ${tenant.name} between ${dto.billingPeriodStart} and ${dto.billingPeriodEnd}`,
      );
    }

    // Build line items with integer paise math
    const lineItemData: Array<{
      routeId: string;
      billableDistanceMeters: number;
      amountPaise: bigint;
    }> = [];

    let subtotalPaise = 0n;

    for (const route of unbilledRoutes) {
      const distanceKm = Math.max(1, Math.round(route.estDistanceMeters / 1000));
      const amountPaise = this.DEFAULT_BASE_FARE_PAISE + BigInt(distanceKm) * this.DEFAULT_RATE_PER_KM_PAISE;

      subtotalPaise += amountPaise;
      lineItemData.push({
        routeId: route.id,
        billableDistanceMeters: route.estDistanceMeters,
        amountPaise,
      });
    }

    // Exact integer GST calculation
    const gstPaise = (subtotalPaise * gstRatePct) / 100n;
    const totalAmountPaise = subtotalPaise + gstPaise;

    // Unique sequential invoice number: INV-<TENANT_CODE>-YYYYMM-<RAND>
    const periodMonthStr = startDate.toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${tenant.code}-${periodMonthStr}-${randomSuffix}`;

    const invoice = await this.db.$transaction(async (tx) => {
      const createdInvoice = await tx.corporateInvoice.create({
        data: {
          tenantId: dto.tenantId,
          invoiceNumber,
          billingPeriodStart: startDate,
          billingPeriodEnd: endDate,
          subtotalPaise,
          gstPaise,
          totalAmountPaise,
          status: 'ISSUED',
        },
      });

      for (const line of lineItemData) {
        await tx.corporateInvoiceLine.create({
          data: {
            invoiceId: createdInvoice.id,
            routeId: line.routeId,
            billableDistanceMeters: line.billableDistanceMeters,
            amountPaise: line.amountPaise,
          },
        });
      }

      return createdInvoice;
    });

    this.logger.log(
      `Generated Invoice ${invoice.invoiceNumber} for ${tenant.name}: ₹${(Number(totalAmountPaise) / 100).toFixed(2)} (${unbilledRoutes.length} routes)`,
    );

    this.notifications.emitEvent(`corporate:${dto.tenantId}`, 'CORPORATE_INVOICE_ISSUED', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmountPaise: totalAmountPaise.toString(),
      subtotalPaise: subtotalPaise.toString(),
      gstPaise: gstPaise.toString(),
      routesCount: unbilledRoutes.length,
    });

    await this.audit.log({
      action: 'CORPORATE_INVOICE_GENERATED',
      userId: actorUserId,
      entityId: invoice.id,
      entityType: 'CORPORATE_INVOICE',
      metadata: {
        tenantId: dto.tenantId,
        invoiceNumber,
        routesCount: unbilledRoutes.length,
        totalAmountPaise: totalAmountPaise.toString(),
      },
    });

    return this.getInvoiceById(invoice.id);
  }

  /**
   * List corporate invoices with pagination and status filtering.
   */
  public async listInvoices(
    tenantId?: string,
    query?: { status?: CorporateInvoiceStatus; page?: number; limit?: number },
  ) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (query?.status) where.status = query.status;

    const [total, items] = await Promise.all([
      this.db.corporateInvoice.count({ where }),
      this.db.corporateInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, code: true } },
          _count: { select: { lines: true } },
        },
      }),
    ]);

    return {
      items: items.map((inv) => ({
        ...inv,
        subtotalPaise: inv.subtotalPaise.toString(),
        gstPaise: inv.gstPaise.toString(),
        totalAmountPaise: inv.totalAmountPaise.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single invoice details with line items and routes.
   */
  public async getInvoiceById(invoiceId: string) {
    const invoice = await this.db.corporateInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: true,
        lines: {
          include: {
            route: {
              select: {
                id: true,
                shiftDate: true,
                shiftTime: true,
                direction: true,
                estDistanceMeters: true,
                assignedPassengerCount: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return {
      ...invoice,
      subtotalPaise: invoice.subtotalPaise.toString(),
      gstPaise: invoice.gstPaise.toString(),
      totalAmountPaise: invoice.totalAmountPaise.toString(),
      lines: invoice.lines.map((l) => ({
        ...l,
        amountPaise: l.amountPaise.toString(),
      })),
    };
  }

  /**
   * Driver Commute Earnings & Payout Disbursement Batch Engine.
   * Aggregates UNPAID driver commute earnings, applies mandatory 1% TDS deduction (Section 194C),
   * marks earnings as PAID, and produces automated IMPS/RazorpayX batch disbursement payloads.
   */
  public async prepareDriverPayoutBatch(
    dto?: DriverPayoutBatchDto,
    actorUserId?: string,
  ) {
    const where: any = { payoutStatus: 'UNPAID' };

    if (dto?.driverIds && dto.driverIds.length > 0) {
      where.driverId = { in: dto.driverIds };
    }
    if (dto?.cutoffDate) {
      where.createdAt = { lte: new Date(dto.cutoffDate) };
    }

    const unpaidEarnings = await this.db.corporateDriverEarning.findMany({
      where,
      include: {
        driver: { select: { id: true, fullName: true, phone: true } },
        route: { select: { id: true, shiftDate: true, direction: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unpaidEarnings.length === 0) {
      return {
        batchId: randomUUID(),
        totalDrivers: 0,
        totalGrossPaise: '0',
        totalTdsPaise: '0',
        totalNetPayoutPaise: '0',
        disbursements: [],
      };
    }

    // Group earnings by driver
    interface DriverPayoutEntry {
      driver: { id: string; fullName: string; phone: string | null };
      earningIds: string[];
      grossPaise: bigint;
    }

    const driverMap = new Map<string, DriverPayoutEntry>();

    for (const earn of unpaidEarnings) {
      let entry = driverMap.get(earn.driverId);
      if (!entry) {
        entry = {
          driver: earn.driver,
          earningIds: [],
          grossPaise: 0n,
        };
        driverMap.set(earn.driverId, entry);
      }
      entry.earningIds.push(earn.id);
      entry.grossPaise += earn.totalEarnedPaise;
    }

    const batchId = randomUUID();
    let batchGrossPaise = 0n;
    let batchTdsPaise = 0n;
    let batchNetPayoutPaise = 0n;

    const disbursements: any[] = [];
    const allEarningIdsToUpdate: string[] = [];

    for (const [driverId, data] of driverMap.entries()) {
      // 1% TDS under Section 194C (integer paise arithmetic)
      const tdsPaise = (data.grossPaise * 1n) / 100n;
      const netPayoutPaise = data.grossPaise - tdsPaise;

      batchGrossPaise += data.grossPaise;
      batchTdsPaise += tdsPaise;
      batchNetPayoutPaise += netPayoutPaise;

      disbursements.push({
        driverId,
        driverName: data.driver.fullName,
        driverPhone: data.driver.phone,
        routesCompletedCount: data.earningIds.length,
        grossPaise: data.grossPaise.toString(),
        tdsDeductionPaise: tdsPaise.toString(),
        netPayoutPaise: netPayoutPaise.toString(),
        netPayoutRupees: (Number(netPayoutPaise) / 100).toFixed(2),
      });

      allEarningIdsToUpdate.push(...data.earningIds);
    }

    // Atomically transition earnings to PAID with batchId
    await this.db.corporateDriverEarning.updateMany({
      where: { id: { in: allEarningIdsToUpdate } },
      data: {
        payoutStatus: 'PAID',
        payoutBatchId: batchId,
      },
    });

    this.logger.log(
      `Generated driver payout batch ${batchId}: ₹${(Number(batchNetPayoutPaise) / 100).toFixed(2)} across ${driverMap.size} drivers (${allEarningIdsToUpdate.length} routes)`,
    );

    await this.audit.log({
      action: 'CORPORATE_DRIVER_PAYOUT_BATCH_GENERATED',
      userId: actorUserId,
      entityId: batchId,
      entityType: 'PAYOUT_BATCH',
      metadata: {
        batchId,
        totalDrivers: driverMap.size,
        totalNetPayoutPaise: batchNetPayoutPaise.toString(),
        totalTdsPaise: batchTdsPaise.toString(),
      },
    });

    return {
      batchId,
      totalDrivers: driverMap.size,
      totalGrossPaise: batchGrossPaise.toString(),
      totalTdsPaise: batchTdsPaise.toString(),
      totalNetPayoutPaise: batchNetPayoutPaise.toString(),
      disbursements,
    };
  }

  /**
   * Driver Commute Earnings Summary
   */
  public async getDriverEarningsSummary(driverId: string) {
    const earnings = await this.db.corporateDriverEarning.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });

    let totalEarnedPaise = 0n;
    let paidPaise = 0n;
    let unpaidPaise = 0n;

    for (const e of earnings) {
      totalEarnedPaise += e.totalEarnedPaise;
      if (e.payoutStatus === 'PAID') {
        paidPaise += e.totalEarnedPaise;
      } else {
        unpaidPaise += e.totalEarnedPaise;
      }
    }

    const estimatedTdsPaise = (totalEarnedPaise * 1n) / 100n;

    return {
      driverId,
      totalRoutesCount: earnings.length,
      totalEarnedPaise: totalEarnedPaise.toString(),
      paidPaise: paidPaise.toString(),
      unpaidPaise: unpaidPaise.toString(),
      estimatedTdsPaise: estimatedTdsPaise.toString(),
      netPaidPaise: ((paidPaise * 99n) / 100n).toString(),
      netUnpaidPaise: ((unpaidPaise * 99n) / 100n).toString(),
    };
  }
}
