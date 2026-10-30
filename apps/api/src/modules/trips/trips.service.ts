import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
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
import { LocationsService } from '../locations/locations.service';
import { findPendingReviewTrip } from '../reviews/pending-review';
import { DispatchConfig } from '../dispatch/dispatch.config';
import { sanitizeRealName } from '../../common';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly locations?: LocationsService,
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
      include: {
        requirement: {
          include: {
            vendor: {
              include: { user: true },
            },
          },
        },
        vendor: {
          include: { user: true },
        },
        driver: { include: { user: true } },
      },
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
      include: {
        requirement: {
          include: {
            vendor: {
              include: { user: true },
            },
          },
        },
        vendor: {
          include: { user: true },
        },
        driver: { include: { user: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => this.mapToDto(t));
  }

  /**
   * Check if current user has any completed trip with a pending review.
   * Enables the mandatory review gatekeeper across mobile and web clients.
   */
  async getPendingReview(userId: string): Promise<{ pending: boolean; pendingCount: number; trip: any | null }> {
    if (!DispatchConfig.reviewGateEnabled) {
      return { pending: false, pendingCount: 0, trip: null };
    }
    const vendor = await this.db.vendor.findUnique({ where: { userId } });
    if (!vendor) {
      return { pending: false, pendingCount: 0, trip: null };
    }

    const { trip: pendingTrip, count } = await findPendingReviewTrip(this.db, vendor.id, userId);

    if (!pendingTrip) {
      return { pending: false, pendingCount: 0, trip: null };
    }

    return {
      pending: true,
      pendingCount: count,
      trip: {
        id: pendingTrip.id,
        status: pendingTrip.status,
        driverId: pendingTrip.driverId,
        driverName: pendingTrip.driver?.user?.fullName || pendingTrip.driver?.fullName || 'Driver',
        vehiclePlate: pendingTrip.driver?.vehiclePlate || undefined,
        vehicleType: pendingTrip.vehicleType,
        pickupAddress: pendingTrip.pickupAddress,
        dropAddress: pendingTrip.dropAddress,
        completedAt: pendingTrip.completedAt?.toISOString(),
      },
    };
  }

  /**
   * Get complete trip details with driver info, vehicle, and events.
   */
  async getTripById(id: string, userId: string, role?: UserRole): Promise<TripDetailResponseDto> {
    const trip = await this.db.trip.findUnique({
      where: { id },
      include: {
        requirement: { include: { vendor: { include: { user: true } } } },
        vendor: { include: { user: true } },
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

    const driverFullName =
      sanitizeRealName(trip.driver?.fullName) ||
      sanitizeRealName(trip.driver?.user?.fullName) ||
      'Driver';
    const driverPhoneNumber = trip.driver?.phone || trip.driver?.user?.phone || undefined;
    const vehiclePlateNumber = trip.driver?.vehiclePlate || undefined;
    const vehicleModelName = trip.driver?.vehicleModel || trip.vehicleType || undefined;

    const vendorRecord = trip.requirement?.vendor || (trip as any).vendor;
    const vendorFullName =
      sanitizeRealName(vendorRecord?.user?.fullName) ||
      sanitizeRealName(vendorRecord?.fullName) ||
      sanitizeRealName(vendorRecord?.organizationName) ||
      'Customer';
    const vendorPhoneNumber = vendorRecord?.phone || vendorRecord?.user?.phone || undefined;
    const vendorOrgName = sanitizeRealName(vendorRecord?.organizationName) || undefined;

    return {
      ...baseDto,
      driverName: driverFullName,
      driverPhone: driverPhoneNumber,
      vehiclePlate: vehiclePlateNumber,
      vehicleModel: vehicleModelName,
      vendorOrganizationName: vendorOrgName,
      vendorName: vendorFullName,
      vendorPhone: vendorPhoneNumber,
      requesterName: vendorFullName,
      vendor: {
        id: trip.vendorId,
        organizationName: vendorOrgName,
        fullName: vendorFullName,
        phone: vendorPhoneNumber,
      },
      startOtp: (role === UserRole.VENDOR || role === UserRole.ADMIN) ? trip.otp : undefined,
      driver: {
        id: trip.driver?.id,
        fullName: driverFullName,
        phone: driverPhoneNumber,
        vehiclePlate: vehiclePlateNumber,
        vehicleModel: vehicleModelName,
        vehicleType: trip.driver?.vehicleType || trip.vehicleType,
        rating: trip.driver?.averageRating ?? 5.0,
        trustScore: trip.driver?.trustScore ?? 100.0,
        user: {
          fullName: driverFullName,
          phone: driverPhoneNumber,
        },
      },
      ...(trip.requirement
        ? {
            requirement: {
              id: trip.requirement.id,
              vehicleType: trip.requirement.vehicleType,
              pickupAddress: trip.requirement.pickupAddress,
              dropAddress: trip.requirement.dropAddress,
              reportingTime: trip.requirement.reportingTime?.toISOString(),
              distanceKm: (trip.requirement as any)?.distanceKm ? Number((trip.requirement as any).distanceKm) : undefined,
              durationMinutes: (trip.requirement as any)?.durationMinutes ? Number((trip.requirement as any).durationMinutes) : undefined,
              pickupLat: trip.requirement.pickupLat ? Number(trip.requirement.pickupLat) : undefined,
              pickupLng: trip.requirement.pickupLng ? Number(trip.requirement.pickupLng) : undefined,
              dropLat: trip.requirement.dropLat ? Number(trip.requirement.dropLat) : undefined,
              dropLng: trip.requirement.dropLng ? Number(trip.requirement.dropLng) : undefined,
              // Strictly protect vendor pricing from drivers:
              ratePerVehicle: Number(baseDto.driverRate || baseDto.driverEarnings),
              budgetPerVehicle: Number(baseDto.driverRate || baseDto.driverEarnings),
              suggestedBudget: Number(baseDto.driverRate || baseDto.driverEarnings),
              totalAmount: Number(baseDto.driverRate || baseDto.driverEarnings),
              notes: trip.requirement.notes,
              vendor: {
                organizationName: vendorOrgName,
                fullName: vendorFullName,
                phone: vendorPhoneNumber,
              },
            },
          }
        : {}),
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
   * Get chat messages between driver and vendor/user for a specific trip.
   */
  async getTripMessages(tripId: string, userId: string, role?: UserRole): Promise<any[]> {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        requirement: { include: { vendor: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (role === UserRole.DRIVER && trip.driver.userId !== userId) {
      throw new ForbiddenException('Not authorized to access messages for this trip');
    }
    if (role === UserRole.VENDOR && trip.requirement?.vendor?.userId !== userId) {
      throw new ForbiddenException('Not authorized to access messages for this trip');
    }

    const events = await this.db.tripEvent.findMany({
      where: {
        tripId,
        eventType: 'CHAT_MESSAGE',
      },
      orderBy: { createdAt: 'asc' },
    });

    return events.map((e) => {
      const meta = (e.metadata as any) || {};
      return {
        id: e.id,
        tripId: e.tripId,
        senderId: meta.senderId || '',
        senderName: meta.senderName || (meta.senderRole === 'DRIVER' ? 'Driver' : 'User'),
        senderRole: meta.senderRole || '',
        text: meta.text || '',
        createdAt: e.createdAt.toISOString(),
      };
    });
  }

  /**
   * Send a chat message for a trip between driver and vendor/user.
   */
  async sendTripMessage(tripId: string, userId: string, role: UserRole | undefined, text: string): Promise<any> {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        requirement: { include: { vendor: { include: { user: true } } } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (role === UserRole.DRIVER && trip.driver.userId !== userId) {
      throw new ForbiddenException('Not authorized to send messages for this trip');
    }
    if (role === UserRole.VENDOR && trip.requirement?.vendor?.userId !== userId) {
      throw new ForbiddenException('Not authorized to send messages for this trip');
    }

    const senderUser = await this.db.user.findUnique({ where: { id: userId } });
    const senderName = senderUser?.fullName || (role === UserRole.DRIVER ? (trip.driver?.fullName || 'Driver') : (trip.requirement?.vendor?.fullName || 'User'));

    const event = await this.db.tripEvent.create({
      data: {
        tripId,
        eventType: 'CHAT_MESSAGE',
        metadata: {
          senderId: userId,
          senderName,
          senderRole: role || 'USER',
          text: cleanText,
        },
      },
    });

    const messagePayload = {
      id: event.id,
      tripId,
      senderId: userId,
      senderName,
      senderRole: role || 'USER',
      text: cleanText,
      createdAt: event.createdAt.toISOString(),
    };

    // Emit real-time socket event on trip channel
    this.notifications.emitEvent(`trip:${tripId}`, 'CHAT_MESSAGE', messagePayload);

    // Notify the other party via push notification
    const recipientUserId = role === UserRole.DRIVER
      ? trip.requirement?.vendor?.userId
      : trip.driver?.userId;

    if (recipientUserId) {
      this.notifications.sendPushToUser(recipientUserId, {
        title: `Message from ${senderName}`,
        body: cleanText,
        data: {
          type: 'TRIP_CHAT_MESSAGE',
          tripId,
          senderId: userId,
          route: `/trips/${tripId}/chat`,
        },
        actionUrl: `/trips/${tripId}/chat`,
      }).catch(() => {});
    }

    return messagePayload;
  }

  /**
   * Mark driver ARRIVED at pickup location.
   * State Transition: ASSIGNED -> ARRIVED per docs/12_STATE_MACHINES.md.
   * Triggers OTP notification to the vendor.
   */
  async markArrived(id: string, driverUserId: string): Promise<TripResponseDto> {
    const trip = await this.findAndVerifyDriverTrip(id, driverUserId);

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException(`Trip is already ${trip.status.toLowerCase()}. Please refresh your trips.`);
    }

    if (trip.status === TripStatus.ARRIVED) {
      // Idempotent retry: driver already marked arrived
      return this.mapToDto(trip);
    }

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
    const vendorPhone = updated.requirement.vendor.phone || updated.requirement.vendor.user?.phone;
    if (vendorPhone) {
      await this.notifications.sendTripOtp(vendorPhone, updated.otp);
    }

    // Notify vendor in real-time
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_DRIVER_ARRIVED', {
      tripId: id,
      driverName: updated.driver.fullName,
      vehiclePlate: updated.driver.vehiclePlate,
      otp: updated.otp,
      reportingTime: updated.reportingTime.toISOString(),
    });
    if (updated.requirement?.vendor?.userId) {
      this.notifications.emitEvent(`user:${updated.requirement.vendor.userId}`, 'TRIP_DRIVER_ARRIVED', {
        tripId: id,
        driverName: updated.driver.fullName,
        vehiclePlate: updated.driver.vehiclePlate,
        otp: updated.otp,
        reportingTime: updated.reportingTime.toISOString(),
      });
    }

    // Notify driver in real-time
    this.notifications.emitEvent(`driver:${updated.driverId}`, 'TRIP_ARRIVED', { tripId: id });
    this.notifications.emitEvent(`user:${driverUserId}`, 'TRIP_ARRIVED', { tripId: id });

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

    // Strict OTP verification against stored trip OTP
    if (trip.otp && trip.otp !== dto.otp) {
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

    // Emit real-time event to vendor and driver
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_STARTED', {
      tripId: id,
      startedAt: now.toISOString(),
      pickupLocation: dto.currentLocation,
    });
    this.notifications.emitEvent(`driver:${trip.driverId}`, 'TRIP_STARTED', { tripId: id });
    this.notifications.emitEvent(`user:${driverUserId}`, 'TRIP_STARTED', { tripId: id });

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

    // Keep the dispatch spatial index fresh (dispatch re-checks availability in the DB).
    this.locations
      ?.indexDriverLocation(trip.driverId, dto.location.latitude, dto.location.longitude, trip.vehicleType as string)
      .catch(() => undefined);

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

    if (trip.status === TripStatus.COMPLETED) {
      // Idempotent retry: the earning was already credited exactly once.
      return this.mapToDto(trip);
    }
    validateTripTransition(trip.status as TripStatus, TripStatus.COMPLETED);

    const isBidding = trip.requirement?.fulfillmentMode === FulfillmentMode.BIDDING;
    const zonalQuote = (trip.requirement as any)?.zonalQuote ?? null;
    const claimedToll = dto.tollCharges || 0;
    const claimedParking = dto.parkingCharges || 0;
    // Corporate zonal trips: driver earnings come only from the accepted quote snapshot. Tolls/parking are
    // recorded as claims for operations approval and never auto-paid (Driver PRD: undefined cases).
    const tollCharges = zonalQuote ? 0 : claimedToll;
    const parkingCharges = zonalQuote ? 0 : claimedParking;
    const fareAmount = zonalQuote ? zonalQuote.driverFarePaise / 100 : Number(trip.driverRate);

    // Dynamic platform commission from Admin Policy Config (default 10%, configurable in Admin Panel)
    let commissionPercent = 10.0;
    try {
      const policy = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
      if (policy && policy.commissionPercent != null) {
        commissionPercent = Number(policy.commissionPercent);
      }
    } catch (_) {}

    const commission = zonalQuote ? 0 : Math.round(fareAmount * (commissionPercent / 100));
    const totalDriverEarnings = fareAmount - commission + tollCharges + parkingCharges;
    const now = new Date();

    const updated = await this.db.$transaction(async (tx) => {
      // 1. Claim the completion atomically: a retried or concurrent request cannot credit twice.
      const claimed = await tx.trip.updateMany({
        where: { id, status: trip.status },
        data: {
          status: TripStatus.COMPLETED,
          completedAt: now,
          tollCharges,
          parkingCharges,
          totalDriverEarnings,
        },
      });
      if (claimed.count !== 1) {
        return null;
      }
      const updatedTrip = await tx.trip.findUnique({
        where: { id },
        include: { requirement: true },
      });
      if (!updatedTrip) {
        throw new NotFoundException('Trip not found');
      }

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
          // Atomic increment (an absolute write from the pre-transaction read would erase
          // concurrent acceptance-rate penalties/rewards); clamped below.
          trustScore: { increment: 0.5 },
          currentLat: dto?.currentLocation?.latitude ? dto.currentLocation.latitude : undefined,
          currentLng: dto?.currentLocation?.longitude ? dto.currentLocation.longitude : undefined,
          lastLocationAt: now,
        },
      });
      await tx.driver.updateMany({
        where: { id: trip.driverId, trustScore: { gt: 100 } },
        data: { trustScore: 100 },
      });

      // 4. Record immutable ledger entry for driver earnings
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: trip.driverId,
          entryType: 'CREDIT',
          amount: totalDriverEarnings,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: isBidding ? 'ESCROW_RELEASE' : 'TRIP_EARNINGS',
          referenceId: trip.id,
          description: `Earnings for trip ${trip.id.slice(-6)} (Fare: ₹${fareAmount}${commission ? `, Commission (${commissionPercent}%): -₹${commission}` : ''}${tollCharges ? `, Toll: ₹${tollCharges}` : ''}${parkingCharges ? `, Parking: ₹${parkingCharges}` : ''})`,
        },
      });

      // 5. Record platform commission entry
      if (commission > 0) {
        await tx.ledgerEntry.create({
          data: {
            accountType: 'PLATFORM',
            accountId: trip.driverId,
            entryType: 'CREDIT',
            amount: commission,
            balanceAfter: commission,
            referenceType: 'PLATFORM_COMMISSION',
            referenceId: trip.id,
            description: `Platform commission (${commissionPercent}%) for trip ${trip.id.slice(-6)}`,
          },
        });
      }


      // 7. Corporate zonal trip: record platform spread and escort payable separately from driver earnings.
      if (zonalQuote) {
        if (zonalQuote.platformFeePaise > 0) {
          await tx.ledgerEntry.create({
            data: {
              accountType: 'PLATFORM',
              accountId: trip.vendorId,
              entryType: 'CREDIT',
              amount: zonalQuote.platformFeePaise / 100,
              balanceAfter: zonalQuote.platformFeePaise / 100,
              referenceType: 'ZONAL_PLATFORM_SPREAD',
              referenceId: trip.id,
              description: `Zonal spread for trip ${trip.id.slice(-6)} (${zonalQuote.hubId}/${zonalQuote.zoneId}, rate ${zonalQuote.rateVersion})`,
            },
          });
        }
        if (zonalQuote.hasEscort && zonalQuote.escortFarePaise > 0) {
          await tx.ledgerEntry.create({
            data: {
              accountType: 'ESCORT_PAYABLE',
              accountId: trip.vendorId,
              entryType: 'CREDIT',
              amount: zonalQuote.escortFarePaise / 100,
              balanceAfter: zonalQuote.escortFarePaise / 100,
              referenceType: 'ZONAL_ESCORT_PAYABLE',
              referenceId: trip.id,
              description: `Escort service payable for trip ${trip.id.slice(-6)} (payee settled by operations)`,
            },
          });
        }
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

    if (!updated) {
      // Duplicate completion: return the already-completed trip without a second credit.
      const current = await this.db.trip.findUnique({ where: { id }, include: { requirement: true } });
      if (current?.status === TripStatus.COMPLETED) {
        return this.mapToDto(current);
      }
      throw new ConflictException('Trip state changed during completion. Please retry.');
    }

    // Driver is AVAILABLE again: re-index at the drop-off position for the next dispatch wave.
    if (dto?.currentLocation?.latitude && dto?.currentLocation?.longitude) {
      this.locations
        ?.indexDriverLocation(updated.driverId, dto.currentLocation.latitude, dto.currentLocation.longitude, updated.vehicleType as string)
        .catch(() => undefined);
    }

    // Record completion event
    await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'TRIP_COMPLETED',
        latitude: dto?.currentLocation?.latitude,
        longitude: dto?.currentLocation?.longitude,
        metadata: {
          totalEarnings: totalDriverEarnings,
          tollCharges,
          parkingCharges,
          ...(zonalQuote && (claimedToll || claimedParking)
            ? { pendingOpsApproval: { tollCharges: claimedToll, parkingCharges: claimedParking } }
            : {}),
        },
      },
    });

    // Real-time notifications
    this.notifications.emitEvent(`vendor:${updated.vendorId}`, 'TRIP_COMPLETED', {
      tripId: id,
      requirementId: updated.requirementId,
      completedAt: now.toISOString(),
      ...(zonalQuote ? {} : { totalEarnings: totalDriverEarnings }),
    });

    this.notifications.emitEvent(`driver:${updated.driverId}`, 'TRIP_COMPLETED', {
      tripId: id,
      totalEarnings: totalDriverEarnings,
    });
    this.notifications.emitEvent(`user:${driverUserId}`, 'TRIP_COMPLETED', {
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
      this.notifications.emitEvent(`user:${vendorUser.userId}`, 'TRIP_COMPLETED', {
        tripId: id,
        requirementId: updated.requirementId,
        completedAt: now.toISOString(),
        ...(zonalQuote ? {} : { totalEarnings: totalDriverEarnings }),
      });
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
      include: {
        requirement: { include: { vendor: true } },
        driver: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    validateTripTransition(trip.status as TripStatus, TripStatus.CANCELLED);

    const now = new Date();
    const wasPreStart = trip.status === TripStatus.ASSIGNED || trip.status === TripStatus.ARRIVED;

    const updated = await this.db.$transaction(async (tx) => {
      // 1. Claim the cancellation atomically: loses cleanly to a concurrent complete/cancel
      const claimed = await tx.trip.updateMany({
        where: { id, status: trip.status },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: now,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Trip state changed. Please refresh and try again.');
      }
      const cancelledTrip = await tx.trip.findUnique({
        where: { id },
        include: { requirement: true },
      });
      if (!cancelledTrip) {
        throw new NotFoundException('Trip not found');
      }

      // 2. Cancel assignment
      await tx.assignment.update({
        where: { id: trip.assignmentId },
        data: { status: AssignmentStatus.CANCELLED },
      });

      // 3. Free driver back to AVAILABLE (penalize trust score if driver cancelled, clamped at 0.0 minimum)
      const isDriverCancel = role === UserRole.DRIVER;
      await tx.driver.update({
        where: { id: trip.driverId },
        data: {
          availabilityStatus: DriverAvailability.AVAILABLE,
          ...(isDriverCancel ? { trustScore: { decrement: 5.0 } } : {}),
        },
      });
      if (isDriverCancel) {
        await tx.driver.updateMany({
          where: { id: trip.driverId, trustScore: { lt: 0 } },
          data: { trustScore: 0 },
        });
      }

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
        // Atomic decrement + read-back: never write a stale absolute count (that would erase a
        // concurrent accept's increment and allow overbooking).
        await tx.requirement.updateMany({
          where: { id: trip.requirementId, assignedQuantity: { gt: 0 } },
          data: { assignedQuantity: { decrement: 1 } },
        });
        const reqAfter = await tx.requirement.findUnique({ where: { id: trip.requirementId } });
        const newAssigned = reqAfter?.assignedQuantity ?? 0;
        if (reqAfter && reqAfter.status !== RequirementStatus.CANCELLED) {
          await tx.requirement.update({
            where: { id: trip.requirementId },
            data: {
              status: isBidding ? RequirementStatus.POSTED : (newAssigned > 0 ? RequirementStatus.PARTIALLY_FULFILLED : RequirementStatus.DISPATCHING),
            },
          });
        }
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
        // Replacement after a cancellation gets a fresh wave budget (isRetry); the cancelled
        // driver's ACCEPTED offer still excludes them from the replacement wave.
        this.dispatchService.dispatchRequirement(trip.requirementId, true).catch((err) => {
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
    if (trip.requirement?.vendor?.userId) {
      this.notifications.emitEvent(`user:${trip.requirement.vendor.userId}`, 'TRIP_CANCELLED', {
        tripId: id,
        requirementId: updated.requirementId,
        reason: dto.reason,
      });
    }
    this.notifications.emitEvent(`driver:${updated.driverId}`, 'TRIP_CANCELLED', {
      tripId: id,
      reason: dto.reason,
    });
    if (trip.driver?.userId) {
      this.notifications.emitEvent(`user:${trip.driver.userId}`, 'TRIP_CANCELLED', {
        tripId: id,
        reason: dto.reason,
      });
    }

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

  /**
   * Trigger emergency SOS / safety alert during an active trip.
   */
  async triggerEmergencySos(
    id: string,
    userId: string,
    role: UserRole,
    dto?: { latitude?: number; longitude?: number; note?: string },
  ): Promise<{ success: boolean; eventId: string; message: string }> {
    const trip = await this.db.trip.findUnique({
      where: { id },
      include: {
        driver: { include: { user: true } },
        requirement: { include: { vendor: { include: { user: true } } } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const isDriver = trip.driver.userId === userId;
    const isVendor = trip.requirement.vendor.userId === userId;
    if (!isDriver && !isVendor && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only trip participants can trigger SOS alerts');
    }

    const lat = dto?.latitude ?? (trip.driver.currentLat ? Number(trip.driver.currentLat) : undefined);
    const lng = dto?.longitude ?? (trip.driver.currentLng ? Number(trip.driver.currentLng) : undefined);

    const event = await this.db.tripEvent.create({
      data: {
        tripId: id,
        eventType: 'EMERGENCY_SOS_TRIGGERED',
        latitude: lat,
        longitude: lng,
        metadata: {
          triggeredByRole: role,
          triggeredByUserId: userId,
          note: dto?.note || 'In-app emergency SOS triggered',
          timestamp: new Date().toISOString(),
        },
      },
    });

    // High-priority safety broadcast to admin and both participants
    this.notifications.emitEvent('admin:safety', 'EMERGENCY_SOS_ALERT', {
      tripId: id,
      triggeredByRole: role,
      triggeredByUserId: userId,
      latitude: lat,
      longitude: lng,
      note: dto?.note,
      driverName: trip.driver.fullName,
      driverPhone: trip.driver.phone,
      vendorName: trip.requirement.vendor.organizationName || trip.requirement.vendor.fullName,
      vehiclePlate: trip.driver.vehiclePlate,
    });

    this.notifications.emitEvent(`vendor:${trip.vendorId}`, 'EMERGENCY_SOS_ACTIVE', {
      tripId: id,
      status: 'EMERGENCY_DESK_DISPATCHED',
    });

    this.notifications.emitEvent(`driver:${trip.driverId}`, 'EMERGENCY_SOS_ACTIVE', {
      tripId: id,
      status: 'EMERGENCY_DESK_DISPATCHED',
    });

    await this.audit.log({
      userId,
      action: 'EMERGENCY_SOS_TRIGGERED',
      entityType: 'TRIP',
      entityId: id,
      metadata: { latitude: lat, longitude: lng, role },
    });

    return {
      success: true,
      eventId: event.id,
      message: 'Emergency SOS alert dispatched to 24/7 safety command desk and authorities.',
    };
  }

  // --- Private helpers ---

  private async findAndVerifyDriverTrip(tripId: string, driverUserId: string) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: { driver: true, requirement: { include: { zonalQuote: true } } },
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
    const driverFullName = sanitizeRealName(t.driver?.fullName) || sanitizeRealName(t.driver?.user?.fullName);
    const driverPhoneNumber = t.driver?.phone || t.driver?.user?.phone;
    const vehiclePlateNumber = t.driver?.vehiclePlate;
    const vehicleModelName = t.driver?.vehicleModel || t.vehicleType;

    const vendorRecord = t.requirement?.vendor || t.vendor;
    const vendorFullName =
      sanitizeRealName(vendorRecord?.user?.fullName) ||
      sanitizeRealName(vendorRecord?.fullName) ||
      sanitizeRealName(vendorRecord?.organizationName);
    const vendorPhoneNumber = vendorRecord?.phone || vendorRecord?.user?.phone;
    const vendorOrgName = sanitizeRealName(vendorRecord?.organizationName);

    return {
      id: t.id,
      requirementId: t.requirementId,
      assignmentId: t.assignmentId,
      vendorId: t.vendorId,
      driverId: t.driverId,
      driverName: driverFullName,
      driverPhone: driverPhoneNumber,
      vehiclePlate: vehiclePlateNumber,
      vehicleModel: vehicleModelName,
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
      driverRate: (() => {
        let r = Number(t.driverRate || 0);
        if (r <= 0) {
          if (t.totalDriverEarnings && Number(t.totalDriverEarnings) > 0) {
            r = Number(t.totalDriverEarnings);
          } else if (t.requirement?.ratePerVehicle) {
            r = Math.round(Number(t.requirement.ratePerVehicle) * 0.85);
          }
        }
        return r;
      })(),
      fare: (() => {
        let r = Number(t.driverRate || 0);
        if (r <= 0) {
          if (t.totalDriverEarnings && Number(t.totalDriverEarnings) > 0) {
            r = Number(t.totalDriverEarnings);
          } else if (t.requirement?.ratePerVehicle) {
            r = Math.round(Number(t.requirement.ratePerVehicle) * 0.85);
          }
        }
        return r;
      })(),
      driverEarnings: Number(t.totalDriverEarnings || t.driverRate || (t.requirement?.ratePerVehicle ? Math.round(Number(t.requirement.ratePerVehicle) * 0.85) : 0)),
      tollCharges: t.tollCharges ? Number(t.tollCharges) : undefined,
      parkingCharges: t.parkingCharges ? Number(t.parkingCharges) : undefined,
      totalDriverEarnings: Number(t.totalDriverEarnings || t.driverRate || (t.requirement?.ratePerVehicle ? Math.round(Number(t.requirement.ratePerVehicle) * 0.85) : 0)),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      vendorName: vendorFullName,
      vendorPhone: vendorPhoneNumber,
      vendorOrganizationName: vendorOrgName,
      requesterName: vendorFullName,
      ...(vendorRecord
        ? {
            vendor: {
              id: t.vendorId,
              organizationName: vendorOrgName,
              fullName: vendorFullName,
              phone: vendorPhoneNumber,
            },
          }
        : {}),
      ...(t.driver
        ? {
            driver: {
              id: t.driver.id,
              fullName: driverFullName,
              phone: driverPhoneNumber,
              vehiclePlate: vehiclePlateNumber,
              vehicleModel: vehicleModelName,
              vehicleType: t.driver.vehicleType || t.vehicleType,
              rating: t.driver.averageRating ?? 5.0,
              trustScore: t.driver.trustScore ?? 100.0,
              user: {
                fullName: driverFullName,
                phone: driverPhoneNumber,
              },
            },
          }
        : {}),
    } as any;
  }
}
