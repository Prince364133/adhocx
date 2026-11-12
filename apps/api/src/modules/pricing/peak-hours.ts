import { BadRequestException } from '@nestjs/common';
import { IST_OFFSET_MINUTES } from '../../domains/corporate/replanning/cutoff-policy';

/**
 * Peak-hour windows for distance pricing.
 *
 * Invariants:
 *  - Wall-clock "HH:mm" times are Asia/Kolkata (IST, UTC+05:30, no DST), independent of the server TZ.
 *  - A window is [start, end): a trip at exactly `start` is peak, at exactly `end` it is not.
 *  - `start > end` means the window crosses midnight (22:00-02:00 = [22:00,24:00) ∪ [00:00,02:00)).
 *  - Windows never overlap (overnight windows included) and each spans at least MIN_PEAK_WINDOW_MINUTES.
 *  - A plan with no windows is never peak. Peak is opt-in per plan; nothing is surcharged by default.
 */
export interface PeakWindowDef {
  start: string;
  end: string;
  label?: string;
}

export const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MIN_PEAK_WINDOW_MINUTES = 30;
export const MAX_PEAK_WINDOWS = 6;
const DAY = 24 * 60;

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** [start, end) intervals on a 0..1440 line; an overnight window becomes two intervals. */
function intervals(w: { s: number; e: number }): Array<[number, number]> {
  return w.s < w.e ? [[w.s, w.e]] : [[w.s, DAY], [0, w.e]];
}

/** Throws BadRequestException with an admin-readable message; returns normalized windows. */
export function validatePeakWindows(windows: PeakWindowDef[] | null | undefined): PeakWindowDef[] {
  if (!windows || windows.length === 0) return [];
  if (windows.length > MAX_PEAK_WINDOWS) {
    throw new BadRequestException(`At most ${MAX_PEAK_WINDOWS} peak windows are allowed.`);
  }
  const parsed = windows.map((w, idx) => {
    const name = w.label?.trim() || `Window #${idx + 1}`;
    for (const t of [w.start, w.end]) {
      if (typeof t !== 'string' || !HHMM_PATTERN.test(t)) {
        throw new BadRequestException(`${name}: time '${t}' must be HH:mm between 00:00 and 23:59.`);
      }
    }
    const s = toMinutes(w.start);
    const e = toMinutes(w.end);
    if (s === e) throw new BadRequestException(`${name}: start and end time cannot be the same.`);
    const span = s < e ? e - s : DAY - s + e;
    if (span < MIN_PEAK_WINDOW_MINUTES) {
      throw new BadRequestException(`${name}: a peak window must be at least ${MIN_PEAK_WINDOW_MINUTES} minutes long.`);
    }
    return { s, e, name, raw: w };
  });

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      const clash = intervals(a).some(([as, ae]) => intervals(b).some(([bs, be]) => Math.max(as, bs) < Math.min(ae, be)));
      if (clash) {
        throw new BadRequestException(
          `Peak window '${a.name}' (${a.raw.start}-${a.raw.end}) overlaps with '${b.name}' (${b.raw.start}-${b.raw.end}).`,
        );
      }
    }
  }
  return parsed.map(({ raw, name }) => ({ start: raw.start, end: raw.end, label: name }));
}

/** Minute of day in IST for an instant. */
export function istMinuteOfDay(instant: Date): number {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Reads a plan's stored windows defensively (JSON column); malformed data means "no peak". */
export function planPeakWindows(raw: unknown): PeakWindowDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is PeakWindowDef => !!w && typeof w === 'object' && HHMM_PATTERN.test((w as any).start) && HHMM_PATTERN.test((w as any).end),
  );
}

export function evaluatePeakTime(instant: Date, windows: PeakWindowDef[] | null | undefined): { isPeak: boolean; activeWindow?: PeakWindowDef } {
  if (!windows || windows.length === 0) return { isPeak: false };
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new BadRequestException('Pickup time is not a valid date.');
  }
  const minute = istMinuteOfDay(instant);
  for (const w of windows) {
    const s = toMinutes(w.start);
    const e = toMinutes(w.end);
    if (intervals({ s, e }).some(([a, b]) => minute >= a && minute < b)) return { isPeak: true, activeWindow: w };
  }
  return { isPeak: false };
}

/** Parses an optional ISO-8601 pickup time; absent means "now". Invalid input is a 400, never a silent off-peak. */
export function parsePickupTime(value: Date | string | null | undefined, now: Date = new Date()): Date {
  if (value === undefined || value === null || value === '') return now;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Pickup time is not a valid date.');
  return d;
}
