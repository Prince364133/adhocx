import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { CORPORATE_PAYOUT_PROVIDER, CorporatePayoutProviderPort } from './payout-provider.port';

/** Header carrying hex HMAC-SHA256(rawBody, CORPORATE_PAYOUT_WEBHOOK_SECRET); `sha256=` prefix allowed. */
export const PAYOUT_SIGNATURE_HEADER = 'x-adhocx-signature';

export type ProviderPayoutStatus = 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED';
const PROVIDER_STATUSES: readonly ProviderPayoutStatus[] = ['PROCESSING', 'PAID', 'FAILED', 'REVERSED'];

export type CallbackOutcome =
  | 'APPLIED'
  | 'NOOP_SAME_STATE'
  | 'ILLEGAL_TRANSITION'
  | 'AMOUNT_MISMATCH'
  | 'UNMATCHED';

/** Payout FSM driven by provider confirmations. Submit never reaches PAID. */
const CONFIRMATION_TRANSITIONS: Readonly<Record<ProviderPayoutStatus, readonly string[]>> = {
  PROCESSING: [],
  PAID: ['PROCESSING'],
  FAILED: ['PROCESSING'],
  REVERSED: ['PAID'],
};

interface ParsedCallback {
  eventId: string;
  status: ProviderPayoutStatus;
  idempotencyKey?: string;
  providerPayoutId?: string;
  amountPaise?: bigint;
  providerReference?: string;
  failureReason?: string;
  occurredAt: Date;
}

const MAX_RECON_RANGE_DAYS = 93;

/**
 * Driver payout execution (WS-E): provider submission, signed confirmations, reconciliation.
 *
 * Invariants
 * - A CorporatePayout is PAID only from a provider confirmation, never at submit.
 * - Every provider call uses the payout's unique idempotencyKey; a retry of a FAILED payout
 *   reuses it, so the provider can never pay twice.
 * - REVERSED adds a compensating REVERSAL row; no payout or event row is ever deleted.
 * - Every transition is a conditional update on the status that was read.
 */
@Injectable()
export class CorporatePayoutService {
  private readonly logger = new Logger(CorporatePayoutService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Inject(CORPORATE_PAYOUT_PROVIDER) private readonly provider: CorporatePayoutProviderPort,
  ) {}

  // ---------------------------------------------------------------------------
  // Submit (APPROVED -> PROCESSING), and retry of FAILED payouts
  // ---------------------------------------------------------------------------

