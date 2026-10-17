import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  OfferResponseDto,
  OfferQueryDto,
  OfferStatus,
  RequirementStatus,
  AssignmentStatus,
  TripStatus,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  NotificationType,
  validateOfferTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { ZonalPricingService } from '../pricing/zonal-pricing.service';
import { DriverBehaviorService } from '../dispatch/driver-behavior.service';
import { GoogleMapsService } from '../locations/google-maps.service';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly zonalPricing?: ZonalPricingService,
    @Optional() private readonly behavior?: DriverBehaviorService,
    @Optional() private readonly googleMapsService?: GoogleMapsService,
  ) {}

  /**
   * Delivery receipt: the driver app displayed this offer. Expiries of offers never shown to the
   * driver (push lost, app killed) are not held against their acceptance rate.
   */
  async markOfferSeen(offerId: string, driverUserId: string): Promise<{ seen: boolean }> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId }, select: { id: true } });
    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }
    const res = await this.db.offer.updateMany({
      where: { id: offerId, driverId: driver.id, seenAt: null },
      data: { seenAt: new Date() },
    });
    return { seen: res.count === 1 };
  }

  /**
   * Get offers sent to a driver with status filtering and countdown computation.
   * Drivers only see their own offers.
   * 
   * IMPORTANT: This is a pure read-only query endpoint. It does NOT create offers
   * as a side effect. Offer creation is handled exclusively by the DispatchService
   * when vendors post requirements.
   */
  async getOffersForDriver(driverUserId: string, query?: OfferQueryDto): Promise<OfferResponseDto[]> {
    try {
      let driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
      if (!driver) {
        const user = await this.db.user.findUnique({ where: { id: driverUserId } });
        if (user) {
          driver = await this.db.driver.create({
            data: {
              userId: driverUserId,
              fullName: user.fullName || 'Driver',
              phone: user.phone || '',
              verificationStatus: VerificationStatus.VERIFIED,
              availabilityStatus: DriverAvailability.AVAILABLE,
            },
          });
        } else {
          return [];
        }
      }

      // Default to only showing actionable SENT offers to prevent stale data
      const where: any = { driverId: driver.id };
      if (query?.status) {
        where.status = query.status;
      } else {
        where.status = OfferStatus.SENT;
      }

      // Also exclude expired offers even if status hasn't been updated yet
      if (!query?.status) {
        where.expiresAt = { gt: new Date() };
      }

      // Get driver's active trips to exclude offers for requirements already fulfilled by this driver
      const activeTrips = await this.db.trip.findMany({
        where: {
          driverId: driver.id,
          status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] },
        },
        select: { requirementId: true },
      });
      const fulfilledRequirementIds = new Set(activeTrips.map(t => t.requirementId));

      let offers = await this.db.offer.findMany({
        where,
        include: {
          requirement: {
            include: { vendor: true, zonalQuote: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter out offers for requirements this driver already has a trip for
      if (fulfilledRequirementIds.size > 0) {
        offers = offers.filter(o => !fulfilledRequirementIds.has(o.requirementId));
      }

      // Strict vehicle type filtering: A sedan driver only sees sedan offers
      if (driver.vehicleType) {
        const dType = driver.vehicleType.toString().toUpperCase();
        const dNorm = dType.includes('SEDAN') ? 'SEDAN' : dType.includes('SUV') ? 'SUV' : dType.includes('HATCH') ? 'HATCHBACK' : dType;
        offers = offers.filter((o) => {
          const reqType = (o.requirement?.vehicleType || o.vehicleType || '').toString().toUpperCase();
          if (!reqType) return true;
          const rNorm = reqType.includes('SEDAN') ? 'SEDAN' : reqType.includes('SUV') ? 'SUV' : reqType.includes('HATCH') ? 'HATCHBACK' : reqType;
          return dNorm === rNorm;
        });
      }

    // Listing live offers in the app counts as delivery (covers app versions without the receipt call)
    const unseenLive = offers.filter((o) => o.status === OfferStatus.SENT && !o.seenAt).map((o) => o.id);
    if (unseenLive.length > 0) {
      await this.db.offer.updateMany({
        where: { id: { in: unseenLive }, seenAt: null },
        data: { seenAt: new Date() },
      });
    }

    const now = Date.now();
    const maps = this.googleMapsService || new GoogleMapsService();
    return Promise.all(
      offers.map(async (o) => {
        const expiresAtMs = new Date(o.expiresAt).getTime();
        const expiresInSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
        const pLat = Number(o.requirement.pickupLat);
        const pLng = Number(o.requirement.pickupLng);
        const dLat = Number(o.requirement.dropLat);
        const dLng = Number(o.requirement.dropLng);
        const tripRoute = await maps.computeRoadRoute(
          { latitude: pLat, longitude: pLng },
          { latitude: dLat, longitude: dLng },
        );
        const hasEscort = Boolean(o.requirement.zonalQuote?.hasEscort);

        return {
          id: o.id,
          requirementId: o.requirementId,
          driverId: o.driverId,
          vehicleType: o.vehicleType as unknown as VehicleType,
          pickupLocation: {
            latitude: pLat,
            longitude: pLng,
            address: o.requirement.pickupAddress,
          },
          dropLocation: {
            latitude: dLat,
            longitude: dLng,
            address: o.requirement.dropAddress,
          },
          pickupLat: pLat,
          pickupLng: pLng,
          dropLat: dLat,
          dropLng: dLng,
          distanceKm: tripRoute.distanceKm,
          tripDistanceKm: tripRoute.distanceKm,
          tripEtaMinutes: tripRoute.durationMinutes,
          hasEscort,
          escortRequired: hasEscort,
          reportingTime: o.requirement.reportingTime.toISOString(),
          offeredRate: Number(o.offeredRate),
          status: o.status as OfferStatus,
          expiresAt: o.expiresAt.toISOString(),
          expiresInSeconds,
          vendorOrganizationName: o.requirement.vendor.organizationName,
          // Driver-filtered zonal context (hub, zone, earnings line items). Never includes vendor amounts.
          zonal: o.requirement.zonalQuote
            ? (this.zonalPricing?.quoteView(o.requirement.zonalQuote, 'DRIVER') as Record<string, unknown>)
            : undefined,
          createdAt: o.createdAt.toISOString(),
        };
      }),
    );
    } catch (_) {
      return [];
    }
  }

  /**
   * Accept an offer.
   * Enforces:
   * 1. Authorization: Only targeted driver can accept.
   * 2. State Machine: Legal transition SENT -> ACCEPTED.
   * 3. Expiration Check: Must not be expired.
   * 4. Atomic Concurrency Lock: Prevents oversubscription of requirement capacity.
   * 5. Creates Assignment & Trip with OTP.
   * 6. Locks driver status to BUSY.
   */
  async acceptOffer(offerId: string, driverUserId: string): Promise<OfferResponseDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId: driverUserId },
      include: { user: true },
    });
    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    const offer = await this.db.offer.findUnique({
      where: { id: offerId },
      include: { requirement: { include: { vendor: true } } },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.driverId !== driver.id) {
      throw new ForbiddenException('Not authorized to accept this offer');
    }

    // Validate state transition: only SENT -> ACCEPTED is legal
    validateOfferTransition(offer.status as OfferStatus, OfferStatus.ACCEPTED);

    // Validate expiry (the reaper owns the SENT -> EXPIRED transition and its accounting)
    const now = new Date();
    if (now > offer.expiresAt) {
      throw new ConflictException('This offer has expired');
    }

    // Atomic transaction for capacity allocation and assignment creation
    const txResult = await this.db.$transaction(async (tx) => {
      // Claim the offer first: loses cleanly to a concurrent expiry/decline/cancel
      const claimed = await tx.offer.updateMany({
        where: { id: offerId, status: OfferStatus.SENT, expiresAt: { gt: new Date() } },
        data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new ConflictException('This offer is no longer available');
      }

      // One active trip per driver. The UPDATE row-locks the driver, so a second simultaneous
      // accept by the same driver blocks here until the first commits; its trip count (a fresh
      // READ COMMITTED snapshot) then sees the first trip and is rejected.
      await tx.driver.update({
        where: { id: driver.id },
        data: { availabilityStatus: DriverAvailability.BUSY },
      });
      const activeTrips = await tx.trip.count({
        where: {
          driverId: driver.id,
          status: { in: [TripStatus.ASSIGNED, TripStatus.ARRIVED, TripStatus.IN_PROGRESS] },
        },
      });
      if (activeTrips > 0) {
        throw new ConflictException('You already have an active trip. Complete it before accepting another.');
      }

      // Atomic capacity reservation (row lock serializes concurrent accepts on this requirement)
      const capacityReserved = await tx.requirement.updateMany({
        where: {
          id: offer.requirementId,
          assignedQuantity: { lt: offer.requirement.quantity },
          status: { notIn: [RequirementStatus.CANCELLED, RequirementStatus.COMPLETED] },
        },
        data: {
          assignedQuantity: { increment: 1 },
        },
      });
      if (capacityReserved.count === 0) {
        throw new ConflictException('Requirement capacity is already fully fulfilled');
      }

      // Read back the authoritative post-increment state (never write a stale absolute count)
      const requirement = await tx.requirement.findUnique({ where: { id: offer.requirementId } });
      if (!requirement) {
        throw new NotFoundException('Requirement not found');
      }

      const updatedOffer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!updatedOffer) {
        throw new NotFoundException('Offer not found');
      }

      const newAssigned = requirement.assignedQuantity;
      const newStatus =
        newAssigned >= requirement.quantity
          ? RequirementStatus.FULFILLED
          : RequirementStatus.PARTIALLY_FULFILLED;

      await tx.requirement.update({
        where: { id: requirement.id },
        data: { status: newStatus },
      });

      // Create Assignment record
      const assignment = await tx.assignment.create({
        data: {
          requirementId: requirement.id,
          offerId: offer.id,
          driverId: driver.id,
          status: AssignmentStatus.CONFIRMED,
        },
      });

      // Generate cryptographically secure 4-digit start OTP (CSPRNG)
      const startOtp = crypto.randomInt(1000, 10000).toString();

      // Create Trip record
      const trip = await tx.trip.create({
        data: {
          requirementId: requirement.id,
          assignmentId: assignment.id,
          vendorId: requirement.vendorId,
          driverId: driver.id,
          vehicleType: requirement.vehicleType,
          pickupAddress: requirement.pickupAddress,
          dropAddress: requirement.dropAddress,
          reportingTime: requirement.reportingTime,
          status: TripStatus.ASSIGNED,
          otp: startOtp,
          driverRate: offer.offeredRate,
        },
      });

      return {
        updatedOffer,
        assignment,
        trip,
        newStatus,
        newAssigned,
        requirement,
      };
    }, { timeout: 30000, maxWait: 10000 });

    // Acceptance-rate window + trust reward (atomic counters, outside the booking transaction)
    await this.behavior?.recordOutcome({
      offerId,
      driverId: driver.id,
      outcome: 'ACCEPTED',
      distanceKm: offer.distanceKm,
      seenAt: offer.seenAt,
      requirement: txResult.requirement,
    });

    // Invalidate any other pending offers sent to this driver
    await this.db.offer.updateMany({
      where: {
        driverId: driver.id,
        status: OfferStatus.SENT,
        id: { not: offerId },
      },
      data: { status: OfferStatus.CANCELLED },
    });

    // If requirement capacity is now 100% fulfilled, expire all other pending wave offers for this requirement
    if (txResult.newStatus === RequirementStatus.FULFILLED) {
      const otherPendingOffers = (await this.db.offer.findMany({
        where: {
          requirementId: txResult.requirement.id,
          status: OfferStatus.SENT,
          id: { not: offerId },
        },
        select: { id: true, driverId: true },
      })) || [];

      if (otherPendingOffers.length > 0) {
        await this.db.offer.updateMany({
          where: {
            requirementId: txResult.requirement.id,
            status: OfferStatus.SENT,
            id: { not: offerId },
          },
          data: { status: OfferStatus.EXPIRED },
        });

        for (const po of otherPendingOffers) {
          this.notifications.emitEvent(`driver:${po.driverId}`, 'OFFER_EXPIRED', {
            offerId: po.id,
            requirementId: txResult.requirement.id,
            reason: 'Requirement fully fulfilled by other drivers',
          });
        }
      }
    }

    // Real-time events
    this.notifications.emitEvent(`vendor:${txResult.requirement.vendorId}`, 'REQUIREMENT_FULFILLMENT_UPDATED', {
      requirementId: txResult.requirement.id,
      assignedQuantity: txResult.newAssigned,
      totalQuantity: txResult.requirement.quantity,
      status: txResult.newStatus,
      driverName: driver.fullName,
      driverPhone: driver.phone,
      tripId: txResult.trip.id,
    });

    this.notifications.emitEvent(`driver:${driver.id}`, 'ASSIGNMENT_CONFIRMED', {
      assignmentId: txResult.assignment.id,
      tripId: txResult.trip.id,
      pickupAddress: txResult.requirement.pickupAddress,
      dropAddress: txResult.requirement.dropAddress,
      reportingTime: txResult.requirement.reportingTime.toISOString(),
      startOtp: txResult.trip.otp,
    });

    // FCM Push to Driver: Assignment Confirmed
    this.notifications.sendPushToUser(driverUserId, {
      title: '✅ Ride Assignment Confirmed!',
      body: `Task confirmed for pickup at ${txResult.requirement.pickupAddress}. Tap to view route and start trip.`,
      type: NotificationType.TRIP_ASSIGNED,
      data: {
        tripId: txResult.trip.id,
        assignmentId: txResult.assignment.id,
        requirementId: txResult.requirement.id,
        route: `/trips/${txResult.trip.id}`,
      },
      actionUrl: `/trips/${txResult.trip.id}`,
      saveInApp: true,
    }).catch((err) => this.logger.warn(`Driver push failed: ${err.message}`));

    // FCM Push to Vendor: Driver Assigned
    this.db.vendor.findUnique({
      where: { id: txResult.requirement.vendorId },
      select: { userId: true },
    }).then((vendorRecord) => {
      if (vendorRecord?.userId) {
        this.notifications.sendPushToUser(vendorRecord.userId, {
          title: '🚗 Driver Assigned!',
          body: `${driver.fullName} has accepted and is assigned to requirement #${txResult.requirement.id.substring(0, 8)}.`,
          type: NotificationType.TRIP_ASSIGNED,
          data: {
            tripId: txResult.trip.id,
            requirementId: txResult.requirement.id,
            route: `/requirements/${txResult.requirement.id}`,
          },
          actionUrl: `/requirements/${txResult.requirement.id}`,
          saveInApp: true,
        }).catch((err) => this.logger.warn(`Vendor push failed: ${err.message}`));
      }
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'OFFER_ACCEPTED',
      entityType: 'OFFER',
      entityId: offerId,
      metadata: {
        requirementId: txResult.requirement.id,
        assignmentId: txResult.assignment.id,
        tripId: txResult.trip.id,
      },
    });

    this.logger.log(
      `Offer ${offerId} accepted by driver ${driver.id}. Requirement ${txResult.requirement.id} status is now ${txResult.newStatus}`,
    );

    return {
      id: txResult.updatedOffer.id,
      requirementId: txResult.updatedOffer.requirementId,
      driverId: txResult.updatedOffer.driverId,
      vehicleType: txResult.updatedOffer.vehicleType as unknown as VehicleType,
      pickupLocation: {
        latitude: Number(offer.requirement.pickupLat),
        longitude: Number(offer.requirement.pickupLng),
        address: offer.requirement.pickupAddress,
      },
      dropLocation: {
        latitude: Number(offer.requirement.dropLat),
        longitude: Number(offer.requirement.dropLng),
        address: offer.requirement.dropAddress,
      },
      reportingTime: offer.requirement.reportingTime.toISOString(),
      offeredRate: Number(txResult.updatedOffer.offeredRate),
      status: OfferStatus.ACCEPTED,
      expiresAt: txResult.updatedOffer.expiresAt.toISOString(),
      createdAt: txResult.updatedOffer.createdAt.toISOString(),
    };
  }

  /**
   * Decline an offer.
   * Transitions SENT -> DECLINED.
   * Automatically triggers redispatch to fill the slot with another candidate.
   */
  async declineOffer(offerId: string, driverUserId: string, reason?: string): Promise<OfferResponseDto> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    const offer = await this.db.offer.findUnique({
      where: { id: offerId },
      include: { requirement: true },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.driverId !== driver.id) {
      throw new ForbiddenException('Not authorized to decline this offer');
    }

    // Validate state transition: only SENT -> DECLINED is legal
    validateOfferTransition(offer.status as OfferStatus, OfferStatus.DECLINED);

    if (new Date() > offer.expiresAt) {
      throw new ConflictException('This offer has expired');
    }

    // Conditional transition: loses cleanly to a concurrent expiry/accept/cancel (no double accounting)
    const transitioned = await this.db.offer.updateMany({
      where: { id: offerId, status: OfferStatus.SENT },
      data: {
        status: OfferStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
    if (transitioned.count === 0) {
      throw new ConflictException('This offer is no longer pending');
    }
    const updated = { ...offer, status: OfferStatus.DECLINED };

    // Behavioural feedback uses the dispatch-time distance stored on the offer, not live GPS
    await this.behavior?.recordOutcome({
      offerId,
      driverId: driver.id,
      outcome: 'DECLINED',
      distanceKm: offer.distanceKm,
      seenAt: offer.seenAt ?? new Date(),
      requirement: offer.requirement,
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'OFFER_DECLINED',
      entityType: 'OFFER',
      entityId: offerId,
      metadata: {
        requirementId: offer.requirementId,
        reason,
      },
    });

    // Replace the declined offer (dispatch keeps live offers within budget; wave timers untouched)
    this.dispatchService.dispatchRequirement(offer.requirementId).catch((err) => {
      this.logger.warn(`Redispatch after decline failed for requirement ${offer.requirementId}: ${err.message}`);
    });

    return {
      id: updated.id,
      requirementId: updated.requirementId,
      driverId: updated.driverId,
      vehicleType: updated.vehicleType as unknown as VehicleType,
      pickupLocation: {
        latitude: Number(offer.requirement.pickupLat),
        longitude: Number(offer.requirement.pickupLng),
        address: offer.requirement.pickupAddress,
      },
      dropLocation: {
        latitude: Number(offer.requirement.dropLat),
        longitude: Number(offer.requirement.dropLng),
        address: offer.requirement.dropAddress,
      },
      reportingTime: offer.requirement.reportingTime.toISOString(),
      offeredRate: Number(updated.offeredRate),
      status: OfferStatus.DECLINED,
      expiresAt: updated.expiresAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
