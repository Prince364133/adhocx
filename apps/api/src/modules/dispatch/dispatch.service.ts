import { Injectable, Logger, NotFoundException, Optional, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  RequirementStatus,
  OfferStatus,
  TripStatus,
  UserStatus,
  VehicleType,
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
import { ZonalPricingService } from '../pricing/zonal-pricing.service';

export interface DispatchResult {
  requirementId: string;
  offersCreated: number;
  status: RequirementStatus;
  driverIds: string[];
}

/** Grace after expiresAt before the wave job fires, so an accept at T-0.1s commits first. */
const WAVE_FIRE_GRACE_MS = 250;
/** ETA assumed for drivers with no GPS fix: dispatchable, but last on proximity. */
const UNKNOWN_LOCATION_ETA_MINUTES = 60;

const normalizeVehicle = (v?: string | null): string => {
  if (!v) return '';
  const s = v.toString().toUpperCase();
  if (s.includes('SEDAN')) return 'SEDAN';
  if (s.includes('SUV') || s.includes('7 SEATER') || s.includes('6 SEATER')) return 'SUV';
  if (s.includes('HATCH') || s.includes('MINI') || s.includes('COMPACT')) return 'HATCHBACK';
  return s;
};

/** Road-factor estimate used for Phase A ranking and whenever live routing is unavailable. */
const estimateRoad = (aerialKm: number) => {
  const roadDistanceKm = Number((aerialKm * 1.25).toFixed(2));
  return { roadDistanceKm, etaMinutes: Math.max(2, Math.round((roadDistanceKm / 25) * 60)) };
};

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
    @Optional() private readonly zonalPricing?: ZonalPricingService,
  ) {}

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

  /** Routes due scheduler jobs. Members: `wave:<reqId>:<wave>` or `redispatch:<reqId>`. */
  async handleScheduledJob(member: string): Promise<void> {
    const [kind, requirementId] = member.split(':');
    if (!requirementId) return;
    if (kind === 'wave') {
      await this.reapExpiredOffersAndRedispatch(requirementId);
    } else if (kind === 'redispatch') {
      await this.dispatchRequirement(requirementId);
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
        zonalQuote: true,
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

    // Guard: Bidding requirements are fulfilled via driver bids, not direct dispatch
    if (requirement.fulfillmentMode === 'BIDDING') {
      this.logger.log(`Requirement ${requirementId} is in BIDDING mode, skipping direct dispatch`);
      return noop(requirement.status as RequirementStatus);
    }

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
    const wavesSoFar = isRetry ? 0 : requirement.dispatchWaves;
    if (wavesSoFar >= DispatchConfig.maxWaves) {
      if (liveOffers > 0) return noop(requirement.status as RequirementStatus);
      return this.markSupplyExhausted(requirement, remaining, 'wave_limit');
    }

    // Uber-grade Sequential Dispatch:
    // For single-vehicle requests, dispatch strictly 1-by-1 (offerBudget = 1) to prevent race conditions.
    // For multi-vehicle requirements (e.g. 5 cabs for corporate shift), dispatch up to 'remaining'.
    const targetLiveOffers = requirement.quantity === 1 ? 1 : remaining;
    const offerBudget = Math.max(0, targetLiveOffers - liveOffers);
    if (offerBudget <= 0) {
      this.logger.debug(`Requirement ${requirementId} already has ${liveOffers} live offers; no new wave needed`);
      return noop(requirement.status as RequirementStatus);
    }

    const pickupLat = Number(requirement.pickupLat);
    const pickupLng = Number(requirement.pickupLng);

    // Concentric Progressive H3 Wave Expansion:
    // Wave 1: k=1 (~1.2 km radius)
    // Wave 2: k=2 (~2.4 km radius)
    // Wave 3: k=3 (~4.5 km radius)
    // Wave 4: k=4 (~7.5 km radius)
    // Wave 5+: k=5 (~12 km radius)
    const currentWaveNumber = wavesSoFar + 1;
    const kRing = Math.min(5, Math.max(1, currentWaveNumber));

    const nearbyCandidates = await this.locationsService.findNearbyDriversByH3(
      pickupLat,
      pickupLng,
      kRing,
      requirement.vehicleType as unknown as VehicleType,
    );

    // If supply in the current H3 disk is thin, expand gradually within a realistic urban boundary (max 15 km)
    if (nearbyCandidates.length === 0) {
      const maxSearchRadiusKm = Math.min(15, 3 + currentWaveNumber * 2.5);
      const radialCandidates = await this.locationsService.findNearbyDrivers(
        pickupLat,
        pickupLng,
        maxSearchRadiusKm,
        requirement.vehicleType as unknown as VehicleType,
      );
      const existingIds = new Set(nearbyCandidates.map((c) => c.driverId));
      for (const rc of radialCandidates) {
        if (!existingIds.has(rc.driverId)) {
          nearbyCandidates.push(rc);
          existingIds.add(rc.driverId);
        }
      }
    }

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

    let candidateIds = nearbyCandidates
      .filter((c) => !alreadyOfferedDriverIds.has(c.driverId))
      .map((c) => c.driverId);

    // Fallback: no spatial supply found -> any available active driver with the matching vehicle
    if (candidateIds.length === 0) {
      const activeDrivers = await this.db.driver.findMany({
        where: {
          user: { status: UserStatus.ACTIVE },
          availabilityStatus: DriverAvailability.AVAILABLE,
          id: { notIn: Array.from(alreadyOfferedDriverIds) },
          ...(requirement.vehicleType
            ? {
                OR: [
                  { vehicleType: requirement.vehicleType },
                  { vehicles: { some: { vehicleType: requirement.vehicleType } } },
                ],
              }
            : {}),
        },
        select: { id: true },
        take: 10,
      });
      candidateIds = activeDrivers.map((d) => d.id);
    }

    const candidateDrivers = await this.db.driver.findMany({
      where: { id: { in: candidateIds } },
      include: {
        user: true,
        vehicles: true,
        trips: {
          where: {
            status: {
              in: [TripStatus.ASSIGNED, TripStatus.ARRIVED, TripStatus.IN_PROGRESS],
            },
          },
        },
      },
    });

    interface ScoredCandidate {
      driverId: string;
      driver: (typeof candidateDrivers)[0];
      hasLocation: boolean;
      driverLat: number;
      driverLng: number;
      distanceKm: number | null;
      roadDistanceKm: number | null;
      etaMinutes: number;
      etaIsLive: boolean;
      trustScore: number;
      rating: number;
      compositeScore: number;
      isRookie: boolean;
    }

    const reqNorm = normalizeVehicle(requirement.vehicleType);
    const eligibleCandidates: ScoredCandidate[] = [];

    for (const driver of candidateDrivers) {
      if (driver.user?.status !== UserStatus.ACTIVE) continue;
      if (driver.verificationStatus && driver.verificationStatus !== VerificationStatus.VERIFIED) continue;
      if (driver.availabilityStatus !== DriverAvailability.AVAILABLE) continue;

      // Anti-cherry-picking cooldown (expires on its own; no job needed)
      if (driver.cooldownUntil && new Date(driver.cooldownUntil).getTime() > nowMs) {
        this.logger.debug(`Driver ${driver.id} in cooldown until ${driver.cooldownUntil.toISOString()}. Skipping.`);
        continue;
      }

      // Strict vehicle capability check (e.g. never a sedan for an SUV request)
      const dNorm = normalizeVehicle(driver.vehicleType || driver.vehicleModel || 'SEDAN');
      const matchesVehicle =
        !reqNorm ||
        dNorm === reqNorm ||
        driver.vehicles.some((v) => normalizeVehicle(v.vehicleType) === reqNorm);
      if (!matchesVehicle) continue;

      // No conflicting active trips
      if (driver.trips && driver.trips.length > 0) continue;

      // Stale GPS: a driver that has pinged before but not in 30 minutes is not trustworthy supply
      const lastPing = driver.lastLocationAt ? new Date(driver.lastLocationAt).getTime() : 0;
      if (lastPing > 0 && nowMs - lastPing > 30 * 60 * 1000) {
        this.logger.debug(`Driver ${driver.id} location is stale (>30m). Skipping.`);
        continue;
      }

      const hasLocation = driver.currentLat !== null && driver.currentLng !== null;
      const driverLat = Number(driver.currentLat ?? pickupLat);
      const driverLng = Number(driver.currentLng ?? pickupLng);
      let distanceKm: number | null = null;
      let roadDistanceKm: number | null = null;
      let etaMinutes = UNKNOWN_LOCATION_ETA_MINUTES;
      if (hasLocation) {
        distanceKm = Math.sqrt(
          Math.pow((driverLat - pickupLat) * 111, 2) +
          Math.pow((driverLng - pickupLng) * 111 * Math.cos(pickupLat * (Math.PI / 180)), 2),
        );
        const est = estimateRoad(distanceKm);
        roadDistanceKm = est.roadDistanceKm;
        etaMinutes = est.etaMinutes;
      }

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
      eligibleCandidates.push(candidate);
    }

    if (eligibleCandidates.length === 0) {
      this.logger.warn(`No eligible drivers found for requirement ${requirementId}`);
      if (liveOffers > 0) {
        // Offers are still counting down; their wave job will cascade again when they lapse.
        return noop(requirement.status as RequirementStatus);
      }
      return this.markSupplyExhausted(requirement, remaining, 'no_supply');
    }

    const waveLimit = Math.min(eligibleCandidates.length, offerBudget);

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
            c.roadDistanceKm = eta.distanceKm;
            c.etaIsLive = eta.isRealRoad;
            c.compositeScore = this.computeCompositeScore(c, nowMs);
          });
        } catch (err: any) {
          this.logger.warn(`Road ETA re-rank skipped for ${requirementId}: ${err.message}`);
        }
      }
    }

    // Separate rookies and veterans, sort both by compositeScore descending
    const rookies = eligibleCandidates.filter((c) => c.isRookie).sort((a, b) => b.compositeScore - a.compositeScore);
    const veterans = eligibleCandidates.filter((c) => !c.isRookie).sort((a, b) => b.compositeScore - a.compositeScore);

    // Reserve ~15% exploration slots for rookie / recovering drivers
    const rookieQuota = Math.min(rookies.length, Math.max(rookies.length > 0 ? 1 : 0, Math.floor(waveLimit * 0.15)));
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
    const waveNumber = wavesSoFar + 1;

    const offerTtlMs = DispatchConfig.offerTtlMs;
    const expiresInSeconds = Math.round(offerTtlMs / 1000);
    const expiresAt = new Date(Date.now() + offerTtlMs);
    const dropLat = Number(requirement.dropLat || 0);
    const dropLng = Number(requirement.dropLng || 0);

    let driverOfferedRate = 0;
    if (requirement.zonalQuote && requirement.zonalQuote.driverFarePaise > 0) {
      driverOfferedRate = requirement.zonalQuote.driverFarePaise / 100;
    } else {
      // Look up authoritative driver rate card so vendor pricing is strictly protected
      const vType = requirement.vehicleType || 'SEDAN';
      if (this.zonalPricing && pickupLat && dropLat) {
        try {
          const calculatedQuote = (this.zonalPricing as any).calculateQuote?.({
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
            pickupAddress: requirement.pickupAddress,
            dropAddress: requirement.dropAddress,
            vehicleType: vType as any,
          });
          if (calculatedQuote && calculatedQuote.driverFarePaise > 0) {
            driverOfferedRate = calculatedQuote.driverFarePaise / 100;
          }
        } catch (_) {}
      }
      if (driverOfferedRate <= 0) {
        // Enforce 15% platform margin ceiling; drivers must NEVER see 100% vendor price
        const vendorRate = Number(requirement.ratePerVehicle ?? 0);
        driverOfferedRate = Math.round(vendorRate * 0.85);
      }
    }
    const h3PickupCell = this.locationsService.latLngToH3(pickupLat, pickupLng);

    // Compute real road driving distance and traffic ETA between pickup and dropoff
    const maps = this.googleMapsService || new GoogleMapsService();
    const tripRoute = await maps.computeRoadRoute(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropLat, longitude: dropLng },
    );
    const hasEscort = Boolean(requirement.zonalQuote?.hasEscort);

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
          isZonalQuote: Boolean(requirement.zonalQuote),
          zoneId: requirement.zonalQuote?.zoneId,
          hubId: requirement.zonalQuote?.hubId,
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
          title: requirement.zonalQuote
            ? (hasEscort ? '🚖 Corporate Fleet Offer (Escort Required)!' : '🚖 Corporate Fleet Offer (Net Guaranteed)!')
            : '🚖 New Trip Offer Available!',
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
    c: { etaMinutes: number; trustScore: number; rating: number; isRookie: boolean; driver: { lastLocationAt: Date | null; updatedAt: Date } },
    nowMs: number,
  ): number {
    const proximityScore = Math.max(0, 35 * (1 - Math.min(30, c.etaMinutes) / 30));
    const trustScorePart = 35 * (Math.min(100, Math.max(0, c.trustScore)) / 100);
    const ratingScorePart = 20 * Math.max(0, (c.rating - 3.0) / 2.0);
    const rookieBoost = c.isRookie ? 10.0 : c.trustScore < 75 ? 5.0 : 0.0;
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
