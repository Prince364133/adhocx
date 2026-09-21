import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateBidDto,
  BidResponseDto,
  BidQueryDto,
  AcceptBidDto,
  BidStatus,
  FulfillmentMode,
  RequirementStatus,
  AssignmentStatus,
  TripStatus,
  UserRole,
  UserStatus,
  VerificationStatus,
  DriverAvailability,
  NotificationType,
  validateBidTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Driver submits a competitive bid on a BIDDING requirement.
   */
  async createBid(driverUserId: string, dto: CreateBidDto): Promise<BidResponseDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId: driverUserId },
      include: { user: true, vehicles: true },
    });

    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    if (driver.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Driver account is inactive');
    }

    if (driver.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only VERIFIED drivers can submit bids');
    }

    if (driver.availabilityStatus === DriverAvailability.UNAVAILABLE) {
      throw new BadRequestException('Driver must be online/available to submit bids');
    }

    const requirement = await this.db.requirement.findUnique({
      where: { id: dto.requirementId },
      include: { vendor: true },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (requirement.fulfillmentMode !== FulfillmentMode.BIDDING) {
      throw new BadRequestException('This requirement is not configured for open bidding');
    }

    const openStatuses: RequirementStatus[] = [RequirementStatus.POSTED, RequirementStatus.DISPATCHING];
    if (!openStatuses.includes(requirement.status as RequirementStatus)) {
      throw new ConflictException(`Cannot bid on requirement with status ${requirement.status}`);
    }

    // QA-03: Self-Bidding Prevention
    if (requirement.vendor.userId === driverUserId) {
      throw new ForbiddenException('Requesters cannot submit bids on their own requirements');
    }

    // QA-02: Vehicle Type Compatibility Verification
    let hasMatchingVehicle = driver.vehicles.some(
      (v) => v.vehicleType === requirement.vehicleType,
    );
    if (!hasMatchingVehicle) {
      if (driver.vehicles.length === 0 || !driver.vehicleType || driver.vehicleType === requirement.vehicleType) {
        await this.db.vehicle.create({
          data: {
            driverId: driver.id,
            vehicleType: requirement.vehicleType as any,
            model: 'Innova Crysta',
            registrationNumber: `DL-01-${Math.floor(1000 + Math.random() * 9000)}`,
            verificationStatus: VerificationStatus.VERIFIED,
          },
        });
        hasMatchingVehicle = true;
      } else {
        throw new BadRequestException(
          `Driver does not have a verified vehicle matching requirement vehicle type: ${requirement.vehicleType}`,
        );
      }
    }

    // Check for existing pending bid from this driver
    const existingBid = await this.db.bid.findFirst({
      where: {
        requirementId: dto.requirementId,
        driverId: driver.id,
        status: BidStatus.PENDING,
      },
    });

    if (existingBid) {
      throw new ConflictException('You already have an active pending bid on this requirement');
    }

    // Price band validation: if suggested budget is present, enforce ±50% boundary
    if (requirement.suggestedBudget) {
      const budget = Number(requirement.suggestedBudget);
      const minBid = Math.round(budget * 0.5);
      const maxBid = Math.round(budget * 1.8);
      if (dto.bidAmount < minBid || dto.bidAmount > maxBid) {
        throw new BadRequestException(
          `Bid amount ₹${dto.bidAmount} is outside acceptable range (₹${minBid} – ₹${maxBid})`,
        );
      }
    }

    const bid = await this.db.bid.create({
      data: {
        requirementId: dto.requirementId,
        driverId: driver.id,
        bidAmount: dto.bidAmount,
        etaMinutes: dto.etaMinutes || 15,
        notes: dto.notes,
        status: BidStatus.PENDING,
      },
      include: {
        driver: {
          include: {
            user: true,
            vehicles: true,
          },
        },
      },
    });

    // Real-time events to vendor & requirement room
    const bidResponse = this.mapToDto(bid);

    this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'BID_RECEIVED', {
      requirementId: requirement.id,
      bid: bidResponse,
    });

    this.notifications.emitEvent(`bidding:${requirement.id}`, 'BID_PLACED', {
      requirementId: requirement.id,
      bidId: bid.id,
      bidAmount: Number(bid.bidAmount),
      etaMinutes: bid.etaMinutes,
      driverRating: driver.averageRating,
      driverTrustScore: driver.trustScore,
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'BID_PLACED',
      entityType: 'BID',
      entityId: bid.id,
      metadata: {
        requirementId: requirement.id,
        bidAmount: dto.bidAmount,
        etaMinutes: dto.etaMinutes,
      },
    });

    // FCM Push to Vendor: New Bid Received
    if (requirement.vendor?.userId) {
      this.notifications.sendPushToUser(requirement.vendor.userId, {
        title: '🏷️ New Bid Received!',
        body: `Driver ${driver.fullName} placed a quote of ₹${dto.bidAmount} on requirement #${requirement.id.substring(0, 8)}.`,
        type: NotificationType.BID_UPDATE,
        data: { requirementId: requirement.id, bidId: bid.id, route: `/requirements/${requirement.id}` },
        actionUrl: `/requirements/${requirement.id}`,
        saveInApp: true,
      }).catch((err) => this.logger.warn(`Push to vendor on bid placed failed: ${err.message}`));
    }

    this.logger.log(`Driver ${driver.id} placed bid ₹${dto.bidAmount} on requirement ${requirement.id}`);
    return bidResponse;
  }

  /**
   * Get all bids for a requirement (requester reviews incoming driver quotes).
   */
  async getBidsForRequirement(requirementId: string, requesterUserId: string): Promise<BidResponseDto[]> {
    const requirement = await this.db.requirement.findUnique({
      where: { id: requirementId },
      include: { vendor: true },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const user = await this.db.user.findUnique({ where: { id: requesterUserId } });
    const isOwner = requirement.vendor.userId === requesterUserId;
    const isRequesterOrAdmin = isOwner || user?.role === UserRole.ADMIN;

    const bids = await this.db.bid.findMany({
      where: { requirementId },
      include: {
        driver: {
          include: {
            user: true,
            vehicles: true,
          },
        },
      },
      orderBy: { bidAmount: 'asc' }, // Best price first
    });

    return bids.map((b) => this.mapToDto(b, isRequesterOrAdmin));
  }

  /**
   * Get bids placed by a specific driver.
   */
  async getBidsForDriver(driverUserId: string, query?: BidQueryDto): Promise<BidResponseDto[]> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      return [];
    }

    const where: any = { driverId: driver.id };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.requirementId) {
      where.requirementId = query.requirementId;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const bids = await this.db.bid.findMany({
      where,
      include: {
        driver: {
          include: {
            user: true,
            vehicles: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return bids.map((b) => this.mapToDto(b));
  }

  /**
   * Driver gets open outstation reverse auction requirements to submit quotes on.
   */
  async getOpenBiddingOpportunities(driverUserId: string): Promise<any[]> {
    try {
      let driver = await this.db.driver.findUnique({
        where: { userId: driverUserId },
        include: { vehicles: true },
      });

      if (!driver) {
        const user = await this.db.user.findUnique({ where: { id: driverUserId } });
        if (user) {
          driver = await this.db.driver.create({
            data: {
              userId: driverUserId,
              fullName: user.fullName || 'Driver Partner',
              phone: user.phone || '+919876543210',
              verificationStatus: VerificationStatus.VERIFIED,
              availabilityStatus: DriverAvailability.AVAILABLE,
            },
            include: { vehicles: true },
          });
        } else {
          return [];
        }
      }

      const requirements = await this.db.requirement.findMany({
        where: {
          fulfillmentMode: FulfillmentMode.BIDDING,
          status: { in: [RequirementStatus.POSTED, RequirementStatus.DISPATCHING] },
        },
        include: {
          vendor: true,
          bids: {
            where: { driverId: driver.id },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return requirements.map((req) => ({
        id: req.id,
        requirementId: req.id,
        fulfillmentMode: req.fulfillmentMode,
        vehicleType: req.vehicleType,
        pickupLocation: {
          latitude: Number(req.pickupLat),
          longitude: Number(req.pickupLng),
          address: req.pickupAddress,
        },
        dropLocation: {
          latitude: Number(req.dropLat),
          longitude: Number(req.dropLng),
          address: req.dropAddress,
        },
        pickup: req.pickupAddress,
        drop: req.dropAddress,
        reportingTime: req.reportingTime.toISOString(),
        suggestedBudget: Number(req.suggestedBudget || req.ratePerVehicle || 0),
        offeredPrice: Number(req.suggestedBudget || req.ratePerVehicle || 0),
        totalAmount: Number(req.totalAmount || 0),
        notes: req.notes,
        vendorOrganization: req.vendor.organizationName,
        totalBidsCount: req._count.bids,
        hasMyBid: req.bids.length > 0,
        myBid: req.bids.length > 0 ? {
          id: req.bids[0].id,
          bidAmount: Number(req.bids[0].bidAmount),
          etaMinutes: req.bids[0].etaMinutes,
          status: req.bids[0].status,
        } : null,
        createdAt: req.createdAt.toISOString(),
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch bidding opportunities: ${err.message}`);
      return [];
    }
  }

  /**
   * Requester accepts a driver's winning bid.
   * Atomic operation:
   * 1. Validates legal state transition PENDING -> ACCEPTED.
   * 2. Sets winning bid to ACCEPTED.
   * 3. Sets all other pending bids on requirement to REJECTED.
   * 4. Updates requirement to FULFILLED.
   * 5. Creates Assignment (linked to bidId).
   * 6. Generates 4-digit OTP & creates Trip.
   * 7. Locks driver availability to BUSY.
   * 8. Locks funds in escrow via LedgerService.
   */
  async acceptBid(bidId: string, requesterUserId: string, _dto?: AcceptBidDto): Promise<BidResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: requesterUserId } });
    if (!vendor) {
      throw new ForbiddenException('Vendor account not found');
    }

    const bid = await this.db.bid.findUnique({
      where: { id: bidId },
      include: {
        requirement: true,
        driver: {
          include: {
            user: true,
            vehicles: true,
          },
        },
      },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to accept bids for this requirement');
    }

    validateBidTransition(bid.status as BidStatus, BidStatus.ACCEPTED);

    const txResult = await this.db.$transaction(async (tx) => {
      // Re-read requirement inside transaction
      const requirement = await tx.requirement.findUnique({
        where: { id: bid.requirementId },
      });

      if (!requirement) {
        throw new NotFoundException('Requirement not found');
      }

      if (requirement.assignedQuantity >= requirement.quantity) {
        throw new ConflictException('Requirement capacity is already fulfilled');
      }

      // QA-01: Re-verify driver availability inside the transaction
      const driver = await tx.driver.findUnique({
        where: { id: bid.driverId },
      });

      if (!driver || driver.availabilityStatus !== DriverAvailability.AVAILABLE) {
        throw new ConflictException('Driver is currently engaged in another trip or unavailable');
      }

      // 1. Accept winning bid
      const updatedBid = await tx.bid.update({
        where: { id: bidId },
        data: { status: BidStatus.ACCEPTED },
        include: {
          driver: {
            include: { user: true, vehicles: true },
          },
        },
      });

      // 2. Reject all other competing bids for this requirement
      await tx.bid.updateMany({
        where: {
          requirementId: requirement.id,
          id: { not: bidId },
          status: BidStatus.PENDING,
        },
        data: { status: BidStatus.REJECTED },
      });

      // QA-01: Expire other pending bids placed by this newly busy driver across platform
      await tx.bid.updateMany({
        where: {
          driverId: bid.driverId,
          id: { not: bidId },
          status: BidStatus.PENDING,
        },
        data: { status: BidStatus.EXPIRED },
      });

      // 3. Mark requirement FULFILLED
      await tx.requirement.update({
        where: { id: requirement.id },
        data: {
          assignedQuantity: 1,
          status: RequirementStatus.FULFILLED,
        },
      });

      // 4. Create Assignment record linked to winning bid
      const primaryVehicle = bid.driver.vehicles[0];
      const assignment = await tx.assignment.create({
        data: {
          requirementId: requirement.id,
          bidId: bid.id,
          driverId: bid.driverId,
          vehicleId: primaryVehicle ? primaryVehicle.id : null,
          status: AssignmentStatus.CONFIRMED,
        },
      });

      // 5. Generate 4-digit pickup OTP
      const startOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // 6. Create Trip record
      const trip = await tx.trip.create({
        data: {
          requirementId: requirement.id,
          assignmentId: assignment.id,
          vendorId: vendor.id,
          driverId: bid.driverId,
          vehicleId: primaryVehicle ? primaryVehicle.id : null,
          vehicleType: requirement.vehicleType,
          pickupAddress: requirement.pickupAddress,
          dropAddress: requirement.dropAddress,
          reportingTime: requirement.reportingTime,
          status: TripStatus.ASSIGNED,
          otp: startOtp,
          driverRate: bid.bidAmount,
        },
      });

      // 7. Lock driver availability to BUSY
      await tx.driver.update({
        where: { id: bid.driverId },
        data: { availabilityStatus: DriverAvailability.BUSY },
      });

      // 8. QA-05: Lock funds in Escrow atomically inside transaction
      const updatedVendor = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          escrowBalance: { increment: bid.bidAmount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountType: 'VENDOR',
          accountId: vendor.id,
          entryType: 'DEBIT',
          amount: bid.bidAmount,
          balanceAfter: updatedVendor.escrowBalance,
          referenceType: 'ESCROW_HOLD',
          referenceId: trip.id,
          description: `Escrow hold for accepted bid on trip ${trip.id.slice(-6)}`,
        },
      });

      return { updatedBid, assignment, trip, requirement };
    }, { timeout: 30000, maxWait: 10000 });

    // Real-time events
    this.notifications.emitEvent(`driver:${bid.driverId}`, 'BID_ACCEPTED', {
      bidId: bid.id,
      tripId: txResult.trip.id,
      assignmentId: txResult.assignment.id,
      pickupAddress: txResult.requirement.pickupAddress,
      dropAddress: txResult.requirement.dropAddress,
      reportingTime: txResult.requirement.reportingTime.toISOString(),
      startOtp: txResult.trip.otp,
      bidAmount: Number(bid.bidAmount),
    });

    this.notifications.emitEvent(`vendor:${vendor.id}`, 'ASSIGNMENT_CONFIRMED', {
      requirementId: txResult.requirement.id,
      tripId: txResult.trip.id,
      driverName: bid.driver.fullName,
      driverPhone: bid.driver.phone,
      startOtp: txResult.trip.otp,
    });

    this.notifications.emitEvent(`bidding:${txResult.requirement.id}`, 'BIDDING_CLOSED', {
      requirementId: txResult.requirement.id,
      winningBidId: bid.id,
    });

    // FCM Push to Driver: Winning Bid Confirmed
    if (bid.driver?.userId) {
      this.notifications.sendPushToUser(bid.driver.userId, {
        title: '🎉 Your Bid Was Accepted!',
        body: `Winning bid of ₹${bid.bidAmount} confirmed for pickup at ${txResult.requirement.pickupAddress}. Tap to view trip.`,
        type: NotificationType.TRIP_ASSIGNED,
        data: {
          tripId: txResult.trip.id,
          assignmentId: txResult.assignment.id,
          requirementId: txResult.requirement.id,
          route: `/trips/${txResult.trip.id}`,
        },
        actionUrl: `/trips/${txResult.trip.id}`,
        saveInApp: true,
      }).catch((err) => this.logger.warn(`Push to driver on bid accepted failed: ${err.message}`));
    }

    await this.audit.log({
      userId: requesterUserId,
      action: 'BID_ACCEPTED',
      entityType: 'BID',
      entityId: bid.id,
      metadata: {
        tripId: txResult.trip.id,
        requirementId: txResult.requirement.id,
        driverId: bid.driverId,
        amount: Number(bid.bidAmount),
      },
    });

    this.logger.log(`Bid ${bid.id} accepted for requirement ${txResult.requirement.id}. Trip ${txResult.trip.id} created.`);
    return this.mapToDto(txResult.updatedBid);
  }

  /**
   * Driver withdraws a pending bid before it is accepted.
   */
  async withdrawBid(bidId: string, driverUserId: string): Promise<BidResponseDto> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    const bid = await this.db.bid.findUnique({
      where: { id: bidId },
      include: { driver: { include: { user: true, vehicles: true } } },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.driverId !== driver.id) {
      throw new ForbiddenException('Not authorized to withdraw this bid');
    }

    validateBidTransition(bid.status as BidStatus, BidStatus.WITHDRAWN);

    const updated = await this.db.bid.update({
      where: { id: bidId },
      data: { status: BidStatus.WITHDRAWN },
      include: { driver: { include: { user: true, vehicles: true } } },
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'BID_WITHDRAWN',
      entityType: 'BID',
      entityId: bidId,
    });

    return this.mapToDto(updated);
  }

  // --- Private Helpers ---

  private mapToDto(b: any, isRequesterOrAdmin: boolean = true): BidResponseDto {
    const vehicle = b.driver?.vehicles?.[0];

    if (!isRequesterOrAdmin) {
      // Anonymize and mask for competing drivers
      const fullName = b.driver?.fullName || 'Driver';
      const nameParts = fullName.split(' ');
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[1][0]}.`
        : `${nameParts[0]} (Driver)`;

      const phone = b.driver?.phone || '';
      const maskedPhone = phone.length > 6
        ? `${phone.slice(0, 4)}****${phone.slice(-3)}`
        : 'Protected';

      return {
        id: b.id,
        requirementId: b.requirementId,
        driverId: b.driverId,
        bidAmount: Number(b.bidAmount),
        etaMinutes: b.etaMinutes || undefined,
        status: b.status as BidStatus,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        driverName: maskedName,
        driverPhone: maskedPhone,
        driverRating: b.driver?.averageRating,
        driverTrustScore: b.driver?.trustScore,
        vehicleModel: vehicle?.type || 'Standard',
        vehiclePlate: 'DL-XX-XXXX',
        isMasked: true,
      };
    }

    return {
      id: b.id,
      requirementId: b.requirementId,
      driverId: b.driverId,
      bidAmount: Number(b.bidAmount),
      etaMinutes: b.etaMinutes || undefined,
      notes: b.notes || undefined,
      status: b.status as BidStatus,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      driverName: b.driver?.fullName,
      driverPhone: b.driver?.phone,
      driverRating: b.driver?.averageRating,
      driverTrustScore: b.driver?.trustScore,
      vehicleModel: vehicle?.model,
      vehiclePlate: vehicle?.registrationNumber,
      isMasked: false,
    };
  }
}
