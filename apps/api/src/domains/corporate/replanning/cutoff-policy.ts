/**
 * 9-hour modification cutoff policy for Corporate ETS cancel / reschedule requests.
 *
 * All shift wall-clock times (`HH:mm`) are interpreted in Asia/Kolkata (IST, UTC+05:30, no DST),
 * independent of the server's TZ. `scheduledDate` / `shiftDate` columns are Postgres `DATE`s that
 * Prisma materialises as UTC-midnight `Date`s, so the calendar day is read from the UTC ISO string.
 *
 * Example: 07:00 IST pickup on 2026-11-03 -> cutoff 22:00 IST on 2026-11-02 (16:30Z).
 */

export const CORPORATE_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330;
export const RESCHEDULE_CUTOFF_HOURS = 9;

export type PickupTimeSource = 'STOP_PLANNED_ETA' | 'ROUTE_DEPARTURE' | 'SHIFT_TIME';

export interface CutoffOverride {
  /** Corporate / platform admin who authorised the late modification. */
  actorUserId: string;
  reason: string;
}

export interface CutoffEvaluation {
  allowed: boolean;
  overridden: boolean;
  pickupAt: Date;
  cutoffAt: Date;
  pickupSource: PickupTimeSource;
  minutesUntilCutoff: number;
  hoursUntilPickup: number;
}

/** Calendar day (YYYY-MM-DD) of a Postgres DATE column value or a YYYY-MM-DD string. */
export function toDateOnly(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/** Converts an IST wall-clock (date + HH:mm) into an absolute UTC instant. */
export function istWallClockToUtc(date: Date | string, hhmm: string): Date {
  const [y, m, d] = toDateOnly(date).split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid IST wall-clock: ${String(date)} ${hhmm}`);
  }
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MINUTES * 60_000);
}

/** Formats an instant as an IST wall-clock string (for user-facing messages). */
export function formatIst(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
  return `${shifted.toISOString().slice(0, 16).replace('T', ' ')} IST`;
}

export function isValidShiftTime(hhmm: unknown): hhmm is string {
  return typeof hhmm === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm);
}

/**
 * The cutoff is anchored on the employee's actual pickup:
 *  - LOGIN with a live planned stop  -> that stop's planned ETA (home pickup time)
 *  - LOGOUT with a live planned stop -> the route's office departure time
 *  - not yet routed                  -> the shift wall-clock time in IST
 */
export function resolvePickupTime(request: {
  scheduledDate: Date | string;
  shiftTime: string;
  direction?: string | null;
  routeStop?: {
    status?: string | null;
    plannedEta?: Date | string | null;
    route?: { status?: string | null; targetPickup1Time?: Date | string | null } | null;
  } | null;
}): { pickupAt: Date; source: PickupTimeSource } {
  const stop = request.routeStop;
  const liveStop = stop && stop.status !== 'CANCELLED' && stop.route?.status !== 'CANCELLED';
  if (liveStop) {
    if (request.direction === 'LOGOUT' && stop.route?.targetPickup1Time) {
      return { pickupAt: new Date(stop.route.targetPickup1Time), source: 'ROUTE_DEPARTURE' };
    }
    if (request.direction !== 'LOGOUT' && stop.plannedEta) {
      return { pickupAt: new Date(stop.plannedEta), source: 'STOP_PLANNED_ETA' };
    }
  }
  return { pickupAt: istWallClockToUtc(request.scheduledDate, request.shiftTime), source: 'SHIFT_TIME' };
}

/** Allowed iff now <= pickupAt - 9h (inclusive), or an explicit admin override is supplied. */
export function evaluateCutoff(
  pickupAt: Date,
  pickupSource: PickupTimeSource,
  now: Date,
  override?: CutoffOverride | null,
): CutoffEvaluation {
  const cutoffAt = new Date(pickupAt.getTime() - RESCHEDULE_CUTOFF_HOURS * 3600_000);
  const withinWindow = now.getTime() <= cutoffAt.getTime();
  const overridden = !withinWindow && !!override;
  return {
    allowed: withinWindow || overridden,
    overridden,
    pickupAt,
    cutoffAt,
    pickupSource,
    minutesUntilCutoff: Math.floor((cutoffAt.getTime() - now.getTime()) / 60_000),
    hoursUntilPickup: (pickupAt.getTime() - now.getTime()) / 3600_000,
  };
}