  /**
   * Sends every unsent payout of the batch to the provider. Allowed for APPROVED batches (first
   * submit) and PROCESSING / FAILED batches (retry). Payouts eligible for sending: PENDING, FAILED,
   * and PROCESSING ones the provider never acknowledged (crash between claim and call). All of them
   * are re-sent with their own idempotencyKey. Safe to call twice concurrently.
   */
  public async submitBatch(batchId: string, actorUserId?: string) {
    const batch = await this.db.corporatePayoutBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException(`Payout batch ${batchId} not found`);

    if (batch.status === 'APPROVED') {
      const claimed = await this.db.corporatePayoutBatch.updateMany({
        where: { id: batchId, status: 'APPROVED' },
        data: {
          status: 'PROCESSING',
          submittedAt: new Date(),
          submittedByUserId: actorUserId ?? null,
          provider: this.provider.name,
        },
      });
      if (claimed.count === 0) {
        const now = await this.db.corporatePayoutBatch.findUnique({ where: { id: batchId } });
        if (!now || !['PROCESSING', 'FAILED'].includes(now.status)) {
          throw new BadRequestException(`Payout batch ${batch.batchNumber} cannot be submitted in status ${now?.status}`);
        }
      }
    } else if (batch.status !== 'PROCESSING' && batch.status !== 'FAILED') {
      throw new BadRequestException(
        `Payout batch ${batch.batchNumber} must be APPROVED (or PROCESSING/FAILED to retry) before submit. Current status: ${batch.status}`,
      );
    }

    const sendable = await this.db.corporatePayout.findMany({
      where: {
        batchId,
        kind: 'PAYOUT',
        OR: [{ status: { in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', providerPayoutId: null }],
      },
      orderBy: { createdAt: 'asc' },
    });

    const results: Array<{ payoutId: string; driverId: string; idempotencyKey: string; result: string }> = [];
    for (const payout of sendable) {
      results.push(await this.sendOne(payout));
    }

    await this.recomputeBatchStatus(this.db, batchId);

    await this.audit.log({
      action: 'CORPORATE_PAYOUT_BATCH_SUBMITTED_TO_PROVIDER',
      userId: actorUserId,
      actorRole: 'ADMIN',
      entityId: batchId,
      entityType: 'CORPORATE_PAYOUT_BATCH',
      metadata: { batchNumber: batch.batchNumber, provider: this.provider.name, sent: results.length },
    });
    this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_BATCH_PROCESSING', {
      batchId,
      batchNumber: batch.batchNumber,
      sent: results.length,
    });

    return { ...(await this.getBatch(batchId)), submitted: results };
  }

  private async sendOne(payout: any) {
    const base = { payoutId: payout.id, driverId: payout.driverId, idempotencyKey: payout.idempotencyKey };
    const claimWhere: any =
      payout.status === 'PROCESSING'
        ? { id: payout.id, status: 'PROCESSING', providerPayoutId: null }
        : { id: payout.id, status: payout.status };
    const claim = await this.db.corporatePayout.updateMany({
      where: claimWhere,
      data: { status: 'PROCESSING', attemptCount: { increment: 1 }, submittedAt: new Date(), failureReason: null },
    });
    if (claim.count === 0) return { ...base, result: 'SKIPPED_CONCURRENT' };

    let outcome;
    try {
      outcome = await this.provider.submitPayout({
        idempotencyKey: payout.idempotencyKey,
        payoutId: payout.id,
        driverId: payout.driverId,
        amountPaise: BigInt(payout.netPaise),
        narration: `AdhocX ETS payout ${payout.idempotencyKey}`,
      });
    } catch (err) {
      // Ambiguous: the provider may have accepted. Stay PROCESSING without providerPayoutId so the
      // next submit re-sends the same idempotencyKey.
      const msg = (err as Error)?.message ?? String(err);
      await this.db.corporatePayout.updateMany({
        where: { id: payout.id, status: 'PROCESSING' },
        data: { failureReason: `SUBMIT_ERROR: ${msg}`.slice(0, 500) },
      });
      this.logger.warn(`Payout ${payout.idempotencyKey} submit error (will be re-sent with the same key): ${msg}`);
      return { ...base, result: 'SUBMIT_ERROR' };
    }

    if (outcome.accepted) {
      await this.db.corporatePayout.updateMany({
        where: { id: payout.id, status: 'PROCESSING' },
        data: { providerPayoutId: outcome.providerPayoutId ?? null },
      });
      return { ...base, result: 'ACCEPTED' };
    }
    await this.db.corporatePayout.updateMany({
      where: { id: payout.id, status: 'PROCESSING' },
      data: { status: 'FAILED', failedAt: new Date(), failureReason: outcome.failureReason ?? 'REJECTED_BY_PROVIDER' },
    });
    return { ...base, result: 'REJECTED' };
  }

  // ---------------------------------------------------------------------------
  // Signed provider callback
  // ---------------------------------------------------------------------------

  /** Constant-time HMAC check. Throws 401 on a missing secret, header or mismatch. */
  public verifySignature(rawBody: Buffer | string, signature: string | undefined): void {
    const secret = process.env.CORPORATE_PAYOUT_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('Payout callback rejected: CORPORATE_PAYOUT_WEBHOOK_SECRET is not configured');
      throw new UnauthorizedException('Payout callback verification is not configured');
    }
    if (!signature || typeof signature !== 'string') {
      throw new UnauthorizedException('Missing payout callback signature');
    }
    const provided = signature.trim().replace(/^sha256=/i, '');
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const providedBuf = /^[0-9a-f]+$/i.test(provided) && provided.length % 2 === 0 ? Buffer.from(provided, 'hex') : Buffer.alloc(0);
    if (providedBuf.length !== expected.length || !timingSafeEqual(providedBuf, expected)) {
      throw new UnauthorizedException('Invalid payout callback signature');
    }
  }

  /**
   * Verifies, de-duplicates (by provider + eventId) and applies a provider confirmation.
   * A replayed eventId is acknowledged without any effect.
   */
  public async handleProviderCallback(rawBody: Buffer | string, signature: string | undefined, body?: any) {
    this.verifySignature(rawBody, signature);
    let payload = body;
    if (!payload || typeof payload !== 'object' || Buffer.isBuffer(payload)) {
      try {
        payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody);
      } catch {
        throw new BadRequestException('Payout callback body is not valid JSON');
      }
    }
    const event = this.parseCallback(payload);
    const providerName = this.provider.name;

