/**
 * Pure, integer-paise fare math for Corporate ETS rate cards (no I/O, no floats on money).
 *
 * A card version is "in effect" at instant T when effectiveFrom <= T < effectiveTo (open-ended
 * when effectiveTo is null). Retiring a card sets effectiveTo, so history is still priced by the
 * version that was in effect at the time; it never disappears.
 */

export interface EffectiveWindow {
  id: string;
  vehicleCategory: string;
  version?: number | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
}

export interface ClientCardTerms extends EffectiveWindow {
  baseFarePaise: bigint;
  baseDistanceMeters: number;
  perKmPaise: bigint;
  perExtraStopPaise?: bigint | null;
  perHourPaise?: bigint | null;
  minimumPaise?: bigint | null;
  noShowPaise?: bigint | null;
  cancellationPaise?: bigint | null;
}

/** Fallback when no card is configured (the pre-rate-card constants). Callers log when used. */
export const DEFAULT_CLIENT_TERMS = {
  baseFarePaise: 40000n, // ₹400 for the first 10 km
  baseDistanceMeters: 10000,
  perKmPaise: 2500n, // ₹25/km beyond
  perExtraStopPaise: 0n,
  perHourPaise: null as bigint | null,
  minimumPaise: 0n,
  noShowPaise: 0n,
  cancellationPaise: 0n,
} as const;

const toTime = (d: Date | string | null | undefined): number | null =>
  d === null || d === undefined ? null : new Date(d).getTime();

export function isInEffect(card: EffectiveWindow, at: Date): boolean {
  const t = at.getTime();
  const from = toTime(card.effectiveFrom)!;
  const to = toTime(card.effectiveTo ?? null);
  return from <= t && (to === null || t < to);
}

/** The version of `category` in effect at `at`; ties (should not happen) go to the highest version. */
export function selectCardAt<T extends EffectiveWindow>(cards: readonly T[], category: string, at: Date): T | null {
  const cat = category.toUpperCase();
  let best: T | null = null;
  for (const c of cards) {
    if (String(c.vehicleCategory).toUpperCase() !== cat || !isInEffect(c, at)) continue;
    if (
      !best ||
      toTime(c.effectiveFrom)! > toTime(best.effectiveFrom)! ||
      (toTime(c.effectiveFrom) === toTime(best.effectiveFrom) && (c.version ?? 0) > (best.version ?? 0))
    ) {
      best = c;
    }
  }
  return best;
}

/** ceil(a / b) for non-negative bigints. */
export const ceilDiv = (a: bigint, b: bigint): bigint => (a + b - 1n) / b;

export interface ClientTripInput {
  distanceMeters: number;
  stopsCount?: number;
  durationSeconds?: number;
  noShowCount?: number;
}

export interface ClientTripFare {
  baseFarePaise: bigint;
  distancePaise: bigint;
  stopsPaise: bigint;
  durationPaise: bigint;
  /** Top-up applied so the trip charge reaches the card minimum (0 when not needed). */
  minimumTopUpPaise: bigint;
  noShowPaise: bigint;
  totalAmountPaise: bigint;
}

/**
 * Trip charge = max(minimum, base + extra km + extra stops + hours) + no-show charges.
 * Extra km and hours round up (whole km / whole minute) so a partial unit is never free.
 */
export function priceClientTrip(card: ClientCardTerms | null, input: ClientTripInput): ClientTripFare {
  const terms = card ?? (DEFAULT_CLIENT_TERMS as unknown as ClientCardTerms);
  const baseFarePaise = terms.baseFarePaise;
  const extraMeters = Math.max(0, Math.round(input.distanceMeters) - terms.baseDistanceMeters);
  const distancePaise = BigInt(Math.ceil(extraMeters / 1000)) * terms.perKmPaise;
  const extraStops = Math.max(0, (input.stopsCount ?? 1) - 1);
  const stopsPaise = BigInt(extraStops) * (terms.perExtraStopPaise ?? 0n);
  const minutes = BigInt(Math.ceil(Math.max(0, input.durationSeconds ?? 0) / 60));
  const durationPaise = terms.perHourPaise ? ceilDiv(terms.perHourPaise * minutes, 60n) : 0n;

  const metered = baseFarePaise + distancePaise + stopsPaise + durationPaise;
  const minimum = terms.minimumPaise ?? 0n;
  const minimumTopUpPaise = metered < minimum ? minimum - metered : 0n;
  const noShowPaise = BigInt(Math.max(0, input.noShowCount ?? 0)) * (terms.noShowPaise ?? 0n);

  return {
    baseFarePaise,
    distancePaise,
    stopsPaise,
    durationPaise,
    minimumTopUpPaise,
    noShowPaise,
    totalAmountPaise: metered + minimumTopUpPaise + noShowPaise,
  };
}

/** GST on a subtotal, floored to the paise (same rule as the invoice). */
export const gstOf = (subtotalPaise: bigint, ratePct: bigint): bigint => (subtotalPaise * ratePct) / 100n;

/** 1% TDS under Sec 194C, floored to the paise. */
export const tdsOf = (grossPaise: bigint): bigint => (grossPaise * 1n) / 100n;
