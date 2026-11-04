import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  RaiseInvoiceDisputeDto,
  ResolveInvoiceDisputeDto,
  parsePaise,
  serializeMoney,
} from './corporate-billing-wire.types';

/**
 * Invoice disputes and credit notes. Corrections are additive: an issued invoice is never edited;
 * an accepted dispute issues an immutable credit note (DB trigger blocks UPDATE/DELETE on it).
 * Credit note GST follows the invoice's own GST ratio, floored to the paise; the credited subtotal
 * of an invoice can never exceed its subtotal (checked under a per-invoice advisory lock).
 */
@Injectable()
export class CorporateInvoiceDisputeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Corporate role (own tenant, enforced by the guard) or ADMIN raises a dispute on an issued invoice. */
  public async raiseDispute(invoiceId: string, dto: RaiseInvoiceDisputeDto, actorUserId: string) {
    const reason = typeof dto?.reason === 'string' ? dto.reason.trim() : '';
    if (reason.length < 5 || reason.length > 2000) throw new BadRequestException('reason must be 5-2000 characters');
    const claimed = parsePaise(dto?.claimedAmountPaise, 'claimedAmountPaise', { required: true, positive: true })!;

    const invoice = await this.db.corporateInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.status === 'DRAFT') throw new BadRequestException('Only issued invoices can be disputed');

    if (dto.invoiceLineId) {
      const line = await this.db.corporateInvoiceLine.findUnique({ where: { id: dto.invoiceLineId } });
      if (!line || line.invoiceId !== invoiceId) throw new BadRequestException('invoiceLineId does not belong to this invoice');
      if (claimed > BigInt(line.amountPaise)) throw new BadRequestException('claimedAmountPaise exceeds the disputed line amount');
    }
    const credited = await this.creditedSubtotal(this.db, invoiceId);
    if (claimed > BigInt(invoice.subtotalPaise) - credited) {
      throw new BadRequestException('claimedAmountPaise exceeds the invoice amount not yet credited');
    }

    const dispute = await this.db.corporateInvoiceDispute.create({
      data: {
        tenantId: invoice.tenantId,
        invoiceId,
        invoiceLineId: dto.invoiceLineId ?? null,
        raisedByUserId: actorUserId,
        reason,
        claimedAmountPaise: claimed,
        status: 'OPEN',
      },
    });

    await this.audit.log({
      action: 'CORPORATE_INVOICE_DISPUTE_RAISED',
      userId: actorUserId,
      entityId: dispute.id,
      entityType: 'CORPORATE_INVOICE_DISPUTE',
      metadata: { invoiceId, tenantId: invoice.tenantId, claimedAmountPaise: claimed.toString() },
    });
    this.notifications.emitEvent('admin:finance', 'CORPORATE_INVOICE_DISPUTE_RAISED', {
      disputeId: dispute.id,
      invoiceId,
      tenantId: invoice.tenantId,
    });
    return this.view(dispute);
  }

  public async listDisputes(tenantId: string | undefined, query: { status?: string; invoiceId?: string } = {}) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    const rows = await this.db.corporateInvoiceDispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { creditNote: true },
    });
    return rows.map((r: any) => this.view(r));
  }

  /** ADMIN accepts: dispute OPEN -> ACCEPTED and one credit note is issued, atomically. */
  public async acceptDispute(disputeId: string, dto: ResolveInvoiceDisputeDto = {}, adminUserId: string) {
    const result = await this.db.$transaction(async (tx: any) => {
      const dispute = await tx.corporateInvoiceDispute.findUnique({ where: { id: disputeId } });
      if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found`);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`corporate-invoice-credit:${dispute.invoiceId}`}::text))`;
      if (dispute.status !== 'OPEN') throw new ConflictException(`Dispute is already ${dispute.status}`);

      const claimed = BigInt(dispute.claimedAmountPaise);
      const approved = parsePaise(dto?.approvedAmountPaise, 'approvedAmountPaise', { positive: true }) ?? claimed;
      if (approved > claimed) throw new BadRequestException('approvedAmountPaise cannot exceed the claimed amount');

      const invoice = await tx.corporateInvoice.findUnique({ where: { id: dispute.invoiceId } });
      const subtotal = BigInt(invoice.subtotalPaise);
      const credited = await this.creditedSubtotal(tx, invoice.id);
      if (approved > subtotal - credited) {
        throw new ConflictException('Credit would exceed the invoice subtotal not yet credited');
      }
      const gst = subtotal > 0n ? (approved * BigInt(invoice.gstPaise)) / subtotal : 0n;

      const moved = await tx.corporateInvoiceDispute.updateMany({
        where: { id: disputeId, status: 'OPEN' },
        data: {
          status: 'ACCEPTED',
          approvedAmountPaise: approved,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
          resolutionNote: dto?.note ?? null,
        },
      });
      if (moved.count === 0) throw new ConflictException('Dispute was resolved concurrently');

      const seq = (await tx.corporateCreditNote.count({ where: { invoiceId: invoice.id } })) + 1;
      const creditNote = await tx.corporateCreditNote.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          disputeId,
          creditNoteNumber: `CN-${invoice.invoiceNumber}-${String(seq).padStart(2, '0')}`,
          subtotalPaise: approved,
          gstPaise: gst,
          totalPaise: approved + gst,
          reason: dispute.reason,
          issuedByUserId: adminUserId,
        },
      });
      const updated = await tx.corporateInvoiceDispute.findUnique({ where: { id: disputeId } });
      return { dispute: updated, creditNote };
    });

    await this.audit.log({
      action: 'CORPORATE_CREDIT_NOTE_ISSUED',
      userId: adminUserId,
      actorRole: 'ADMIN',
      entityId: result.creditNote.id,
      entityType: 'CORPORATE_CREDIT_NOTE',
      metadata: {
        disputeId,
        invoiceId: result.creditNote.invoiceId,
        creditNoteNumber: result.creditNote.creditNoteNumber,
        totalPaise: String(result.creditNote.totalPaise),
      },
    });
    this.notifications.emitEvent(`corporate:${result.creditNote.tenantId}`, 'CORPORATE_CREDIT_NOTE_ISSUED', {
      disputeId,
      creditNoteId: result.creditNote.id,
      creditNoteNumber: result.creditNote.creditNoteNumber,
      totalPaise: String(result.creditNote.totalPaise),
    });
    return { dispute: this.view(result.dispute), creditNote: serializeMoney(result.creditNote) };
  }

  /** ADMIN rejects: dispute OPEN -> REJECTED with a mandatory note. Nothing financial changes. */
  public async rejectDispute(disputeId: string, dto: ResolveInvoiceDisputeDto = {}, adminUserId: string) {
    const note = typeof dto?.note === 'string' ? dto.note.trim() : '';
    if (note.length < 3) throw new BadRequestException('note (reason for rejection) is required');
    const dispute = await this.db.corporateInvoiceDispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found`);
    const moved = await this.db.corporateInvoiceDispute.updateMany({
      where: { id: disputeId, status: 'OPEN' },
      data: { status: 'REJECTED', resolvedByUserId: adminUserId, resolvedAt: new Date(), resolutionNote: note },
    });
    if (moved.count === 0) throw new ConflictException(`Dispute is already ${dispute.status}`);

    await this.audit.log({
      action: 'CORPORATE_INVOICE_DISPUTE_REJECTED',
      userId: adminUserId,
      actorRole: 'ADMIN',
      entityId: disputeId,
      entityType: 'CORPORATE_INVOICE_DISPUTE',
      metadata: { invoiceId: dispute.invoiceId },
    });
    this.notifications.emitEvent(`corporate:${dispute.tenantId}`, 'CORPORATE_INVOICE_DISPUTE_REJECTED', { disputeId });
    return this.view(await this.db.corporateInvoiceDispute.findUnique({ where: { id: disputeId } }));
  }

  public async listCreditNotes(tenantId: string | undefined, query: { invoiceId?: string } = {}) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    const rows = await this.db.corporateCreditNote.findMany({ where, orderBy: { issuedAt: 'desc' }, take: 200 });
    return rows.map((r: any) => serializeMoney(r));
  }

  private async creditedSubtotal(client: any, invoiceId: string): Promise<bigint> {
    const notes = await client.corporateCreditNote.findMany({
      where: { invoiceId },
      select: { subtotalPaise: true },
    });
    return notes.reduce((sum: bigint, n: any) => sum + BigInt(n.subtotalPaise), 0n);
  }

  private view(d: any) {
    if (!d) return d;
    const { creditNote, ...rest } = d;
    return {
      ...serializeMoney(rest),
      ...(creditNote !== undefined ? { creditNote: creditNote ? serializeMoney(creditNote) : null } : {}),
    };
  }
}