    let result: { duplicate: boolean; outcome: CallbackOutcome; payoutId: string | null; batchId: string | null };
    try {
      result = await this.db.$transaction(async (tx: any) => {
        const seen = await tx.corporatePayoutProviderEvent.findUnique({
          where: { provider_eventId: { provider: providerName, eventId: event.eventId } },
        });
        if (seen) {
          return { duplicate: true, outcome: seen.outcome as CallbackOutcome, payoutId: seen.payoutId, batchId: null };
        }

        let payout: any = null;
        if (event.idempotencyKey) {
          payout = await tx.corporatePayout.findUnique({ where: { idempotencyKey: event.idempotencyKey } });
        } else if (event.providerPayoutId) {
          payout = await tx.corporatePayout.findFirst({
            where: { providerPayoutId: event.providerPayoutId, kind: 'PAYOUT' },
          });
        }
        if (payout && payout.kind !== 'PAYOUT') payout = null;

        const outcome = payout ? await this.applyConfirmation(tx, payout, event) : 'UNMATCHED';

        await tx.corporatePayoutProviderEvent.create({
          data: {
            provider: providerName,
            eventId: event.eventId,
            payoutId: payout?.id ?? null,
            idempotencyKey: event.idempotencyKey ?? payout?.idempotencyKey ?? null,
            providerPayoutId: event.providerPayoutId ?? null,
            status: event.status,
            amountPaise: event.amountPaise ?? null,
            providerReference: event.providerReference ?? null,
            outcome,
            occurredAt: event.occurredAt,
            receivedAt: new Date(),
            payload: this.jsonSafe(payload),
          },
        });

        if (payout && outcome === 'APPLIED') await this.recomputeBatchStatus(tx, payout.batchId);
        return { duplicate: false, outcome, payoutId: payout?.id ?? null, batchId: payout?.batchId ?? null };
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Concurrent delivery of the same eventId: the other transaction won; ignore this one.
        return { received: true, duplicate: true, eventId: event.eventId };
      }
      throw err;
    }

    if (!result.duplicate) {
      await this.audit.log({
        action: 'CORPORATE_PAYOUT_PROVIDER_CONFIRMATION',
        actorRole: 'PAYOUT_PROVIDER',
        entityId: result.payoutId ?? event.eventId,
        entityType: 'CORPORATE_PAYOUT',
        metadata: { eventId: event.eventId, status: event.status, outcome: result.outcome, provider: providerName },
      });
      if (result.outcome !== 'APPLIED' && result.outcome !== 'NOOP_SAME_STATE') {
        this.notifications.emitEvent('admin:finance', 'CORPORATE_PAYOUT_RECONCILIATION_ALERT', {
          eventId: event.eventId,
          outcome: result.outcome,
          payoutId: result.payoutId,
        });
      }
    }

    return {
      received: true,
      duplicate: result.duplicate,
      eventId: event.eventId,
      outcome: result.outcome,
      payoutId: result.payoutId,
    };
  }

  private async applyConfirmation(tx: any, payout: any, event: ParsedCallback): Promise<CallbackOutcome> {
    const target = event.status;
    if (payout.status === target) return 'NOOP_SAME_STATE';
    if (!CONFIRMATION_TRANSITIONS[target].includes(payout.status)) return 'ILLEGAL_TRANSITION';
    if ((target === 'PAID' || target === 'REVERSED') && event.amountPaise !== BigInt(payout.netPaise)) {
      return 'AMOUNT_MISMATCH';
    }

    const data: any = { status: target };
    if (event.providerReference) data.providerReference = event.providerReference;
    if (target === 'PAID') data.paidAt = event.occurredAt;
    if (target === 'FAILED') {
      data.failedAt = event.occurredAt;
      data.failureReason = event.failureReason ?? 'FAILED_AT_PROVIDER';
    }
    if (target === 'REVERSED') data.reversedAt = event.occurredAt;

    const moved = await tx.corporatePayout.updateMany({ where: { id: payout.id, status: payout.status }, data });
    if (moved.count === 0) return 'ILLEGAL_TRANSITION';

    const earningIds: string[] = payout.earningIds ?? [];
    if (target === 'PAID' && earningIds.length) {
      await tx.corporateDriverEarning.updateMany({
        where: { id: { in: earningIds }, payoutStatus: 'PROCESSING' },
        data: { payoutStatus: 'PAID' },
      });
    }
    if (target === 'REVERSED') {
      // Compensating record: the money came back. The original PAYOUT row stays as it was paid.
      await tx.corporatePayout.create({
        data: {
          batchId: payout.batchId,
          driverId: payout.driverId,
          kind: 'REVERSAL',
          reversalOfId: payout.id,
          idempotencyKey: `${payout.idempotencyKey}:reversal`,
          status: 'REVERSED',
          grossPaise: -BigInt(payout.grossPaise),
          tdsPaise: -BigInt(payout.tdsPaise),
          netPaise: -BigInt(payout.netPaise),
          earningIds,
          providerPayoutId: payout.providerPayoutId ?? null,
          providerReference: event.providerReference ?? null,
          reversedAt: event.occurredAt,
        },
      });
      // The driver is still owed: the earnings become payable again in a later batch.
      if (earningIds.length) {
        await tx.corporateDriverEarning.updateMany({
          where: { id: { in: earningIds }, payoutStatus: 'PAID' },
          data: { payoutStatus: 'UNPAID', payoutBatchId: null },
        });
      }
    }
    return 'APPLIED';
  }

