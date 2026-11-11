import { AsyncLocalStorage } from 'node:async_hooks';
import { PickupRadiusConfig } from '../../../modules/dispatch/pickup-radius';
import {
  Inject,
  Injectable,
  Logger,
  Optional,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { LocationsService } from '../../../modules/locations/locations.service';
import { CorporateRiderNotifier } from '../execution/corporate-rider-notifier.service';
import {
  CorporateRouteOfferData,
  TrafficAdvancerResult,
  CorporateDispatchWaveResult,
  DirectedOfferOptions,
  OfferPricing,
} from './corporate-dispatch.types';
import {
  ITrafficEstimatorPort,
  TRAFFIC_ESTIMATOR_PORT,
  TrafficRouteEstimate,
  TrafficWaypoint,
} from './traffic/traffic-estimator.port';
import { heuristicTrafficDelay } from './traffic/heuristic-traffic';
import { TripEventRecorder } from '../tracking/trip-event-recorder.service';
import { DriverEligibilityService } from '../supply/driver-eligibility.service';
import { RateCardService } from '../billing/rate-card.service';
import {
  CORPORATE_ESCALATION_LEAD_MIN,
  DriverActiveOfferResponse,
  DriverDutySummary,
} from '../supply/corporate-supply.types';

function envPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Redis key layout shared by the dispatch service and the scheduler / reaper. */
export const CorporateDispatchKeys = {
  ACTIVE_OFFERS_SET: 'corporate:active_offers_set',
  /** Sorted set routeId -> offer expiry (ms). Any instance pops due entries and reaps them. */
  OFFER_EXPIRY_ZSET: 'corporate:offer_expiry',
  /** Shared dispatch work queue: sorted set routeId -> when to (re)evaluate the route (ms). */
  DISPATCH_QUEUE_ZSET: 'corporate:dispatch:queue',
  offer: (routeId: string) => `corporate:route:offer:${routeId}`,
  offerDriver: (routeId: string) => `corporate:offer_driver:${routeId}`,
  rejected: (routeId: string) => `corporate:rejected:${routeId}`,
  unserved: (routeId: string) => `corporate:unserved:${routeId}`,
  driverHold: (driverId: string) => `corporate:driver:offer_hold:${driverId}`,
};

/**
 * Tears down a route's live offer (offer payload, active-set entry, driver pointer and the driver's
 * exclusive hold). Used when a route is cancelled while DISPATCHING so the driver's offer card
 * disappears instead of waiting out the 60s TTL. Returns the driver whose offer was withdrawn.
 */
export async function withdrawCorporateRouteOffer(client: any, routeId: string, db?: any): Promise<string | null> {
  if (!client) return null;
  let driverId: string | null = null;
  const raw = await client.get(CorporateDispatchKeys.offer(routeId));
  if (raw) {
    try {
      driverId = JSON.parse(raw).driverId ?? null;
    } catch {
      driverId = null;
    }
  }
  if (!driverId) driverId = (await client.get(CorporateDispatchKeys.offerDriver(routeId))) || null;
  await client.del(CorporateDispatchKeys.offer(routeId));
  await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
  await client.zrem(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, routeId);
  await client.del(CorporateDispatchKeys.offerDriver(routeId));
  await client.del(CorporateDispatchKeys.unserved(routeId));
  if (driverId && (await client.get(CorporateDispatchKeys.driverHold(driverId))) === routeId) {
    await client.del(CorporateDispatchKeys.driverHold(driverId));
  }
  if (driverId && db?.corporateDriverOffer) {
    try {
      await db.corporateDriverOffer.updateMany({
        where: { routeId, driverId, status: 'SENT' },
        data: { status: 'WITHDRAWN', respondedAt: new Date() },
      });
    } catch {}
  }
  return driverId;
}

/** Gap kept between two corporate trips of the same driver when checking for clashes. */
export const CORPORATE_DRIVER_TURNAROUND_MINUTES = 30;

/** Time window [start, end] a corporate route occupies its driver (LOGOUT includes the 15 min office staging). */
export function corporateRouteBusyWindow(route: {
  direction?: string;
  targetPickup1Time: Date | string;
  targetOfficeArrivalTime?: Date | string | null;
  estDurationSeconds?: number | null;
}): { start: number; end: number } {
  const pickup1 = new Date(route.targetPickup1Time).getTime();
  const start = route.direction === 'LOGOUT' ? pickup1 - 15 * 60_000 : pickup1;
  const durationMs = Math.max(0, Number(route.estDurationSeconds) || 0) * 1000;
  const officeArrival = route.targetOfficeArrivalTime ? new Date(route.targetOfficeArrivalTime).getTime() : NaN;
  const end =
    route.direction !== 'LOGOUT' && Number.isFinite(officeArrival)
      ? Math.max(officeArrival, pickup1)
      : pickup1 + (durationMs || 2 * 3600_000);
  return { start, end };
}

/** After a "no supply within 10 km" result, wait this long before the recovery sweep retries. */
export const CORPORATE_DISPATCH_UNSERVED_RETRY_SECONDS = 300;
/** After an "all candidates busy" result, retry sooner: busy drivers free up within ~60s. */
export const CORPORATE_DISPATCH_BUSY_RETRY_SECONDS = 60;

export interface DispatchPolicySettings {
  approachLeadMinutes: number;
  dispatchWindowMinutes: number;
  retryIntervalMinutes: number;
  searchRadiusKm: number;
  maxRuns: number;
  policyStopDwellSeconds: number | null;
}

function clampDispatchInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

@Injectable()
export class CorporateDispatchService {
  private readonly logger = new Logger(CorporateDispatchService.name);
  private readonly clockStorage = new AsyncLocalStorage<number>();
  private readonly cascadeStorage = new AsyncLocalStorage<boolean>();

  /** Runs a dispatch operation under an explicit synthetic clock (for deterministic ticks/simulations). */
  public withClock<T>(nowMs: number, fn: () => Promise<T>): Promise<T> {
    return this.clockStorage.run(nowMs, fn);
  }

  private getCurrentNowMs(overrideNowMs?: number): number {
    if (overrideNowMs !== undefined && Number.isFinite(overrideNowMs)) return overrideNowMs;
    return this.clockStorage.getStore() ?? Date.now();
  }

  // Constants per PRD specification
  private readonly APPROACH_BUFFER_MINUTES = 30; // 30m driver approach travel time to 10km pickup
  private readonly DISPATCH_WINDOW_MINUTES = 30; // 30m driver search window before approach cutoff
  private readonly RETRY_INTERVAL_MINUTES = 5; // 5m wait before restarting 10km search (up to 6 runs)
  private readonly LOGOUT_STAGING_LEAD_MINUTES = 15; // Cab at office 15m prior to logout
  /** Primary search: 5 km, never beyond the configured pickup radius (docs/23). */
  private get PRIMARY_SEARCH_RADIUS_KM(): number {
    return Math.min(5, PickupRadiusConfig.maxPickupRadiusKm);
  }
  private readonly OFFER_TTL_SECONDS = 60; // 60 seconds atomic offer countdown
  /** How long an accept waits for the route lock before answering 409 "retry". */
  private readonly ACCEPT_LOCK_WAIT_MS = 3000;
  /** Fallback offer pricing, used only when no CorporateDriverRateCard is in force (logs a warning). */
  private readonly BASE_FARE_PAISE = 30000; // ₹300 base fare (in paise)
  private readonly RATE_PER_KM_PAISE = 2000; // ₹20/km (in paise)
  private readonly STOP_DWELL_SECONDS = 300; // Fallback boarding buffer when policy/stop dwell absent
  private readonly MODERATE_DELAY_MINUTES = 10; // congestion label only; does not advance dispatch
  /** DDA advances dispatch when traffic delay >= this many minutes (env CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES). */
  private readonly ddaAdvanceThresholdMinutes = envPositiveNumber('CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES', 30);

  private async loadDispatchPolicy(tenantId?: string | null): Promise<DispatchPolicySettings> {
    let policy: any = null;
    if (tenantId && typeof (this.db as any)?.corporateTenantPolicy?.findFirst === 'function') {
      try {
        policy = await (this.db as any).corporateTenantPolicy.findFirst({
          where: { tenantId },
          orderBy: { version: 'desc' },
        });
      } catch {
        policy = null;
      }
    }
    const approachLeadMinutes = clampDispatchInt(policy?.approachLeadMinutes, 5, 120, this.APPROACH_BUFFER_MINUTES);
    const dispatchWindowMinutes = clampDispatchInt(policy?.dispatchWindowMinutes, 5, 120, this.DISPATCH_WINDOW_MINUTES);
    const retryIntervalMinutes = clampDispatchInt(policy?.dispatchRetryIntervalMinutes, 1, 30, this.RETRY_INTERVAL_MINUTES);
    const maxAllowedRadius = Math.max(1, PickupRadiusConfig.maxPickupRadiusKm || 10);
    const searchRadiusKm = Math.min(
      maxAllowedRadius,
      clampDispatchInt(policy?.searchRadiusKm, 1, 50, maxAllowedRadius),
    );
    const maxRuns = Math.max(1, Math.floor(dispatchWindowMinutes / retryIntervalMinutes));
    const policyStopDwellSeconds =
      typeof policy?.stopDwellMinutes === 'number' && policy.stopDwellMinutes > 0
        ? Math.min(10, Math.round(policy.stopDwellMinutes)) * 60
        : null;
    return {
      approachLeadMinutes,
      dispatchWindowMinutes,
      retryIntervalMinutes,
      searchRadiusKm,
      maxRuns,
      policyStopDwellSeconds,
    };
  }

  private computeRouteDwellSeconds(stops: any[], policyStopDwellSeconds: number | null): number {
    const pickupStops = stops.filter((s) => s.stopType !== 'DROPOFF');
    if (pickupStops.length === 0) return 0;
    const hasExplicitDwell = pickupStops.some((s) => typeof s.dwellBufferSeconds === 'number' && s.dwellBufferSeconds > 0);
    if (hasExplicitDwell) {
      return pickupStops.reduce(
        (sum, s) => sum + (typeof s.dwellBufferSeconds === 'number' && s.dwellBufferSeconds > 0 ? Math.min(600, s.dwellBufferSeconds) : policyStopDwellSeconds ?? this.STOP_DWELL_SECONDS),
        0,
      );
    }
    if (policyStopDwellSeconds !== null) {
      return pickupStops.length * policyStopDwellSeconds;
    }
    return pickupStops.length * this.STOP_DWELL_SECONDS;
  }

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly locationsService: LocationsService,
    @Optional()
    @Inject(TRAFFIC_ESTIMATOR_PORT)
    private readonly trafficEstimator?: ITrafficEstimatorPort,
    @Optional() private readonly riderNotifier?: CorporateRiderNotifier,
  ) {}

  /** WS-B trip timeline (property-injected so the constructor signature is unchanged). */
  @Optional() @Inject(TripEventRecorder) private readonly tripEvents?: TripEventRecorder;
  @Optional() @Inject(DriverEligibilityService) private readonly driverEligibilityService?: DriverEligibilityService;

  @Optional() @Inject(RateCardService) private readonly rateCardService?: RateCardService;

  private getEligibilityService(): DriverEligibilityService {
    return this.driverEligibilityService ?? new DriverEligibilityService(this.db);
  }

  private getRateCardService(): RateCardService {
    return this.rateCardService ?? new RateCardService(this.db);
  }

  /**
   * Driver offer price from the versioned CorporateDriverRateCard in force at the route's pickup-1
   * time. With no card configured the legacy constants apply and a warning is logged.
   */
  public async priceOffer(route: {
    id: string;
    vehicleCategory?: string | null;
    estDistanceMeters?: number | null;
    targetPickup1Time?: Date | string | null;
  }): Promise<OfferPricing> {
    const at = route.targetPickup1Time ? new Date(route.targetPickup1Time) : new Date();
    const category = route.vehicleCategory || 'SEDAN';
    const distanceMeters = Number(route.estDistanceMeters) || 0;
    const card = await this.getRateCardService().findDriverRateCard(category, at);
    if (card) {
      const payout = RateCardService.computeDriverPayout(card, distanceMeters);
      return { farePaise: Number(payout.totalPayoutPaise), rateCardId: card.id, source: 'RATE_CARD' };
    }
    this.logger.warn(
      `[PRICING] No active CorporateDriverRateCard for ${category} at ${at.toISOString()} (route ${route.id}); ` +
        `using fallback ₹${this.BASE_FARE_PAISE / 100} + ₹${this.RATE_PER_KM_PAISE / 100}/km`,
    );
    return {
      farePaise: Math.round(this.BASE_FARE_PAISE + (distanceMeters / 1000) * this.RATE_PER_KM_PAISE),
      source: 'FALLBACK',
    };
  }

  /**
   * Dynamic Dispatch Advancer (DDA) for a scheduled corporate route.
   *
   * Asks the traffic estimator (Google Routes, traffic-aware for the planned departure; heuristic
   * fallback) for the drive time of the full multi-stop route and derives
   *   delay = durationInTraffic - staticDuration.
   * When delay >= CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES (default 30):
   *  - LOGIN: pickup-1 moves earlier so the cab still reaches office by the login anchor:
   *      pickup1 = officeArrival - max(plannedDrive + delay, googleTrafficDrive) - 5 min x pickups
   *    and dispatch = pickup1 - 60 min. Google-sourced advances are persisted (route pickup-1 and
   *    pickup stop ETAs), never moving a time later than what is already stored.
   *  - LOGOUT: office departure is fixed by the shift; only dispatch is advanced by the delay.
   */
  public async assessDynamicTraffic(routeId: string): Promise<TrafficAdvancerResult> {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
        office: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    const isLogout = route.direction === 'LOGOUT';
    const stops: any[] = Array.isArray(route.stops) ? route.stops : [];
    const policy = await this.loadDispatchPolicy(route.tenantId);
    const storedPickup1 = new Date(route.targetPickup1Time);
    const officeArrival = route.targetOfficeArrivalTime ? new Date(route.targetOfficeArrivalTime) : null;
    const estDurationSec = Number(route.estDurationSeconds) || 0;

    // Pickups carry configured boarding dwell buffer (stop dwellSeconds or policy default, falling back to 5m)
    const dwellSec = isLogout ? 0 : this.computeRouteDwellSeconds(stops, policy.policyStopDwellSeconds);

    // Stable planning anchor (idempotent across polls even after pickup-1 has been persisted earlier)
    const plannedPickup1 =
      !isLogout && officeArrival && estDurationSec > 0
        ? new Date(officeArrival.getTime() - estDurationSec * 1000)
        : storedPickup1;
    const plannedDriveSec = estDurationSec > 0 ? Math.max(0, estDurationSec - dwellSec) : undefined;

    const estimate = await this.estimateTraffic(
      this.buildTrafficWaypoints(route, stops, isLogout),
      plannedPickup1,
      { distanceMetersHint: Number(route.estDistanceMeters) || 0, staticDurationSecHint: plannedDriveSec },
    );

    const delaySec = Math.max(0, estimate.durationInTrafficSec - estimate.staticDurationSec);
    const delayMinutes = Math.round(delaySec / 60);
    const thresholdMinutes = this.ddaAdvanceThresholdMinutes;
    const isAdvanced = delaySec >= thresholdMinutes * 60;
    const congestionLevel: TrafficAdvancerResult['congestionLevel'] = isAdvanced
      ? 'SEVERE'
      : delayMinutes >= this.MODERATE_DELAY_MINUTES
        ? 'MODERATE'
        : 'NORMAL';

    // Total pre-pickup dispatch lead: 30m driver approach + 30m dispatch search window (= 60m default)
    const dispatchLeadMinutes = policy.approachLeadMinutes + policy.dispatchWindowMinutes;
    const lead = (t: Date) =>
      new Date(
        t.getTime() -
          ((isLogout ? this.LOGOUT_STAGING_LEAD_MINUTES : 0) + dispatchLeadMinutes) * 60_000,
      );
    const standardDispatchTime = lead(plannedPickup1);

    let adjustedPickup1 = plannedPickup1;
    let adjustedDispatchTime: Date;
    let persisted = false;

    if (isLogout) {
      adjustedDispatchTime = isAdvanced
        ? new Date(standardDispatchTime.getTime() - delaySec * 1000)
        : standardDispatchTime;
    } else {
      if (isAdvanced) {
        if (officeArrival && plannedDriveSec !== undefined) {
          const requiredDriveSec = Math.max(plannedDriveSec + delaySec, estimate.durationInTrafficSec);
          adjustedPickup1 = new Date(officeArrival.getTime() - (requiredDriveSec + dwellSec) * 1000);
        } else {
          adjustedPickup1 = new Date(plannedPickup1.getTime() - delaySec * 1000);
        }
      }
      // Never move a pickup later than what has already been persisted/communicated.
      if (storedPickup1.getTime() < adjustedPickup1.getTime()) {
        adjustedPickup1 = storedPickup1;
      }
      adjustedDispatchTime = lead(adjustedPickup1);

      if (
        isAdvanced &&
        estimate.source === 'GOOGLE' &&
        storedPickup1.getTime() - adjustedPickup1.getTime() >= 60_000
      ) {
        persisted = await this.persistAdvancedPickup(route, stops, storedPickup1, adjustedPickup1, delayMinutes);
      }
    }

    const fmt = (d: Date) => d.toISOString().substring(11, 16);
    let reason: string;
    if (estimate.source === 'HEURISTIC') {
      reason = heuristicTrafficDelay(Number(route.estDistanceMeters) || 0, plannedPickup1).reason;
    } else if (isAdvanced) {
      reason =
        `Google traffic forecast +${delayMinutes}m (in-traffic ${Math.round(estimate.durationInTrafficSec / 60)}m vs ` +
        `free-flow ${Math.round(estimate.staticDurationSec / 60)}m); dispatch advanced to ${fmt(adjustedDispatchTime)}Z`;
    } else {
      reason = `Google traffic forecast +${delayMinutes}m is below the ${thresholdMinutes}m advance threshold`;
    }

    if (isAdvanced) {
      this.logger.log(
        `[DDA] Route ${routeId} advanced: +${delayMinutes}m (${estimate.source}); ` +
          `pickup-1 ${fmt(plannedPickup1)}Z -> ${fmt(adjustedPickup1)}Z, dispatch ${fmt(adjustedDispatchTime)}Z`,
      );
    }

    return {
      routeId,
      originalPickup1Time: plannedPickup1,
      standardDispatchTime,
      adjustedDispatchTime,
      trafficDelayMinutes: delayMinutes,
      isAdvanced,
      congestionLevel,
      reason,
      adjustedPickup1Time: adjustedPickup1,
      trafficSource: estimate.source,
      durationInTrafficSeconds: estimate.durationInTrafficSec,
      staticDurationSeconds: estimate.staticDurationSec,
      persisted,
    };
  }

  /** Ordered route geometry: LOGIN pickups -> office, LOGOUT office -> drops. */
  private buildTrafficWaypoints(route: any, stops: any[], isLogout: boolean): TrafficWaypoint[] {
    const points: TrafficWaypoint[] = stops
      .filter((s) => s.latitude !== undefined && s.longitude !== undefined)
      .map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) }));
    const office =
      route.office && route.office.latitude !== undefined
        ? { latitude: Number(route.office.latitude), longitude: Number(route.office.longitude) }
        : null;
    const hasOfficeStop = isLogout
      ? stops[0]?.stopType === 'PICKUP' && stops.length > 0 && stops.slice(1).every((s) => s.stopType === 'DROPOFF')
      : stops[stops.length - 1]?.stopType === 'DROPOFF';
    if (office && !hasOfficeStop) {
      if (isLogout) points.unshift(office);
      else points.push(office);
    }
    return points;
  }

  private async estimateTraffic(
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints: { distanceMetersHint: number; staticDurationSecHint?: number },
  ): Promise<TrafficRouteEstimate> {
    if (this.trafficEstimator) {
      try {
        return await this.trafficEstimator.estimateRouteDuration(waypoints, departureTime, hints);
      } catch (err: any) {
        this.logger.warn(`[DDA] Traffic estimator failed (${err?.message ?? err}); using heuristic`);
      }
    }
    const staticDurationSec = hints.staticDurationSecHint ?? 0;
    const { delayMinutes } = heuristicTrafficDelay(hints.distanceMetersHint, departureTime);
    return {
      durationInTrafficSec: staticDurationSec + delayMinutes * 60,
      staticDurationSec,
      distanceMeters: hints.distanceMetersHint,
      source: 'HEURISTIC',
    };
  }

  /** Writes the advanced pickup-1 and shifts pickup stop ETAs by the same amount (office ETA unchanged). */
  private async persistAdvancedPickup(
    route: any,
    stops: any[],
    storedPickup1: Date,
    adjustedPickup1: Date,
    delayMinutes: number,
  ): Promise<boolean> {
    const shiftMs = adjustedPickup1.getTime() - storedPickup1.getTime();
    try {
      const ops: any[] = [
        this.db.corporateRoute.update({
          where: { id: route.id },
          data: { targetPickup1Time: adjustedPickup1 },
        }),
      ];
      for (const s of stops) {
        if (s.stopType === 'DROPOFF' || !s.id || !s.plannedEta) continue;
        ops.push(
          this.db.corporateRouteStop.update({
            where: { id: s.id },
            data: { plannedEta: new Date(new Date(s.plannedEta).getTime() + shiftMs) },
          }),
        );
      }
      await this.db.$transaction(ops);

      // Employees: their pickup is now earlier, so tell each of them the new time (never throws).
      if (this.riderNotifier) {
        const changes = stops
          .filter(
            (s) =>
              s.stopType !== 'DROPOFF' &&
              s.id &&
              s.plannedEta &&
              s.employeeId &&
              (s.status ?? 'PENDING') === 'PENDING',
          )
          .map((s) => ({
            stopId: s.id,
            stopSequence: s.stopSequence,
            employeeId: s.employeeId,
            previousEta: new Date(s.plannedEta),
            plannedEta: new Date(new Date(s.plannedEta).getTime() + shiftMs),
            reason: `heavy traffic expected, +${delayMinutes} min`,
          }));
        if (changes.length > 0) {
          await this.riderNotifier.notifyPickupRetimed({ id: route.id, tenantId: route.tenantId }, changes);
        }
      }

      this.notifications.emitEvent('admin:operations', 'CORPORATE_DDA_PICKUP_ADVANCED', {
        routeId: route.id,
        previousPickup1Time: storedPickup1,
        targetPickup1Time: adjustedPickup1,
        trafficDelayMinutes: delayMinutes,
      });
      await this.audit.log({
        action: 'CORPORATE_DDA_PICKUP_ADVANCED',
        actorRole: 'SYSTEM_AUTONOMOUS_DISPATCH',
        entityId: route.id,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          previousPickup1Time: storedPickup1.toISOString(),
          targetPickup1Time: adjustedPickup1.toISOString(),
          trafficDelayMinutes: delayMinutes,
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`[DDA] Failed to persist advanced pickup for route ${route.id}: ${err?.message ?? err}`);
      return false;
    }
  }

  private async markRouteDriversNotFound(
    route: any,
    client: any,
    params: { attempts: number; searchRadiusKm: number; reason: string; nowMs: number },
  ): Promise<boolean> {
    if (route.driverId || route.dispatchStatus === 'NO_DRIVERS_FOUND') {
      return false;
    }

    let transitioned = false;
    if (typeof (this.db as any)?.corporateRoute?.updateMany === 'function') {
      const updated = await this.db.corporateRoute.updateMany({
        where: {
          id: route.id,
          driverId: null,
          status: { in: ['PLANNED', 'DISPATCHING'] },
          dispatchStatus: { not: 'NO_DRIVERS_FOUND' },
        },
        data: {
          dispatchStatus: 'NO_DRIVERS_FOUND',
          dispatchFailureReason: params.reason,
          lastDispatchAttemptAt: new Date(params.nowMs),
          atRisk: true,
        },
      });
      transitioned = (updated?.count ?? 0) > 0;
    } else if (typeof (this.db as any)?.corporateRoute?.update === 'function') {
      try {
        await this.db.corporateRoute.update({
          where: { id: route.id, status: { in: ['PLANNED', 'DISPATCHING'] } },
          data: {
            dispatchStatus: 'NO_DRIVERS_FOUND',
            dispatchFailureReason: params.reason,
            lastDispatchAttemptAt: new Date(params.nowMs),
            atRisk: true,
          },
        });
        transitioned = true;
      } catch {
        transitioned = false;
      }
    }

    if (!transitioned) return false;

    if (client) {
      await Promise.resolve(client.del(CorporateDispatchKeys.unserved(route.id))).catch(() => undefined);
      await Promise.resolve(client.del(CorporateDispatchKeys.offer(route.id))).catch(() => undefined);
      await Promise.resolve(client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, route.id)).catch(() => undefined);
      await Promise.resolve(client.zrem(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, route.id)).catch(() => undefined);
    }

    const alertPayload = {
      routeId: route.id,
      tenantId: route.tenantId,
      tenantName: route.tenant?.name || 'Corporate Client',
      shiftDate: route.shiftDate,
      shiftTime: route.shiftTime,
      direction: route.direction,
      dispatchStatus: 'NO_DRIVERS_FOUND',
      attempts: params.attempts,
      searchRadiusKm: params.searchRadiusKm,
      reason: params.reason,
    };

    this.notifications.emitEvent('admin:operations', 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND', alertPayload);
    this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_AT_RISK', alertPayload);
    if (route.tenantId) {
      this.notifications.emitEvent(`corporate:${route.tenantId}`, 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND', alertPayload);
      this.notifications.emitEvent(`corporate:${route.tenantId}`, 'CORPORATE_ROUTE_AT_RISK', alertPayload);
    }

    await this.audit.log({
      action: 'CORPORATE_DISPATCH_DRIVERS_NOT_FOUND',
      actorRole: 'SYSTEM_AUTONOMOUS_DISPATCH',
      entityId: route.id,
      entityType: 'CORPORATE_ROUTE',
      metadata: {
        tenantId: route.tenantId,
        attempts: params.attempts,
        searchRadiusKm: params.searchRadiusKm,
        reason: params.reason,
      },
    });

    this.logger.error(
      `[DISPATCH_EXHAUSTED] Drivers not found for route ${route.id} after ${params.attempts} runs within ${params.searchRadiusKm}km: ${params.reason}`,
    );

    return true;
  }

  /**
   * Transitions DISPATCHING unassigned routes whose 30-min dispatch window / 6-run budget
   * has exhausted (at approach cutoff T - 30m or maxRuns) cleanly into NO_DRIVERS_FOUND.
   */
  public async checkAndMarkExhaustedWindows(nowMs: number = Date.now()): Promise<string[]> {
    const now = this.getCurrentNowMs(nowMs);
    if (typeof (this.db as any)?.corporateRoute?.findMany !== 'function') return [];

    let candidates: any[] = [];
    try {
      candidates = await this.db.corporateRoute.findMany({
        where: {
          status: 'DISPATCHING',
          driverId: null,
          targetPickup1Time: { gte: new Date(now - 2 * 60 * 60_000) },
        },
        include: { tenant: true },
        take: 250,
      });
    } catch {
      return [];
    }

    const client = this.redis?.getClient();
    const exhaustedIds: string[] = [];

    for (const route of candidates ?? []) {
      if (!route || route.driverId || route.dispatchStatus === 'NO_DRIVERS_FOUND') continue;
      if (!route.dispatchWindowStartedAt && !(Number(route.dispatchAttempts) > 0)) continue;

      const policy = await this.loadDispatchPolicy(route.tenantId);
      const attempts = Number(route.dispatchAttempts) || 0;
      const windowStartedMs = route.dispatchWindowStartedAt
        ? new Date(route.dispatchWindowStartedAt).getTime()
        : null;
      const pickup1Ms = route.targetPickup1Time ? new Date(route.targetPickup1Time).getTime() : NaN;
      const approachCutoffMs = Number.isFinite(pickup1Ms)
        ? pickup1Ms - policy.approachLeadMinutes * 60_000
        : Infinity;

      const activeOffer = client ? await client.get(CorporateDispatchKeys.offer(route.id)) : null;
      if (activeOffer) continue;

      const lastAttemptMs = route.lastDispatchAttemptAt ? new Date(route.lastDispatchAttemptAt).getTime() : 0;
      const retryCooldownElapsed = now - lastAttemptMs >= policy.retryIntervalMinutes * 60_000;

      const runsExhausted = attempts >= policy.maxRuns && retryCooldownElapsed;
      const windowElapsedPastCutoff =
        windowStartedMs !== null &&
        attempts >= 2 &&
        now - windowStartedMs >= policy.dispatchWindowMinutes * 60_000 &&
        now >= approachCutoffMs;

      if (!runsExhausted && !windowElapsedPastCutoff) continue;

      const changed = await this.markRouteDriversNotFound(route, client, {
        attempts,
        searchRadiusKm: policy.searchRadiusKm,
        reason: `Drivers not found within ${policy.searchRadiusKm}km after ${policy.dispatchWindowMinutes}m dispatch window (${attempts} runs)`,
        nowMs: now,
      });
      if (changed) exhaustedIds.push(route.id);
    }

    return exhaustedIds;
  }

  /**
   * Autonomous dispatch trigger for a route.
   * Supports scheduled 30-min (6x 5m retry) waves, offer cascades, and manual Ops retry ("Start" / "Retry Search").
   */
  public async dispatchRoute(
    routeId: string,
    forceStart: boolean = false,
    actorUserId?: string,
    waveOptions?: { nowMs?: number; isCascade?: boolean },
  ): Promise<CorporateDispatchWaveResult> {
    const nowMs = this.getCurrentNowMs(waveOptions?.nowMs);
    const isCascade = Boolean(waveOptions?.isCascade || this.cascadeStorage.getStore());
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        tenant: true,
        office: true,
        stops: { orderBy: { stopSequence: 'asc' } },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    if (route.status === 'ASSIGNED' || route.status === 'IN_TRANSIT' || route.status === 'COMPLETED') {
      return {
        routeId,
        waveNumber: 0,
        searchRadiusKm: 0,
        status: 'ALREADY_ASSIGNED',
        offeredToDriverId: route.driverId || undefined,
        candidatesCount: 0,
      };
    }

    const policy = await this.loadDispatchPolicy(route.tenantId);

    if (route.dispatchStatus === 'NO_DRIVERS_FOUND' && !forceStart) {
      return {
        routeId,
        waveNumber: Number(route.dispatchAttempts) || policy.maxRuns,
        searchRadiusKm: policy.searchRadiusKm,
        status: 'NO_DRIVERS_FOUND',
        candidatesCount: 0,
      };
    }

    // Determine dispatch search coordinates:
    // For LOGIN: Stop 1 pickup coordinate
    // For LOGOUT: Corporate Office coordinate
    let originLat: number;
    let originLng: number;
    let originAddress: string;

    if (route.direction === 'LOGIN') {
      const stop1 = route.stops[0];
      if (!stop1) {
        throw new BadRequestException(`Route ${routeId} has no stops configured`);
      }
      originLat = Number(stop1.latitude);
      originLng = Number(stop1.longitude);
      originAddress = `Stop 1 (First Commuter Pickup)`;
    } else {
      originLat = Number(route.office.latitude);
      originLng = Number(route.office.longitude);
      originAddress = `${route.office.name} (Corporate Staging Bay)`;
    }

    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const lockAcquired = await this.redis.acquireLockToken(lockKey, 30);
    if (!lockAcquired) {
      throw new ConflictException(`Dispatch operation already in progress for route ${routeId}`);
    }

    try {
      const client = this.redis.getClient();

      // Idempotency: a live offer already exists (e.g. manual Start raced the scheduler, or a
      // duplicate job ran). Never issue a second concurrent offer for the same route.
      const existingRaw = client ? await client.get(CorporateDispatchKeys.offer(routeId)) : null;
      if (existingRaw) {
        const existing: CorporateRouteOfferData = JSON.parse(existingRaw);
        return {
          routeId,
          waveNumber: Number(route.dispatchAttempts) || 1,
          searchRadiusKm: policy.searchRadiusKm,
          status: 'OFFERED',
          offeredToDriverId: existing.driverId,
          candidatesCount: 0,
        };
      }

      let currentAttempts = Number(route.dispatchAttempts) || 0;
      const pickup1Ms = route.targetPickup1Time ? new Date(route.targetPickup1Time).getTime() : NaN;
      const approachCutoffMs = Number.isFinite(pickup1Ms)
        ? pickup1Ms - policy.approachLeadMinutes * 60_000
        : Infinity;
      const windowStartedAtMs = route.dispatchWindowStartedAt
        ? new Date(route.dispatchWindowStartedAt).getTime()
        : null;

      if (forceStart) {
        currentAttempts = 0;
        if (client) {
          await client.del(CorporateDispatchKeys.rejected(routeId));
          await client.del(CorporateDispatchKeys.unserved(routeId));
        }
      } else if (!isCascade) {
        const exhaustedByRuns = currentAttempts >= policy.maxRuns;
        const exhaustedByWindow =
          windowStartedAtMs !== null &&
          currentAttempts >= 2 &&
          nowMs - windowStartedAtMs >= policy.dispatchWindowMinutes * 60_000 &&
          nowMs >= approachCutoffMs;

        if (exhaustedByRuns || exhaustedByWindow) {
          await this.markRouteDriversNotFound(route, client, {
            attempts: currentAttempts,
            searchRadiusKm: policy.searchRadiusKm,
            reason: `Drivers not found within ${policy.searchRadiusKm}km after ${policy.dispatchWindowMinutes}m dispatch window (${currentAttempts} runs)`,
            nowMs,
          });
          return {
            routeId,
            waveNumber: currentAttempts,
            searchRadiusKm: policy.searchRadiusKm,
            status: 'NO_DRIVERS_FOUND',
            candidatesCount: 0,
          };
        }

        // Restarting a fresh dispatch search wave after 5m wait: clear previous wave rejections
        if (currentAttempts > 0 && client) {
          await client.del(CorporateDispatchKeys.rejected(routeId));
        }
      }

      const waveNumber = isCascade ? Math.max(1, currentAttempts) : currentAttempts + 1;
      const windowStartedDate =
        forceStart || !route.dispatchWindowStartedAt ? new Date(nowMs) : new Date(route.dispatchWindowStartedAt);

      // Conditional transition (PLANNED|DISPATCHING -> DISPATCHING).
      try {
        await this.db.corporateRoute.update({
          where: { id: routeId, status: { in: ['PLANNED', 'DISPATCHING'] } },
          data: {
            status: 'DISPATCHING',
            ...(isCascade
              ? {}
              : {
                  dispatchAttempts: waveNumber,
                  dispatchWindowStartedAt: windowStartedDate,
                  lastDispatchAttemptAt: new Date(nowMs),
                  dispatchFailureReason: null,
                  dispatchStatus: 'PENDING',
                }),
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          return {
            routeId,
            waveNumber: 0,
            searchRadiusKm: 0,
            status: 'ALREADY_ASSIGNED',
            candidatesCount: 0,
          };
        }
        throw err;
      }

      // Retrieve drivers who already rejected this route offer in the current wave
      const rejectedDriverIds = (await client?.smembers(CorporateDispatchKeys.rejected(routeId))) || [];

      // Phase 1: Search in primary radius (up to 5 km, capped by tenant policy searchRadiusKm)
      const primaryRadius = Math.min(this.PRIMARY_SEARCH_RADIUS_KM, policy.searchRadiusKm);
      let candidateDrivers = await this.findEligibleDrivers(
        originLat,
        originLng,
        primaryRadius,
        route.vehicleCategory,
        rejectedDriverIds,
        route,
      );

      let currentRadius = primaryRadius;
      let busyCandidates = 0;
      const triedIds = new Set<string>();

      let claim = await this.claimFirstFreeDriver(routeId, candidateDrivers, triedIds);
      busyCandidates += claim.busy;
      let selectedDriver = claim.driver;

      // Phase 2: Expand up to policy max radius (default 10 km) if needed
      if (!selectedDriver && policy.searchRadiusKm > primaryRadius) {
        this.logger.warn(
          `No eligible drivers found within ${primaryRadius} km for route ${routeId} (run ${waveNumber}/${policy.maxRuns}). Expanding search radius to ${policy.searchRadiusKm} km...`,
        );
        currentRadius = policy.searchRadiusKm;
        candidateDrivers = await this.findEligibleDrivers(
          originLat,
          originLng,
          currentRadius,
          route.vehicleCategory,
          rejectedDriverIds,
          route,
        );
        claim = await this.claimFirstFreeDriver(routeId, candidateDrivers, triedIds);
        busyCandidates += claim.busy;
        selectedDriver = claim.driver;
      }

      if (!selectedDriver && busyCandidates > 0) {
        if (client) {
          await client.set(
            CorporateDispatchKeys.unserved(routeId),
            'BUSY',
            'EX',
            CORPORATE_DISPATCH_BUSY_RETRY_SECONDS,
          );
        }
        this.notifications.emitEvent('admin:operations', 'CORPORATE_DISPATCH_DEFERRED', {
          routeId,
          reason: 'All nearby candidates hold another active offer',
          busyCandidates,
        });
        return {
          routeId,
          waveNumber,
          searchRadiusKm: currentRadius,
          status: 'ALL_DRIVERS_BUSY',
          candidatesCount: busyCandidates,
        };
      }

      if (!selectedDriver) {
        const retrySeconds = policy.retryIntervalMinutes * 60;
        const hitExhaustion =
          waveNumber >= policy.maxRuns ||
          (!forceStart &&
            nowMs - windowStartedDate.getTime() >= policy.dispatchWindowMinutes * 60_000 &&
            nowMs >= approachCutoffMs &&
            waveNumber >= 2);

        if (hitExhaustion) {
          await this.markRouteDriversNotFound(route, client, {
            attempts: waveNumber,
            searchRadiusKm: policy.searchRadiusKm,
            reason: `Drivers not found within ${policy.searchRadiusKm}km after ${policy.dispatchWindowMinutes}m dispatch window (${waveNumber} runs)`,
            nowMs,
          });
        } else {
          await Promise.resolve(
            this.db.corporateRoute.update({
              where: { id: routeId },
              data: { dispatchStatus: 'PENDING' },
            }),
          ).catch(() => undefined);
          if (client) {
            await client.set(
              CorporateDispatchKeys.unserved(routeId),
              'NO_SUPPLY',
              'EX',
              retrySeconds,
            );
          }
          this.logger.warn(
            `Dispatch run ${waveNumber}/${policy.maxRuns} found no available drivers within ${policy.searchRadiusKm} km for route ${routeId}; scheduling next scan in ${policy.retryIntervalMinutes} min.`,
          );
          this.notifications.emitEvent('admin:operations', 'CORPORATE_DISPATCH_UNSERVED', {
            routeId,
            tenantId: route.tenantId,
            tenantName: route.tenant?.name,
            shiftDate: route.shiftDate,
            shiftTime: route.shiftTime,
            direction: route.direction,
            waveNumber,
            maxRuns: policy.maxRuns,
            reason: `No drivers available in ${policy.searchRadiusKm} km radius (run ${waveNumber}/${policy.maxRuns})`,
          });
        }

        return {
          routeId,
          waveNumber,
          searchRadiusKm: currentRadius,
          status: 'NO_DRIVERS_FOUND',
          candidatesCount: 0,
        };
      }

      // Driver guaranteed payout in paise (versioned driver rate card; constants only as fallback)
      const pricing = await this.priceOffer(route);
      const farePaise = pricing.farePaise;

      const offerExpiresAt = new Date(nowMs + this.OFFER_TTL_SECONDS * 1000);

      const offerData: CorporateRouteOfferData = {
        routeId: route.id,
        driverId: selectedDriver.id,
        tenantName: route.tenant.name,
        shiftDate: route.shiftDate.toISOString().split('T')[0],
        shiftTime: route.shiftTime,
        direction: route.direction,
        passengerCount: route.assignedPassengerCount,
        totalDistanceMeters: route.estDistanceMeters,
        targetPickup1Time: route.targetPickup1Time,
        farePaise,
        offerExpiresAt,
        stopsCount: route.stops.length,
        originAddress,
        destinationAddress: route.office.name,
      };

      // Store atomic offer in Redis with 60s TTL, then the durable WS-A CorporateDriverOffer row
      await this.publishOffer(client, offerData);
      await this.persistOfferRow(route.tenantId, routeId, selectedDriver.id, farePaise, offerExpiresAt);
      await Promise.resolve(
        this.db.corporateRoute.update({
          where: { id: routeId },
          data: { dispatchStatus: 'OFFERED' },
        }),
      ).catch(() => undefined);

      // Send Realtime WebSocket Event + FCM Push to Driver
      this.notifications.emitEvent(`driver:${selectedDriver.id}`, 'CORPORATE_ROUTE_OFFER', offerData);

      if (selectedDriver.userId) {
        await this.notifications.sendPushToUser(selectedDriver.userId, {
          title: '🚖 New Corporate Route Assigned!',
          body: `Corporate Commute (${route.direction}): ${route.assignedPassengerCount} passengers, ₹${(farePaise / 100).toFixed(0)} payout. Tap to accept within 60s!`,
          data: {
            routeId: route.id,
            action: 'CORPORATE_ROUTE_OFFER',
            expiresAt: offerExpiresAt.toISOString(),
          },
        });
      }

      await this.audit.log({
        action: forceStart ? 'CORPORATE_DISPATCH_FORCE_START' : 'CORPORATE_DISPATCH_TRIGGERED',
        userId: actorUserId,
        actorRole: forceStart ? 'SUPER_ADMIN' : 'SYSTEM_AUTONOMOUS_DISPATCH',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          offeredToDriverId: selectedDriver.id,
          driverName: selectedDriver.fullName,
          waveNumber,
          maxRuns: policy.maxRuns,
          searchRadiusKm: currentRadius,
          farePaise,
          rateCardId: pricing.rateCardId ?? null,
          pricingSource: pricing.source,
          candidatesCount: candidateDrivers.length,
        },
      });

      await this.tripEvents?.recordOfferSent({ tenantId: route.tenantId, routeId, driverId: selectedDriver.id, actorId: actorUserId, payload: { farePaise, searchRadiusKm: currentRadius, expiresAt: offerExpiresAt } });
      return {
        routeId,
        waveNumber,
        searchRadiusKm: currentRadius,
        status: 'OFFERED',
        offeredToDriverId: selectedDriver.id,
        offeredDriverName: selectedDriver.fullName,
        candidatesCount: candidateDrivers.length,
      };
    } finally {
      await this.redis.releaseLockToken(lockKey, lockAcquired);
    }
  }

  /**
   * Writes a live offer with the shared Redis contract (payload with 60 s TTL, active set, expiry
   * queue, driver pointer). The scheduler's reaper and the accept path read exactly these keys.
   */
  private async publishOffer(client: any, offer: CorporateRouteOfferData): Promise<void> {
    if (!client) return;
    const routeId = offer.routeId;
    await client.set(CorporateDispatchKeys.offer(routeId), JSON.stringify(offer), 'EX', this.OFFER_TTL_SECONDS);
    await client.sadd(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
    await client.zadd(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, new Date(offer.offerExpiresAt).getTime(), routeId);
    await client.del(CorporateDispatchKeys.unserved(routeId));
    await client.set(CorporateDispatchKeys.offerDriver(routeId), offer.driverId, 'EX', this.OFFER_TTL_SECONDS + 60);
  }

  /** WS-A: durable CorporateDriverOffer row; `(routeId, driverId, attempt)` keeps retries idempotent. */
  private async persistOfferRow(
    tenantId: string,
    routeId: string,
    driverId: string,
    farePaise: number,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.db?.corporateDriverOffer) return;
    try {
      const existingCount = await this.db.corporateDriverOffer.count({ where: { routeId, driverId } });
      const attempt = existingCount + 1;
      await this.db.corporateDriverOffer.upsert({
        where: { routeId_driverId_attempt: { routeId, driverId, attempt } },
        create: { tenantId, routeId, driverId, attempt, status: 'SENT', payoutPaise: BigInt(farePaise), expiresAt },
        update: { status: 'SENT', payoutPaise: BigInt(farePaise), expiresAt, updatedAt: new Date() },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to persist CorporateDriverOffer: ${e?.message ?? e}`);
    }
  }

  /**
   * Checks that one specific driver may take `route` (verified, available, vehicle category, seats,
   * insurance, duty hours, overlap) and holds no live offer for another route.
   * Unknown driver -> 404; ineligible -> 409 whose body carries the machine-readable `reason`.
   */
  public async assertDriverCanTakeRoute(route: any, driverId: string): Promise<{ driver: any; matchedVehicleId?: string }> {
    const res = await this.getEligibilityService().checkDriverEligibility(driverId, route);
    if (!res.isEligible) {
      if (res.rejectionReason === 'DRIVER_NOT_FOUND') {
        throw new NotFoundException(`Driver ${driverId} not found`);
      }
      const detail =
        res.rejectionReason === 'ROUTE_TIME_OVERLAP' && res.conflictingRouteId
          ? `: committed to route ${res.conflictingRouteId} in an overlapping window`
          : '';
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        reason: res.rejectionReason,
        ...(res.conflictingRouteId ? { conflictingRouteId: res.conflictingRouteId } : {}),
        message: `Driver ${driverId} is not eligible for route ${route.id} (${res.rejectionReason})${detail}`,
      });
    }
    const client = this.redis.getClient();
    if (client) {
      const hold = await client.get(CorporateDispatchKeys.driverHold(driverId));
      if (hold && hold !== route.id) throw this.driverBusyConflict(driverId, hold);
    }
    const driver = await this.db.driver.findUnique({ where: { id: driverId } });
    return { driver, matchedVehicleId: res.matchedVehicleId };
  }

  private driverBusyConflict(driverId: string, holdRouteId: string | null): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      reason: 'DRIVER_HOLDS_LIVE_OFFER',
      message: `Driver ${driverId} currently holds a live offer for route ${holdRouteId}`,
    });
  }

  /**
   * Directed offer: offers `routeId` to one chosen driver (ops reassign, manual allocation) with the
   * same Redis keys / 60 s TTL and CorporateDriverOffer persistence as `dispatchRoute`, so the
   * driver accepts through the normal accept path and an unanswered offer is reaped and cascaded.
   *
   * - The driver must pass DriverEligibilityService for this route (409 with `reason` otherwise).
   * - The route must be PLANNED or DISPATCHING; it is moved to DISPATCHING conditionally.
   * - A live offer of the route to another driver is withdrawn (the directed choice wins); a live
   *   offer to the same driver is returned unchanged (idempotent retry).
   * - Price: `opts.farePaise` when given, else the driver rate card (`priceOffer`).
   */
  public async offerRouteToDriver(
    routeId: string,
    driverId: string,
    opts: DirectedOfferOptions = {},
  ): Promise<CorporateDispatchWaveResult> {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: { tenant: true, office: true, stops: { orderBy: { stopSequence: 'asc' } } },
    });
    if (!route) throw new NotFoundException(`Corporate route ${routeId} not found`);
    if (route.status !== 'PLANNED' && route.status !== 'DISPATCHING') {
      throw new ConflictException(`Route ${routeId} is ${route.status}; only PLANNED or DISPATCHING routes can be offered`);
    }

    const { driver } = await this.assertDriverCanTakeRoute(route, driverId);

    const client = this.redis.getClient();
    if (!client) throw new ConflictException('Live offer store unavailable; directed offer not issued');

    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const deadline = Date.now() + (opts.lockWaitMs ?? this.ACCEPT_LOCK_WAIT_MS);
    let token = await this.redis.acquireLockToken(lockKey, 30);
    while (!token && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 25 + Math.floor(Math.random() * 25)));
      token = await this.redis.acquireLockToken(lockKey, 30);
    }
    if (!token) throw new ConflictException(`Dispatch operation already in progress for route ${routeId}`);

    try {
      const existingRaw = await client.get(CorporateDispatchKeys.offer(routeId));
      if (existingRaw) {
        const existing: CorporateRouteOfferData = JSON.parse(existingRaw);
        if (existing.driverId === driverId) {
          return {
            routeId,
            waveNumber: 0,
            searchRadiusKm: 0,
            status: 'OFFERED',
            offeredToDriverId: driverId,
            offeredDriverName: driver?.fullName,
            candidatesCount: 1,
            offerExpiresAt: new Date(existing.offerExpiresAt),
          };
        }
      }

      try {
        await this.db.corporateRoute.update({
          where: { id: routeId, status: { in: ['PLANNED', 'DISPATCHING'] } },
          data: { status: 'DISPATCHING' },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') throw new ConflictException(`Route ${routeId} is no longer open for an offer`);
        throw err;
      }

      // The directed choice replaces an offer the scheduler issued in the meantime.
      await withdrawCorporateRouteOffer(client, routeId, this.db);

      const holdKey = CorporateDispatchKeys.driverHold(driverId);
      const held = await client.set(holdKey, routeId, 'EX', this.OFFER_TTL_SECONDS + 5, 'NX');
      if (held !== 'OK') {
        const holder = await client.get(holdKey);
        if (holder !== routeId) throw this.driverBusyConflict(driverId, holder);
      }

      const pricing: OfferPricing =
        opts.farePaise !== undefined && opts.farePaise !== null
          ? { farePaise: Math.round(Number(opts.farePaise)), source: 'OVERRIDE' }
          : await this.priceOffer(route);
      const offerExpiresAt = new Date(Date.now() + this.OFFER_TTL_SECONDS * 1000);
      const offerData: CorporateRouteOfferData = {
        routeId,
        driverId,
        tenantName: route.tenant?.name,
        shiftDate: new Date(route.shiftDate).toISOString().slice(0, 10),
        shiftTime: route.shiftTime,
        direction: route.direction,
        passengerCount: route.assignedPassengerCount,
        totalDistanceMeters: route.estDistanceMeters,
        targetPickup1Time: route.targetPickup1Time,
        farePaise: pricing.farePaise,
        offerExpiresAt,
        stopsCount: (route.stops ?? []).length,
        originAddress:
          route.direction === 'LOGIN' ? 'Stop 1 (First Commuter Pickup)' : `${route.office?.name} (Corporate Staging Bay)`,
        destinationAddress: route.office?.name,
      };

      await this.publishOffer(client, offerData);
      await this.persistOfferRow(route.tenantId, routeId, driverId, pricing.farePaise, offerExpiresAt);

      this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_OFFER', {
        ...offerData,
        directedByOps: opts.directedByOps ?? true,
      });
      if (driver?.userId) {
        try {
          await this.notifications.sendPushToUser(driver.userId, {
            title: 'Corporate route offered to you',
            body: `Corporate commute (${route.direction}): ${route.assignedPassengerCount} passengers, ₹${(pricing.farePaise / 100).toFixed(0)} payout. Tap to accept within 60s.`,
            data: { routeId, action: 'CORPORATE_ROUTE_OFFER', expiresAt: offerExpiresAt.toISOString() },
          });
        } catch (err: any) {
          this.logger.warn(`Push to driver ${driverId} failed: ${err?.message}`);
        }
      }
      await this.audit.log({
        action: 'CORPORATE_DISPATCH_DIRECT_OFFER',
        userId: opts.actorUserId,
        actorRole: opts.actorRole ?? 'ADMIN',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          offeredToDriverId: driverId,
          farePaise: pricing.farePaise,
          pricingSource: pricing.source,
          rateCardId: pricing.rateCardId ?? null,
          offerExpiresAt: offerExpiresAt.toISOString(),
          reason: opts.reason ?? null,
        },
      });
      await this.tripEvents?.recordOfferSent({
        tenantId: route.tenantId,
        routeId,
        driverId,
        actorId: opts.actorUserId,
        payload: { farePaise: pricing.farePaise, directed: true, expiresAt: offerExpiresAt },
      });

      return {
        routeId,
        waveNumber: 0,
        searchRadiusKm: 0,
        status: 'OFFERED',
        offeredToDriverId: driverId,
        offeredDriverName: driver?.fullName,
        candidatesCount: 1,
        offerExpiresAt,
      };
    } finally {
      await this.redis.releaseLockToken(lockKey, token);
    }
  }

  /**
   * Driver accepts corporate route offer within the 60-second atomic timer.
   */
  public async acceptRouteOffer(routeId: string, driverId: string): Promise<any> {
    // Cheap pre-check outside the lock: a driver who doesn't hold the offer is turned away without
    // contending for the route lock (it is re-checked under the lock below).
    const preClient = this.redis.getClient();
    if (preClient) {
      const preRaw = await preClient.get(CorporateDispatchKeys.offer(routeId));
      if (!preRaw) {
        if (this.db?.corporateDriverOffer) {
          const dbOffer = await this.db.corporateDriverOffer.findFirst({
            where: { routeId, driverId },
            orderBy: { createdAt: 'desc' },
          });
          if (dbOffer && (dbOffer.status === 'EXPIRED' || dbOffer.status === 'WITHDRAWN')) {
            throw new ConflictException(`Offer has expired or was withdrawn (status: ${dbOffer.status})`);
          }
        }
        throw new BadRequestException('Route offer has expired or is no longer valid');
      }
      if ((JSON.parse(preRaw) as CorporateRouteOfferData).driverId !== driverId) {
        throw new BadRequestException('This offer was dispatched to another driver');
      }
    }

    // The offered driver waits briefly for a concurrent operation on the route (e.g. a double tap
    // or the offer reaper) instead of failing at once; the 60s offer window easily absorbs this.
    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const deadline = Date.now() + this.ACCEPT_LOCK_WAIT_MS;
    let lockAcquired = await this.redis.acquireLockToken(lockKey, 15);
    while (!lockAcquired && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 25 + Math.floor(Math.random() * 25)));
      lockAcquired = await this.redis.acquireLockToken(lockKey, 15);
    }
    if (!lockAcquired) {
      throw new ConflictException(`Route assignment in progress, please retry`);
    }

    try {
      const client = this.redis.getClient();
      const rawOffer = client ? await client.get(CorporateDispatchKeys.offer(routeId)) : null;

      if (!rawOffer) {
        throw new BadRequestException('Route offer has expired or is no longer valid');
      }

      const offer: CorporateRouteOfferData = JSON.parse(rawOffer);
      if (offer.driverId !== driverId) {
        throw new BadRequestException('This offer was dispatched to another driver');
      }

      const driver = await this.db.driver.findUnique({
        where: { id: driverId },
      });
      if (!driver) {
        throw new NotFoundException(`Driver ${driverId} not found`);
      }

      // Find driver's verified vehicle or fallback to first vehicle
      const vehicle = await this.db.vehicle.findFirst({
        where: { driverId, verificationStatus: 'VERIFIED' },
      });

      // Update route to ASSIGNED and link driver & vehicle. Conditional on DISPATCHING so a
      // route cancelled (or already assigned) concurrently is never double-assigned.
      // Assignment and earning are one transaction: a route is never ASSIGNED without its
      // earning row, and a failed earning insert rolls the assignment back.
      let updatedRoute: any;
      try {
        updatedRoute = await this.db.$transaction(async (tx: any) => {
          const assigned = await tx.corporateRoute.update({
            where: { id: routeId, status: 'DISPATCHING' },
            data: {
              driverId,
              vehicleId: vehicle ? vehicle.id : null,
              status: 'ASSIGNED',
              dispatchStatus: 'DRIVER_ASSIGNED',
              dispatchFailureReason: null,
            },
            include: {
              stops: { orderBy: { stopSequence: 'asc' } },
              office: true,
              tenant: true,
            },
          });

          // Driver earning record in integer paise (no float rounding)
          await tx.corporateDriverEarning.create({
            data: {
              driverId,
              routeId,
              routeFarePaise: BigInt(offer.farePaise),
              approachBonusPaise: BigInt(0),
              tollReimbursementPaise: BigInt(0),
              totalEarnedPaise: BigInt(offer.farePaise),
              payoutStatus: 'UNPAID',
            },
          });
          return assigned;
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          throw new ConflictException(`Route ${routeId} is no longer open for assignment`);
        }
        throw err;
      }

      // Clear active offer in Redis
      if (client) {
        await client.del(CorporateDispatchKeys.offer(routeId));
        await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
        await client.zrem(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, routeId);
        await client.del(CorporateDispatchKeys.offerDriver(routeId));
        await this.releaseDriverHold(client, driverId, routeId);
      }

      this.logger.log(`Driver ${driver.fullName} (${driverId}) accepted corporate route ${routeId}`);

      // Emit assignment events
      this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_CONFIRMED', {
        routeId,
        status: 'ASSIGNED',
        targetPickup1Time: updatedRoute.targetPickup1Time,
      });

      this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_ASSIGNED', {
        routeId,
        tenantId: updatedRoute.tenantId,
        driverId,
        driverName: driver.fullName,
        driverPhone: driver.phone,
        status: 'ASSIGNED',
      });
      if (updatedRoute.tenantId) {
        this.notifications.emitEvent(`corporate:${updatedRoute.tenantId}`, 'CORPORATE_ROUTE_ASSIGNED', {
          routeId,
          driverId,
          driverName: driver.fullName,
          driverPhone: driver.phone,
          status: 'ASSIGNED',
        });
      }

      // Employees: cab assigned with driver & vehicle details (never throws)
      if (this.riderNotifier) {
        await this.riderNotifier.notifyRouteAssigned(routeId);
      }

      await this.audit.log({
        action: 'CORPORATE_ROUTE_OFFER_ACCEPTED',
        userId: driver.userId,
        actorRole: 'DRIVER',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          driverId,
          farePaise: offer.farePaise,
          vehicleId: vehicle?.id,
        },
      });

      await this.tripEvents?.recordOfferAccepted({ tenantId: updatedRoute.tenantId, routeId, driverId, actorId: driver.userId, payload: { farePaise: offer.farePaise, vehicleId: vehicle?.id ?? null } });
      if (this.db?.corporateDriverOffer) {
        try {
          await this.db.corporateDriverOffer.updateMany({
            where: { routeId, driverId, status: 'SENT' },
            data: { status: 'ACCEPTED', respondedAt: new Date() },
          });
        } catch {}
      }
      return updatedRoute;
    } finally {
      await this.redis.releaseLockToken(lockKey, lockAcquired);
    }
  }

  /**
   * Driver declines corporate route offer or 60s timer expires.
   * Cascades immediately to the next available candidate.
   */
  public async rejectRouteOffer(routeId: string, driverId: string, reason?: string): Promise<void> {
    const client = this.redis.getClient();
    if (client) {
      // Add driver to blacklist for this route
      await client.sadd(CorporateDispatchKeys.rejected(routeId), driverId);
      await client.expire(CorporateDispatchKeys.rejected(routeId), 86400); // 24h retention

      // Stale reject guard: if the live offer now belongs to a different driver (this driver's
      // offer was already reaped and cascaded), only blacklist; never tear down the newer offer.
      const currentDriverId = await this.getCurrentOfferDriverId(client, routeId);
      if (currentDriverId && currentDriverId !== driverId) {
        this.logger.warn(
          `Ignoring stale reject from driver ${driverId} on route ${routeId}; live offer is with ${currentDriverId}`,
        );
        await this.releaseDriverHold(client, driverId, routeId);
        return;
      }

      await client.del(CorporateDispatchKeys.offer(routeId));
      await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
      await client.zrem(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, routeId);
      await client.del(CorporateDispatchKeys.offerDriver(routeId));
      await this.releaseDriverHold(client, driverId, routeId);
    }

    this.logger.log(
      `Driver ${driverId} rejected route ${routeId} (Reason: ${reason || 'NONE'}). Cascading to next candidate...`,
    );

    if (this.db?.corporateDriverOffer) {
      try {
        const isExpired = /EXPIRED|TIMEOUT/i.test(reason || '');
        await this.db.corporateDriverOffer.updateMany({
          where: { routeId, driverId, status: 'SENT' },
          data: {
            status: isExpired ? 'EXPIRED' : 'REJECTED',
            respondedAt: new Date(),
            rejectReason: reason || (isExpired ? 'OFFER_TIMEOUT_EXPIRED' : 'DECLINED_BY_DRIVER'),
          },
        });
      } catch {}
    }
    await this.tripEvents?.recordOfferDeclined(routeId, driverId, reason);
    // Cascade to next driver within the same wave (do not increment attempt counter per driver)
    await this.cascadeStorage.run(true, () => this.dispatchRoute(routeId, false));
  }

  /**
   * Returns the driver currently holding the live offer for a route (offer payload first,
   * then the longer-lived offer_driver pointer that survives the 60s offer TTL).
   */
  private async getCurrentOfferDriverId(client: any, routeId: string): Promise<string | null> {
    const raw = await client.get(CorporateDispatchKeys.offer(routeId));
    if (raw) {
      try {
        return JSON.parse(raw).driverId ?? null;
      } catch {
        return null;
      }
    }
    return (await client.get(CorporateDispatchKeys.offerDriver(routeId))) || null;
  }

  /**
   * Walks proximity-ordered candidates and claims the first driver without another live offer
   * via SET NX EX on a per-driver hold key. Exactly one route can hold a given driver.
   */
  private async claimFirstFreeDriver(
    routeId: string,
    candidates: any[],
    triedIds: Set<string>,
  ): Promise<{ driver: any | null; busy: number }> {
    const client = this.redis.getClient();
    let busy = 0;
    for (const cand of candidates) {
      if (triedIds.has(cand.id)) continue;
      triedIds.add(cand.id);
      if (!client) return { driver: cand, busy };
      const ok = await client.set(
        CorporateDispatchKeys.driverHold(cand.id),
        routeId,
        'EX',
        this.OFFER_TTL_SECONDS + 5,
        'NX',
      );
      if (ok === 'OK') return { driver: cand, busy };
      // A re-dispatch of the same route may find its own previous hold still present.
      if ((await client.get(CorporateDispatchKeys.driverHold(cand.id))) === routeId) {
        return { driver: cand, busy };
      }
      busy++;
    }
    return { driver: null, busy };
  }

  /**
   * Releases a driver's offer hold only if it still belongs to this route.
   * NOTE: GET+DEL is not atomic; the window only matters if the hold expired and was re-claimed
   * by another route in between, in which case that driver could briefly receive two offers.
   * Swap for a Lua compare-and-delete once RedisService exposes one.
   */
  private async releaseDriverHold(client: any, driverId: string, routeId: string): Promise<void> {
    const key = CorporateDispatchKeys.driverHold(driverId);
    if ((await client.get(key)) === routeId) {
      await client.del(key);
    }
  }

  /**
   * Helper: Searches available, verified drivers within a given radius using LocationsService.
   */
  private async findEligibleDrivers(
    lat: number,
    lng: number,
    radiusKm: number,
    vehicleCategory: string,
    excludeDriverIds: string[] = [],
    forRoute?: any,
  ): Promise<any[]> {
    const nearby = await this.locationsService.findNearbyDrivers(lat, lng, radiusKm);
    const excludeSet = new Set(excludeDriverIds);

    const candidateIds = nearby
      .filter((cand) => !excludeSet.has(cand.driverId))
      .map((cand) => cand.driverId);

    if (candidateIds.length === 0) return [];

    // WS-A: Strict eligibility filtering via DriverEligibilityService
    const eligibilitySvc = this.getEligibilityService();
    const { eligibleDriverIds, driverVehicleMap } = await eligibilitySvc.batchFilterEligibleDrivers(
      candidateIds,
      forRoute || { vehicleCategory },
    );

    if (eligibleDriverIds.length === 0) return [];

    const drivers = await this.db.driver.findMany({
      where: {
        id: { in: eligibleDriverIds },
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
      },
    });

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    // Preserve proximity order from nearby search
    return candidateIds
      .filter((id) => driverMap.has(id))
      .map((id) => {
        const d = driverMap.get(id)!;
        return {
          ...d,
          matchedVehicleId: driverVehicleMap.get(id),
        };
      });
  }

  /**
   * WS-A Escalation (ALLOC-05): unassigned (PLANNED / DISPATCHING) routes whose pickup-1 is within
   * CORPORATE_ESCALATION_LEAD_MIN are flagged `atRisk = true` and ops is alerted once.
   *
   * Idempotent: only `atRisk = false` rows are read and the flag is set by a conditional
   * `updateMany(where atRisk = false)`; only the caller whose update matched (count === 1) alerts,
   * so a flagged route never re-alerts, even when two scheduler instances overlap.
   * Routes whose pickup passed more than 2 h ago are ignored (same window as the dispatch scan).
   */
  async checkAndEscalateAtRiskRoutes(nowMs: number = Date.now(), limit: number = 500): Promise<string[]> {
    const leadMs = CORPORATE_ESCALATION_LEAD_MIN * 60_000;
    const atRiskRoutes = await this.db.corporateRoute.findMany({
      where: {
        status: { in: ['PLANNED', 'DISPATCHING'] },
        atRisk: false,
        targetPickup1Time: { gte: new Date(nowMs - 2 * 60 * 60_000), lte: new Date(nowMs + leadMs) },
      },
      include: { stops: true },
      orderBy: { targetPickup1Time: 'asc' },
      take: limit,
    });

    const escalatedRouteIds: string[] = [];
    for (const r of atRiskRoutes ?? []) {
      const flagged = await this.db.corporateRoute.updateMany({
        where: { id: r.id, atRisk: false, status: { in: ['PLANNED', 'DISPATCHING'] } },
        data: { atRisk: true },
      });
      if (!flagged || flagged.count !== 1) continue; // flagged (or assigned) concurrently: no second alert
      escalatedRouteIds.push(r.id);
      const minutesToPickup = Math.round((new Date(r.targetPickup1Time).getTime() - nowMs) / 60000);
      this.logger.warn(`[ALLOC-05] Route ${r.id} is unassigned ${minutesToPickup}m before pickup! Flagged atRisk.`);

      this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_AT_RISK', {
        routeId: r.id,
        tenantId: r.tenantId,
        status: r.status,
        targetPickup1Time: r.targetPickup1Time,
        minutesToPickup,
        stopsCount: r.stops?.length ?? 0,
      });
      await this.audit.log({
        action: 'CORPORATE_ROUTE_AT_RISK_ESCALATED',
        actorRole: 'SYSTEM_AUTONOMOUS_DISPATCH',
        entityId: r.id,
        entityType: 'CORPORATE_ROUTE',
        metadata: { status: r.status, minutesToPickup, leadMinutes: CORPORATE_ESCALATION_LEAD_MIN },
      });

      if (this.tripEvents) {
        await this.tripEvents.recordRouteAtRisk(r.id, minutesToPickup, r.targetPickup1Time);
      }
    }
    return escalatedRouteIds;
  }

  /**
   * WS-A Reconnect: Returns active 60s offer for driver app reconnect.
   */
  async getDriverActiveOffer(driverId: string): Promise<DriverActiveOfferResponse> {
    const client = this.redis.getClient();
    let routeId: string | null = null;
    if (client) {
      routeId = await client.get(CorporateDispatchKeys.driverHold(driverId));
    }

    if (routeId && client) {
      const rawOffer = await client.get(CorporateDispatchKeys.offer(routeId));
      if (rawOffer) {
        const ttl = await client.ttl(CorporateDispatchKeys.offer(routeId));
        const parsed = JSON.parse(rawOffer);
        return {
          hasActiveOffer: true,
          offer: {
            ...parsed,
            id: routeId,
            remainingSeconds: Math.max(0, ttl),
          },
        };
      }
    }

    // Fallback to database CorporateDriverOffer if Redis key just expired or during reconnect
    if (this.db?.corporateDriverOffer) {
      const dbOffer = await this.db.corporateDriverOffer.findFirst({
        where: {
          driverId,
          status: 'SENT',
          expiresAt: { gt: new Date() },
        },
        include: {
          route: {
            include: { tenant: true, stops: { orderBy: { stopSequence: 'asc' } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbOffer && dbOffer.route) {
        const remainingSeconds = Math.max(
          0,
          Math.floor((new Date(dbOffer.expiresAt).getTime() - Date.now()) / 1000),
        );
        const stops = dbOffer.route.stops ?? [];
        return {
          hasActiveOffer: true,
          offer: {
            id: dbOffer.id,
            routeId: dbOffer.routeId,
            tenantName: dbOffer.route.tenant?.name ?? 'Corporate Client',
            shiftDate: dbOffer.route.shiftDate.toISOString().substring(0, 10),
            shiftTime: dbOffer.route.shiftTime,
            direction: dbOffer.route.direction as any,
            passengerCount: dbOffer.route.assignedPassengerCount,
            totalDistanceMeters: dbOffer.route.estDistanceMeters,
            targetPickup1Time: dbOffer.route.targetPickup1Time,
            farePaise: Number(dbOffer.payoutPaise),
            offerExpiresAt: dbOffer.expiresAt,
            remainingSeconds,
            stopsCount: stops.length,
            originAddress: `Stop 1 (${stops[0]?.stopType ?? 'PICKUP'})`,
            destinationAddress: `Stop ${stops.length} (${stops[stops.length - 1]?.stopType ?? 'DROPOFF'})`,
          },
        };
      }
    }

    return { hasActiveOffer: false };
  }

  /**
   * WS-A Driver Duties: Returns all upcoming committed corporate routes assigned to this driver.
   */
  async getDriverAssignedDuties(driverId: string): Promise<DriverDutySummary[]> {
    const routes = await this.db.corporateRoute.findMany({
      where: {
        driverId,
        status: { in: ['ASSIGNED', 'IN_TRANSIT'] },
      },
      include: {
        tenant: true,
        stops: { orderBy: { stopSequence: 'asc' } },
      },
      orderBy: { targetPickup1Time: 'asc' },
    });

    return routes.map((r) => ({
      routeId: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenant?.name ?? 'Corporate Client',
      shiftDate: r.shiftDate.toISOString().substring(0, 10),
      shiftTime: r.shiftTime,
      direction: r.direction as any,
      vehicleCategory: r.vehicleCategory,
      status: r.status,
      targetPickup1Time: r.targetPickup1Time,
      targetOfficeArrivalTime: r.targetOfficeArrivalTime,
      estDistanceMeters: r.estDistanceMeters,
      estDurationSeconds: r.estDurationSeconds,
      passengerCount: r.assignedPassengerCount,
      stopsCount: r.stops?.length ?? 0,
      stops: (r.stops ?? []).map((s) => ({
        sequence: s.stopSequence,
        stopType: s.stopType,
        locationText: `Stop ${s.stopSequence} (${s.stopType})`,
        plannedEta: s.plannedEta,
        status: s.status,
      })),
    }));
  }
}
