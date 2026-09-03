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
  RequirementQueryDto,
  CancelRequirementDto,
  RequirementStatus,
  VerificationStatus,
  OfferStatus,
  BidStatus,
  FulfillmentMode,
  VehicleType,
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
    const vendor = await this.db.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (vendor && vendor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Vendor account must be VERIFIED before creating requirements');
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

    const requirement = await this.db.requirement.create({
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
      this.dispatchService.dispatchRequirement(requirement.id).catch((err) => {
        this.logger.error(`Auto-dispatch failed for requirement ${requirement.id}: ${err.message}`);
      });
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
   * Get detailed requirement view including remaining slots, offer stats, bids, and assigned drivers.
   */
  async getRequirementDetails(id: string, vendorUserId: string): Promise<RequirementDetailResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({
      where: { id },
      include: {
        offers: true,
        bids: {
          include: {
            driver: {
              include: { user: true, vehicles: true },
            },
          },
          orderBy: { bidAmount: 'asc' },
        },
        assignments: {
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

    const baseDto = this.mapToDto(requirement);

    return {
      ...baseDto,
      remainingQuantity: requirement.quantity - requirement.assignedQuantity,
      offersCount: requirement.offers.length,
      bidsCount: requirement.bids.length,
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
      })),
    };
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

    const updated = await this.db.requirement.update({
      where: { id },
      data: { status: RequirementStatus.CANCELLED },
    });

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
