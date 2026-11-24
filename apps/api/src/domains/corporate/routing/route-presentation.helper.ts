import { PickupRadiusConfig } from '../../../modules/dispatch/pickup-radius';
import { istWallClockToUtc } from '../replanning/cutoff-policy';

export interface EffectiveRoutePolicy {
  isPolicyConfigured: boolean;
  policyVersion: number | null;
  approachLeadMinutes: number;
  dispatchWindowMinutes: number;
  dispatchRetryIntervalMinutes: number;
  searchRadiusKm: number;
  maxRuns: number;
  stopDwellMinutes: number;
  officeArrivalBufferMinutes: number;
  logoutStagingLeadMinutes: number;
}

export interface RouteDispatchSchedule {
  windowStartAt: string | null;
  windowEndAt: string | null;
  approachStartAt: string | null;
  reportingTimeAt: string | null;
  nextAttemptAt: string | null;
  attemptsUsed: number;
  maxRuns: number;
  searchRadiusKm: number;
  retryIntervalMinutes: number;
  dispatchWindowMinutes: number;
  approachLeadMinutes: number;
  logoutStagingLeadMinutes: number;
  isPolicyConfigured: boolean;
}

export interface RouteOperationalSummary {
  employeeStopCount: number;
  totalStopCount: number;
  invalidCoordinateStopCount: number;
  boardedCount: number;
  arrivedCount: number;
  noShowCount: number;
  pendingCount: number;
  cancelledCount: number;
  occupancyPct: number;
  plannedStartTime: string | null;
  plannedEndTime: string | null;
  shiftDeadlineTime: string | null;
  plannedDistanceMeters: number;
  plannedDistanceKm: number;
  plannedDriveSeconds: number;
  plannedDwellSeconds: number;
  plannedTotalSeconds: number;
  liveDistanceMeters: number | null;
  liveDistanceKm: number | null;
  liveDriveSeconds: number | null;
  liveDwellSeconds: number | null;
  liveTotalSeconds: number | null;
  liveTrafficSource: string | null;
  liveRefreshedAt: string | null;
}

export interface RouteFinancialsDto {
  corporateBilling: {
    invoiceLineId: string;
    invoiceId: string;
    invoiceNumber: string | null;
    invoiceStatus: string | null;
    lineType: string;
    billableDistanceMeters: number;
    amountPaise: number;
    amountInr: number;
    noShowCount: number;
    noShowPaise: number;
    noShowInr: number;
  } | null;
  driverEarning: {
    earningId: string;
    driverId: string;
    routeFarePaise: number;
    approachBonusPaise: number;
    tollReimbursementPaise: number;
    totalEarnedPaise: number;
    totalEarnedInr: number;
    payoutStatus: string;
    voidedAt: string | null;
    voidReason: string | null;
  } | null;
}

const DEFAULT_APPROACH_LEAD_MINUTES = 30;
const DEFAULT_DISPATCH_WINDOW_MINUTES = 30;
const DEFAULT_RETRY_INTERVAL_MINUTES = 5;
const DEFAULT_STOP_DWELL_MINUTES = 10;
const DEFAULT_OFFICE_BUFFER_MINUTES = 10;
const LOGOUT_STAGING_LEAD_MINUTES = 15;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * Validates geographic coordinates. Rejects null, undefined, empty strings, NaN,
 * out-of-range latitude/longitude, and (0, 0) ("Null Island").
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') {
    return false;
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return false;
  if (Math.abs(latNum) < 1e-6 && Math.abs(lngNum) < 1e-6) return false;
  return true;
}

/**
 * Identifies the office stop across both LOGIN (final DROPOFF) and LOGOUT (first PICKUP).
 * Employee stops always have at least one of employeeId, employeeName, or employee relation.
 */
export function isOfficeRouteStop(stop: {
  employeeId?: string | null;
  employeeName?: string | null;
  employee?: { id?: string; fullName?: string | null } | null;
}): boolean {
  return !stop.employeeId && !stop.employeeName && !stop.employee;
}

/**
 * Resolves the effective dispatch & routing policy using the exact same clamping rules as
 * CorporateDispatchService.loadDispatchPolicy().
 */
