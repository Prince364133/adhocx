import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IST_OFFSET_MINUTES, isValidShiftDate } from '../replanning/cutoff-policy';

/** Route statuses shown on the command-centre board, in lifecycle order. */
export const OPS_ROUTE_STATUSES = [
  'PLANNED',
  'DISPATCHING',
  'ASSIGNED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OpsRouteStatus = (typeof OPS_ROUTE_STATUSES)[number];

/** Redis key the trip-execution service writes the latest GPS fix to (JSON with `recordedAt`). */
export const routeTelemetryKey = (routeId: string) => `corporate:route:telemetry:${routeId}`;

/** GPS freshness thresholds (seconds), matching doc 19 WS-B: LIVE <= 45 s, STALE <= 180 s, else OFFLINE. */
export const GPS_LIVE_MAX_AGE_SEC = 45;
export const GPS_STALE_MAX_AGE_SEC = 180;
export type GpsFreshness = 'LIVE' | 'STALE' | 'OFFLINE';

export function classifyGpsFreshness(ageSeconds: number | null): GpsFreshness {
  if (ageSeconds === null || !Number.isFinite(ageSeconds)) return 'OFFLINE';
  if (ageSeconds <= GPS_LIVE_MAX_AGE_SEC) return 'LIVE';
  if (ageSeconds <= GPS_STALE_MAX_AGE_SEC) return 'STALE';
  return 'OFFLINE';
}

export interface LivePosition {
  freshness: GpsFreshness;
  ageSeconds: number | null;
  lastSeenAt: string | null;
  latitude?: number;
  longitude?: number;
  speedMps?: number;
  heading?: number;
}

/** Unassigned routes whose pickup-1 is within this many minutes are "at risk" (env CORPORATE_ESCALATION_LEAD_MIN). */
export function escalationLeadMinutes(): number {
  const raw = Number(process.env.CORPORATE_ESCALATION_LEAD_MIN);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

/** At-risk routes whose pickup passed more than this long ago are no longer actionable and drop off the queue. */
export const AT_RISK_LOOKBACK_MINUTES = 6 * 60;

/** Live offer state of a DISPATCHING route, read from the dispatch Redis keys. Never carries the fare. */
export type OfferStateKind =
  /** A driver holds a live 60 s offer. */
  | 'OFFERED'
  /** Offer TTL elapsed; the reaper has not cascaded yet. */
  | 'OFFER_EXPIRING'
  /** Last wave found no eligible driver within 10 km; retry pending. */
  | 'RETRY_NO_SUPPLY'
  /** Every nearby candidate holds another offer; retry pending. */
  | 'RETRY_ALL_BUSY'
  /** No live offer and no retry marker; the scheduler recovery sweep will re-dispatch. */
  | 'SEARCHING';

export interface OfferState {
  state: OfferStateKind;
  driverId: string | null;
  driverName?: string | null;
  offerExpiresAt: string | null;
  secondsRemaining: number | null;
  rejectedDriverCount: number;
}

export class ReassignRouteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsUUID()
  newDriverId?: string;
}

/** Today's calendar day in IST (YYYY-MM-DD), independent of the server TZ. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` to the UTC-midnight Date Prisma uses for Postgres DATE columns. Returns null if invalid. */
export function parseDateOnly(day: unknown): Date | null {
  return isValidShiftDate(day) ? new Date(`${day}T00:00:00.000Z`) : null;
}
