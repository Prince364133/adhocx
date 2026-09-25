import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateRequirementDto,
  RequirementResponseDto,
  RequirementDetailResponseDto,
  RequirementSummaryDto,
  RequirementQueryDto,
  CancelRequirementDto,
  RequirementStatus,
  AssignmentStatus,
  VerificationStatus,
  OfferStatus,
  BidStatus,
  FulfillmentMode,
  VehicleType,
  PaymentStatus,
  UserRole,
  validateRequirementTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly pricingService: PricingService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create and post a new vehicle requirement.
   * Supports both:
   * 1. Mode A: DIRECT_DISPATCH (Corporate bulk bookings, fixed rate, timed offer waves)
   * 2. Mode B: BIDDING (Outstation / Long distance, suggested budget floor, reverse auction)
   */
  async createRequirement(vendorUserId: string, dto: CreateRequirementDto): Promise<RequirementResponseDto> {
    let vendor = await this.db.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (!vendor) {
      // Auto-provision vendor if user is registering/posting
      const user = await this.db.user.findUnique({ where: { id: vendorUserId } });
      vendor = await this.db.vendor.create({
        data: {
          userId: vendorUserId,
          fullName: user?.fullName || 'Corporate User',
          organizationName: `${user?.fullName || 'AdhocX'} Corp`,
          phone: user?.phone || '+919999999999',
          verificationStatus: VerificationStatus.VERIFIED,
        },
      });
    } else if (vendor.verificationStatus !== VerificationStatus.VERIFIED) {
      // In development mode, auto-promote vendor to VERIFIED
      vendor = await this.db.vendor.update({
        where: { id: vendor.id },
        data: { verificationStatus: VerificationStatus.VERIFIED },
      });
    }

    const vendorId = vendor?.id || `vnd_${vendorUserId}`;
    const mode = dto.fulfillmentMode || FulfillmentMode.DIRECT_DISPATCH;

    // Route distance calculation
    const distanceKm = this.pricingService.calculateDistanceKm(
      dto.pickupLocation.latitude,
      dto.pickupLocation.longitude,
      dto.dropLocation.latitude,
      dto.dropLocation.longitude,
    );

    let ratePerVehicle = dto.ratePerVehicle;
    let suggestedBudget = dto.suggestedBudget;
    let totalAmount = 0;

    if (mode === FulfillmentMode.BIDDING) {
      // Outstation Bidding Mode: Quantity defaults to 1 unless specified
      const minFareFloor = this.pricingService.calculateMinimumFare(dto.vehicleType, distanceKm);

      if (suggestedBudget && suggestedBudget < minFareFloor) {
        throw new BadRequestException(
          `Suggested budget ₹${suggestedBudget} is below minimum calculated fare floor of ₹${minFareFloor} for ${distanceKm} km`,
        );
      }

      suggestedBudget = suggestedBudget || minFareFloor;
      ratePerVehicle = suggestedBudget;
      totalAmount = (dto.quantity || 1) * suggestedBudget;
    } else {
      // Direct Dispatch Mode: Fixed rate per vehicle
      if (!ratePerVehicle || ratePerVehicle <= 0) {
        ratePerVehicle = this.pricingService.calculateDriverRate(dto.vehicleType, distanceKm);
      }
      totalAmount = (dto.quantity || 1) * ratePerVehicle;
    }

    // Check if coupon promo is applied
    let couponToRedeem: any = null;
    let discountAmount = 0;
    if (dto.couponCode) {
      const code = dto.couponCode.trim().toUpperCase();
      const coupon = await this.db.coupon.findUnique({ where: { code } });
      const now = new Date();
      if (coupon && coupon.isActive && now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.applicableTo === 'ALL' || coupon.applicableTo === 'REQUIREMENT_BOOKING') {
          if (totalAmount >= Number(coupon.minOrderAmount)) {
            couponToRedeem = coupon;
            if (coupon.discountType === 'PERCENTAGE') {
              discountAmount = (totalAmount * Number(coupon.discountValue)) / 100;
              if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
              }
            } else {
              discountAmount = Number(coupon.discountValue);
            }
            discountAmount = Math.min(discountAmount, totalAmount);
            totalAmount = Math.max(0, totalAmount - discountAmount);
          }
        }
      }
    }

    // Enforce Wallet-Only payment deduction rule
    if (Number(vendor.escrowBalance) < totalAmount) {
      throw new BadRequestException(
        `Insufficient AdhocX Wallet balance: required ₹${totalAmount}, available ₹${vendor.escrowBalance}. Please top up your wallet before posting requirements.`,
      );
    }

    const { requirement, updatedVendor } = await this.db.$transaction(async (tx) => {
      // 1. Deduct totalAmount from vendor wallet balance
      const v = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          escrowBalance: { decrement: totalAmount },
        },
      });

      // 2. Create requirement
      const req = await tx.requirement.create({
        data: {
          vendorId,
          fulfillmentMode: mode,
          vehicleType: dto.vehicleType as any,
          quantity: dto.quantity || 1,
          assignedQuantity: 0,
          pickupLat: dto.pickupLocation.latitude,
          pickupLng: dto.pickupLocation.longitude,
          pickupAddress: dto.pickupLocation.address || 'Pickup Location',
          dropLat: dto.dropLocation.latitude,
          dropLng: dto.dropLocation.longitude,
          dropAddress: dto.dropLocation.address || 'Drop Location',
          reportingTime: new Date(dto.reportingTime),
          ratePerVehicle,
          suggestedBudget,
          totalAmount,
          status: RequirementStatus.POSTED,
          notes: dto.notes,
        },
      });

      // 3. Create immutable ledger debit entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'VENDOR',
          accountId: vendor.id,
          entryType: 'DEBIT',
          amount: totalAmount,
          balanceAfter: v.escrowBalance,
          referenceType: 'REQUIREMENT_HOLD',
          referenceId: req.id,
          description: `Escrow hold for ${req.quantity}x ${req.vehicleType} requirement (${req.id.slice(-6)})${couponToRedeem ? ` [Promo: ${couponToRedeem.code}]` : ''}`,
        },
      });

      // 4. Create captured Payment record
      await tx.payment.create({
        data: {
          requirementId: req.id,
          vendorId: vendor.id,
          amount: totalAmount,
          paymentMethod: 'WALLET',
          transactionRef: `pay_wallet_${req.id.slice(-8)}_${Date.now()}`,
          status: PaymentStatus.CAPTURED,
        },
      });

      // 5. Coupon redemption
      if (couponToRedeem) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponToRedeem.id,
            userId: vendorUserId,
            referenceType: 'REQUIREMENT_BOOKING',
            referenceId: req.id,
            orderAmount: totalAmount + discountAmount,
            discountAmount,
            finalAmount: totalAmount,
          },
        });
        await tx.coupon.update({
          where: { id: couponToRedeem.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return { requirement: req, updatedVendor: v };
    }, { timeout: 30000, maxWait: 10000 });

    this.notifications.emitEvent(`vendor:${vendor.id}`, 'WALLET_DEBITED', {
      requirementId: requirement.id,
      amount: totalAmount,
      newBalance: Number(updatedVendor.escrowBalance),
    });

    if (mode === FulfillmentMode.BIDDING) {
      // Bidding Mode: Broadcast to nearby drivers
      this.notifications.emitEvent(`bidding:open`, 'NEW_BIDDING_OPPORTUNITY', {
        requirementId: requirement.id,
        vehicleType: requirement.vehicleType,
        pickupAddress: requirement.pickupAddress,
        dropAddress: requirement.dropAddress,
        distanceKm,
        suggestedBudget,
        reportingTime: requirement.reportingTime.toISOString(),
      });
      this.logger.log(`Requirement ${requirement.id} opened for bidding (Mode: BIDDING)`);
    } else {
      // Direct Dispatch Mode: Auto-trigger progressive dispatch waves
      try {
        await this.dispatchService.dispatchRequirement(requirement.id);
      } catch (err: any) {
        this.logger.error(`Auto-dispatch failed for requirement ${requirement.id}: ${err.message}`);
      }
      this.logger.log(`Requirement ${requirement.id} submitted for progressive dispatch (Mode: DIRECT_DISPATCH)`);
    }

    return this.mapToDto(requirement);
  }

  /**
   * List requirements for a vendor with pagination and status filters.
   */
  async getRequirementsByVendor(
    vendorUserId: string,
    query?: RequirementQueryDto,
  ): Promise<{ items: RequirementResponseDto[]; total: number; page: number; pageSize: number }> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorId: vendor.id };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.vehicleType) {
      where.vehicleType = query.vehicleType as any;
    }

    const [items, total] = await Promise.all([
      this.db.requirement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.requirement.count({ where }),
    ]);

    return {
      items: items.map((r) => this.mapToDto(r)),
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Get aggregated summary metrics for vendor requirements dashboard.
   */
  async getRequirementsSummary(vendorUserId: string): Promise<RequirementSummaryDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      return {
        totalRequirements: 0,
        totalVehiclesRequired: 0,
        totalVehiclesFulfilled: 0,
        assignedCount: 0,
        searchingCount: 0,
        completedCount: 0,
      };
    }

    const allRequirements = await this.db.requirement.findMany({
      where: { vendorId: vendor.id },
    });

    let totalVehiclesRequired = 0;
    let totalVehiclesFulfilled = 0;
    let assignedCount = 0;
    let searchingCount = 0;
    let completedCount = 0;

    for (const req of allRequirements) {
      totalVehiclesRequired += req.quantity;
      totalVehiclesFulfilled += req.assignedQuantity;
      if (
        req.status === RequirementStatus.COMPLETED ||
        req.status === RequirementStatus.FULFILLED
      ) {
        completedCount++;
      } else if (
        req.status === RequirementStatus.DISPATCHING ||
        req.status === RequirementStatus.POSTED ||
        req.status === RequirementStatus.NO_DRIVER_AVAILABLE
      ) {
        searchingCount++;
      } else if (req.status === RequirementStatus.PARTIALLY_FULFILLED) {
        assignedCount++;
      }
    }

    return {
      totalRequirements: allRequirements.length,
      totalVehiclesRequired,
      totalVehiclesFulfilled,
      assignedCount,
      searchingCount,
      completedCount,
    };
  }

  /**
   * List all platform requirements for administrative review across all vendors.
   */
  async getAllRequirements(
    query?: RequirementQueryDto,
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status && (query.status as any) !== 'ALL') {
      where.status = query.status;
    }
    if (query?.vehicleType) {
      where.vehicleType = query.vehicleType as any;
    }

    const [items, total] = await Promise.all([
      this.db.requirement.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: {
            include: { user: true },
          },
          offers: true,
          bids: true,
          assignments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.requirement.count({ where }),
    ]);

    return {
      items: items.map((r) => {
        const dto = this.mapToDto(r);
        return {
          ...dto,
          vendorName: r.vendor?.organizationName || r.vendor?.fullName || 'Corporate Client',
          vendorPhone: r.vendor?.phone || r.vendor?.user?.phone || '',
          vendorId: r.vendorId,
        };
      }),
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Get platform-wide aggregated requirement metrics for administrator dashboard.
   */
  async getAllRequirementsSummary(): Promise<RequirementSummaryDto> {
    const allRequirements = await this.db.requirement.findMany();

    let totalVehiclesRequired = 0;
    let totalVehiclesFulfilled = 0;
    let assignedCount = 0;
    let searchingCount = 0;
    let completedCount = 0;

    for (const req of allRequirements) {
      totalVehiclesRequired += req.quantity;
      totalVehiclesFulfilled += req.assignedQuantity;
      if (
        req.status === RequirementStatus.COMPLETED ||
        req.status === RequirementStatus.FULFILLED
      ) {
        completedCount++;
      } else if (
        req.status === RequirementStatus.DISPATCHING ||
        req.status === RequirementStatus.POSTED ||
        req.status === RequirementStatus.NO_DRIVER_AVAILABLE
      ) {
        searchingCount++;
      } else if (req.status === RequirementStatus.PARTIALLY_FULFILLED) {
        assignedCount++;
      }
    }

    return {
      totalRequirements: allRequirements.length,
      totalVehiclesRequired,
      totalVehiclesFulfilled,
      assignedCount,
      searchingCount,
      completedCount,
    };
  }

  /**
   * Get detailed requirement view including remaining slots, offer stats, bids, and assigned drivers.
   */
  async getRequirementDetails(id: string, vendorUserId: string): Promise<RequirementDetailResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({
      where: { id },
      include: {
        offers: {
          include: {
            driver: {
              include: { user: true, vehicles: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        bids: {
          include: {
            driver: {
              include: { user: true, vehicles: true },
            },
          },
          orderBy: { bidAmount: 'asc' },
        },
        assignments: {
          where: { status: { not: AssignmentStatus.CANCELLED } },
          include: {
            driver: {
              include: { user: true },
            },
            trip: true,
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (vendor && requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to access this requirement');
    }

    // Auto-timeout check: If requirement is in POSTED or DISPATCHING state but last active > 15 mins ago
    // with no active unexpired offers, auto-transition to NO_DRIVER_AVAILABLE or PARTIALLY_FULFILLED
    const now = new Date();
    const lastActiveTime = requirement.updatedAt ?? requirement.createdAt;
    const ageMinutes = (now.getTime() - lastActiveTime.getTime()) / (60 * 1000);
    const hasActiveSentOffers = requirement.offers.some(
      (o) => o.status === OfferStatus.SENT && o.expiresAt > now,
    );

    if (
      !hasActiveSentOffers &&
      ageMinutes > 15 &&
      (requirement.status === RequirementStatus.POSTED ||
        requirement.status === RequirementStatus.DISPATCHING)
    ) {
      const autoStatus =
        requirement.assignedQuantity > 0
          ? RequirementStatus.PARTIALLY_FULFILLED
          : RequirementStatus.NO_DRIVER_AVAILABLE;

      await this.db.requirement.update({
        where: { id: requirement.id },
        data: { status: autoStatus },
      });
      requirement.status = autoStatus;
    }

    const baseDto = this.mapToDto(requirement);
    const isStopped = [
      RequirementStatus.NO_DRIVER_AVAILABLE,
      RequirementStatus.CANCELLED,
      RequirementStatus.COMPLETED,
      RequirementStatus.FULFILLED,
    ].includes(requirement.status as RequirementStatus);

    return {
      ...baseDto,
      remainingQuantity: requirement.quantity - requirement.assignedQuantity,
      offersCount: requirement.offers.length,
      bidsCount: requirement.bids.length,
      driversApproachedCount: requirement.offers.length,
      searchStartedAt: requirement.createdAt.toISOString(),
      searchEndedAt: isStopped ? requirement.updatedAt.toISOString() : null,
      searchDurationMinutes: Math.max(
        1,
        Math.round(
          ((isStopped ? requirement.updatedAt.getTime() : Date.now()) -
            requirement.createdAt.getTime()) /
            (60 * 1000),
        ),
      ),
      offers: requirement.offers.map((o) => {
        const primaryVehicle = o.driver?.vehicles?.[0];
        return {
          id: o.id,
          requirementId: o.requirementId,
          driverId: o.driverId,
          driverName: o.driver?.fullName || 'Verified Driver',
          driverPhone: o.driver?.phone || '—',
          driverRating: o.driver?.averageRating || 4.9,
          driverTrustScore: o.driver?.trustScore || 95.0,
          vehicleType: o.vehicleType || o.driver?.vehicleType || 'SEDAN',
          vehicleModel: o.driver?.vehicleModel || primaryVehicle?.model || 'Commercial Vehicle',
          vehiclePlate: o.driver?.vehiclePlate || primaryVehicle?.registrationNumber || '—',
          offeredRate: Number(o.offeredRate),
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          expiresAt: o.expiresAt.toISOString(),
          respondedAt: o.respondedAt ? o.respondedAt.toISOString() : undefined,
        };
      }),
      bids: requirement.bids.map((b) => {
        const primaryVehicle = b.driver.vehicles[0];
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
          driverName: b.driver.fullName,
          driverPhone: b.driver.phone,
          driverRating: b.driver.averageRating,
          driverTrustScore: b.driver.trustScore,
          vehicleModel: primaryVehicle?.model,
          vehiclePlate: primaryVehicle?.registrationNumber,
        };
      }),
      assignedDrivers: requirement.assignments.map((a) => ({
        assignmentId: a.id,
        driverId: a.driverId,
        driverName: a.driver.fullName,
        driverPhone: a.driver.phone,
        vehiclePlate: a.driver.vehiclePlate || undefined,
        tripStatus: a.trip?.status,
        tripId: a.trip?.id,
        startOtp: a.trip?.otp,
      })),
    };
  }

  /**
   * Retry dispatch for a requirement marked NO_DRIVER_AVAILABLE.
   */
  async retryRequirement(id: string, vendorUserId: string): Promise<RequirementDetailResponseDto> {
    const user = await this.db.user.findUnique({ where: { id: vendorUserId } });
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({ where: { id } });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const isAdmin = user?.role === UserRole.ADMIN;
    if (!isAdmin && vendor && requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to retry this requirement');
    }

    if (
      requirement.status === RequirementStatus.COMPLETED ||
      requirement.status === RequirementStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot retry requirement in ${requirement.status} status`);
    }

    await this.db.requirement.update({
      where: { id },
      data: {
        status: RequirementStatus.DISPATCHING,
        updatedAt: new Date(),
      },
    });

    try {
      await this.dispatchService.dispatchRequirement(id, true);
    } catch (err: any) {
      this.logger.warn(`Retry dispatch notice for ${id}: ${err.message}`);
    }

    return this.getRequirementDetails(id, vendorUserId);
  }

  /**
   * Cancel requirement with state machine validation, active offer invalidation, and pending bid rejection.
   */
  async cancelRequirement(
    id: string,
    vendorUserId: string,
    dto: CancelRequirementDto,
  ): Promise<RequirementResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({
      where: { id },
      include: {
        offers: { where: { status: OfferStatus.SENT } },
        bids: { where: { status: BidStatus.PENDING } },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (vendor && requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to cancel this requirement');
    }

    // Validate state transition
    validateRequirementTransition(
      requirement.status as RequirementStatus,
      RequirementStatus.CANCELLED,
    );

    // Cancel in-flight sent offers if in DIRECT_DISPATCH mode
    if (requirement.offers.length > 0) {
      await this.db.offer.updateMany({
        where: {
          requirementId: id,
          status: OfferStatus.SENT,
        },
        data: { status: OfferStatus.CANCELLED },
      });

      for (const offer of requirement.offers) {
        this.notifications.emitEvent(`driver:${offer.driverId}`, 'OFFER_CANCELLED', {
          offerId: offer.id,
          requirementId: id,
          reason: dto.reason || 'Requirement was cancelled by vendor',
        });
      }
    }

    // Expire/reject pending bids if in BIDDING mode
    if (requirement.bids.length > 0) {
      await this.db.bid.updateMany({
        where: {
          requirementId: id,
          status: BidStatus.PENDING,
        },
        data: { status: BidStatus.EXPIRED },
      });

      for (const bid of requirement.bids) {
        this.notifications.emitEvent(`driver:${bid.driverId}`, 'BID_EXPIRED', {
          bidId: bid.id,
          requirementId: id,
          reason: dto.reason || 'Requirement was cancelled by requester',
        });
      }
    }

    // Calculate unfulfilled capacity to refund escrow funds back to vendor wallet
    const unassigned = requirement.quantity - requirement.assignedQuantity;
    let refundAmount = 0;
    if (unassigned > 0 && Number(requirement.totalAmount) > 0 && requirement.quantity > 0) {
      refundAmount = Math.round((unassigned / requirement.quantity) * Number(requirement.totalAmount));
    }

    const updated = await this.db.$transaction(async (tx) => {
      if (refundAmount > 0) {
        const v = await tx.vendor.update({
          where: { id: requirement.vendorId },
          data: {
            escrowBalance: { increment: refundAmount },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            accountType: 'VENDOR',
            accountId: requirement.vendorId,
            entryType: 'CREDIT',
            amount: refundAmount,
            balanceAfter: v.escrowBalance,
            referenceType: 'REQUIREMENT_REFUND',
            referenceId: requirement.id,
            description: `Refund for cancelled requirement ${requirement.id.slice(-6)} (${unassigned} unfulfilled vehicles)`,
          },
        });
      }

      return tx.requirement.update({
        where: { id },
        data: { status: RequirementStatus.CANCELLED },
      });
    }, { timeout: 30000, maxWait: 10000 });

    if (refundAmount > 0) {
      this.notifications.emitEvent(`vendor:${requirement.vendorId}`, 'WALLET_REFUNDED', {
        requirementId: id,
        refundAmount,
      });
    }

    await this.audit.log({
      userId: vendorUserId,
      action: 'REQUIREMENT_CANCELLED',
      entityType: 'REQUIREMENT',
      entityId: id,
      metadata: {
        reason: dto.reason,
        cancelledOffersCount: requirement.offers.length,
        expiredBidsCount: requirement.bids.length,
      },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(r: any): RequirementResponseDto {
    return {
      id: r.id,
      vendorId: r.vendorId,
      fulfillmentMode: r.fulfillmentMode as FulfillmentMode,
      vehicleType: r.vehicleType as unknown as VehicleType,
      quantity: r.quantity,
      assignedQuantity: r.assignedQuantity,
      pickupLocation: {
        latitude: Number(r.pickupLat),
        longitude: Number(r.pickupLng),
        address: r.pickupAddress,
      },
      dropLocation: {
        latitude: Number(r.dropLat),
        longitude: Number(r.dropLng),
        address: r.dropAddress,
      },
      reportingTime: r.reportingTime.toISOString(),
      ratePerVehicle: r.ratePerVehicle ? Number(r.ratePerVehicle) : undefined,
      suggestedBudget: r.suggestedBudget ? Number(r.suggestedBudget) : undefined,
      totalAmount: Number(r.totalAmount),
      status: r.status as RequirementStatus,
      notes: r.notes || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
