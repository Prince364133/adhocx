import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  RequirementStatus,
  OfferStatus,
  TripStatus,
  UserStatus,
  VerificationStatus,
  DriverAvailability,
  VehicleType,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { LocationsService } from '../locations/locations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

export interface DispatchResult {
  requirementId: string;
  offersCreated: number;
  status: RequirementStatus;
  driverIds: string[];
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    protected readonly db: DatabaseService,
    private readonly locationsService: LocationsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Dispatch available drivers for a requirement following docs/11_DISPATCH_ENGINE.md.
   */
  async dispatchRequirement(requirementId: string): Promise<DispatchResult> {
    this.logger.log(`Dispatch initiated for requirement ${requirementId}`);

    const requirement = await this.db.requirement.findUnique({
      where: { id: requirementId },
      include: {
        vendor: true,
        offers: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
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

    // Progressive radius search tiers per docs/11_DISPATCH_ENGINE.md Section 14
    const radiusTiers = [15, 35, 60];
    let nearbyCandidates: { driverId: string; distanceKm: number }[] = [];

    for (const radiusKm of radiusTiers) {
      nearbyCandidates = await this.locationsService.findNearbyDrivers(
        pickupLat,
        pickupLng,
        radiusKm,
        requirement.vehicleType as unknown as VehicleType,
      );
      if (nearbyCandidates.length >= remaining) {
        break;
      }
    }

    // Collect already offered driver IDs for this requirement to prevent duplicates
    const alreadyOfferedDriverIds = new Set(
      requirement.offers
        .filter((o) => o.status === OfferStatus.SENT || o.status === OfferStatus.ACCEPTED)
        .map((o) => o.driverId),
    );

    // Filter candidates with comprehensive eligibility checks per Section 7 & 8
    const eligibleDriverIds: string[] = [];

    for (const candidate of nearbyCandidates) {
      if (alreadyOfferedDriverIds.has(candidate.driverId)) {
        continue;
      }

      const driver = await this.db.driver.findUnique({
        where: { id: candidate.driverId },
        include: {
          user: true,
          trips: {
            where: {
              status: {
                in: [TripStatus.ASSIGNED, TripStatus.ARRIVED, TripStatus.IN_PROGRESS],
              },
            },
          },
        },
      });

      if (!driver) continue;

      // 1. Account status active
      if (driver.user.status !== UserStatus.ACTIVE) continue;

      // 2. Driver verified
      if (driver.verificationStatus !== VerificationStatus.VERIFIED) continue;

      // 3. Driver available
      if (driver.availabilityStatus !== DriverAvailability.AVAILABLE) continue;

      // 4. No conflicting active trips
      if (driver.trips.length > 0) continue;

      eligibleDriverIds.push(candidate.driverId);
    }

    if (eligibleDriverIds.length === 0) {
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
    const waveLimit = Math.max(remaining, Math.min(eligibleDriverIds.length, remaining * 2));
    const selectedDriverIds = eligibleDriverIds.slice(0, waveLimit);

    // 60-second offer countdown window
    const expiresAt = new Date(Date.now() + 60 * 1000);

    const createdOffers = await Promise.all(
      selectedDriverIds.map(async (driverId) => {
        const offer = await this.db.offer.create({
          data: {
            requirementId,
            driverId,
            vehicleType: requirement.vehicleType,
            offeredRate: requirement.ratePerVehicle,
            status: OfferStatus.SENT,
            expiresAt,
          },
        });

        // Emit real-time offer event to driver channel
        this.notifications.emitEvent(`driver:${driverId}`, 'OFFER_RECEIVED', {
          offerId: offer.id,
          requirementId,
          vehicleType: requirement.vehicleType,
          offeredRate: Number(requirement.ratePerVehicle),
          pickupAddress: requirement.pickupAddress,
          dropAddress: requirement.dropAddress,
          reportingTime: requirement.reportingTime.toISOString(),
          expiresAt: expiresAt.toISOString(),
          expiresInSeconds: 60,
        });

        // Send push notification
        await this.notifications.sendPush(
          driverId,
          'New Trip Offer',
          `Offer of ₹${requirement.ratePerVehicle} for ${requirement.vehicleType} pickup at ${requirement.pickupAddress}`,
          { offerId: offer.id, requirementId },
        );

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
