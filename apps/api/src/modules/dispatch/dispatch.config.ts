/**
 * Central dispatch tunables. Read lazily from the environment so tests and
 * operators can change behaviour without code edits.
 */
const num = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

export type PenaltyMode = 'enforce' | 'shadow' | 'off';

// Trips completed before this instant never block a customer from booking.
const DEFAULT_REVIEW_GATE_START_AT = '2026-10-12T00:00:00.000Z';

export const DispatchConfig = {
  /** Offer countdown window per wave (18s Uber-grade golden window). */
  get offerTtlMs(): number {
    return Math.max(1000, num(process.env.OFFER_TTL_MS, 18000));
  },
  /** Automatic waves allowed before the requirement is marked NO_DRIVER_AVAILABLE (manual retry resets). */
  get maxWaves(): number {
    return Math.max(1, num(process.env.DISPATCH_MAX_WAVES, 5));
  },
  /** Scheduler poll cadence for due wave timeouts. */
  get schedulerPollMs(): number {
    return Math.max(100, num(process.env.DISPATCH_SCHEDULER_POLL_MS, 500));
  },

  // ---- Road ETA (two-phase routing) ----
  get roadEtaEnabled(): boolean {
    return bool(process.env.ROAD_ETA_ENABLED, true);
  },
  /** Number of best aerial candidates re-ranked with the road matrix (Routes API caps at 25 origins here). */
  get roadEtaTopK(): number {
    return Math.min(25, Math.max(1, num(process.env.ROAD_ETA_TOP_K, 6)));
  },

  // ---- Acceptance-rate behaviour ----
  get penaltyMode(): PenaltyMode {
    const raw = (process.env.AR_PENALTY_MODE || 'enforce').toLowerCase();
    return raw === 'shadow' || raw === 'off' ? raw : 'enforce';
  },
  /** Offers within this road distance count as "nearby" for penalties. */
  get nearbyKm(): number {
    return num(process.env.AR_NEARBY_KM, 3.5);
  },
  get arWindow(): number {
    return Math.max(1, num(process.env.AR_WINDOW, 50));
  },
  get declinePenalty(): number {
    return num(process.env.AR_DECLINE_PENALTY, 1.5);
  },
  get acceptReward(): number {
    return num(process.env.AR_ACCEPT_REWARD, 0.25);
  },
  get consecutiveDeclineLimit(): number {
    return Math.max(1, num(process.env.AR_CONSECUTIVE_LIMIT, 3));
  },
  /** Escalating cooldown ladder (minutes) for repeat offenders within 24h. */
  get cooldownLadderMinutes(): number[] {
    const raw = process.env.AR_COOLDOWN_LADDER_MINUTES;
    const parsed = raw ? raw.split(',').map((s) => Number(s.trim())).filter((n) => n > 0) : [];
    return parsed.length > 0 ? parsed : [3, 10, 30];
  },
  /** Only count expiries against a driver when the app actually displayed the offer. */
  get expiryRequiresSeen(): boolean {
    return bool(process.env.AR_EXPIRY_REQUIRES_SEEN, true);
  },

  // ---- Mandatory review gate ----
  get reviewGateEnabled(): boolean {
    return bool(process.env.REVIEW_GATE_ENABLED, true);
  },
  get reviewGateStartAt(): Date {
    const d = new Date(process.env.REVIEW_GATE_START_AT || DEFAULT_REVIEW_GATE_START_AT);
    return Number.isNaN(d.getTime()) ? new Date(DEFAULT_REVIEW_GATE_START_AT) : d;
  },
};
