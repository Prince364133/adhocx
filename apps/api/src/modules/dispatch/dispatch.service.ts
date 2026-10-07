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

export interface DispatchResult {
  requirementId: string;
  offersCreated: number;
  status: RequirementStatus;
  driverIds: string[];
}

@Injectable()
export class DispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchService.name);
  private reaperInterval?: NodeJS.Timeout;

  constructor(
    protected readonly db: DatabaseService,
    private readonly locationsService: LocationsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  onModuleInit() {
    // Background automatic wave reaper for timed-out offers (every 10s)
    this.reaperInterval = setInterval(() => {
      this.reapExpiredOffersAndRedispatch().catch((err) => {
        this.logger.warn(`Wave reaper tick notice: ${err.message}`);
      });
    }, 10000);
    this.reaperInterval.unref(); // Prevents hanging process or test teardown
  }

  onModuleDestroy() {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
    }
  }

  /**
   * Automatically reaps timed-out dispatch offers and cascades to Wave 2 for unfulfilled requirements.
   * Multi-instance safe via distributed locking.
   */
  async reapExpiredOffersAndRedispatch(): Promise<{ expiredCount: number; requirementsRedispatched: string[] }> {
    if (this.redis) {
      const lockAcquired = await this.redis.acquireLock('wave_reaper', 12);
      if (!lockAcquired) {
        return { expiredCount: 0, requirementsRedispatched: [] };
      }
    }

    try {
      const now = new Date();
      const expiredOffers = await this.db.offer.findMany({
        where: {
          status: OfferStatus.SENT,
          expiresAt: { lt: now },
        },
        include: { requirement: true },
      });

      if (expiredOffers.length === 0) {
        return { expiredCount: 0, requirementsRedispatched: [] };
      }

      this.logger.log(`Reaping ${expiredOffers.length} expired dispatch offers`);

      // 1. Mark expired in database
      await this.db.offer.updateMany({
        where: { id: { in: expiredOffers.map((o) => o.id) } },
        data: { status: OfferStatus.EXPIRED },
      });

      // 2. Notify drivers via SSE
      for (const offer of expiredOffers) {
        this.notifications.emitEvent(`driver:${offer.driverId}`, 'OFFER_EXPIRED', {
          offerId: offer.id,
          requirementId: offer.requirementId,
          reason: 'Offer timed out',
        });
      }

      // 3. Trigger next wave dispatch for unfulfilled requirements
      const requirementIds = Array.from(new Set(expiredOffers.map((o) => o.requirementId)));
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
            this.logger.log(`Cascading wave dispatch for unfulfilled requirement ${reqId}`);
            await this.dispatchRequirement(reqId);
            redispatchedReqIds.push(reqId);
          }
        } catch (err: any) {
          this.logger.warn(`Failed cascading wave for requirement ${reqId}: ${err.message}`);
        }
      }

      return {
        expiredCount: expiredOffers.length,
        requirementsRedispatched: redispatchedReqIds,
      };
    } finally {
      if (this.redis) {
        await this.redis.releaseLock('wave_reaper');
      }
    }
  }

  /**
   * Dispatch available drivers for a requirement following docs/11_DISPATCH_ENGINE.md.
   */
  async dispatchRequirement(requirementId: string, isRetry: boolean = false): Promise<DispatchResult> {
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

    // Guard: Bidding requirements are fulfilled via driver bids, not direct dispatch
    if ((requirement as any).fulfillmentMode === 'BIDDING') {
      this.logger.log(`Requirement ${requirementId} is in BIDDING mode, skipping direct dispatch`);
      return {
        requirementId,
        offersCreated: 0,
        status: requirement.status as RequirementStatus,
        driverIds: [],
      };
    }

    // Guard: Can only dispatch if not already completed/cancelled
    if (
      requirement.status === RequirementStatus.COMPLETED ||
      requirement.status === RequirementStatus.CANCELLED
    ) {
      this.logger.warn(`Requirement ${requirementId} is ${requirement.status}, skipping dispatch`);
      return {
        requirementId,
        offersCreated: 0,
        status: requirement.status as RequirementStatus,
        driverIds: [],
      };
    }

    const remaining = requirement.quantity - requirement.assignedQuantity;
    if (remaining <= 0) {
      this.logger.log(`Requirement ${requirementId} is already fully fulfilled`);
      await this.db.requirement.update({
        where: { id: requirementId },
        data: { status: RequirementStatus.FULFILLED },
      });
      return {
        requirementId,
        offersCreated: 0,
        status: RequirementStatus.FULFILLED,
        driverIds: [],
      };
    }

    const pickupLat = Number(requirement.pickupLat);
    const pickupLng = Number(requirement.pickupLng);

    // Search nearby drivers using Uber H3 Hexagonal Disk (k=2 rings, ~3-4 km)
    // with progressive expansion to full 100km radius if more supply is needed
    let nearbyCandidates = await this.locationsService.findNearbyDriversByH3(
      pickupLat,
      pickupLng,
      2, // k=2 rings (19 hexagons)
      requirement.vehicleType as unknown as VehicleType,
    );

    if (nearbyCandidates.length < 3) {
      const radialCandidates = await this.locationsService.findNearbyDrivers(
        pickupLat,
        pickupLng,
        100,
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

    // Collect already offered driver IDs
    // During normal automated progressive waves, exclude SENT, ACCEPTED, DECLINED, EXPIRED to avoid duplicates.
    // On retry waves (isRetry === true or previous status was NO_DRIVER_AVAILABLE), allow re-approaching EXPIRED/DECLINED drivers,
    // only excluding drivers currently holding active SENT or ACCEPTED offers.
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

    // Fallback: If no candidate drivers with matching radius found, grab available active drivers matching vehicle
    if (candidateIds.length === 0) {
      const activeDrivers = await this.db.driver.findMany({
        where: {
          user: { status: UserStatus.ACTIVE },
          availabilityStatus: DriverAvailability.AVAILABLE,
          id: { notIn: Array.from(alreadyOfferedDriverIds) },
          ...(requirement.vehicleType
            ? {
                OR: [
                  { vehicleType: requirement.vehicleType as any },
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

    // Batch fetch candidate drivers with active trips
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

    // Filter candidates with comprehensive eligibility checks and compute composite scores
    interface ScoredCandidate {
      driverId: string;
      driver: (typeof candidateDrivers)[0];
      distanceKm: number;
      trustScore: number;
      rating: number;
      compositeScore: number;
      isRookie: boolean;
    }

    const eligibleCandidates: ScoredCandidate[] = [];

    for (const driver of candidateDrivers) {
      // 1. Account status active
      if (driver.user?.status !== UserStatus.ACTIVE) continue;

      // 2. Driver verification check
      if (driver.verificationStatus && driver.verificationStatus !== VerificationStatus.VERIFIED) continue;

      // 3. Driver availability status check
      if (driver.availabilityStatus !== DriverAvailability.AVAILABLE) continue;

      // 4. Strict vehicle capability check (reject incompatible vehicles, e.g. bike for sedan)
      const driverVehicles = (driver as any).vehicles || [];
      const matchesVehicle =
        !requirement.vehicleType ||
        driver.vehicleType === requirement.vehicleType ||
        driverVehicles.some((v: any) => v.vehicleType === requirement.vehicleType || v.type === requirement.vehicleType);
      if (!matchesVehicle) {
        continue;
      }

      // 5. No conflicting active trips
      if (driver.trips && driver.trips.length > 0) continue;

      const driverLat = Number(driver.currentLat ?? pickupLat);
      const driverLng = Number(driver.currentLng ?? pickupLng);
      const distanceKm = Math.sqrt(
        Math.pow((driverLat - pickupLat) * 111, 2) +
        Math.pow((driverLng - pickupLng) * 111 * Math.cos(pickupLat * (Math.PI / 180)), 2),
      );

      const rawTrust = Number(driver.trustScore ?? 94.0);
      const avgRating = Number(driver.averageRating ?? 4.85);
      const totalTrips = driver.totalTrips || 0;
      const isRookie = totalTrips < 25;

      // Multi-factor Scoring: Proximity (35 pts) + Trust (35 pts) + Rating (20 pts) + Rookie (10 pts) + Idle Fairness (5 pts)
      const proximityScore = Math.max(0, 35 * (1 - distanceKm / 100));
      const trustScorePart = 35 * (Math.min(100, Math.max(0, rawTrust)) / 100);
      const ratingScorePart = 20 * Math.max(0, (avgRating - 3.0) / 2.0);
      const rookieBoost = isRookie ? 10.0 : rawTrust < 75 ? 5.0 : 0.0;

      // Earning fairness & idle time weighting (up to 5 pts for drivers waiting online)
      const lastActiveTime = driver.lastLocationAt
        ? new Date(driver.lastLocationAt).getTime()
        : driver.updatedAt
          ? new Date(driver.updatedAt).getTime()
          : Date.now();
      const idleMinutes = Math.max(0, (Date.now() - lastActiveTime) / (60 * 1000));
      const idleFairnessBoost = Math.min(5.0, Number((idleMinutes / 10).toFixed(2)));

      const compositeScore = Number(
        (proximityScore + trustScorePart + ratingScorePart + rookieBoost + idleFairnessBoost).toFixed(2),
      );

      eligibleCandidates.push({
        driverId: driver.id,
        driver,
        distanceKm,
        trustScore: rawTrust,
        rating: avgRating,
        compositeScore,
        isRookie,
      });
    }

    if (eligibleCandidates.length === 0) {
      this.logger.warn(`No eligible drivers found for requirement ${requirementId}`);

      // If requirement has 0 assignments and no drivers found
      if (requirement.assignedQuantity === 0) {
        await this.db.requirement.update({
          where: { id: requirementId },
          data: { status: RequirementStatus.NO_DRIVER_AVAILABLE },
        });

        this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_NO_DRIVERS', {
          requirementId,
          message: 'No eligible drivers currently available in the area.',
        });
      } else {
        // Requirement is partially fulfilled (e.g. 3 of 5 filled), but no more drivers available for remaining slots
        this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_PARTIAL_EXHAUSTION', {
          requirementId,
          assignedQuantity: requirement.assignedQuantity,
          totalQuantity: requirement.quantity,
          remainingQuantity: remaining,
          message: `Supply currently exhausted for remaining ${remaining} vehicle(s). System will keep monitoring for newly available drivers.`,
        });
      }

      return {
        requirementId,
        offersCreated: 0,
        status: requirement.assignedQuantity > 0
          ? (requirement.status as RequirementStatus)
          : RequirementStatus.NO_DRIVER_AVAILABLE,
        driverIds: [],
      };
    }

    // Controlled wave oversubscription: up to remaining * 2 candidates
    const waveLimit = Math.max(remaining, Math.min(eligibleCandidates.length, remaining * 2));

    // Separate rookies and veterans, sort both by compositeScore descending
    const rookies = eligibleCandidates.filter((c) => c.isRookie).sort((a, b) => b.compositeScore - a.compositeScore);
    const veterans = eligibleCandidates.filter((c) => !c.isRookie).sort((a, b) => b.compositeScore - a.compositeScore);

    // Reserve 15% exploration slots for rookie / recovering drivers
    const rookieQuota = Math.min(rookies.length, Math.max(rookies.length > 0 ? 1 : 0, Math.floor(waveLimit * 0.15)));
    const veteranQuota = waveLimit - rookieQuota;

    const selectedCandidates = [
      ...rookies.slice(0, rookieQuota),
      ...veterans.slice(0, veteranQuota),
    ];

    // If quotas didn't fill waveLimit, backfill from remaining
    if (selectedCandidates.length < waveLimit) {
      const remainingCandidates = eligibleCandidates
        .filter((c) => !selectedCandidates.some((s) => s.driverId === c.driverId))
        .sort((a, b) => b.compositeScore - a.compositeScore);
      selectedCandidates.push(...remainingCandidates.slice(0, waveLimit - selectedCandidates.length));
    }

    const selectedDriverIds = selectedCandidates.map((c) => c.driverId);

    // 30-second offer countdown window
    const expiresAt = new Date(Date.now() + 30 * 1000);
    const driverOfferedRate = requirement.zonalQuote
      ? requirement.zonalQuote.driverFarePaise / 100
      : Number(requirement.ratePerVehicle ?? 0);

    const createdOffers = await Promise.all(
      selectedDriverIds.map(async (driverId) => {
        const offer = await this.db.offer.create({
          data: {
            requirementId,
            driverId,
            vehicleType: requirement.vehicleType,
            offeredRate: driverOfferedRate,
            status: OfferStatus.SENT,
            expiresAt,
          },
        });

        // Emit real-time offer event to driver channel
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
          h3PickupCell: this.locationsService.latLngToH3(pickupLat, pickupLng),
          pickupAddress: requirement.pickupAddress,
          dropAddress: requirement.dropAddress,
          reportingTime: requirement.reportingTime.toISOString(),
          expiresAt: expiresAt.toISOString(),
          expiresInSeconds: 30,
        });

        // Send rich FCM push notification to driver device & in-app feed
        const candidate = selectedCandidates.find((c) => c.driverId === driverId);
        const targetUserId = candidate?.driver?.userId || driverId;

        await this.notifications.sendPushToUser(targetUserId, {
          title: requirement.zonalQuote ? '🚖 Corporate Fleet Offer (Net Guaranteed)!' : '🚖 New Trip Offer Available!',
          body: `Guaranteed net payout of ₹${driverOfferedRate.toFixed(2)} for ${requirement.vehicleType} pickup at ${requirement.pickupAddress}. 30s to accept!`,
          type: NotificationType.TRIP_OFFER,
          data: {
            offerId: offer.id,
            id: offer.id,
            requirementId,
            vehicleType: String(requirement.vehicleType),
            rate: String(driverOfferedRate),
            h3Cell: this.locationsService.latLngToH3(pickupLat, pickupLng),
            pickupAddress: requirement.pickupAddress,
            dropAddress: requirement.dropAddress,
            expiresAt: expiresAt.toISOString(),
            expiresInSeconds: '30',
            route: `/offers/${offer.id}`,
          },
          actionUrl: `/offers/${offer.id}`,
          saveInApp: true,
        });

        return offer;
      }),
    );

    // Update requirement status to DISPATCHING
    const updatedStatus = requirement.assignedQuantity > 0
      ? RequirementStatus.PARTIALLY_FULFILLED
      : RequirementStatus.DISPATCHING;

    await this.db.requirement.update({
      where: { id: requirementId },
      data: { status: updatedStatus },
    });

    // Notify vendor
    this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'REQUIREMENT_DISPATCHING', {
      requirementId,
      status: updatedStatus,
      offersDispatched: createdOffers.length,
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
      },
    });

    this.logger.log(`Created ${createdOffers.length} offers for requirement ${requirementId}`);
    return {
      requirementId,
      offersCreated: createdOffers.length,
      status: updatedStatus,
      driverIds: selectedDriverIds,
    };
  }
}
