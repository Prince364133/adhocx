import { IST_OFFSET_MINUTES, isValidShiftDate } from '../replanning/cutoff-policy';
import { MAX_RANGE_DAYS } from './metric-definitions';

export const REPORT_TYPES = ['trips', 'no-shows', 'attendance'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportFormat = 'csv' | 'json';

export interface AnalyticsQuery {
  tenantId?: string;
  officeId?: string;
  from?: string;
  to?: string;
  direction?: string;
  shiftTime?: string;
}

/** Validated filter. Dates are UTC-midnight `Date`s, the representation Prisma uses for Postgres DATE. */
export interface AnalyticsFilter {
  tenantId: string;
  officeId?: string;
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  /** [from 00:00 IST, to+1 00:00 IST) as instants, for timestamp columns. */
  fromInstant: Date;
  toInstantExclusive: Date;
  direction?: 'LOGIN' | 'LOGOUT';
  shiftTime?: string;
}

export class AnalyticsFilterError extends Error {}

const DAY_MS = 86_400_000;

/** Start of an IST calendar day as a UTC instant (00:00 IST = previous day 18:30Z). */
export function istDayStart(day: string): Date {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - IST_OFFSET_MINUTES * 60_000);
}

/** Instant rendered as an ISO string with the IST offset, e.g. 2026-11-03T07:05:00+05:30. */
export function toIstIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 19) + '+05:30';
}

export function buildAnalyticsFilter(q: AnalyticsQuery): AnalyticsFilter {
  if (!q.tenantId) throw new AnalyticsFilterError('tenantId is required');
  if (!isValidShiftDate(q.from) || !isValidShiftDate(q.to)) {
    throw new AnalyticsFilterError('from and to must be valid YYYY-MM-DD IST calendar days');
  }
  const fromDate = new Date(`${q.from}T00:00:00.000Z`);
  const toDate = new Date(`${q.to}T00:00:00.000Z`);
  if (toDate.getTime() < fromDate.getTime()) throw new AnalyticsFilterError('from must not be after to');
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) throw new AnalyticsFilterError(`date range must be at most ${MAX_RANGE_DAYS} days`);

  let direction: AnalyticsFilter['direction'];
  if (q.direction !== undefined && q.direction !== '') {
    const d = String(q.direction).toUpperCase();
    if (d !== 'LOGIN' && d !== 'LOGOUT') throw new AnalyticsFilterError('direction must be LOGIN or LOGOUT');
    direction = d;
  }
  let shiftTime: string | undefined;
  if (q.shiftTime !== undefined && q.shiftTime !== '') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.shiftTime)) throw new AnalyticsFilterError('shiftTime must be HH:mm');
    shiftTime = q.shiftTime;
  }

  return {
    tenantId: q.tenantId,
    officeId: q.officeId || undefined,
    from: q.from as string,
    to: q.to as string,
    fromDate,
    toDate,
    fromInstant: istDayStart(q.from as string),
    toInstantExclusive: new Date(istDayStart(q.to as string).getTime() + DAY_MS),
    direction,
    shiftTime,
  };
}

/** RFC 4180 CSV. Cells starting with = + - @ (or tab / CR) are prefixed with ' against spreadsheet formula injection. */
export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    let s = v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(cell).join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}
