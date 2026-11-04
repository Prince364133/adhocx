import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { ClientCardTerms, selectCardAt } from './corporate-fare-math';

/** Versioned driver payout card row (CorporateDriverRateCard), money in BigInt paise. */
export interface DriverRateCardRow {
  id: string;
  vehicleCategory: string;
  basePayoutPaise: bigint;
  baseDistanceMeters: number;
  perKmPaise: bigint;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
}

export interface DriverPayoutBreakdown {
  basePayoutPaise: bigint;
  distancePaise: bigint;
  totalPayoutPaise: bigint;
  rateCardId?: string;
}

/** Defaults used by billing when no driver card is configured: ₹300 for the first 10 km + ₹18/km. */
export const DEFAULT_DRIVER_PAYOUT_CARD = {
  basePayoutPaise: 30000n,
  baseDistanceMeters: 10000,
  perKmPaise: 1800n,
} as const;

/**
 * Driver rate-card lookup shared by billing (payout resolution) and dispatch (offer pricing).
 * Kept free of billing / dispatch dependencies so both can inject it without a module cycle.
 */
@Injectable()
export class RateCardService {
  private readonly logger = new Logger(RateCardService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * The active driver card for `vehicleCategory` in force at `at`:
   * `isActive AND effectiveFrom <= at AND (effectiveTo IS NULL OR effectiveTo > at)`, latest
   * `effectiveFrom` wins. Returns null when none is configured (or the table is unavailable).
   */
  async findDriverRateCard(vehicleCategory: string = 'SEDAN', at: Date = new Date()): Promise<DriverRateCardRow | null> {
    const delegate: any = (this.db as any)?.corporateDriverRateCard;
    if (!delegate?.findFirst) return null;
    try {
      const card = await delegate.findFirst({
        where: {
          vehicleCategory: { equals: vehicleCategory || 'SEDAN', mode: 'insensitive' },
          isActive: true,
          effectiveFrom: { lte: at },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      return card ?? null;
    } catch (err: any) {
      this.logger.warn(`Driver rate card lookup failed (${vehicleCategory}): ${err?.message ?? err}`);
      return null;
    }
  }

  /** base for the first `baseDistanceMeters`, then `perKmPaise` per started km (integer paise). */
  static computeDriverPayout(
    card: Pick<DriverRateCardRow, 'basePayoutPaise' | 'baseDistanceMeters' | 'perKmPaise'>,
    distanceMeters: number,
  ): Omit<DriverPayoutBreakdown, 'rateCardId'> {
    const basePayoutPaise = BigInt(card.basePayoutPaise);
    const perKmPaise = BigInt(card.perKmPaise);
    const extraMeters = Math.max(0, (Number(distanceMeters) || 0) - Number(card.baseDistanceMeters ?? 0));
    const distancePaise = BigInt(Math.ceil(extraMeters / 1000)) * perKmPaise;
    return { basePayoutPaise, distancePaise, totalPayoutPaise: basePayoutPaise + distancePaise };
  }

  /** Card in force at `at`, or `fallback` (billing defaults) when none exists. */
  async resolveDriverPayout(
    vehicleCategory: string = 'SEDAN',
    distanceMeters: number,
    at: Date = new Date(),
    fallback: Pick<DriverRateCardRow, 'basePayoutPaise' | 'baseDistanceMeters' | 'perKmPaise'> = DEFAULT_DRIVER_PAYOUT_CARD,
  ): Promise<DriverPayoutBreakdown> {
    const card = await this.findDriverRateCard(vehicleCategory, at);
    return { ...RateCardService.computeDriverPayout(card ?? fallback, distanceMeters), rateCardId: card?.id };
  }

  // ---------------------------------------------------------------------------
  // wire/billing-payouts: corporate (client) cards + version listings
  // ---------------------------------------------------------------------------

  /**
   * The tenant's corporate card for `vehicleCategory` in force at `at`:
   * `effectiveFrom <= at AND (effectiveTo IS NULL OR effectiveTo > at)`, latest effectiveFrom then
   * highest version wins. No `isActive` filter on purpose: retiring a version closes its effectiveTo
   * (and clears isActive), so a retired version still prices the trips that fell inside its window.
   */
  async findClientRateCard(
    tenantId: string,
    vehicleCategory: string = 'SEDAN',
    at: Date = new Date(),
  ): Promise<ClientCardTerms | null> {
    const delegate: any = (this.db as any)?.corporateRateCard;
    if (!delegate?.findFirst) return null;
    try {
      const card = await delegate.findFirst({
        where: {
          tenantId,
          vehicleCategory: { equals: vehicleCategory || 'SEDAN', mode: 'insensitive' },
          effectiveFrom: { lte: at },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
        },
        orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
      });
      return card ?? null;
    } catch (err: any) {
      this.logger.warn(`Corporate rate card lookup failed (${tenantId}/${vehicleCategory}): ${err?.message ?? err}`);
      return null;
    }
  }

  /** Every corporate card version (optionally of one tenant / category), oldest first. */
  async listClientRateCards(filter: { tenantId?: string; vehicleCategory?: string } = {}): Promise<ClientCardTerms[]> {
    const delegate: any = (this.db as any)?.corporateRateCard;
    if (!delegate?.findMany) return [];
    const where: any = {};
    if (filter.tenantId) where.tenantId = filter.tenantId;
    if (filter.vehicleCategory) where.vehicleCategory = filter.vehicleCategory;
    try {
      return (
        (await delegate.findMany({
          where,
          orderBy: [{ effectiveFrom: 'asc' }, { version: 'asc' }],
        })) ?? []
      );
    } catch (err: any) {
      this.logger.warn(`Corporate rate card listing failed (${filter.tenantId ?? '*'}): ${err?.message ?? err}`);
      return [];
    }
  }

  /** Every driver card version (optionally of one category), oldest first. */
  async listDriverRateCards(filter: { vehicleCategory?: string } = {}): Promise<DriverRateCardRow[]> {
    const where: any = {};
    if (filter.vehicleCategory) where.vehicleCategory = filter.vehicleCategory;
    return this.db.corporateDriverRateCard.findMany({
      where,
      orderBy: [{ effectiveFrom: 'asc' }, { version: 'asc' }],
    }) as unknown as DriverRateCardRow[];
  }

  /** Corporate card in force at `at` picked from an already-loaded version list (no query). */
  static selectClientCard(cards: readonly ClientCardTerms[], vehicleCategory: string, at: Date): ClientCardTerms | null {
    return selectCardAt(cards, vehicleCategory || 'SEDAN', at);
  }
}
