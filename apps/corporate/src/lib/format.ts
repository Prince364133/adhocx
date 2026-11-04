/** Display helpers. All times are shown in IST (the analytics timezone of the API). */

const IST = 'Asia/Kolkata';

export function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Postgres DATE columns arrive as UTC-midnight ISO strings: show the calendar day as stored. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return (
    d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: IST,
    }) + ' IST'
  );
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST });
}

/** Signed minutes actual - planned, or null when either side is missing. */
export function delayMinutes(planned: string | null | undefined, actual: string | null | undefined): number | null {
  if (!planned || !actual) return null;
  const p = new Date(planned).getTime();
  const a = new Date(actual).getTime();
  if (!Number.isFinite(p) || !Number.isFinite(a)) return null;
  return Math.round((a - p) / 60_000);
}

/** Integer paise (string or number, as the API serialises BigInt) to rupees. */
export function formatPaise(paise: string | number | null | undefined): string {
  if (paise === null || paise === undefined || paise === '') return '—';
  let n: bigint;
  try {
    n = BigInt(String(paise));
  } catch {
    return '—';
  }
  const negative = n < BigInt(0);
  const abs = negative ? -n : n;
  const rupees = abs / BigInt(100);
  const rem = (abs % BigInt(100)).toString().padStart(2, '0');
  const grouped = Number(rupees) <= Number.MAX_SAFE_INTEGER ? Number(rupees).toLocaleString('en-IN') : rupees.toString();
  return `${negative ? '-' : ''}₹${grouped}.${rem}`;
}

/** Rupee text input ("1250.50") to integer paise string, or null when invalid. */
export function rupeesToPaise(input: string): string | null {
  const s = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return (BigInt(whole) * BigInt(100) + BigInt(frac.padEnd(2, '0'))).toString();
}

export function formatKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v}%`;
}

export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function ageText(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'no fix';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
}

/**
 * Keys that must never be shown to a corporate user (driver payout, margins, earnings). Mirrors
 * CORPORATE_FORBIDDEN_KEY_PATTERN in the API's corporate-response-guard; used when rendering
 * free-form payloads such as trip-event details.
 */
export const FORBIDDEN_KEY_PATTERN =
  /(payout|earning|margin|tds|driverRate|basePayout|tollReimbursement|commission|fare|otp)/i;