export function resolveEffectiveRoutePolicy(policy?: any | null): EffectiveRoutePolicy {
  const approachLeadMinutes = clampInt(policy?.approachLeadMinutes, 5, 120, DEFAULT_APPROACH_LEAD_MINUTES);
  const dispatchWindowMinutes = clampInt(policy?.dispatchWindowMinutes, 5, 120, DEFAULT_DISPATCH_WINDOW_MINUTES);
  const dispatchRetryIntervalMinutes = clampInt(
    policy?.dispatchRetryIntervalMinutes,
    1,
    30,
    DEFAULT_RETRY_INTERVAL_MINUTES,
  );
  const maxAllowedRadius = Math.max(1, PickupRadiusConfig.maxPickupRadiusKm || 10);
  const searchRadiusKm = Math.min(
    maxAllowedRadius,
    clampInt(policy?.searchRadiusKm, 1, 50, maxAllowedRadius),
  );
  const maxRuns = Math.max(1, Math.floor(dispatchWindowMinutes / dispatchRetryIntervalMinutes));
  const stopDwellMinutes = clampInt(policy?.stopDwellMinutes, 1, 10, DEFAULT_STOP_DWELL_MINUTES);
  const officeArrivalBufferMinutes = clampInt(
    policy?.officeArrivalBufferMinutes,
    0,
    60,
    DEFAULT_OFFICE_BUFFER_MINUTES,
  );

  return {
    isPolicyConfigured: Boolean(policy),
    policyVersion: typeof policy?.version === 'number' ? policy.version : null,
    approachLeadMinutes,
    dispatchWindowMinutes,
    dispatchRetryIntervalMinutes,
    searchRadiusKm,
    maxRuns,
    stopDwellMinutes,
    officeArrivalBufferMinutes,
    logoutStagingLeadMinutes: LOGOUT_STAGING_LEAD_MINUTES,
  };
}

/**
 * Computes authoritative cron dispatch window, approach buffer, and next retry execution time.
 * Mirrors CorporateDispatchService.dispatchDeadlineMs() including the 15-min LOGOUT staging lead.
 */
export function computeDispatchSchedule(route: any, policy: EffectiveRoutePolicy): RouteDispatchSchedule {
  const pickup1Date = route?.targetPickup1Time ? new Date(route.targetPickup1Time) : null;
  const pickup1Ms = pickup1Date && Number.isFinite(pickup1Date.getTime()) ? pickup1Date.getTime() : NaN;
  const isLogout = route?.direction === 'LOGOUT';
  const stagingMs = isLogout ? policy.logoutStagingLeadMinutes * 60_000 : 0;

  let windowStartAt: string | null = null;
  let windowEndAt: string | null = null;
  let approachStartAt: string | null = null;
  let reportingTimeAt: string | null = null;

  if (Number.isFinite(pickup1Ms)) {
    const reportingMs = pickup1Ms - stagingMs;
    const deadlineMs = reportingMs - policy.approachLeadMinutes * 60_000;
    const windowStartMs = deadlineMs - policy.dispatchWindowMinutes * 60_000;

    reportingTimeAt = new Date(reportingMs).toISOString();
    approachStartAt = new Date(deadlineMs).toISOString();
    windowEndAt = new Date(deadlineMs).toISOString();
    windowStartAt = new Date(windowStartMs).toISOString();
  }

  const attemptsUsed = Math.max(0, Number(route?.dispatchAttempts ?? 0));
  const status = String(route?.status ?? '').toUpperCase();
  const dispatchStatus = String(route?.dispatchStatus ?? 'PENDING').toUpperCase();

  let nextAttemptAt: string | null = null;
  const isTerminal =
    Boolean(route?.driverId) ||
    status === 'ASSIGNED' ||
    status === 'IN_TRANSIT' ||
    status === 'COMPLETED' ||
    status === 'CANCELLED' ||
    dispatchStatus === 'DRIVER_ASSIGNED' ||
    dispatchStatus === 'NO_DRIVERS_FOUND';

  if (!isTerminal) {
    if (route?.lastDispatchAttemptAt && attemptsUsed < policy.maxRuns) {
      const lastMs = new Date(route.lastDispatchAttemptAt).getTime();
      if (Number.isFinite(lastMs)) {
        const candidateMs = lastMs + policy.dispatchRetryIntervalMinutes * 60_000;
        const deadlineMs = windowEndAt ? new Date(windowEndAt).getTime() : Infinity;
        if (candidateMs <= deadlineMs) {
          nextAttemptAt = new Date(candidateMs).toISOString();
        }
      }
    } else if (dispatchStatus === 'PENDING' && windowStartAt) {
      nextAttemptAt = windowStartAt;
    }
  }

  return {
    windowStartAt,
    windowEndAt,
    approachStartAt,
    reportingTimeAt,
    nextAttemptAt,
    attemptsUsed,
    maxRuns: policy.maxRuns,
    searchRadiusKm: policy.searchRadiusKm,
    retryIntervalMinutes: policy.dispatchRetryIntervalMinutes,
    dispatchWindowMinutes: policy.dispatchWindowMinutes,
    approachLeadMinutes: policy.approachLeadMinutes,
    logoutStagingLeadMinutes: policy.logoutStagingLeadMinutes,
    isPolicyConfigured: policy.isPolicyConfigured,
  };
}

