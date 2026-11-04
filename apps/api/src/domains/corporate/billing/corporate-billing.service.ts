import {
  Injectable,
  Logger,
  Optional,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
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
import { RateCardService } from './rate-card.service';
import {
  ClientCardTerms,
  DEFAULT_CLIENT_TERMS,
  priceClientTrip,
  tdsOf,
} from './corporate-fare-math';
import { CorporatePayoutService } from './corporate-payout.service';

@Injectable()
export class CorporateBillingService {
  private readonly logger = new Logger(CorporateBillingService.name);

  // Corporate fares come from versioned rate cards (corporate-fare-math.ts holds the fallback).

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly rateCards?: RateCardService,
    @Optional() private readonly payouts?: CorporatePayoutService,
  ) {}

  private getRateCards(): RateCardService {
    return this.rateCards ?? new RateCardService(this.db);
  }

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

    // Billable routes in the period: COMPLETED trips, plus CANCELLED ones (a late-cancellation
    // charge applies only when the card in effect has cancellationPaise > 0).
    const candidateRoutes = await this.db.corporateRoute.findMany({
      where: {
        tenantId: dto.tenantId,
        status: { in: ['COMPLETED', 'CANCELLED'] },
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        office: true,
        stops: { select: { id: true, status: true } },
      },
    });

    // A route is billed at most once (any earlier invoice line for it excludes it).
    const candidateIds = candidateRoutes.map((r: any) => r.id);
    const existingLines = candidateIds.length
      ? await this.db.corporateInvoiceLine.findMany({
          where: { routeId: { in: candidateIds } },
          select: { routeId: true },
        })
      : [];
    const invoicedRouteIds = new Set(existingLines.map((l: any) => l.routeId));
    const unbilledRoutes = candidateRoutes.filter((r: any) => !invoicedRouteIds.has(r.id));

    // Every corporate card version of the tenant, loaded once; each line is priced by the version
    // in effect at the trip's own instant (pickup time), so a mid-period rate change splits correctly.
    const cards = await this.loadTenantCards(dto.tenantId);
    const cancelCutoffHours = await this.loadCancelCutoffHours(dto.tenantId);

    const lineItemData: Array<{
      routeId: string;
      billableDistanceMeters: number;
      amountPaise: bigint;
      lineType: 'TRIP' | 'CANCELLATION';
      rateCardId: string | null;
      rateCardVersion: number | null;
      noShowCount: number;
      noShowPaise: bigint;
    }> = [];

    let subtotalPaise = 0n;

    for (const route of unbilledRoutes as any[]) {
      const tripAt = this.tripInstant(route);
      const category = route.vehicleCategory || 'SEDAN';
      const stops: any[] = Array.isArray(route.stops) ? route.stops : [];

      if (route.status === 'CANCELLED') {
        // Late cancellation: cancelled (last state change) inside the tenant's cancel cutoff.
        const cancelledAt = route.updatedAt ? new Date(route.updatedAt) : null;
        const cutoffAt = new Date(tripAt.getTime() - cancelCutoffHours * 3600_000);
        if (!cancelledAt || cancelledAt < cutoffAt) continue;
        const card = RateCardService.selectClientCard(cards, category, tripAt);
        const fee = card?.cancellationPaise ?? DEFAULT_CLIENT_TERMS.cancellationPaise;
        if (fee <= 0n) continue;
        subtotalPaise += fee;
        lineItemData.push({
          routeId: route.id,
          billableDistanceMeters: 0,
          amountPaise: fee,
          lineType: 'CANCELLATION',
          rateCardId: card?.id ?? null,
          rateCardVersion: card?.version ?? null,
          noShowCount: 0,
          noShowPaise: 0n,
        });
        continue;
      }

      const noShowCount = stops.filter((s) => s.status === 'NO_SHOW').length;
      const fare = await this.resolveClientFare(
        dto.tenantId,
        category,
        route.estDistanceMeters,
        Math.max(1, stops.length),
        { at: tripAt, durationSeconds: route.estDurationSeconds, noShowCount, cards },
      );

      subtotalPaise += fare.totalAmountPaise;
      lineItemData.push({
        routeId: route.id,
        billableDistanceMeters: route.estDistanceMeters,
        amountPaise: fare.totalAmountPaise,
        lineType: 'TRIP',
        rateCardId: fare.rateCardId ?? null,
        rateCardVersion: fare.rateCardVersion ?? null,
        noShowCount,
        noShowPaise: fare.noShowPaise,
      });
    }

    if (lineItemData.length === 0) {
      throw new BadRequestException(
        `No unbilled completed routes found for tenant ${tenant.name} between ${dto.billingPeriodStart} and ${dto.billingPeriodEnd}`,
      );
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
            lineType: line.lineType,
            rateCardId: line.rateCardId,
            rateCardVersion: line.rateCardVersion,
            noShowCount: line.noShowCount,
            noShowPaise: line.noShowPaise,
          },
        });
      }

      return createdInvoice;
    });

    this.logger.log(
      `Generated Invoice ${invoice.invoiceNumber} for ${tenant.name}: ₹${(Number(totalAmountPaise) / 100).toFixed(2)} (${lineItemData.length} lines)`,
    );

    this.notifications.emitEvent(`corporate:${dto.tenantId}`, 'CORPORATE_INVOICE_ISSUED', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmountPaise: totalAmountPaise.toString(),
      subtotalPaise: subtotalPaise.toString(),
      gstPaise: gstPaise.toString(),
      routesCount: lineItemData.length,
    });

    await this.audit.log({
      action: 'CORPORATE_INVOICE_GENERATED',
      userId: actorUserId,
      entityId: invoice.id,
      entityType: 'CORPORATE_INVOICE',
      metadata: {
        tenantId: dto.tenantId,
        invoiceNumber,
        routesCount: lineItemData.length,
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
      lines: invoice.lines.map((l: any) => ({
        ...l,
        amountPaise: l.amountPaise.toString(),
        noShowPaise: l.noShowPaise === undefined || l.noShowPaise === null ? l.noShowPaise : String(l.noShowPaise),
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
   * Read-only preview of the next driver payout batch: groups UNPAID earnings per driver and applies
   * 1% TDS (Section 194C) in integer paise. Writes nothing. Money only moves through the
   * maker-checker batch flow (createPayoutBatch -> approvePayoutBatch -> submit), and earnings
   * become PAID only from the payout provider's signed confirmation.
   * (Replaces the old prepareDriverPayoutBatch, which marked earnings PAID with no payment made.)
   */
  public async previewDriverPayoutBatch(dto?: DriverPayoutBatchDto) {
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
        batchId: 'preview',
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

    const batchId = 'preview';
    let batchGrossPaise = 0n;
    let batchTdsPaise = 0n;
    let batchNetPayoutPaise = 0n;

    const disbursements: any[] = [];

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
    }

    return {
      batchId,
      totalDrivers: driverMap.size,
      totalGrossPaise: batchGrossPaise.toString(),
      totalTdsPaise: batchTdsPaise.toString(),
      totalNetPayoutPaise: batchNetPayoutPaise.toString(),
      disbursements,
    };
  }

  // The legacy one-step payout (`prepareDriverPayoutBatch`, POST payouts/prepare-batch) marked
  // earnings PAID with no maker-checker and no provider confirmation. It is retired: payouts go
  // through createPayoutBatch -> approvePayoutBatch -> CorporatePayoutService.submitBatch, and an
  // earning becomes PAID only from a signed provider confirmation.


  /**
   * Driver Commute Earnings Summary
   */
  public async getDriverEarningsSummary(driverId: string) {
    const earnings = await this.db.corporateDriverEarning.findMany({
      // VOIDED earnings (withdrawn by a reassign) are kept for audit but never counted.
      where: { driverId, payoutStatus: { not: 'VOIDED' } },
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
   * WS-E: Resolves a corporate client trip fare from the CorporateRateCard version in effect at
   * `options.at` (default: now). Pass `options.cards` (all versions of the tenant) to price many
   * trips with one query. Falls back to the default ₹400 (first 10 km) + ₹25/km, logged.
   */
  public async resolveClientFare(
    tenantId: string,
    vehicleCategory: string = 'SEDAN',
    distanceMeters: number,
    stopsCount: number = 1,
    options: {
      at?: Date;
      durationSeconds?: number;
      noShowCount?: number;
      cards?: readonly ClientCardTerms[];
    } = {},
  ): Promise<{
    baseFarePaise: bigint;
    distancePaise: bigint;
    stopsPaise: bigint;
    durationPaise: bigint;
    minimumTopUpPaise: bigint;
    noShowPaise: bigint;
    totalAmountPaise: bigint;
    rateCardId?: string;
    rateCardVersion?: number;
  }> {
    const at = options.at ?? new Date();
    // Effective-dated selection lives in RateCardService (same rule for invoices and reads).
    const rateCard: ClientCardTerms | null = options.cards
      ? RateCardService.selectClientCard(options.cards, vehicleCategory, at)
      : await this.getRateCards().findClientRateCard(tenantId, vehicleCategory, at);
    if (!rateCard) {
      this.logger.debug(
        `No corporate rate card in effect for tenant ${tenantId} / ${vehicleCategory} at ${at.toISOString()}; using default fare`,
      );
    }

    const fare = priceClientTrip(rateCard, {
      distanceMeters,
      stopsCount,
      durationSeconds: options.durationSeconds,
      noShowCount: options.noShowCount,
    });

    return {
      ...fare,
      rateCardId: rateCard?.id,
      rateCardVersion: rateCard?.version ?? undefined,
    };
  }

  /**
   * WS-E: Resolves an independent driver payout from the CorporateDriverRateCard version in effect
   * at `at` (default now), via RateCardService. Falls back to ₹300 (first 10 km) + ₹18/km.
   */
  public async resolveDriverPayout(
    vehicleCategory: string = 'SEDAN',
    distanceMeters: number,
    at: Date = new Date(),
  ): Promise<{
    basePayoutPaise: bigint;
    distancePaise: bigint;
    totalPayoutPaise: bigint;
    rateCardId?: string;
  }> {
    // Lookup + arithmetic live in RateCardService (shared with dispatch offer pricing).
    return this.getRateCards().resolveDriverPayout(vehicleCategory, distanceMeters, at);
  }

  /**
   * WS-E: Creates a driver payout batch (maker step) with idempotency key enforcement.
   * Status SUBMITTED = submitted for checker approval. One CorporatePayout row per driver
   * (status PENDING, unique idempotencyKey) is created in the same transaction; the batch is
   * only sent to the provider after approval (POST payouts/batches/:id/submit).
   * Creation is serialised with a transaction-scoped advisory lock so two concurrent makers can
   * never claim the same UNPAID earning.
   */
  public async createPayoutBatch(
    dto: DriverPayoutBatchDto,
    makerUserId: string,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey || `payout-batch-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const existing = await this.db.corporatePayoutBatch.findUnique({
      where: { idempotencyKey: key },
      include: { earnings: true },
    });
    if (existing) {
      return existing;
    }

    const where: any = { payoutStatus: 'UNPAID' };
    if (dto?.driverIds && dto.driverIds.length > 0) {
      where.driverId = { in: dto.driverIds };
    }
    if (dto?.cutoffDate) {
      where.createdAt = { lte: new Date(dto.cutoffDate) };
    }

    const batchNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await this.db.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('corporate:payout-batch:create'))`;

      // Re-check under the lock (a concurrent request with the same key may have just committed).
      const raced = await tx.corporatePayoutBatch.findUnique({ where: { idempotencyKey: key } });
      if (raced) return { batch: raced, created: false as const };

      const unpaidEarnings = await tx.corporateDriverEarning.findMany({
        where,
        include: {
          driver: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (unpaidEarnings.length === 0) {
        throw new BadRequestException('No unpaid driver commute earnings available for payout batch');
      }

      const perDriver = new Map<string, { gross: bigint; earningIds: string[] }>();
      for (const e of unpaidEarnings) {
        const entry = perDriver.get(e.driverId) ?? { gross: 0n, earningIds: [] };
        entry.gross += e.totalEarnedPaise;
        entry.earningIds.push(e.id);
        perDriver.set(e.driverId, entry);
      }

      // 1% TDS under Section 194C per driver; batch totals are the sums of the payout rows.
      let grossPaise = 0n;
      let tdsPaise = 0n;
      for (const p of perDriver.values()) {
        grossPaise += p.gross;
        tdsPaise += tdsOf(p.gross);
      }
      const netPayoutPaise = grossPaise - tdsPaise;

      const batch = await tx.corporatePayoutBatch.create({
        data: {
          batchNumber,
          idempotencyKey: key,
          status: 'SUBMITTED',
          totalDrivers: perDriver.size,
          totalRoutes: unpaidEarnings.length,
          grossPaise,
          tdsPaise,
          netPayoutPaise,
          createdByUserId: makerUserId,
        },
      });

      // Link earnings and transition to PROCESSING
      await tx.corporateDriverEarning.updateMany({
        where: { id: { in: unpaidEarnings.map((e: any) => e.id) } },
        data: {
          payoutStatus: 'PROCESSING',
          payoutBatchId: batch.id,
        },
      });

      await tx.corporatePayout.createMany({
        data: [...perDriver.entries()].map(([driverId, p]) => {
          const tds = tdsOf(p.gross);
          return {
            batchId: batch.id,
            driverId,
            kind: 'PAYOUT',
            idempotencyKey: `cpo:${batch.id}:${driverId}`,
            status: 'PENDING',
            grossPaise: p.gross,
            tdsPaise: tds,
            netPaise: p.gross - tds,
            earningIds: p.earningIds,
          };
        }),
      });

      return { batch, created: true as const };
    });

    const createdBatch: any = result.batch;
    if (!result.created) return createdBatch;

    this.logger.log(
      `Created payout batch ${batchNumber}: ₹${(Number(createdBatch.netPayoutPaise) / 100).toFixed(2)} across ${createdBatch.totalDrivers} drivers (${createdBatch.totalRoutes} routes)`,
    );

    this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_BATCH_SUBMITTED', {
      batchId: createdBatch.id,
      batchNumber,
      totalDrivers: createdBatch.totalDrivers,
      netPayoutPaise: createdBatch.netPayoutPaise.toString(),
    });

    await this.audit.log({
      action: 'CORPORATE_PAYOUT_BATCH_CREATED',
      userId: makerUserId,
      actorRole: 'FINANCE_CONTROLLER',
      entityId: createdBatch.id,
      entityType: 'CORPORATE_PAYOUT_BATCH',
      metadata: {
        batchNumber,
        totalDrivers: createdBatch.totalDrivers,
        netPayoutPaise: createdBatch.netPayoutPaise.toString(),
      },
    });

    return createdBatch;
  }

  /**
   * WS-E: Approves payout batch with Maker-Checker constraint.
   * Creator cannot approve their own batch. The update is conditional on the status that was
   * read, so two concurrent checkers cannot both approve (the loser gets 409).
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
    if (!checkerUserId || batch.createdByUserId === checkerUserId) {
      throw new ForbiddenException(
        'Maker-Checker violation: Batch creator cannot approve their own payout batch',
      );
    }

    let approved: any;
    try {
      approved = await this.db.corporatePayoutBatch.update({
        where: { id: batchId, status: batch.status },
        data: {
          status: 'APPROVED',
          approvedByUserId: checkerUserId,
          approvedAt: new Date(),
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new ConflictException(`Payout batch ${batch.batchNumber} changed state concurrently; reload and retry`);
      }
      throw err;
    }

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
      metadata: { batchNumber: batch.batchNumber, makerUserId: batch.createdByUserId },
    });

    return approved;
  }

  /**
   * @deprecated Use CorporatePayoutService.submitBatch (POST payouts/batches/:id/submit).
   * Sends an APPROVED batch to the payout provider. It NEVER marks the batch or its earnings PAID:
   * a payout becomes PAID only from a signed provider confirmation (POST payouts/provider-callback).
   */
  public async processPayoutBatch(batchId: string, _disbursementReference?: string, actorUserId?: string) {
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

    if (!this.payouts) {
      throw new ServiceUnavailableException('Payout provider is not wired; cannot submit payout batch');
    }
    return this.payouts.submitBatch(batchId, actorUserId);
  }

  /**
   * WS-E: List payout batches (ADMIN), with per-status payout counts.
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
        include: { payouts: { select: { id: true, status: true, kind: true } } },
      }),
    ]);

    return {
      items: items.map((b: any) => {
        const payoutStatusCounts: Record<string, number> = {};
        for (const p of b.payouts ?? []) {
          if (p.kind !== 'PAYOUT') continue;
          payoutStatusCounts[p.status] = (payoutStatusCounts[p.status] ?? 0) + 1;
        }
        const { payouts: _payouts, ...rest } = b;
        return {
          ...rest,
          grossPaise: String(b.grossPaise),
          tdsPaise: String(b.tdsPaise),
          netPayoutPaise: String(b.netPayoutPaise),
          payoutStatusCounts,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Invoice pricing helpers
  // ---------------------------------------------------------------------------

  /** All corporate card versions of a tenant (one query per invoice run). */
  private async loadTenantCards(tenantId: string): Promise<ClientCardTerms[]> {
    const cards = await this.getRateCards().listClientRateCards({ tenantId });
    if (!cards.length) {
      this.logger.warn(`No corporate rate cards for tenant ${tenantId}; invoice lines use the default fare`);
    }
    return cards;
  }

  /** Tenant policy cancel cutoff (hours before pickup 1); default 9. */
  private async loadCancelCutoffHours(tenantId: string): Promise<number> {
    try {
      const policy = await (this.db as any).corporateTenantPolicy.findFirst({
        where: { tenantId, effectiveFrom: { lte: new Date() } },
        orderBy: { version: 'desc' },
        select: { cancelCutoffHours: true },
      });
      return policy?.cancelCutoffHours ?? 9;
    } catch {
      return 9;
    }
  }

  /** The instant a trip is priced at: its first pickup; else the shift date. */
  private tripInstant(route: any): Date {
    const candidate = route.targetPickup1Time ?? route.shiftDate;
    const d = candidate ? new Date(candidate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }
}
