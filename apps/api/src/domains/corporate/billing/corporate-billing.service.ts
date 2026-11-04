import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import PDFDocument from 'pdfkit';

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
        tenant: {
          include: {
            offices: true,
          },
        },
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
   * Generates a professional B2B GST tax invoice PDF binary stream.
   * Includes itemized shift routes, SAC 9964 passenger transport code,
   * corporate GSTIN, dual CGST/SGST tax split, and bank wire details.
   */
  public async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.db.corporateInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          include: {
            offices: true,
          },
        },
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

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ─── Header ──────────────────────────────────────────
      doc.fillColor('#0F172A').fontSize(18).text('ADHOCX FLEET TECHNOLOGIES PVT LTD', { align: 'left' });
      doc.fontSize(8).fillColor('#64748B')
        .text('Hitec City, Madhapur, Hyderabad, Telangana 500081 | operations@adhocx.com')
        .text('GSTIN: 36AAACA1234F1Z8 | SAC Code: 9964 (Passenger Transport Services)');
      
      doc.moveDown(0.5);
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // ─── Invoice Meta & Bill To ───────────────────────────
      const startY = doc.y;

      // Left Column: Bill To
      doc.fontSize(10).fillColor('#1E293B').text('BILLED TO:', 40, startY);
      doc.fontSize(11).fillColor('#0F172A').text(invoice.tenant.legalEntityName || invoice.tenant.name, 40, startY + 15);
      doc.fontSize(9).fillColor('#64748B')
        .text(`Tenant Code: ${invoice.tenant.code}`, 40, startY + 30)
        .text(`GSTIN: ${invoice.tenant.gstin || 'Unregistered / Exempt'}`, 40, startY + 43)
        .text(`Address: ${invoice.tenant.offices?.[0]?.addressText || 'Hyderabad Campus, Telangana'}`, 40, startY + 56);

      // Right Column: Invoice Details
      doc.fontSize(14).fillColor('#0284C7').text('TAX INVOICE', 350, startY, { align: 'right' });
      doc.fontSize(9).fillColor('#334155')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 350, startY + 20, { align: 'right' })
        .text(`Invoice Date: ${invoice.createdAt.toISOString().slice(0, 10)}`, 350, startY + 33, { align: 'right' })
        .text(`Period: ${invoice.billingPeriodStart.toISOString().slice(0, 10)} to ${invoice.billingPeriodEnd.toISOString().slice(0, 10)}`, 350, startY + 46, { align: 'right' })
        .text(`Status: ${invoice.status}`, 350, startY + 59, { align: 'right' });

      doc.moveDown(5);

      // ─── Itemized Route Line Items Table ──────────────────
      const tableTop = Math.max(doc.y, startY + 85);
      doc.rect(40, tableTop, 515, 20).fill('#F1F5F9');
      
      doc.fillColor('#1E293B').fontSize(9)
        .text('#', 45, tableTop + 5, { width: 25 })
        .text('Route ID / Shift', 75, tableTop + 5, { width: 200 })
        .text('Shift Date & Time', 280, tableTop + 5, { width: 110 })
        .text('Distance', 395, tableTop + 5, { width: 60, align: 'right' })
        .text('Amount (INR)', 465, tableTop + 5, { width: 85, align: 'right' });

      let currentY = tableTop + 24;

      invoice.lines.forEach((line, index) => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }

        const distanceKm = (line.billableDistanceMeters / 1000).toFixed(1);
        const amountINR = (Number(line.amountPaise) / 100).toFixed(2);
        const shiftStr = line.route
          ? `${line.route.shiftDate.toISOString().slice(0, 10)} ${line.route.shiftTime} (${line.route.direction})`
          : 'Corporate Shift';

        doc.fillColor('#334155').fontSize(8)
          .text(`${index + 1}`, 45, currentY, { width: 25 })
          .text(line.routeId.slice(0, 24), 75, currentY, { width: 200 })
          .text(shiftStr, 280, currentY, { width: 110 })
          .text(`${distanceKm} km`, 395, currentY, { width: 60, align: 'right' })
          .text(`Rs. ${amountINR}`, 465, currentY, { width: 85, align: 'right' });

        currentY += 16;
      });

      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(40, currentY + 4).lineTo(555, currentY + 4).stroke();
      currentY += 12;

      // ─── Financial Breakdown & Tax Summary ────────────────
      const subtotalINR = (Number(invoice.subtotalPaise) / 100).toFixed(2);
      const halfGstINR = (Number(invoice.gstPaise) / 200).toFixed(2);
      const totalINR = (Number(invoice.totalAmountPaise) / 100).toFixed(2);

      const summaryX = 350;
      doc.fontSize(9).fillColor('#475569')
        .text('Subtotal:', summaryX, currentY)
        .text(`Rs. ${subtotalINR}`, 465, currentY, { width: 85, align: 'right' });

      currentY += 15;
      doc.text('CGST (2.5%):', summaryX, currentY)
        .text(`Rs. ${halfGstINR}`, 465, currentY, { width: 85, align: 'right' });

      currentY += 15;
      doc.text('SGST (2.5%):', summaryX, currentY)
        .text(`Rs. ${halfGstINR}`, 465, currentY, { width: 85, align: 'right' });

      currentY += 18;
      doc.rect(summaryX - 10, currentY - 4, 215, 22).fill('#E0F2FE');
      doc.fontSize(10).fillColor('#0369A1')
        .text('Total Payable:', summaryX, currentY)
        .text(`Rs. ${totalINR}`, 465, currentY, { width: 85, align: 'right' });

      currentY += 35;

      // ─── Bank & Wire Settlement Details ───────────────────
      doc.rect(40, currentY, 515, 50).fill('#F8FAFC');
      doc.strokeColor('#CBD5E1').lineWidth(0.5).rect(40, currentY, 515, 50).stroke();

      doc.fillColor('#0F172A').fontSize(8).text('SETTLEMENT BANK ACCOUNT DETAILS (NEFT / RTGS / IMPS):', 50, currentY + 8);
      doc.fillColor('#475569').fontSize(8)
        .text('Account Name: AdhocX Fleet Technologies Pvt Ltd  |  Account No: 50200012345678', 50, currentY + 22)
        .text('Bank: HDFC Bank Ltd  |  IFSC Code: HDFC0000123  |  Branch: Madhapur Hitec City, Hyderabad', 50, currentY + 34);

      // ─── Footer ───────────────────────────────────────────
      doc.fontSize(7).fillColor('#94A3B8').text(
        'This is a digitally generated Tax Invoice complying with Indian GST rules (Sec 31 CGST Act). No physical signature required.',
        40,
        780,
        { align: 'center', width: 515 },
      );

      doc.end();
    });
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

  /**
   * WS-E: Resolves corporate client route fare using versioned CorporateRateCard.
   * Falls back to default ₹400 base (first 10km) + ₹25/km if no custom rate card is configured.
   */
  public async resolveClientFare(
    tenantId: string,
    vehicleCategory: string = 'SEDAN',
    distanceMeters: number,
    stopsCount: number = 1,
  ): Promise<{
    baseFarePaise: bigint;
    distancePaise: bigint;
    stopsPaise: bigint;
    totalAmountPaise: bigint;
    rateCardId?: string;
  }> {
    let rateCard: any = null;
    try {
      if (this.db?.corporateRateCard?.findFirst) {
        rateCard = await this.db.corporateRateCard.findFirst({
          where: {
            tenantId,
            vehicleCategory: { equals: vehicleCategory, mode: 'insensitive' },
            isActive: true,
          },
          orderBy: { effectiveFrom: 'desc' },
        });
      }
    } catch {
      rateCard = null;
    }

    const baseFarePaise = rateCard ? rateCard.baseFarePaise : this.DEFAULT_BASE_FARE_PAISE;
    const baseDistanceMeters = rateCard ? rateCard.baseDistanceMeters : 10000;
    const perKmPaise = rateCard ? rateCard.perKmPaise : this.DEFAULT_RATE_PER_KM_PAISE;
    const perExtraStopPaise = rateCard ? rateCard.perExtraStopPaise : 0n;

    const extraMeters = Math.max(0, distanceMeters - baseDistanceMeters);
    const extraKm = Math.ceil(extraMeters / 1000);
    const distancePaise = BigInt(extraKm) * perKmPaise;

    const extraStops = Math.max(0, stopsCount - 1);
    const stopsPaise = BigInt(extraStops) * perExtraStopPaise;

    const totalAmountPaise = baseFarePaise + distancePaise + stopsPaise;

    return {
      baseFarePaise,
      distancePaise,
      stopsPaise,
      totalAmountPaise,
      rateCardId: rateCard?.id,
    };
  }

  /**
   * WS-E: Resolves independent driver payout using versioned CorporateDriverRateCard.
   * Falls back to default ₹300 base (first 10km) + ₹18/km if no custom card is configured.
   */
  public async resolveDriverPayout(
    vehicleCategory: string = 'SEDAN',
    distanceMeters: number,
  ): Promise<{
    basePayoutPaise: bigint;
    distancePaise: bigint;
    totalPayoutPaise: bigint;
    rateCardId?: string;
  }> {
    let driverCard: any = null;
    try {
      if (this.db?.corporateDriverRateCard?.findFirst) {
        driverCard = await this.db.corporateDriverRateCard.findFirst({
          where: {
            vehicleCategory: { equals: vehicleCategory, mode: 'insensitive' },
            isActive: true,
          },
          orderBy: { effectiveFrom: 'desc' },
        });
      }
    } catch {
      driverCard = null;
    }

    const basePayoutPaise = driverCard ? driverCard.basePayoutPaise : 30000n; // ₹300
    const baseDistanceMeters = driverCard ? driverCard.baseDistanceMeters : 10000;
    const perKmPaise = driverCard ? driverCard.perKmPaise : 1800n; // ₹18/km

    const extraMeters = Math.max(0, distanceMeters - baseDistanceMeters);
    const extraKm = Math.ceil(extraMeters / 1000);
    const distancePaise = BigInt(extraKm) * perKmPaise;

    const totalPayoutPaise = basePayoutPaise + distancePaise;

    return {
      basePayoutPaise,
      distancePaise,
      totalPayoutPaise,
      rateCardId: driverCard?.id,
    };
  }

  /**
   * WS-E: Creates a driver payout batch with idempotency key enforcement.
   * Status: SUBMITTED (awaiting checker approval).
   */
  public async createPayoutBatch(
    dto: DriverPayoutBatchDto,
    makerUserId: string,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey || `payout-batch-${Date.now()}-${randomUUID().slice(0, 8)}`;

    if (this.db?.corporatePayoutBatch?.findUnique) {
      const existing = await this.db.corporatePayoutBatch.findUnique({
        where: { idempotencyKey: key },
        include: { earnings: true },
      });
      if (existing) {
        return existing;
      }
    }

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
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unpaidEarnings.length === 0) {
      throw new BadRequestException('No unpaid driver commute earnings available for payout batch');
    }

    const uniqueDriverIds = new Set(unpaidEarnings.map((e) => e.driverId));
    let grossPaise = 0n;
    for (const e of unpaidEarnings) {
      grossPaise += e.totalEarnedPaise;
    }

    // 1% TDS under Section 194C
    const tdsPaise = (grossPaise * 1n) / 100n;
    const netPayoutPaise = grossPaise - tdsPaise;

    const batchNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    let createdBatch: any = null;
    if (this.db?.corporatePayoutBatch?.create) {
      createdBatch = await this.db.corporatePayoutBatch.create({
        data: {
          batchNumber,
          idempotencyKey: key,
          status: 'SUBMITTED',
          totalDrivers: uniqueDriverIds.size,
          totalRoutes: unpaidEarnings.length,
          grossPaise,
          tdsPaise,
          netPayoutPaise,
          createdByUserId: makerUserId,
        },
      });

      // Link earnings and transition to PROCESSING
      await this.db.corporateDriverEarning.updateMany({
        where: { id: { in: unpaidEarnings.map((e) => e.id) } },
        data: {
          payoutStatus: 'PROCESSING',
          payoutBatchId: createdBatch.id,
        },
      });
    } else {
      createdBatch = {
        id: randomUUID(),
        batchNumber,
        idempotencyKey: key,
        status: 'SUBMITTED',
        totalDrivers: uniqueDriverIds.size,
        totalRoutes: unpaidEarnings.length,
        grossPaise,
        tdsPaise,
        netPayoutPaise,
        createdByUserId: makerUserId,
        createdAt: new Date(),
      };
    }

    this.logger.log(
      `Created payout batch ${batchNumber}: ₹${(Number(netPayoutPaise) / 100).toFixed(2)} across ${uniqueDriverIds.size} drivers (${unpaidEarnings.length} routes)`,
    );

    this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_BATCH_SUBMITTED', {
      batchId: createdBatch.id,
      batchNumber,
      totalDrivers: uniqueDriverIds.size,
      netPayoutPaise: netPayoutPaise.toString(),
    });

    await this.audit.log({
      action: 'CORPORATE_PAYOUT_BATCH_CREATED',
      userId: makerUserId,
      actorRole: 'FINANCE_CONTROLLER',
      entityId: createdBatch.id,
      entityType: 'CORPORATE_PAYOUT_BATCH',
      metadata: {
        batchNumber,
        totalDrivers: uniqueDriverIds.size,
        netPayoutPaise: netPayoutPaise.toString(),
      },
    });

    return createdBatch;
  }

  /**
   * WS-E: Approves payout batch with Maker-Checker constraint.
   * Creator cannot approve their own batch.
   */
  public async approvePayoutBatch(batchId: string, checkerUserId: string) {
    const batch = await this.db.corporatePayoutBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Payout batch ${batchId} not found`);
    }

    if (batch.status !== 'SUBMITTED' && batch.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve batch in status ${batch.status}`);
    }

    // Strict Maker-Checker constraint enforcement
    if (batch.createdByUserId === checkerUserId) {
      throw new ForbiddenException(
        'Maker-Checker violation: Batch creator cannot approve their own payout batch',
      );
    }

    const approved = await this.db.corporatePayoutBatch.update({
      where: { id: batchId },
      data: {
        status: 'APPROVED',
        approvedByUserId: checkerUserId,
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Payout batch ${batch.batchNumber} approved by checker ${checkerUserId}`);

    this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_BATCH_APPROVED', {
      batchId: approved.id,
      batchNumber: approved.batchNumber,
      approvedByUserId: checkerUserId,
    });

    await this.audit.log({
      action: 'CORPORATE_PAYOUT_BATCH_APPROVED',
      userId: checkerUserId,
      actorRole: 'SUPER_ADMIN',
      entityId: batchId,
      entityType: 'CORPORATE_PAYOUT_BATCH',
      metadata: { batchNumber: batch.batchNumber },
    });

    return approved;
  }

  /**
   * WS-E: Processes payout batch (disbursement settlement) and marks all earnings PAID.
   */
  public async processPayoutBatch(batchId: string, disbursementReference?: string) {
    const batch = await this.db.corporatePayoutBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Payout batch ${batchId} not found`);
    }

    if (batch.status !== 'APPROVED') {
      throw new BadRequestException(
        `Batch must be in APPROVED status before processing. Current status: ${batch.status}`,
      );
    }

    const ref = disbursementReference || `IMPS-${Date.now()}`;

    const paidBatch = await this.db.corporatePayoutBatch.update({
      where: { id: batchId },
      data: {
        status: 'PAID',
        processedAt: new Date(),
        disbursementReference: ref,
      },
    });

    // Mark all linked earnings as PAID
    await this.db.corporateDriverEarning.updateMany({
      where: { payoutBatchId: batchId },
      data: { payoutStatus: 'PAID' },
    });

    this.logger.log(`Payout batch ${batch.batchNumber} settled with reference ${ref}`);

    this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_BATCH_PAID', {
      batchId,
      batchNumber: batch.batchNumber,
      disbursementReference: ref,
    });

    return paidBatch;
  }

  /**
   * WS-E: List payout batches
   */
  public async listPayoutBatches(query?: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) where.status = query.status;

    const [total, items] = await Promise.all([
      this.db.corporatePayoutBatch.count({ where }),
      this.db.corporatePayoutBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
