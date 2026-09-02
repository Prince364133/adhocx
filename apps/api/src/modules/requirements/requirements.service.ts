import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
  VehicleType,
  validateRequirementTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create and post a new vehicle requirement.
   * Only VERIFIED vendors can post requirements.
   * Automatically triggers initial dispatch wave.
   */
  async createRequirement(vendorUserId: string, dto: CreateRequirementDto): Promise<RequirementResponseDto> {
    const vendor = await this.db.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (!vendor) {
      throw new ForbiddenException('Only registered vendors can create requirements');
    }

    if (vendor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Vendor account must be VERIFIED before creating requirements');
    }

    const totalAmount = dto.quantity * dto.ratePerVehicle;

    const requirement = await this.db.requirement.create({
      data: {
        vendorId: vendor.id,
        vehicleType: dto.vehicleType as any,
        quantity: dto.quantity,
        assignedQuantity: 0,
        pickupLat: dto.pickupLocation.latitude,
        pickupLng: dto.pickupLocation.longitude,
        pickupAddress: dto.pickupLocation.address || 'Pickup Location',
        dropLat: dto.dropLocation.latitude,
        dropLng: dto.dropLocation.longitude,
        dropAddress: dto.dropLocation.address || 'Drop Location',
        reportingTime: new Date(dto.reportingTime),
        ratePerVehicle: dto.ratePerVehicle,
        totalAmount,
        status: RequirementStatus.POSTED,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: vendorUserId,
      action: 'REQUIREMENT_CREATED',
      entityType: 'REQUIREMENT',
      entityId: requirement.id,
      metadata: {
        vehicleType: dto.vehicleType,
        quantity: dto.quantity,
        ratePerVehicle: dto.ratePerVehicle,
        totalAmount,
      },
    });

    // Auto-trigger dispatch wave
    this.dispatchService.dispatchRequirement(requirement.id).catch((err) => {
      this.logger.error(`Auto-dispatch failed for requirement ${requirement.id}: ${err.message}`);
    });

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
   * Get detailed requirement view including remaining slots, offer stats, and assigned drivers.
   */
  async getRequirementDetails(id: string, vendorUserId: string): Promise<RequirementDetailResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({
      where: { id },
      include: {
        offers: true,
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
   * Cancel requirement with state machine validation and active offer invalidation.
   */
  async cancelRequirement(
    id: string,
    vendorUserId: string,
    dto: CancelRequirementDto,
  ): Promise<RequirementResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const requirement = await this.db.requirement.findUnique({
      where: { id },
      include: { offers: { where: { status: OfferStatus.SENT } } },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (vendor && requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to cancel this requirement');
    }

    // Validate state transition per docs/12_STATE_MACHINES.md
    validateRequirementTransition(
      requirement.status as RequirementStatus,
      RequirementStatus.CANCELLED,
    );

    // Cancel in-flight sent offers
    if (requirement.offers.length > 0) {
      await this.db.offer.updateMany({
        where: {
          requirementId: id,
          status: OfferStatus.SENT,
        },
        data: { status: OfferStatus.CANCELLED },
      });

      // Notify offered drivers that the offer was cancelled
      for (const offer of requirement.offers) {
        this.notifications.emitEvent(`driver:${offer.driverId}`, 'OFFER_CANCELLED', {
          offerId: offer.id,
          requirementId: id,
          reason: dto.reason || 'Requirement was cancelled by vendor',
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
      },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(r: any): RequirementResponseDto {
    return {
      id: r.id,
      vendorId: r.vendorId,
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
      ratePerVehicle: Number(r.ratePerVehicle),
      totalAmount: Number(r.totalAmount),
      status: r.status as RequirementStatus,
      notes: r.notes || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
