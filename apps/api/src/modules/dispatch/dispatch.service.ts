import { Injectable, Logger, NotFoundException, Optional, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { rookieQuotaFor } from './dispatch-ranking';
import { PickupRadiusConfig, evaluateDispatchLocation, kRingForRadiusKm, waveSearchRadiusKm } from './pickup-radius';
import { ModuleRef } from '@nestjs/core';
import {
  RequirementStatus,
  OfferStatus,
  TripStatus,
  UserStatus,
  VerificationStatus,
  DriverAvailability,
  NotificationType,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { LocationsService } from '../locations/locations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../redis/redis.service';
import { GoogleMapsService } from '../locations/google-maps.service';
import { DispatchSchedulerService } from './dispatch-scheduler.service';
import { DriverBehaviorService } from './driver-behavior.service';
import { DispatchConfig } from './dispatch.config';
import type { DistancePricingService } from '../pricing/distance-pricing.service';

export interface DispatchResult {
  requirementId: string;
  offersCreated: number;
  status: RequirementStatus;
  driverIds: string[];
}

/** Grace after expiresAt before the wave job fires, so an accept at T-0.1s commits first. */
const WAVE_FIRE_GRACE_MS = 250;
/** ETA assumed for drivers with no GPS fix: dispatchable, but last on proximity. */

const normalizeVehicle = (v?: string | null): string => {
  if (!v) return '';
  return v.toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
};

/** Road-factor estimate used for Phase A ranking and whenever live routing is unavailable. */
const estimateRoad = (aerialKm: number) => {
  const roadDistanceKm = Number((aerialKm * 1.25).toFixed(2));
  return { roadDistanceKm, etaMinutes: Math.max(2, Math.round((roadDistanceKm / 25) * 60)) };
};

/**
 * The newest known position of a driver: the live index position (search hit) when it is newer than
 * the Postgres row, else the row. Postgres location writes are throttled, so the index can be ahead.
 */
function freshestPosition(
  driver: { currentLat: unknown; currentLng: unknown; lastLocationAt?: Date | string | null },
  hit?: { lat?: number; lng?: number; locationAtMs?: number },
): { currentLat: unknown; currentLng: unknown; lastLocationAt?: Date | string | null } {
  const rowMs = driver.lastLocationAt ? new Date(driver.lastLocationAt).getTime() : NaN;
  if (hit?.locationAtMs && hit.lat !== undefined && hit.lng !== undefined && (!Number.isFinite(rowMs) || hit.locationAtMs > rowMs)) {
    return { currentLat: hit.lat, currentLng: hit.lng, lastLocationAt: new Date(hit.locationAtMs) };
  }
  return driver;
}

@Injectable()
export class DispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchService.name);
  private reaperInterval?: NodeJS.Timeout;
  /** Single-instance dispatch serialization when Redis is not wired (tests / degraded mode). */
  private readonly localDispatchLocks = new Set<string>();

  constructor(
    protected readonly db: DatabaseService,
    private readonly locationsService: LocationsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly googleMapsService?: GoogleMapsService,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly scheduler?: DispatchSchedulerService,
    @Optional() private readonly behavior?: DriverBehaviorService,
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  /**
   * Resolved lazily: PricingModule depends (via RequirementsModule) on this module, so a constructor
   * dependency would be circular.
   */
  private distancePricing(): DistancePricingService | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DistancePricingService: Svc } = require('../pricing/distance-pricing.service');
      return this.moduleRef?.get(Svc, { strict: false }) ?? null;
    } catch {
      return null;
    }
  }

  onModuleInit() {
    this.scheduler?.registerHandler((member) => this.handleScheduledJob(member));

    // Safety-net sweep: exact-time jobs do the real work; this only catches anything orphaned.
    this.reaperInterval = setInterval(() => {
      this.reapExpiredOffersAndRedispatch().catch((err) => {
        this.logger.warn(`Wave sweep notice: ${err.message}`);
      });
    }, 10000);
    this.reaperInterval.unref();

    this.rehydratePendingWaveTimers().catch((err) => {
      this.logger.warn(`Wave timer rehydration notice: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
    }
  }

  /** Routes due scheduler jobs. Members: `wave:<reqId>:<wave>`, `redispatch:<reqId>`, `schedule-notify:<reqId>`, `schedule-dispatch:<reqId>`. */
  async handleScheduledJob(member: string): Promise<void> {
    const [kind, requirementId] = member.split(':');
    if (!requirementId) return;
    if (kind === 'wave') {
      await this.reapExpiredOffersAndRedispatch(requirementId);
    } else if (kind === 'redispatch') {
      await this.dispatchRequirement(requirementId);
    } else if (kind === 'schedule-notify') {
      await this.handleScheduledPreDispatchAlert(requirementId);
    } else if (kind === 'schedule-dispatch') {
      await this.handleScheduledTriggerDispatch(requirementId);
    }
  }

  /**
   * Fires exactly 30 seconds before scheduled driver dispatch begins.
   * Emits real-time event and sends in-app alert to corporate vendor/booker.
   */
  async handleScheduledPreDispatchAlert(requirementId: string): Promise<void> {
    try {
      const requirement = await this.db.requirement.findUnique({
        where: { id: requirementId },
        include: { vendor: true },
      });
      if (!requirement) return;

      // Do not alert if already cancelled, fulfilled, or completed
      if (
        requirement.status === RequirementStatus.CANCELLED ||
        requirement.status === RequirementStatus.COMPLETED ||
        requirement.status === RequirementStatus.FULFILLED
      ) {
        return;
      }

      const alertPayload = {
        requirementId: requirement.id,
        vehicleType: requirement.vehicleType,
        pickupAddress: requirement.pickupAddress,
        dropAddress: requirement.dropAddress,
        reportingTime: requirement.reportingTime.toISOString(),
        secondsRemaining: 30,
        message: 'Hey, we are initiating your ride dispatch and finding drivers in 30 seconds.',
      };

      // 1. Real-time event to vendor channel
      this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'SCHEDULED_RIDE_DISPATCH_ALERT', alertPayload);

      // 2. Real-time event and push to user channel
      if (requirement.vendor?.userId) {
        this.notifications.emitEvent(`user:${requirement.vendor.userId}`, 'SCHEDULED_RIDE_DISPATCH_ALERT', alertPayload);
        await this.notifications.sendPushToUser(requirement.vendor.userId, {
          title: 'Trip Dispatch Alert: 30 Seconds',
          body: 'Hey, we are initiating your ride dispatch and finding drivers in 30 seconds.',
          data: {
            ...alertPayload,
            route: `/requirements/${requirement.id}`,
          },
          actionUrl: `/requirements/${requirement.id}`,
          saveInApp: true,
        });
      }

      this.logger.log(`[Schedule] Pre-dispatch 30s alert emitted for requirement ${requirementId}`);
    } catch (err: any) {
      this.logger.error(`Failed to handle pre-dispatch alert for ${requirementId}: ${err.message}`);
    }
  }

  /**
   * Fires at scheduled dispatch time: triggers progressive dispatch waves to locate drivers.
   */
  async handleScheduledTriggerDispatch(requirementId: string): Promise<void> {
    try {
      const requirement = await this.db.requirement.findUnique({
        where: { id: requirementId },
        include: { vendor: true },
      });
      if (!requirement) return;

      if (
        requirement.status === RequirementStatus.CANCELLED ||
        requirement.status === RequirementStatus.COMPLETED ||
        requirement.status === RequirementStatus.FULFILLED
      ) {
        return;
      }

      this.logger.log(`[Schedule] Automated driver dispatch triggered for requirement ${requirementId}`);
      await this.dispatchRequirement(requirementId);

      const startedPayload = {
        requirementId: requirement.id,
        status: RequirementStatus.DISPATCHING,
        message: 'Automated driver matching is now active for your scheduled trip.',
      };
      this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'SCHEDULED_RIDE_DISPATCHING', startedPayload);
      if (requirement.vendor?.userId) {
        this.notifications.emitEvent(`user:${requirement.vendor.userId}`, 'SCHEDULED_RIDE_DISPATCHING', startedPayload);
      }
    } catch (err: any) {
      this.logger.error(`Failed to handle scheduled dispatch for ${requirementId}: ${err.message}`);
    }
  }

  /**
   * Re-register wave jobs for in-flight offers. Idempotent (same member/score), so it is safe for
   * every instance to run at boot; with Redis the jobs already survived the restart.
   */
  async rehydratePendingWaveTimers(): Promise<void> {
    if (!this.scheduler) return;
    const activeSentOffers = await this.db.offer.findMany({
      where: { status: OfferStatus.SENT },
      select: { requirementId: true, waveNumber: true, expiresAt: true },
    });

    const due = new Map<string, number>();
    for (const off of activeSentOffers) {
      const member = `wave:${off.requirementId}:${off.waveNumber}`;
      const at = new Date(off.expiresAt).getTime() + WAVE_FIRE_GRACE_MS;
      const existing = due.get(member);
      if (existing === undefined || at < existing) due.set(member, at);
    }
    for (const [member, at] of due.entries()) {
      await this.scheduler.schedule(member, at);
    }
    if (due.size > 0) {
      this.logger.log(`[Rehydrate] Restored ${due.size} wave timer(s)`);
    }
  }

  /**
   * Expire lapsed offers and cascade the next wave.
   *
   * Exactly-once per offer: each transition is a conditional UPDATE (status still SENT), and
   * behaviour accounting / notifications run only for rows this call actually transitioned.
   * Safe to run concurrently on any number of instances.
   */
  async reapExpiredOffersAndRedispatch(
    specificRequirementId?: string,
  ): Promise<{ expiredCount: number; requirementsRedispatched: string[] }> {
    const now = new Date();
    const candidates = await this.db.offer.findMany({
      where: {
        status: OfferStatus.SENT,
        expiresAt: { lte: now },
        ...(specificRequirementId ? { requirementId: specificRequirementId } : {}),
      },
      include: { requirement: true },
      take: 500,
    });

    const reaped: typeof candidates = [];
    for (const offer of candidates) {
      const res = await this.db.offer.updateMany({
        where: { id: offer.id, status: OfferStatus.SENT },
        data: { status: OfferStatus.EXPIRED, respondedAt: now },
      });
      if (res.count === 1) reaped.push(offer);
    }

    if (reaped.length === 0) {
      return { expiredCount: 0, requirementsRedispatched: [] };
    }
    this.logger.log(`Expired ${reaped.length} dispatch offer(s)`);

    for (const offer of reaped) {
      await this.behavior?.recordOutcome({
        offerId: offer.id,
        driverId: offer.driverId,
        outcome: 'EXPIRED',
        distanceKm: offer.distanceKm,
        seenAt: offer.seenAt,
        requirement: offer.requirement,
      });
      this.notifications.emitEvent(`driver:${offer.driverId}`, 'OFFER_EXPIRED', {
        offerId: offer.id,
        requirementId: offer.requirementId,
        reason: 'Offer timed out',
      });
    }

    const requirementIds = Array.from(new Set(reaped.map((o) => o.requirementId)));
    const redispatchedReqIds: string[] = [];
    for (const reqId of requirementIds) {
      try {
        const req = await this.db.requirement.findUnique({ where: { id: reqId } });
        if (
          req &&
          req.quantity > req.assignedQuantity &&
          req.status !== RequirementStatus.COMPLETED &&
          req.status !== RequirementStatus.CANCELLED
        ) {
          await this.dispatchRequirement(reqId);
          redispatchedReqIds.push(reqId);
        }
      } catch (err: any) {
        this.logger.warn(`Failed cascading wave for requirement ${reqId}: ${err.message}`);
      }
    }

    return { expiredCount: reaped.length, requirementsRedispatched: redispatchedReqIds };
  }

  /**
   * Dispatch the next wave for a requirement. Serialized per requirement across instances; a
   * concurrent caller is deferred (re-queued ~1.5s later) rather than dropped.
   */
  async dispatchRequirement(requirementId: string, isRetry: boolean = false): Promise<DispatchResult> {
    const lockKey = `dispatch:${requirementId}`;
    let token: string | null = null;
    if (this.redis) {
      token = await this.redis.acquireLockToken(lockKey, 20);
    } else if (!this.localDispatchLocks.has(lockKey)) {
      this.localDispatchLocks.add(lockKey);
      token = 'local';
    }

    if (!token) {
      this.logger.debug(`Dispatch for ${requirementId} already running; deferring`);
      await this.scheduler?.schedule(`redispatch:${requirementId}`, Date.now() + 1500);
      const current = await this.db.requirement.findUnique({ where: { id: requirementId }, select: { status: true } });
      return {
        requirementId,
        offersCreated: 0,
        status: (current?.status as RequirementStatus) ?? RequirementStatus.DISPATCHING,
        driverIds: [],
      };
    }

    try {
      return await this.runDispatchWave(requirementId, isRetry);
    } finally {
      if (this.redis) {
        await this.redis.releaseLockToken(lockKey, token);
      } else {
        this.localDispatchLocks.delete(lockKey);
      }
    }
  }

  private async runDispatchWave(requirementId: string, isRetry: boolean): Promise<DispatchResult> {
    this.logger.log(`Dispatch initiated for requirement ${requirementId} (isRetry: ${isRetry})`);

    const requirement = await this.db.requirement.findUnique({
      where: { id: requirementId },
      include: {
        vendor: true,
        offers: true,
        pricingSnapshot: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
    }

    const noop = (status: RequirementStatus): DispatchResult => ({
      requirementId,
      offersCreated: 0,
      status,
      driverIds: [],
    });

    // Guard: Can only dispatch if not already completed/cancelled
    if (
      requirement.status === RequirementStatus.COMPLETED ||
      requirement.status === RequirementStatus.CANCELLED
    ) {
      this.logger.warn(`Requirement ${requirementId} is ${requirement.status}, skipping dispatch`);
      return noop(requirement.status as RequirementStatus);
    }

    const remaining = requirement.quantity - requirement.assignedQuantity;
    if (remaining <= 0) {
      this.logger.log(`Requirement ${requirementId} is already fully fulfilled`);
      await this.db.requirement.update({
        where: { id: requirementId },
        data: { status: RequirementStatus.FULFILLED },
      });
      return noop(RequirementStatus.FULFILLED);
    }

    const nowMs = Date.now();
    const liveOffers = requirement.offers.filter(
      (o) => o.status === OfferStatus.SENT && new Date(o.expiresAt).getTime() > nowMs,
    ).length;

    // Wave budget: automatic waves are capped; a manual retry starts a fresh budget.
    const wavesSoFar = isRetry ? 0 : Math.max(0, Math.floor(Number(requirement.dispatchWaves) || 0));
    if (wavesSoFar >= DispatchConfig.maxWaves) {
      if (liveOffers > 0) return noop(requirement.status as RequirementStatus);
      return this.markSupplyExhausted(requirement, remaining, 'wave_limit');
    }

    // Uber-grade Sequential Dispatch:
    // By default, single-vehicle requests dispatch strictly 1-by-1 (offerBudget = 1) to prevent race conditions.
    // If DISPATCH_OFFERS_PER_VEHICLE is configured (e.g. 2 for concurrent race testing), respect the multiplier.
    const offersPerVehicle = Number(process.env.DISPATCH_OFFERS_PER_VEHICLE || 1);
    const targetLiveOffers = offersPerVehicle > 1
      ? remaining * offersPerVehicle
      : (requirement.quantity === 1 ? 1 : remaining);
    const offerBudget = Math.max(0, targetLiveOffers - liveOffers);
    if (offerBudget <= 0) {
      this.logger.debug(`Requirement ${requirementId} already has ${liveOffers} live offers; no new wave needed`);
      return noop(requirement.status as RequirementStatus);
    }

    const pickupLat = Number(requirement.pickupLat);
    const pickupLng = Number(requirement.pickupLng);

    const maxPickupRadiusKm = PickupRadiusConfig.maxPickupRadiusKm;

    // Normal waves never re-approach a driver for the same requirement; retry waves may
    // re-approach drivers who previously declined or timed out.
    const isRetryWave = isRetry || requirement.status === RequirementStatus.NO_DRIVER_AVAILABLE;
    const alreadyOfferedDriverIds = new Set(
      requirement.offers
        .filter((o) => {
          if (isRetryWave) {
            return o.status === OfferStatus.SENT || o.status === OfferStatus.ACCEPTED;
          }
          return (
            o.status === OfferStatus.SENT ||
            o.status === OfferStatus.ACCEPTED ||
            o.status === OfferStatus.DECLINED ||
            o.status === OfferStatus.EXPIRED
          );
        })
        .map((o) => o.driverId),
    );

    interface ScoredCandidate {
      driverId: string;
      driver: any;
      hasLocation: boolean;
      driverLat: number;
      driverLng: number;
      distanceKm: number | null;
      roadDistanceKm: number | null;
      etaMinutes: number;
      etaIsLive: boolean;
      /** Unrounded live ETA (minutes) from the road matrix, for ranking only. */
      etaExactMinutes?: number;
      trustScore: number;
      rating: number;
      compositeScore: number;
      isRookie: boolean;
    }

    const reqNorm = normalizeVehicle(requirement.vehicleType);

    /**
     * Eligible, scored candidates within `waveRadiusKm` (never beyond the pickup radius: docs/23).
     * H3 cells first; the radial GEO/DB search runs whenever H3 produced no candidate that has not
     * been offered yet (H3 hits that were all already offered must not hide drivers further out).
     */
    const collectEligible = async (waveRadiusKm: number): Promise<ScoredCandidate[]> => {
      // Own copies: the merge below appends to this list, and must never iterate an array it grows.
      const nearbyCandidates = [
        ...(await this.locationsService.findNearbyDriversByH3(
          pickupLat,
          pickupLng,
          kRingForRadiusKm(waveRadiusKm),
          requirement.vehicleType,
          waveRadiusKm,
        )),
      ];
      if (!nearbyCandidates.some((c) => !alreadyOfferedDriverIds.has(c.driverId))) {
        const radialCandidates = await this.locationsService.findNearbyDrivers(
          pickupLat,
          pickupLng,
          waveRadiusKm,
          requirement.vehicleType,
        );
        const existingIds = new Set(nearbyCandidates.map((c) => c.driverId));
        for (const rc of [...radialCandidates]) {
          if (!existingIds.has(rc.driverId)) {
            nearbyCandidates.push(rc);
            existingIds.add(rc.driverId);
          }
        }
      }

      const searchHits = new Map(nearbyCandidates.map((c) => [c.driverId, c]));
      // No location-less fallback: a driver the spatial search did not find in radius is never offered.
      const candidateIds = nearbyCandidates.filter((c) => !alreadyOfferedDriverIds.has(c.driverId)).map((c) => c.driverId);
      if (candidateIds.length === 0) return [];

      const candidateDrivers = await this.db.driver.findMany({
        where: { id: { in: candidateIds } },
        include: {
          user: true,
          vehicles: true,
          trips: { where: { status: { in: [TripStatus.ASSIGNED, TripStatus.ARRIVED, TripStatus.IN_PROGRESS] } } },
        },
      });

      const eligible: ScoredCandidate[] = [];
      for (const driver of candidateDrivers) {
        if (driver.user?.status !== UserStatus.ACTIVE) continue;
        if (driver.verificationStatus && driver.verificationStatus !== VerificationStatus.VERIFIED) continue;
        if (driver.availabilityStatus !== DriverAvailability.AVAILABLE) continue;

        // Anti-cherry-picking cooldown (expires on its own; no job needed)
        if (driver.cooldownUntil && new Date(driver.cooldownUntil).getTime() > nowMs) {
          this.logger.debug(`Driver ${driver.id} in cooldown until ${driver.cooldownUntil.toISOString()}. Skipping.`);
          continue;
        }

        // Require an exact match between the driver's registered category and the request.
        const dNorm = normalizeVehicle(driver.vehicleType);
        const matchesVehicle =
          !reqNorm ||
          dNorm === reqNorm ||
          (driver.vehicles ?? []).some((v) => normalizeVehicle(v.vehicleType) === reqNorm);
        if (!matchesVehicle) continue;

        // No conflicting active trips
        if (driver.trips && driver.trips.length > 0) continue;

        // The pickup-radius invariant (docs/23): known, fresh location within the configured radius.
        // Unknown or stale locations are never treated as "at the pickup".
        const verdict = evaluateDispatchLocation(
          freshestPosition(driver, searchHits.get(driver.id)),
          { lat: pickupLat, lng: pickupLng },
          nowMs,
          maxPickupRadiusKm,
        );
        if (!verdict.eligible) {
          this.logger.debug(
            `Driver ${driver.id} skipped for ${requirementId}: ${verdict.reason}${verdict.distanceKm !== null ? ` (${verdict.distanceKm.toFixed(1)} km)` : ''}`,
          );
          continue;
        }
        const hasLocation = true;
        const position = freshestPosition(driver, searchHits.get(driver.id));
        const driverLat = Number(position.currentLat);
        const driverLng = Number(position.currentLng);
        const distanceKm: number | null = verdict.distanceKm;
        const { roadDistanceKm, etaMinutes } = estimateRoad(distanceKm);

        const rawTrust = Number(driver.trustScore ?? 94.0);
        const avgRating = Number(driver.averageRating ?? 4.85);
        const isRookie = (driver.totalTrips || 0) < 25;

        const candidate: ScoredCandidate = {
          driverId: driver.id,
          driver,
          hasLocation,
          driverLat,
          driverLng,
          distanceKm,
          roadDistanceKm,
          etaMinutes,
          etaIsLive: false,
          trustScore: rawTrust,
          rating: avgRating,
          compositeScore: 0,
          isRookie,
        };
        candidate.compositeScore = this.computeCompositeScore(candidate, nowMs);
        eligible.push(candidate);
      }

      return eligible;
    };

    // Progressive waves inside the pickup radius: wave w searches radius × w / maxWaves. An empty
    // radius does NOT end the search: the same dispatch widens to the next radius (and the wave
    // counter advances with it) until a candidate is found or the full radius has been searched.
    // (Load-test finding 2026-11-10: ending at an empty 2 km first wave left 115 of 145 bookings
    // without any offer although drivers were within 10 km.)
    const maxWaves = DispatchConfig.maxWaves;
    let currentWaveNumber = Math.min(wavesSoFar + 1, maxWaves);
    let eligibleCandidates: ScoredCandidate[] = [];
    // Bounded: at most maxWaves searches per dispatch.
    for (let attempt = 0; attempt < maxWaves; attempt++) {
      const waveRadiusKm = waveSearchRadiusKm(currentWaveNumber, maxWaves, maxPickupRadiusKm);
      eligibleCandidates = await collectEligible(waveRadiusKm);
      if (eligibleCandidates.length > 0 || currentWaveNumber >= maxWaves) break;
      currentWaveNumber++;
    }

    if (eligibleCandidates.length === 0) {
      this.logger.warn(`No eligible drivers found for requirement ${requirementId}`);
      if (liveOffers > 0) {
        // Offers are still counting down; their wave job will cascade again when they lapse.
        return noop(requirement.status as RequirementStatus);
      }
      return this.markSupplyExhausted(requirement, remaining, 'no_supply');
    }

    let waveLimit = Math.min(eligibleCandidates.length, offerBudget);

    // Phase B: re-rank the best aerial candidates with live traffic road ETA (single batched call)
    if (DispatchConfig.roadEtaEnabled && this.googleMapsService) {
      const byScore = [...eligibleCandidates].sort((a, b) => b.compositeScore - a.compositeScore);
      const k = Math.min(25, Math.max(DispatchConfig.roadEtaTopK, waveLimit));
      const pool = byScore.slice(0, k);
      const bestOutsideRookie = byScore.slice(k).find((c) => c.isRookie);
      if (bestOutsideRookie && !pool.some((c) => c.isRookie)) pool.push(bestOutsideRookie);

      const routable = pool.filter((c) => c.hasLocation);
      if (routable.length > 0) {
        try {
          const etas = await this.googleMapsService.computeDriverEtaMatrix(
            routable.map((c) => ({ latitude: c.driverLat, longitude: c.driverLng })),
            { latitude: pickupLat, longitude: pickupLng },
          );
          routable.forEach((c, i) => {
            const eta = etas[i];
            if (!eta) return;
            c.etaMinutes = eta.etaMinutes;
            c.etaExactMinutes = eta.durationSeconds !== undefined ? eta.durationSeconds / 60 : undefined;
            c.roadDistanceKm = eta.distanceKm;
            c.etaIsLive = eta.isRealRoad;
            c.compositeScore = this.computeCompositeScore(c, nowMs);
          });
        } catch (err: any) {
          this.logger.warn(`Road ETA re-rank skipped for ${requirementId}: ${err.message}`);
        }
      }
    }

    // Optional ROAD-distance cap (DISPATCH_MAX_PICKUP_ROAD_KM), enforced once Google returned a live
    // road distance; the straight-line radius has already been enforced for every candidate.
    const maxPickupRoadKm = PickupRadiusConfig.maxPickupRoadKm;
    if (maxPickupRoadKm !== null) {
      for (let i = eligibleCandidates.length - 1; i >= 0; i--) {
        const c = eligibleCandidates[i];
        if (c.etaIsLive && c.roadDistanceKm !== null && c.roadDistanceKm > maxPickupRoadKm) {
          this.logger.debug(`Driver ${c.driverId} skipped for ${requirementId}: road ${c.roadDistanceKm.toFixed(1)} km > ${maxPickupRoadKm} km`);
          eligibleCandidates.splice(i, 1);
        }
      }
      if (eligibleCandidates.length === 0) {
        if (liveOffers > 0) return noop(requirement.status as RequirementStatus);
        return this.markSupplyExhausted(requirement, remaining, 'no_supply');
      }
      waveLimit = Math.min(eligibleCandidates.length, offerBudget);
    }

    // Separate rookies and veterans, sort both by compositeScore descending
    // Higher score first; on equal score the nearer driver wins (deterministic, no list-order luck).
    const byRank = (a: ScoredCandidate, b: ScoredCandidate) =>
      b.compositeScore - a.compositeScore || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    const rookies = eligibleCandidates.filter((c) => c.isRookie).sort(byRank);
    const veterans = eligibleCandidates.filter((c) => !c.isRookie).sort(byRank);

    // Rookie exploration share, honoured on average (a single-offer wave used to go to ANY rookie in
    // range every time, overriding trust, rating and distance: docs/25).
    const rookieQuota = rookieQuotaFor(waveLimit, rookies.length, DispatchConfig.rookieShare, requirementId, currentWaveNumber);
    const veteranQuota = waveLimit - rookieQuota;

    const selectedCandidates = [
      ...rookies.slice(0, rookieQuota),
      ...veterans.slice(0, veteranQuota),
    ].slice(0, waveLimit);

    if (selectedCandidates.length < waveLimit) {
      const remainingCandidates = eligibleCandidates
        .filter((c) => !selectedCandidates.some((s) => s.driverId === c.driverId))
        .sort((a, b) => b.compositeScore - a.compositeScore);
      selectedCandidates.push(...remainingCandidates.slice(0, waveLimit - selectedCandidates.length));
    }

    const selectedDriverIds = selectedCandidates.map((c) => c.driverId);
    const waveNumber = currentWaveNumber;

    const offerTtlMs = DispatchConfig.offerTtlMs;
    const expiresInSeconds = Math.round(offerTtlMs / 1000);
    const expiresAt = new Date(Date.now() + offerTtlMs);
    const dropLat = Number(requirement.dropLat || 0);
    const dropLng = Number(requirement.dropLng || 0);

    // Driver payout comes only from the booking's pricing snapshot. Bookings made before the
    // distance engine (no snapshot) are priced from the current database plan and verified road
    // distance; never from the vendor rate. If that is impossible, no offers go out.
    let driverOfferedRate = 0;
    const pricingSnapshot = (requirement as any).pricingSnapshot;
    if (pricingSnapshot && pricingSnapshot.driverPayoutPaise > 0) {
      driverOfferedRate = pricingSnapshot.driverPayoutPaise / 100;
    } else {
      try {
        const engine = this.distancePricing();
        if (!engine) throw new Error('pricing engine unavailable');
        const priced = await engine.driverPayoutForRoute(
          { latitude: pickupLat, longitude: pickupLng },
          { latitude: dropLat, longitude: dropLng },
          String(requirement.vehicleType || ''),
          requirement.reportingTime,
        );
        driverOfferedRate = priced.driverPayoutPaise / 100;
      } catch (err: any) {
        this.logger.error(
          `Requirement ${requirementId} has no pricing snapshot and could not be priced (${err?.message ?? err}); no offers sent.`,
        );
        await this.audit
          .log({
            action: 'DISPATCH_BLOCKED_NO_PRICE',
            entityType: 'REQUIREMENT',
            entityId: requirementId,
            metadata: { reason: String(err?.message ?? err) },
          })
          .catch(() => undefined);
        return noop(requirement.status as RequirementStatus);
      }
    }
    const h3PickupCell = this.locationsService.latLngToH3(pickupLat, pickupLng);

    // Compute real road driving distance and traffic ETA between pickup and dropoff
    const maps = this.googleMapsService ?? GoogleMapsService.sharedInstance();
    const tripRoute = await maps.computeRoadRoute(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropLat, longitude: dropLng },
    );
    const hasEscort = Boolean(
      pricingSnapshot?.hasEscort ||
      (requirement as any)?.zonalQuote?.hasEscort ||
      (typeof requirement.notes === 'string' && requirement.notes.includes('Security Escort: Required')),
    );

    const createdOffers = await Promise.all(
      selectedCandidates.map(async (candidate) => {
        const driverId = candidate.driverId;
        const offer = await this.db.offer.create({
          data: {
            requirementId,
            driverId,
            vehicleType: requirement.vehicleType,
            offeredRate: driverOfferedRate,
            status: OfferStatus.SENT,
            expiresAt,
            waveNumber,
            distanceKm: candidate.roadDistanceKm,
            etaMinutes: candidate.hasLocation ? candidate.etaMinutes : null,
          },
        });

        this.notifications.emitEvent(`driver:${driverId}`, 'OFFER_RECEIVED', {
          offerId: offer.id,
          id: offer.id,
          requirementId,
          vehicleType: requirement.vehicleType,
          offeredRate: driverOfferedRate,
          offeredEarnings: `₹${driverOfferedRate.toFixed(2)} Net Guaranteed`,
          h3PickupCell,
          pickupAddress: requirement.pickupAddress,
          dropAddress: requirement.dropAddress,
          pickupLocation: {
            latitude: pickupLat,
            longitude: pickupLng,
            address: requirement.pickupAddress,
          },
          dropLocation: {
            latitude: dropLat,
            longitude: dropLng,
            address: requirement.dropAddress,
          },
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          distanceKm: tripRoute.distanceKm,
          tripDistanceKm: tripRoute.distanceKm,
          tripEtaMinutes: tripRoute.durationMinutes,
          hasEscort,
          escortRequired: hasEscort,
          reportingTime: requirement.reportingTime
            ? new Date(requirement.reportingTime).toISOString()
            : new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          expiresInSeconds,
          pickupEtaMinutes: candidate.hasLocation ? candidate.etaMinutes : undefined,
          pickupDistanceKm: candidate.roadDistanceKm ?? undefined,
        });

        const targetUserId = candidate.driver?.userId || driverId;
        await this.notifications.sendPushToUser(targetUserId, {
          title: '🚖 New Trip Offer Available!',
          body: `Guaranteed net payout of ₹${driverOfferedRate.toFixed(2)} for ${requirement.vehicleType} pickup at ${requirement.pickupAddress} (${tripRoute.distanceKm} km). ${expiresInSeconds}s to accept!`,
          type: NotificationType.TRIP_OFFER,
          data: {
            offerId: offer.id,
            id: offer.id,
            requirementId,
            vehicleType: String(requirement.vehicleType),
            rate: String(driverOfferedRate),
            h3Cell: h3PickupCell,
            pickupAddress: requirement.pickupAddress,
            dropAddress: requirement.dropAddress,
            distanceKm: String(tripRoute.distanceKm),
            tripDistanceKm: String(tripRoute.distanceKm),
            tripEtaMinutes: String(tripRoute.durationMinutes),
            hasEscort: String(hasEscort),
            escortRequired: String(hasEscort),
            expiresAt: expiresAt.toISOString(),
            expiresInSeconds: String(expiresInSeconds),
            route: `/offers/${offer.id}`,
          },
          actionUrl: `/offers/${offer.id}`,
          saveInApp: true,
        });

        return offer;
      }),
    );

    const updatedStatus = requirement.assignedQuantity > 0
      ? RequirementStatus.PARTIALLY_FULFILLED
      : RequirementStatus.DISPATCHING;

    await this.db.requirement.update({
      where: { id: requirementId },
      data: { status: updatedStatus, dispatchWaves: waveNumber },
    });

    // Exact-time wave timeout (Redis sorted set, survives restarts, claimed once cluster-wide)
    await this.scheduler?.schedule(`wave:${requirementId}:${waveNumber}`, expiresAt.getTime() + WAVE_FIRE_GRACE_MS);

    this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_DISPATCHING', {
      requirementId,
      status: updatedStatus,
      offersDispatched: createdOffers.length,
      wave: waveNumber,
    });

    await this.audit.log({
      userId: requirement.vendor.userId,
      action: 'REQUIREMENT_DISPATCHED',
      entityType: 'REQUIREMENT',
      entityId: requirementId,
      metadata: {
        offersCount: createdOffers.length,
        driverIds: selectedDriverIds,
        status: updatedStatus,
        wave: waveNumber,
        liveEta: selectedCandidates.filter((c) => c.etaIsLive).length,
      },
    });

    this.logger.log(`Wave ${waveNumber}: created ${createdOffers.length} offers for requirement ${requirementId}`);

    return {
      requirementId,
      offersCreated: createdOffers.length,
      status: updatedStatus,
      driverIds: selectedDriverIds,
    };
  }

  /**
   * Composite score (max ~105): road-ETA proximity 35 + trust 35 + rating 20 + rookie/recovery 10 + idle 5.
   */
  private computeCompositeScore(
    c: {
      etaMinutes: number;
      etaIsLive?: boolean;
      etaExactMinutes?: number;
      roadDistanceKm?: number | null;
      trustScore: number;
      rating: number;
      isRookie: boolean;
      driver: { lastLocationAt: Date | null; updatedAt: Date };
    },
    nowMs: number,
  ): number {
    // Rank on the unrounded estimate: the displayed ETA is whole minutes with a 2-minute floor, which
    // gave every driver within ~1.5 km the same proximity score (a 0.7 km driver beat a 0.5 km one).
    const etaForScore =
      c.etaIsLive && c.etaExactMinutes !== undefined
        ? c.etaExactMinutes
        : !c.etaIsLive && c.roadDistanceKm !== null && c.roadDistanceKm !== undefined
          ? (c.roadDistanceKm / 25) * 60
          : c.etaMinutes;
    const proximityScore = Math.max(0, 35 * (1 - Math.min(30, etaForScore) / 30));
    const trustScorePart = 35 * (Math.min(100, Math.max(0, c.trustScore)) / 100);
    const ratingScorePart = 20 * Math.max(0, (c.rating - 3.0) / 2.0);
    const rookieBoost = c.isRookie ? 10.0 : c.trustScore < 75 ? DispatchConfig.lowTrustBoost : 0.0;
    const lastActive = c.driver.lastLocationAt
      ? new Date(c.driver.lastLocationAt).getTime()
      : c.driver.updatedAt
        ? new Date(c.driver.updatedAt).getTime()
        : nowMs;
    const idleMinutes = Math.max(0, (nowMs - lastActive) / 60000);
    const idleFairnessBoost = Math.min(5.0, idleMinutes / 10);
    return Number((proximityScore + trustScorePart + ratingScorePart + rookieBoost + idleFairnessBoost).toFixed(2));
  }

  private async markSupplyExhausted(
    requirement: { id: string; vendorId: string; assignedQuantity: number; quantity: number; status: string },
    remaining: number,
    reason: 'no_supply' | 'wave_limit',
  ): Promise<DispatchResult> {
    const message =
      reason === 'wave_limit'
        ? 'No driver accepted after several dispatch rounds. Tap retry to search again.'
        : 'No eligible drivers currently available in the area.';

    if (requirement.assignedQuantity === 0) {
      await this.db.requirement.update({
        where: { id: requirement.id },
        data: { status: RequirementStatus.NO_DRIVER_AVAILABLE },
      });
      this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_NO_DRIVERS', {
        requirementId: requirement.id,
        reason,
        message,
      });
      return {
        requirementId: requirement.id,
        offersCreated: 0,
        status: RequirementStatus.NO_DRIVER_AVAILABLE,
        driverIds: [],
      };
    }

    this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_PARTIAL_EXHAUSTION', {
      requirementId: requirement.id,
      assignedQuantity: requirement.assignedQuantity,
      totalQuantity: requirement.quantity,
      remainingQuantity: remaining,
      reason,
      message: `Supply currently exhausted for remaining ${remaining} vehicle(s). ${message}`,
    });
    return {
      requirementId: requirement.id,
      offersCreated: 0,
      status: requirement.status as RequirementStatus,
      driverIds: [],
    };
  }
}
