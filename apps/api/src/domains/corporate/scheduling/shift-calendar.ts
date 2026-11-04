/**
 * Pure IST shift-calendar helpers. All dates are YYYY-MM-DD calendar days (IST wall clock) and are
 * computed with UTC arithmetic only, so the result never depends on the server's TZ.
 */

/** Adds `days` calendar days to a YYYY-MM-DD string. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO weekday of a YYYY-MM-DD calendar day: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** A shift is overnight when its logout wall-clock is not after its login (20:00 -> 02:00). */
export function isOvernightShift(loginTime: string, logoutTime: string): boolean {
  return logoutTime <= loginTime;
}

export interface ShiftTemplateLike {
  loginTime: string;
  logoutTime: string;
  isOvernight: boolean;
  isActive?: boolean;
  weekdays?: number[];
}

/**
 * IST calendar day the LOGOUT commute belongs to. `rosterDate` is the shift (login) day.
 *  - login and logout both given: next day iff logout <= login (20:00 login, 02:00 logout -> D+1).
 *  - logout only: next day iff an active overnight template of the office has that logout time
 *    (and runs on that weekday, when weekdays are set).
 */
export function resolveLogoutDate(
  rosterDate: string,
  loginTime: string | undefined,
  logoutTime: string,
  templates: ShiftTemplateLike[] = [],
): string {
  if (loginTime) {
    return isOvernightShift(loginTime, logoutTime) ? addDays(rosterDate, 1) : rosterDate;
  }
  const weekday = isoWeekday(rosterDate);
  const overnight = templates.some(
    (t) =>
      t.isActive !== false &&
      t.isOvernight &&
      t.logoutTime === logoutTime &&
      (!t.weekdays || t.weekdays.length === 0 || t.weekdays.includes(weekday)),
  );
  return overnight ? addDays(rosterDate, 1) : rosterDate;
}
