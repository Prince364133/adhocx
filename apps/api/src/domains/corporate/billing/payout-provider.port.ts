import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Payout provider port (docs/15 §28: the domain never depends on provider-specific concepts).
 *
 * `submitPayout` only hands a payout to the provider. Acceptance is NOT payment: a payout becomes
 * PAID only when the provider later sends a signed confirmation (POST payouts/provider-callback).
 * The provider must treat `idempotencyKey` as its idempotency key: re-submitting the same key
 * (retry after FAILED, crash recovery, duplicate submit) must never create a second transfer.
 */
export const CORPORATE_PAYOUT_PROVIDER = Symbol('CORPORATE_PAYOUT_PROVIDER');

export interface PayoutSubmitRequest {
  idempotencyKey: string;
  payoutId: string;
  driverId: string;
  amountPaise: bigint;
  narration: string;
}

export interface PayoutSubmitResult {
  /** true = provider accepted the instruction (still unpaid); false = synchronous rejection. */
  accepted: boolean;
  providerPayoutId?: string;
  failureReason?: string;
}

export interface CorporatePayoutProviderPort {
  readonly name: string;
  submitPayout(request: PayoutSubmitRequest): Promise<PayoutSubmitResult>;
}

/**
 * Deterministic in-memory provider for development and tests. Idempotent per key: the same key
 * always maps to the same providerPayoutId and is counted as one transfer. It never confirms a
 * payout by itself; tests drive confirmations through the signed callback.
 */
export class MockPayoutProviderAdapter implements CorporatePayoutProviderPort {
  readonly name = 'mock';
  private readonly logger = new Logger(MockPayoutProviderAdapter.name);
  /** key -> accepted transfer */
  readonly transfers = new Map<string, { providerPayoutId: string; amountPaise: bigint; driverId: string }>();
  /** Every call, including retries with the same key. */
  readonly calls: PayoutSubmitRequest[] = [];
  /** Keys / drivers to reject synchronously once (simulates a bank-side rejection). */
  private readonly rejectOnce = new Set<string>();

  rejectNextFor(driverIdOrKey: string): void {
    this.rejectOnce.add(driverIdOrKey);
  }

  async submitPayout(request: PayoutSubmitRequest): Promise<PayoutSubmitResult> {
    this.calls.push(request);
    for (const probe of [request.idempotencyKey, request.driverId]) {
      if (this.rejectOnce.has(probe)) {
        this.rejectOnce.delete(probe);
        return { accepted: false, failureReason: 'MOCK_BENEFICIARY_REJECTED' };
      }
    }
    const existing = this.transfers.get(request.idempotencyKey);
    if (existing) {
      return { accepted: true, providerPayoutId: existing.providerPayoutId };
    }
    const providerPayoutId = `mockpo_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    this.transfers.set(request.idempotencyKey, {
      providerPayoutId,
      amountPaise: request.amountPaise,
      driverId: request.driverId,
    });
    this.logger.debug(`Mock payout accepted ${request.idempotencyKey} -> ${providerPayoutId}`);
    return { accepted: true, providerPayoutId };
  }
}

/** Bound in production when no real provider is configured: fails closed, never fakes success. */
export class UnconfiguredPayoutProvider implements CorporatePayoutProviderPort {
  readonly name = 'unconfigured';
  async submitPayout(): Promise<PayoutSubmitResult> {
    throw new ServiceUnavailableException(
      'No corporate payout provider is configured (set CORPORATE_PAYOUT_PROVIDER)',
    );
  }
}

/** Provider selection: CORPORATE_PAYOUT_PROVIDER=mock, or the mock outside production. */
export function createPayoutProviderFromEnv(env: NodeJS.ProcessEnv = process.env): CorporatePayoutProviderPort {
  const selected = (env.CORPORATE_PAYOUT_PROVIDER || '').trim().toLowerCase();
  if (selected === 'mock' || (!selected && env.NODE_ENV !== 'production')) {
    return new MockPayoutProviderAdapter();
  }
  return new UnconfiguredPayoutProvider();
}