function toIsoOrNull(val: unknown): string | null {
  if (!val) return null;
  const d = new Date(val as any);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * Computes the authoritative route timing, duration, distance, stop counts, and occupancy metrics.
 * Always separates driving time from stop dwell time (never double-counting).
 */
export function computeRouteOperationalSummary(
  route: any,
  orderedStops: any[],
  directions?: any | null,
): RouteOperationalSummary {
  const employeeStops = orderedStops.filter((s) => !isOfficeRouteStop(s));
  const invalidCoordinateStopCount = orderedStops.filter(
    (s) => !isValidCoordinate(s.latitude, s.longitude),
  ).length;

  let boardedCount = 0;
  let arrivedCount = 0;
  let noShowCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;

  for (const s of employeeStops) {
    const st = String(s.status ?? '').toUpperCase();
    if (st === 'BOARDED' || st === 'COMPLETED') boardedCount++;
    else if (st === 'ARRIVED') arrivedCount++;
    else if (st === 'NO_SHOW') noShowCount++;
    else if (st === 'CANCELLED') cancelledCount++;
    else pendingCount++;
  }

  const maxCapacity = Math.max(0, Number(route?.maxCapacity ?? 0));
  const assignedPassengerCount = Math.max(0, Number(route?.assignedPassengerCount ?? employeeStops.length));
  const occupancyPct = maxCapacity > 0 ? Math.min(100, Math.round((assignedPassengerCount / maxCapacity) * 100)) : 0;

  const isLogout = route?.direction === 'LOGOUT';
  const estDurationSeconds = Math.max(0, Number(route?.estDurationSeconds ?? 0));
  const plannedDistanceMeters = Math.max(0, Number(route?.estDistanceMeters ?? 0));

  // Employee dwell time from persisted stops (office stop always has 0 dwell).
  const plannedDwellSeconds = employeeStops.reduce(
    (sum, s) => sum + Math.max(0, Number(s.dwellBufferSeconds ?? 0)),
    0,
  );
  // Persisted estDurationSeconds includes dwell (commitPlanToDatabase & route-solver both persist drive + dwell).
  const plannedDriveSeconds =
    estDurationSeconds >= plannedDwellSeconds
      ? estDurationSeconds - plannedDwellSeconds
      : estDurationSeconds;
  const plannedTotalSeconds = plannedDriveSeconds + plannedDwellSeconds;

  const firstStop = orderedStops[0];
  const lastStop = orderedStops[orderedStops.length - 1];

  const plannedStartTime =
    toIsoOrNull(route?.targetPickup1Time) ?? toIsoOrNull(firstStop?.plannedEta);

  let plannedEndTime: string | null;
  if (isLogout) {
    // LOGOUT: targetOfficeArrivalTime equals office departure in DB, so end time is the final
    // employee drop-off stop's plannedEta (or start + estDurationSeconds when stops aren't loaded).
    const lastEmployeeStop = employeeStops[employeeStops.length - 1];
    plannedEndTime = toIsoOrNull(lastEmployeeStop?.plannedEta);
    if (!plannedEndTime && plannedStartTime && estDurationSeconds > 0) {
      plannedEndTime = new Date(new Date(plannedStartTime).getTime() + estDurationSeconds * 1000).toISOString();
    }
  } else {
    // LOGIN: prefer office stop / targetOfficeArrivalTime; if start + estDuration is earlier (legacy
    // unbuffered route where targetOfficeArrivalTime was saved as shiftTime), keep targetOfficeArrivalTime
    // consistent with persisted DB while exposing shiftDeadlineTime separately.
    plannedEndTime =
      toIsoOrNull(lastStop?.plannedEta) ??
      toIsoOrNull(route?.targetOfficeArrivalTime);
  }

  let shiftDeadlineTime: string | null = null;
  if (route?.shiftDate && route?.shiftTime) {
    try {
      const dateStr =
        route.shiftDate instanceof Date
          ? route.shiftDate.toISOString().slice(0, 10)
          : String(route.shiftDate).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && /^\d{2}:\d{2}$/.test(String(route.shiftTime))) {
        shiftDeadlineTime = istWallClockToUtc(dateStr, String(route.shiftTime)).toISOString();
      }
    } catch {
      shiftDeadlineTime = null;
    }
  }

  const hasDirections = Boolean(directions && typeof directions === 'object');
  const liveDistanceMeters = hasDirections ? Math.max(0, Number(directions.totalDistanceMeters ?? 0)) : null;
  const liveDistanceKm = hasDirections ? Number(((liveDistanceMeters ?? 0) / 1000).toFixed(2)) : null;
  const liveDriveSeconds = hasDirections ? Math.max(0, Number(directions.totalDurationSeconds ?? 0)) : null;
  const liveDwellSeconds = hasDirections ? Math.max(0, Number(directions.totalDwellSeconds ?? 0)) : null;
  const liveTotalSeconds =
    hasDirections && liveDriveSeconds !== null && liveDwellSeconds !== null
      ? liveDriveSeconds + liveDwellSeconds
      : null;

  return {
    employeeStopCount: employeeStops.length,
    totalStopCount: orderedStops.length,
    invalidCoordinateStopCount,
    boardedCount,
    arrivedCount,
    noShowCount,
    pendingCount,
    cancelledCount,
    occupancyPct,
    plannedStartTime,
    plannedEndTime,
    shiftDeadlineTime,
    plannedDistanceMeters,
    plannedDistanceKm: Number((plannedDistanceMeters / 1000).toFixed(2)),
    plannedDriveSeconds,
    plannedDwellSeconds,
    plannedTotalSeconds,
    liveDistanceMeters,
    liveDistanceKm,
    liveDriveSeconds,
    liveDwellSeconds,
    liveTotalSeconds,
    liveTrafficSource: hasDirections ? String(directions.trafficSource ?? '') || null : null,
    liveRefreshedAt: hasDirections ? toIsoOrNull(directions.refreshedAt) : null,
  };
}