  private parseCallback(body: any): ParsedCallback {
    if (!body || typeof body !== 'object') throw new BadRequestException('Payout callback body must be an object');
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!eventId || eventId.length > 128) throw new BadRequestException('eventId is required (<= 128 chars)');
    const status = String(body.status ?? '').toUpperCase() as ProviderPayoutStatus;
    if (!PROVIDER_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of ${PROVIDER_STATUSES.join(', ')}`);
    }
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey ? body.idempotencyKey : undefined;
    const providerPayoutId =
      typeof body.providerPayoutId === 'string' && body.providerPayoutId ? body.providerPayoutId : undefined;
    if (!idempotencyKey && !providerPayoutId) {
      throw new BadRequestException('idempotencyKey or providerPayoutId is required');
    }
    let amountPaise: bigint | undefined;
    if (body.amountPaise !== undefined && body.amountPaise !== null) {
      const raw = String(body.amountPaise);
      if (!/^\d+$/.test(raw)) throw new BadRequestException('amountPaise must be a non-negative integer (paise)');
      amountPaise = BigInt(raw);
    }
    if ((status === 'PAID' || status === 'REVERSED') && amountPaise === undefined) {
      throw new BadRequestException(`amountPaise is required for ${status}`);
    }
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
    if (isNaN(occurredAt.getTime())) throw new BadRequestException('occurredAt must be an ISO timestamp');
    return {
      eventId,
      status,
      idempotencyKey,
      providerPayoutId,
      amountPaise,
      providerReference: typeof body.providerReference === 'string' ? body.providerReference.slice(0, 128) : undefined,
      failureReason: typeof body.failureReason === 'string' ? body.failureReason.slice(0, 500) : undefined,
      occurredAt,
    };
  }

  /**
   * Batch status is a summary of its PAYOUT rows: any PENDING/PROCESSING -> PROCESSING;
   * else any FAILED -> FAILED (retryable); else (all PAID / REVERSED) -> PAID.
   */
  private async recomputeBatchStatus(client: any, batchId: string): Promise<void> {
    const payouts = await client.corporatePayout.findMany({
      where: { batchId, kind: 'PAYOUT' },
      select: { status: true },
    });
    if (!payouts.length) return;
    const statuses = payouts.map((p: any) => p.status as string);
    let next: 'PROCESSING' | 'FAILED' | 'PAID';
    if (statuses.some((s: string) => s === 'PENDING' || s === 'PROCESSING')) next = 'PROCESSING';
    else if (statuses.includes('FAILED')) next = 'FAILED';
    else next = 'PAID';
    await client.corporatePayoutBatch.updateMany({
      where: { id: batchId, status: { in: ['PROCESSING', 'FAILED', 'PAID'] }, NOT: { status: next } },
      data: { status: next, ...(next === 'PAID' ? { processedAt: new Date() } : {}) },
    });
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  public async getBatch(batchId: string) {
    const batch = await this.db.corporatePayoutBatch.findUnique({
      where: { id: batchId },
      include: { payouts: { orderBy: { createdAt: 'asc' } } },
    });
    if (!batch) throw new NotFoundException(`Payout batch ${batchId} not found`);
    return {
      ...batch,
      grossPaise: String(batch.grossPaise),
      tdsPaise: String(batch.tdsPaise),
      netPayoutPaise: String(batch.netPayoutPaise),
      payouts: (batch.payouts ?? []).map((p: any) => this.serializePayout(p)),
    };
  }

  private serializePayout(p: any) {
    return {
      ...p,
      grossPaise: String(p.grossPaise),
      tdsPaise: String(p.tdsPaise),
      netPaise: String(p.netPaise),
    };
  }

  // ---------------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------------

  /**
   * Lists (a) payouts whose status differs from the provider's latest confirmation (or that are
   * PAID with no applied PAID confirmation), and (b) confirmations that match no payout.
   * Window = provider events received in [from, to] plus payouts paid in [from, to].
   */
  public async getReconciliation(fromRaw?: string, toRaw?: string) {
    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('from and to are required ISO dates');
    }
    if (from > to) throw new BadRequestException('from must not be after to');
    if (to.getTime() - from.getTime() > MAX_RECON_RANGE_DAYS * 86400_000) {
      throw new BadRequestException(`Reconciliation range is limited to ${MAX_RECON_RANGE_DAYS} days`);
    }

    const windowEvents = await this.db.corporatePayoutProviderEvent.findMany({
      where: { receivedAt: { gte: from, lte: to } },
      orderBy: [{ occurredAt: 'asc' }, { receivedAt: 'asc' }],
    });
    const paidInWindow = await this.db.corporatePayout.findMany({
      where: { kind: 'PAYOUT', paidAt: { gte: from, lte: to } },
    });

    const payoutIds = new Set<string>();
    for (const e of windowEvents) if (e.payoutId) payoutIds.add(e.payoutId);
    for (const p of paidInWindow) payoutIds.add(p.id);

    const ids = [...payoutIds];
    const [payouts, allEvents] = ids.length
      ? await Promise.all([
          this.db.corporatePayout.findMany({ where: { id: { in: ids } } }),
          this.db.corporatePayoutProviderEvent.findMany({
            where: { payoutId: { in: ids } },
            orderBy: [{ occurredAt: 'asc' }, { receivedAt: 'asc' }],
          }),
        ])
      : [[], []];

    const eventsByPayout = new Map<string, any[]>();
    for (const e of allEvents as any[]) {
      const list = eventsByPayout.get(e.payoutId) ?? [];
      list.push(e);
      eventsByPayout.set(e.payoutId, list);
    }

    const mismatches: any[] = [];
    for (const p of payouts as any[]) {
      const events = eventsByPayout.get(p.id) ?? [];
      const latest = events[events.length - 1];
      const base = {
        payoutId: p.id,
        batchId: p.batchId,
        driverId: p.driverId,
        idempotencyKey: p.idempotencyKey,
        payoutStatus: p.status,
        payoutNetPaise: String(p.netPaise),
      };
      if (p.status === 'PAID' && !events.some((e) => e.status === 'PAID' && e.outcome === 'APPLIED')) {
        mismatches.push({ ...base, providerStatus: latest?.status ?? null, reason: 'PAID_WITHOUT_CONFIRMATION' });
        continue;
      }
      if (!latest) continue;
      const amountDiffers =
        latest.amountPaise !== null && latest.amountPaise !== undefined &&
        (latest.status === 'PAID' || latest.status === 'REVERSED') &&
        BigInt(latest.amountPaise) !== BigInt(p.netPaise);
      if (latest.status !== p.status || amountDiffers) {
        mismatches.push({
          ...base,
          providerStatus: latest.status,
          providerEventId: latest.eventId,
          providerAmountPaise: latest.amountPaise === null || latest.amountPaise === undefined ? null : String(latest.amountPaise),
          reason: amountDiffers ? 'AMOUNT_MISMATCH' : 'STATUS_MISMATCH',
        });
      }
    }

    const unmatchedConfirmations = (windowEvents as any[])
      .filter((e) => !e.payoutId)
      .map((e) => ({
        eventId: e.eventId,
        provider: e.provider,
        idempotencyKey: e.idempotencyKey,
        providerPayoutId: e.providerPayoutId,
        status: e.status,
        amountPaise: e.amountPaise === null || e.amountPaise === undefined ? null : String(e.amountPaise),
        receivedAt: e.receivedAt,
      }));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      payoutsChecked: payouts.length,
      confirmationsChecked: windowEvents.length,
      clean: mismatches.length === 0 && unmatchedConfirmations.length === 0,
      mismatches,
      unmatchedConfirmations,
    };
  }

  private jsonSafe(value: any): any {
    return JSON.parse(JSON.stringify(value ?? {}, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  }
}
