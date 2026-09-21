import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
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
  FulfillmentMode,
  NotificationType,
  validateOfferTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get offers sent to a driver with status filtering and countdown computation.
   * Drivers only see their own offers.
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
              fullName: user.fullName || 'Driver Partner',
              phone: user.phone || '',
              verificationStatus: VerificationStatus.VERIFIED,
              availabilityStatus: DriverAvailability.AVAILABLE,
            },
          });
        } else {
          return [];
        }
      }

      const where: any = { driverId: driver.id };
      if (query?.status) {
        where.status = query.status;
      }

      let offers = await this.db.offer.findMany({
        where,
        include: {
          requirement: {
            include: { vendor: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // If online driver has no pending offers, check for active dispatching requirements
      if (offers.length === 0 && driver.availabilityStatus === DriverAvailability.AVAILABLE) {
        const activeRequirements = await this.db.requirement.findMany({
          where: {
            fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
            status: { in: [RequirementStatus.POSTED, RequirementStatus.DISPATCHING, RequirementStatus.PARTIALLY_FULFILLED] },
          },
          include: { vendor: true, offers: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const req of activeRequirements) {
          const remaining = req.quantity - req.assignedQuantity;
          if (remaining > 0) {
            const hasExisting = req.offers.some(o => o.driverId === driver!.id);
            if (!hasExisting) {
              const expiresAt = new Date(Date.now() + 60 * 1000);
              const newOffer = await this.db.offer.create({
                data: {
                  requirementId: req.id,
                  driverId: driver.id,
                  vehicleType: req.vehicleType,
                  offeredRate: req.ratePerVehicle ?? 0,
                  status: OfferStatus.SENT,
                  expiresAt,
                },
                include: {
                  requirement: {
                    include: { vendor: true },
                  },
                },
              });
              offers.push(newOffer);
            }
          }
        }
      }

    const now = Date.now();
    return offers.map((o) => {
      const expiresAtMs = new Date(o.expiresAt).getTime();
      const expiresInSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

      return {
        id: o.id,
        requirementId: o.requirementId,
        driverId: o.driverId,
        vehicleType: o.vehicleType as unknown as VehicleType,
        pickupLocation: {
          latitude: Number(o.requirement.pickupLat),
          longitude: Number(o.requirement.pickupLng),
          address: o.requirement.pickupAddress,
        },
        dropLocation: {
          latitude: Number(o.requirement.dropLat),
          longitude: Number(o.requirement.dropLng),
          address: o.requirement.dropAddress,
        },
        reportingTime: o.requirement.reportingTime.toISOString(),
        offeredRate: Number(o.offeredRate),
        status: o.status as OfferStatus,
        expiresAt: o.expiresAt.toISOString(),
        expiresInSeconds,
        vendorOrganizationName: o.requirement.vendor.organizationName,
        createdAt: o.createdAt.toISOString(),
      };
    });
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

    // Validate expiry
    const now = new Date();
    if (now > offer.expiresAt) {
      await this.db.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.EXPIRED },
      });
      throw new ConflictException('This offer has expired');
    }

    // Atomic transaction for capacity allocation and assignment creation
    const txResult = await this.db.$transaction(async (tx) => {
      // Re-read requirement inside transaction
      const requirement = await tx.requirement.findUnique({
        where: { id: offer.requirementId },
      });

      if (!requirement) {
        throw new NotFoundException('Requirement not found');
      }

      const remaining = requirement.quantity - requirement.assignedQuantity;
      if (remaining <= 0) {
        await tx.offer.update({
          where: { id: offerId },
          data: { status: OfferStatus.EXPIRED },
        });
        throw new ConflictException('Requirement capacity is already fully fulfilled');
      }

      // Atomic capacity reservation: prevents race conditions during concurrent acceptance
      if (tx.requirement.updateMany) {
        const capacityReserved = await tx.requirement.updateMany({
          where: {
            id: requirement.id,
            assignedQuantity: { lt: requirement.quantity },
          },
          data: {
            assignedQuantity: { increment: 1 },
          },
        });

        if (capacityReserved.count === 0) {
          await tx.offer.update({
            where: { id: offerId },
            data: { status: OfferStatus.EXPIRED },
          });
          throw new ConflictException('Requirement capacity is already fully fulfilled');
        }
      }

      // Mark offer ACCEPTED
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      // Increment requirement capacity
      const newAssigned = requirement.assignedQuantity + 1;
      const newStatus =
        newAssigned >= requirement.quantity
          ? RequirementStatus.FULFILLED
          : RequirementStatus.PARTIALLY_FULFILLED;

      await tx.requirement.update({
        where: { id: requirement.id },
        data: {
          assignedQuantity: newAssigned,
          status: newStatus,
        },
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

      // Generate 4-digit start OTP
      const startOtp = Math.floor(1000 + Math.random() * 9000).toString();

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

      // Lock driver availability to BUSY
      await tx.driver.update({
        where: { id: driver.id },
        data: { availabilityStatus: DriverAvailability.BUSY },
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
            reason: 'Requirement fully fulfilled by other partners',
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

    const updated = await this.db.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.DECLINED,
        respondedAt: new Date(),
      },
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

    // Re-trigger dispatch wave to find another driver for remaining slot
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