/**
 * Safely maps Prisma BigInt paise fields from CorporateInvoiceLine and CorporateDriverEarning.
 * Must ONLY be attached for authorized platform roles (never leak driver earnings to corporate users).
 */
export function buildRouteFinancials(route: any): RouteFinancialsDto {
  const invoiceLine = Array.isArray(route?.invoiceLines) ? route.invoiceLines[0] : null;
  const earnings: any[] = Array.isArray(route?.driverEarnings) ? route.driverEarnings : [];
  // Prefer the active (non-voided) earning; fall back to most recent earning so ops can inspect void history.
  const activeEarning = earnings.find((e) => e.payoutStatus !== 'VOIDED') ?? earnings[0] ?? null;

  const corporateBilling = invoiceLine
    ? (() => {
        const amountPaise = Number(invoiceLine.amountPaise ?? 0);
        const noShowPaise = Number(invoiceLine.noShowPaise ?? 0);
        return {
          invoiceLineId: invoiceLine.id,
          invoiceId: invoiceLine.invoiceId,
          invoiceNumber: invoiceLine.invoice?.invoiceNumber ?? null,
          invoiceStatus: invoiceLine.invoice?.status ?? null,
          lineType: invoiceLine.lineType ?? 'TRIP',
          billableDistanceMeters: Number(invoiceLine.billableDistanceMeters ?? 0),
          amountPaise,
          amountInr: Number((amountPaise / 100).toFixed(2)),
          noShowCount: Number(invoiceLine.noShowCount ?? 0),
          noShowPaise,
          noShowInr: Number((noShowPaise / 100).toFixed(2)),
        };
      })()
    : null;

  const driverEarning = activeEarning
    ? (() => {
        const routeFarePaise = Number(activeEarning.routeFarePaise ?? 0);
        const approachBonusPaise = Number(activeEarning.approachBonusPaise ?? 0);
        const tollReimbursementPaise = Number(activeEarning.tollReimbursementPaise ?? 0);
        const totalEarnedPaise = Number(activeEarning.totalEarnedPaise ?? 0);
        return {
          earningId: activeEarning.id,
          driverId: activeEarning.driverId,
          routeFarePaise,
          approachBonusPaise,
          tollReimbursementPaise,
          totalEarnedPaise,
          totalEarnedInr: Number((totalEarnedPaise / 100).toFixed(2)),
          payoutStatus: String(activeEarning.payoutStatus ?? 'UNPAID'),
          voidedAt: toIsoOrNull(activeEarning.voidedAt),
          voidReason: activeEarning.voidReason ?? null,
        };
      })()
    : null;

  return { corporateBilling, driverEarning };
}
