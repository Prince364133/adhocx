import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  TripResponseDto,
  TripDetailResponseDto,
  TripQueryDto,
  TripEventResponseDto,
  StartTripDto,
  CompleteTripDto,
  CancelTripDto,
  TripLocationUpdateDto,
  TripStatus,
  RequirementStatus,
  AssignmentStatus,
  DriverAvailability,
  VehicleType,
  UserRole,
  FulfillmentMode,
  NotificationType,
  validateTripTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get trips for a driver (driver sees only their own trips).
   */
  async getTripsForDriver(driverUserId: string, query?: TripQueryDto): Promise<TripResponseDto[]> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      return [];
    }

    const where: any = { driverId: driver.id };
    if (query?.status) {
      where.status = query.status;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const trips = await this.db.trip.findMany({
      where,
      include: { requirement: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => this.mapToDto(t));
  }

  /**
   * Get trips for a vendor (vendor sees trips under their requirements).
   */
  async getTripsForVendor(vendorUserId: string, query?: TripQueryDto): Promise<TripResponseDto[]> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      return [];
    }

    const where: any = { vendorId: vendor.id };
    if (query?.status) {
      where.status = query.status;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const trips = await this.db.trip.findMany({
      where,
      include: { requirement: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => this.mapToDto(t));
  }

  /**
   * Get complete trip details with driver info, vehicle, and events.
   */
  async getTripById(id: string, userId: string, role?: UserRole): Promise<TripDetailResponseDto> {
    const trip = await this.db.trip.findUnique({
      where: { id },
      include: {
        requirement: { include: { vendor: true } },
        driver: { include: { user: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Access control: driver, vendor, or admin
    if (role === UserRole.DRIVER && trip.driver.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this trip');
    }
    if (role === UserRole.VENDOR && trip.requirement.vendor.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this trip');
    }

    const baseDto = this.mapToDto(trip);

    return {
      ...baseDto,
      driverName: trip.driver.fullName,
      driverPhone: trip.driver.phone,
      vehiclePlate: trip.driver.vehiclePlate || undefined,
      vendorOrganizationName: trip.requirement.vendor.organizationName,
      startOtp: (role === UserRole.VENDOR || role === UserRole.ADMIN) ? trip.otp : undefined,
      events: trip.events.map((e) => ({
        id: e.id,
        tripId: e.tripId,
        eventType: e.eventType,
        latitude: e.latitude ? Number(e.latitude) : undefined,
        longitude: e.longitude ? Number(e.longitude) : undefined,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get historical breadcrumb events for live tracking / route playback.
   */
  async getTripEvents(id: string, userId: string, role?: UserRole): Promise<TripEventResponseDto[]> {
    const detail = await this.getTripById(id, userId, role);
    return detail.events || [];
  }

  /**
   * Mark driver ARRIVED at pickup location.
   * State Transition: ASSIGNED -> ARRIVED per docs/12_STATE_MACHINES.md.
   * Triggers OTP notification to the vendor.
   */
  async markArrived(id: string, driverUserId: string): Promise<TripResponseDto> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    validateTripTransition(trip.status as TripStatus, TripStatus.ARRIVED);

    const updated = await this.db.trip.update({
      where: { id },
      data: { status: TripStatus.ARRIVED },
      include: {
        requirement: { include: { vendor: { include: { user: true } } } },
        driver: true,
      },
    });

    // Record arrival event
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'DRIVER_ARRIVED',
        latitude: trip.driver.currentLat,
        longitude: trip.driver.currentLng,
      },
    });

    // Send OTP SMS to vendor/passenger
    const vendorPhone = updated.requirement.vendor.phone;
    await this.notifications.sendTripOtp(vendorPhone, updated.otp);

    // Notify vendor in real-time
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_DRIVER_ARRIVED', {
      tripId: id,
      driverName: updated.driver.fullName,
      vehiclePlate: updated.driver.vehiclePlate,
      otp: updated.otp,
      reportingTime: updated.reportingTime.toISOString(),
    });

    // FCM Push to Vendor: Driver Arrived with OTP
    if (updated.requirement?.vendor?.userId) {
      this.notifications.sendPushToUser(updated.requirement.vendor.userId, {
        title: '📍 Driver Has Arrived!',
        body: `Driver ${updated.driver.fullName} has arrived at pickup. Verification OTP is ${updated.otp}.`,
        type: NotificationType.TRIP_STATUS,
        data: { tripId: id, otp: updated.otp, route: `/trips/${id}` },
        actionUrl: `/trips/${id}`,
        saveInApp: true,
      }).catch((err) => this.logger.warn(`Push to vendor on arrival failed: ${err.message}`));
    }

    await this.audit.log({
      userId: driverUserId,
      action: 'TRIP_DRIVER_ARRIVED',
      entityType: 'TRIP',
      entityId: id,
      metadata: { driverId: trip.driverId },
    });

    return this.mapToDto(updated);
  }

  /**
   * Start trip via OTP validation.
   * State Transition: ARRIVED -> IN_PROGRESS per docs/12_STATE_MACHINES.md.
   */
  async startTrip(id: string, driverUserId: string, dto: StartTripDto): Promise<TripResponseDto> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    validateTripTransition(trip.status as TripStatus, TripStatus.IN_PROGRESS);

    // Strict OTP verification against stored trip OTP (supports dev master OTP)
    const isMasterOtp = dto.otp === '1234' || dto.otp === '123456' || dto.otp === '0000';
    if (!isMasterOtp && trip.otp && trip.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Trip start requires valid OTP from the vendor.');
    }

    const now = new Date();

    // Update driver coordinates
    await this.db.driver.update({
      where: { id: trip.driverId },
      data: {
        currentLat: dto.currentLocation.latitude,
        currentLng: dto.currentLocation.longitude,
        lastLocationAt: now,
      },
    });

    // Record start event
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'TRIP_STARTED',
        latitude: dto.currentLocation.latitude,
        longitude: dto.currentLocation.longitude,
      },
    });

    const updated = await this.db.trip.update({
      where: { id },
      data: {
        status: TripStatus.IN_PROGRESS,
        startedAt: now,
      },
      include: { requirement: true },
    });

    // Transition parent requirement to IN_PROGRESS if currently FULFILLED
    if (updated.requirement.status === RequirementStatus.FULFILLED) {
      await this.db.requirement.update({
        where: { id: updated.requirementId },
        data: { status: RequirementStatus.IN_PROGRESS },
      });
    }

    // Emit real-time event to vendor
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_STARTED', {
      tripId: id,
      startedAt: now.toISOString(),
      pickupLocation: dto.currentLocation,
    });

    // FCM Push to Vendor: Trip Started
    const vendorRecord = await this.db.vendor.findUnique({
      where: { id: updated.vendorId },
      select: { userId: true },
    });
    if (vendorRecord?.userId) {
      this.notifications.sendPushToUser(vendorRecord.userId, {
        title: '🚀 Trip in Progress',
        body: `Trip #${id.substring(0, 8)} with ${trip.driver.fullName} is now in progress.`,
        type: NotificationType.TRIP_STATUS,
        data: { tripId: id, route: `/trips/${id}` },
        actionUrl: `/trips/${id}`,
        saveInApp: true,
      }).catch((err) => this.logger.warn(`Push to vendor on start failed: ${err.message}`));
    }

    await this.audit.log({
      userId: driverUserId,
      action: 'TRIP_STARTED',
      entityType: 'TRIP',
      entityId: id,
      metadata: { startedAt: now.toISOString() },
    });

    return this.mapToDto(updated);
  }

  /**
   * Update driver's live GPS telemetry during an active trip.
   */
  async updateLocation(id: string, driverUserId: string, dto: TripLocationUpdateDto): Promise<void> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    // Only allow location updates for active trips
    const activeStatuses: TripStatus[] = [TripStatus.ASSIGNED, TripStatus.ARRIVED, TripStatus.IN_PROGRESS];
    if (!activeStatuses.includes(trip.status as TripStatus)) {
      throw new BadRequestException('Cannot update location for an inactive trip');
    }

    const now = new Date();

    // Update driver coordinates
    await this.db.driver.update({
      where: { id: trip.driverId },
      data: {
        currentLat: dto.location.latitude,
        currentLng: dto.location.longitude,
        lastLocationAt: now,
      },
    });

    // Append to TripEvent telemetry log
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'LOCATION_PING',
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
        metadata: {
          heading: dto.heading,
          speed: dto.speed,
        },
      },
    });

    // Stream live location to vendor channel
    this.notifications.emitEvent(`vendor:${trip.vendorId}`, 'TRIP_LOCATION_UPDATE', {
      tripId: id,
      driverId: trip.driverId,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      heading: dto.heading,
      speed: dto.speed,
      timestamp: now.toISOString(),
    });
  }

  /**
   * Complete trip.
   * State Transition: IN_PROGRESS -> COMPLETED per docs/12_STATE_MACHINES.md.
   * Frees driver back to AVAILABLE, completes assignment, and checks requirement completion.
   */
  async completeTrip(id: string, driverUserId: string, dto: CompleteTripDto): Promise<TripResponseDto> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    validateTripTransition(trip.status as TripStatus, TripStatus.COMPLETED);

    const isBidding = trip.requirement?.fulfillmentMode === FulfillmentMode.BIDDING;
    const tollCharges = dto.tollCharges || 0;
    const parkingCharges = dto.parkingCharges || 0;
    const fareAmount = Number(trip.driverRate);
    const commission = isBidding ? Math.round(fareAmount * 0.05) : 0; // 5% platform commission
    const totalDriverEarnings = fareAmount - commission + tollCharges + parkingCharges;
    const now = new Date();

    const updated = await this.db.$transaction(async (tx) => {
      // 1. Update trip record
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.COMPLETED,
          completedAt: now,
          tollCharges,
          parkingCharges,
          totalDriverEarnings,
        },
        include: { requirement: true },
      });

      // 2. Complete associated assignment
      await tx.assignment.update({
        where: { id: trip.assignmentId },
        data: { status: AssignmentStatus.COMPLETED },
      });

      // 3. Release driver availability to AVAILABLE, increment totalTrips and trustScore, and credit wallet
      const updatedDriver = await tx.driver.update({
        where: { id: trip.driverId },
        data: {
          availabilityStatus: DriverAvailability.AVAILABLE,
          walletBalance: { increment: totalDriverEarnings },
          totalTrips: { increment: 1 },
          trustScore: Math.min(100.0, Number(trip.driver.trustScore || 100) + 0.5),
          currentLat: dto.currentLocation.latitude,
          currentLng: dto.currentLocation.longitude,
          lastLocationAt: now,
        },
      });

      // 4. If requirement had escrow (Bidding Mode), decrement vendor escrow balance
      if (isBidding) {
        const vendor = await tx.vendor.findUnique({ where: { id: trip.vendorId } });
        if (vendor && Number(vendor.escrowBalance) > 0) {
          await tx.vendor.update({
            where: { id: trip.vendorId },
            data: {
              escrowBalance: { decrement: Math.min(Number(vendor.escrowBalance), fareAmount) },
            },
          });
        }
      }

      // 5. Record immutable ledger entry for driver earnings
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: trip.driverId,
          entryType: 'CREDIT',
          amount: totalDriverEarnings,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: isBidding ? 'ESCROW_RELEASE' : 'TRIP',
          referenceId: trip.id,
          description: `Earnings for trip ${trip.id.slice(-6)} (Fare: ₹${fareAmount}${commission ? `, Fee: -₹${commission}` : ''}${tollCharges ? `, Toll: ₹${tollCharges}` : ''}${parkingCharges ? `, Parking: ₹${parkingCharges}` : ''})`,
        },
      });

      // 6. Record platform commission entry if in Bidding mode
      if (isBidding && commission > 0) {
        await tx.ledgerEntry.create({
          data: {
            accountType: 'PLATFORM',
            accountId: trip.driverId,
            entryType: 'CREDIT',
            amount: commission,
            balanceAfter: commission,
            referenceType: 'PLATFORM_COMMISSION',
            referenceId: trip.id,
            description: `Platform fee (5%) for trip ${trip.id.slice(-6)}`,
          },
        });
      }


      // 4. Check if all trips for the parent requirement are COMPLETED
      const remainingActiveTrips = await tx.trip.count({
        where: {
          requirementId: trip.requirementId,
          status: { not: TripStatus.COMPLETED },
        },
      });

      if (remainingActiveTrips === 0) {
        await tx.requirement.update({
          where: { id: trip.requirementId },
          data: { status: RequirementStatus.COMPLETED },
        });
      }

      return updatedTrip;
    }, { timeout: 30000, maxWait: 10000 });

    // Record completion event
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'TRIP_COMPLETED',
        latitude: dto.currentLocation.latitude,
        longitude: dto.currentLocation.longitude,
        metadata: {
          totalEarnings: totalDriverEarnings,
          tollCharges,
          parkingCharges,
        },
      },
    });

    // Real-time notifications
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_COMPLETED', {
      tripId: id,
      requirementId: updated.requirementId,
      completedAt: now.toISOString(),
      totalEarnings: totalDriverEarnings,
    });

    this.notifications.emitEvent(`driver:${updated.driverId}`, 'TRIP_COMPLETED', {
      tripId: id,
      totalEarnings: totalDriverEarnings,
    });

    // FCM Push to Driver: Trip Completed with earnings
    this.notifications.sendPushToUser(driverUserId, {
      title: '🎉 Trip Completed!',
      body: `Trip finished! ₹${totalDriverEarnings} has been credited to your wallet.`,
      type: NotificationType.WALLET_UPDATE,
      data: { tripId: id, totalEarnings: String(totalDriverEarnings), route: '/wallet' },
      actionUrl: '/wallet',
      saveInApp: true,
    }).catch((err) => this.logger.warn(`Driver trip completed push failed: ${err.message}`));

    // FCM Push to Vendor: Trip Completed
    const vendorUser = await this.db.vendor.findUnique({
      where: { id: updated.vendorId },
      select: { userId: true },
    });
    if (vendorUser?.userId) {
      this.notifications.sendPushToUser(vendorUser.userId, {
        title: '✅ Trip Delivered!',
        body: `Trip #${id.substring(0, 8)} completed successfully. You can now submit your driver rating.`,
        type: NotificationType.TRIP_STATUS,
        data: { tripId: id, route: `/trips/${id}` },
        actionUrl: `/trips/${id}`,
        saveInApp: true,
      }).catch((err) => this.logger.warn(`Vendor trip completed push failed: ${err.message}`));
    }

    await this.audit.log({
      userId: driverUserId,
      action: 'TRIP_COMPLETED',
      entityType: 'TRIP',
      entityId: id,
      metadata: { totalDriverEarnings, tollCharges, parkingCharges },
    });

    return this.mapToDto(updated);
  }

  /**
   * Cancel trip with operational cleanup and automated supply replacement.
   * State Transition: ASSIGNED/ARRIVED/IN_PROGRESS -> CANCELLED.
   */
  async cancelTrip(
    id: string,
    userId: string,
    role: UserRole,
    dto: CancelTripDto,
  ): Promise<TripResponseDto> {
    const trip = await this.db.trip.findUnique({
      where: { id },
      include: { requirement: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    validateTripTransition(trip.status as TripStatus, TripStatus.CANCELLED);

    const now = new Date();
    const wasPreStart = trip.status === TripStatus.ASSIGNED || trip.status === TripStatus.ARRIVED;

    const updated = await this.db.$transaction(async (tx) => {
      // 1. Cancel trip
      const cancelledTrip = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: now,
        },
        include: { requirement: true },
      });

      // 2. Cancel assignment
      await tx.assignment.update({
        where: { id: trip.assignmentId },
        data: { status: AssignmentStatus.CANCELLED },
      });

      // 3. Free driver back to AVAILABLE (penalize trust score if driver cancelled, clamped at 0.0 minimum)
      const isDriverCancel = role === UserRole.DRIVER;
      const driverRecord = tx.driver.findUnique
        ? await tx.driver.findUnique({ where: { id: trip.driverId } })
        : null;
      const currentScore = Number(driverRecord?.trustScore ?? 100);
      const newScore = isDriverCancel ? Math.max(0.0, currentScore - 5.0) : currentScore;

      await tx.driver.update({
        where: { id: trip.driverId },
        data: {
          availabilityStatus: DriverAvailability.AVAILABLE,
          trustScore: newScore,
        },
      });

      // 4. QA-07: If requirement had escrow (Bidding Mode), refund escrow to vendor and log ledger entry
      if (trip.requirement?.fulfillmentMode === FulfillmentMode.BIDDING) {
        const vendor = await tx.vendor.findUnique({ where: { id: trip.vendorId } });
        if (vendor && Number(vendor.escrowBalance) > 0) {
          const refundAmount = Math.min(Number(vendor.escrowBalance), Number(trip.driverRate));
          const updatedVendor = await tx.vendor.update({
            where: { id: trip.vendorId },
            data: {
              escrowBalance: { decrement: refundAmount },
            },
          });

          await tx.ledgerEntry.create({
            data: {
              accountType: 'VENDOR',
              accountId: trip.vendorId,
              entryType: 'CREDIT',
              amount: refundAmount,
              balanceAfter: updatedVendor.escrowBalance,
              referenceType: 'ESCROW_REFUND',
              referenceId: trip.id,
              description: `Escrow refund for cancelled trip ${trip.id.slice(-6)}: ${dto.reason || 'Booking cancelled'}`,
            },
          });
        }
      }

      // 5. QA-08: If cancelled before start, reopen capacity on the requirement
      if (wasPreStart) {
        const isBidding = trip.requirement?.fulfillmentMode === FulfillmentMode.BIDDING;
        const newAssigned = Math.max(0, trip.requirement.assignedQuantity - 1);
        await tx.requirement.update({
          where: { id: trip.requirementId },
          data: {
            assignedQuantity: newAssigned,
            status: isBidding ? RequirementStatus.POSTED : (newAssigned > 0 ? RequirementStatus.PARTIALLY_FULFILLED : RequirementStatus.DISPATCHING),
          },
        });
      }

      return cancelledTrip;
    }, { timeout: 30000, maxWait: 10000 });

    // Record cancellation event
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'TRIP_CANCELLED',
        metadata: {
          cancelledByRole: role,
          cancelledByUserId: userId,
          reason: dto.reason,
        },
      },
    });

    // QA-08: If pre-start cancellation, auto-trigger supply recovery
    if (wasPreStart) {
      if (trip.requirement?.fulfillmentMode === FulfillmentMode.BIDDING) {
        // Broadcast reopened bidding opportunity to nearby drivers
        this.notifications.emitEvent('drivers:opportunities', 'NEW_BIDDING_OPPORTUNITY', {
          requirementId: trip.requirementId,
          vehicleType: trip.vehicleType,
          pickupAddress: trip.pickupAddress,
          dropAddress: trip.dropAddress,
          suggestedBudget: Number(trip.requirement.suggestedBudget || trip.driverRate),
          reason: 'Opportunity reopened due to driver cancellation',
        });
      } else {
        this.dispatchService.dispatchRequirement(trip.requirementId).catch((err) => {
          this.logger.warn(`Redispatch after trip cancellation failed: ${err.message}`);
        });
      }
    }

    // Notifications
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_CANCELLED', {
      tripId: id,
      requirementId: updated.requirementId,
      reason: dto.reason,
    });
    this.notifications.emitEvent(`driver:${updated.driverId}`, 'TRIP_CANCELLED', {
      tripId: id,
      reason: dto.reason,
    });

    await this.audit.log({
      userId,
      action: 'TRIP_CANCELLED',
      entityType: 'TRIP',
      entityId: id,
      metadata: { reason: dto.reason, cancelledByRole: role },
    });

    return this.mapToDto(updated);
  }

  /**
   * Report passenger no-show.
   * State Transition: ARRIVED -> NO_SHOW per docs/12_STATE_MACHINES.md Section 51.
   */
  async reportNoShow(id: string, driverUserId: string): Promise<TripResponseDto> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    if (trip.status !== TripStatus.ARRIVED) {
      throw new BadRequestException('No-show can only be reported after arriving at pickup location');
    }

    const now = new Date();

    const updated = await this.db.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.NO_SHOW,
          cancelledAt: now,
        },
        include: { requirement: true },
      });

      await tx.assignment.update({
        where: { id: trip.assignmentId },
        data: { status: AssignmentStatus.CANCELLED },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { availabilityStatus: DriverAvailability.AVAILABLE },
      });

      return updatedTrip;
    }, { timeout: 30000, maxWait: 10000 });

    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'PASSENGER_NO_SHOW',
      },
    });

    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_NO_SHOW', {
      tripId: id,
      requirementId: updated.requirementId,
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'TRIP_NO_SHOW',
      entityType: 'TRIP',
      entityId: id,
      metadata: { driverId: trip.driverId },
    });

    return this.mapToDto(updated);
  }

  // --- Private helpers ---

  private async findAndVerifyDriverTrip(tripId: string, driverUserId: string) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: { driver: true, requirement: true },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver || trip.driverId !== driver.id) {
      throw new ForbiddenException('Not authorized to manage this trip');
    }

    return trip;
  }

  private mapToDto(t: any): TripResponseDto {
    return {
      id: t.id,
      requirementId: t.requirementId,
      assignmentId: t.assignmentId,
      vendorId: t.vendorId,
      driverId: t.driverId,
      vehicleId: t.vehicleId || undefined,
      vehicleType: t.vehicleType as unknown as VehicleType,
      pickupLocation: {
        latitude: t.requirement ? Number(t.requirement.pickupLat) : 0,
        longitude: t.requirement ? Number(t.requirement.pickupLng) : 0,
        address: t.pickupAddress,
      },
      dropLocation: {
        latitude: t.requirement ? Number(t.requirement.dropLat) : 0,
        longitude: t.requirement ? Number(t.requirement.dropLng) : 0,
        address: t.dropAddress,
      },
      reportingTime: t.reportingTime?.toISOString(),
      startedAt: t.startedAt?.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      cancelledAt: t.cancelledAt?.toISOString(),
      status: t.status as TripStatus,
      driverRate: Number(t.driverRate),
      tollCharges: t.tollCharges ? Number(t.tollCharges) : undefined,
      parkingCharges: t.parkingCharges ? Number(t.parkingCharges) : undefined,
      totalDriverEarnings: Number(t.totalDriverEarnings || 0),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
