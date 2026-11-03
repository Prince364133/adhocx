/**
 * Corporate ETS analytics: single source of truth for every KPI the dashboard / attendance / report
 * endpoints return (PRD CP-DASH, CP-RPT, COR-02). Exposed verbatim by
 * `GET /corporate/analytics/metric-definitions` so portal tooltips never drift from the code.
 *
 * Common rules
 *  - Timezone: Asia/Kolkata (IST, UTC+05:30, no DST), independent of the server TZ.
 *    `from` / `to` are inclusive IST calendar days (YYYY-MM-DD).
 *    - Routes / stops are bucketed by `CorporateRoute.shiftDate` (a Postgres DATE that already holds the IST shift day).
 *    - Requests are bucketed by `CorporateTransportRequest.scheduledDate` (DATE, IST shift day).
 *    - Instant-based rows (SOS alerts) use [from 00:00 IST, to+1 00:00 IST), i.e. [from-1 18:30Z, to 18:30Z).
 *  - Filters: tenantId (always, forced to the caller's tenant for corporate users), optional officeId,
 *    direction (LOGIN | LOGOUT) and shiftTime (HH:mm). Requests are office-filtered through the employee's office.
 *  - Freshness: computed live from Postgres on every call (no cache). `asOf` is the server time at the start of
 *    the computation; rows written after it may or may not be included.
 *  - Never includes driver payout, fare or margin fields.
 */

export const ON_TIME_GRACE_MINUTES = 5;
export const ANALYTICS_TIMEZONE = 'Asia/Kolkata';
/** Largest from..to span (days, inclusive) a dashboard / attendance / report call may cover. */
export const MAX_RANGE_DAYS = 93;

export interface MetricDefinition {
  key: string;
  label: string;
  numerator: string;
  denominator: string | null;
  statusInclusion: string;
  timezone: string;
  freshness: string;
  unit: 'count' | 'percent' | 'minutes';
}

const TZ_ROUTE_DAY = 'IST shift day (CorporateRoute.shiftDate) within [from, to]';
const TZ_REQUEST_DAY = 'IST shift day (CorporateTransportRequest.scheduledDate) within [from, to]';
const LIVE = 'Live query at request time; see asOf';

export const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  {
    key: 'trips.byStatus',
    label: 'Vehicle trips (routes) by status',
    numerator: 'COUNT(CorporateRoute) grouped by status',
    denominator: null,
    statusInclusion: 'All route statuses: PLANNED, DISPATCHING, ASSIGNED, IN_TRANSIT, COMPLETED, CANCELLED. total = sum of all.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'employeesServed',
    label: 'Employees served',
    numerator: 'COUNT(DISTINCT CorporateRouteStop.employeeId) with stop status BOARDED',
    denominator: null,
    statusInclusion:
      'Stops with status BOARDED only (OTP / QR verified boarding). Counted separately from vehicle trips; one employee riding twice counts once. LOGOUT drop stops are not boarding events and do not count.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'requests.byStatus',
    label: 'Ride requests by status',
    numerator: 'COUNT(CorporateTransportRequest) grouped by status',
    denominator: null,
    statusInclusion:
      'All request statuses (APPROVED, PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED, UNSERVED). ' +
      'cancelled = CANCELLED. unserved = UNSERVED minus no-shows (a no-show also marks its request UNSERVED). ' +
      'noShows = stops with status NO_SHOW.',
    timezone: TZ_REQUEST_DAY + ' (noShows: ' + TZ_ROUTE_DAY + ')',
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'punctuality.onTimePct',
    label: 'On-time pickup %',
    numerator: `BOARDED stops whose actualArrivalTime <= plannedEta + ${ON_TIME_GRACE_MINUTES} min`,
    denominator: 'BOARDED stops with an actualArrivalTime recorded',
    statusInclusion:
      'BOARDED employee stops only. BOARDED stops without a recorded arrival are excluded from both sides and reported as excludedNoArrival. null when the denominator is 0.',
    timezone: TZ_ROUTE_DAY + '; comparison is between two instants so it is TZ-independent',
    freshness: LIVE,
    unit: 'percent',
  },
  {
    key: 'punctuality.avgDelayMinutes',
    label: 'Average pickup delay (minutes)',
    numerator: 'SUM(max(0, actualArrivalTime - plannedEta)) in minutes',
    denominator: 'BOARDED stops with an actualArrivalTime recorded',
    statusInclusion: 'Same population as onTimePct. Early arrivals count as 0 delay. Rounded to 2 decimals; null when empty.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'minutes',
  },
  {
    key: 'seatUtilisation.pct',
    label: 'Seat utilisation %',
    numerator: 'SUM(CorporateRoute.assignedPassengerCount)',
    denominator: 'SUM(CorporateRoute.maxCapacity)',
    statusInclusion: 'COMPLETED routes only (pooled ratio, not an average of per-route ratios). null when no completed routes.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'percent',
  },
  {
    key: 'safety.sosAlerts',
    label: 'Safety (SOS) alerts',
    numerator: 'COUNT(CorporateSosAlert) raised on the tenant\'s routes',
    denominator: null,
    statusInclusion: 'All SOS statuses, including FALSE_ALARM and RESOLVED. byStatus breaks them down.',
    timezone: 'CorporateSosAlert.createdAt within [from 00:00 IST, to+1 00:00 IST)',
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'attendance.scheduledRides',
    label: 'Scheduled rides (per employee)',
    numerator: 'COUNT(CorporateTransportRequest) of the employee',
    denominator: null,
    statusInclusion: 'Every request status except RESCHEDULED (the rescheduled replacement request is counted instead).',
    timezone: TZ_REQUEST_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'attendance.boarded',
    label: 'Boarded rides (per employee)',
    numerator: 'COUNT(CorporateRouteStop) of the employee with status BOARDED',
    denominator: null,
    statusInclusion: 'BOARDED only.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'attendance.noShows',
    label: 'No-shows (per employee)',
    numerator: 'COUNT(CorporateRouteStop) of the employee with status NO_SHOW',
    denominator: null,
    statusInclusion: 'NO_SHOW only (marked after the 5-minute wait window).',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'attendance.cancellations',
    label: 'Cancellations (per employee)',
    numerator: 'COUNT(CorporateTransportRequest) of the employee with status CANCELLED',
    denominator: null,
    statusInclusion: 'CANCELLED only (RESCHEDULED is not a cancellation).',
    timezone: TZ_REQUEST_DAY,
    freshness: LIVE,
    unit: 'count',
  },
  {
    key: 'attendance.lateDays',
    label: 'Late days (per employee)',
    numerator: `COUNT(DISTINCT shiftDate) where a BOARDED stop of the employee has actualArrivalTime > plannedEta + ${ON_TIME_GRACE_MINUTES} min`,
    denominator: null,
    statusInclusion: 'BOARDED stops with a recorded arrival. Two late pickups on the same IST shift day count as one late day.',
    timezone: TZ_ROUTE_DAY,
    freshness: LIVE,
    unit: 'count',
  },
];
