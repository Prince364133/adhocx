import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  AdminDriverQueryDto,
  AdminVendorQueryDto,
  VerifyDriverKycDto,
  RejectDriverKycDto,
  SuspendDriverDto,
  ReactivateDriverDto,
  VerifyVendorDto,
  RejectVendorDto,
  VerificationStatus,
  validateVerificationTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List drivers with filtering and pagination for admin review.
   */
  async listDrivers(query: AdminDriverQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.verificationStatus) {
      where.verificationStatus = query.verificationStatus;
    }
    if (query.availabilityStatus) {
      where.availabilityStatus = query.availabilityStatus;
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { vehiclePlate: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.driver.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Get complete driver details including vehicles for verification review.
   */
  async getDriverDetails(id: string) {
    const driver = await this.db.driver.findUnique({
      where: { id },
      include: {
        user: true,
        vehicles: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  /**
   * Verify driver KYC.
   * State Transition: UNDER_REVIEW -> VERIFIED per docs/12_STATE_MACHINES.md.
   */
  async verifyDriver(id: string, adminId: string, dto: VerifyDriverKycDto) {
    const driver = await this.db.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Validate state transition
    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.VERIFIED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_DRIVER_VERIFIED',
      entityType: 'DRIVER',
      entityId: id,
      metadata: {
        previousStatus: driver.verificationStatus,
        nextStatus: VerificationStatus.VERIFIED,
        notes: dto.notes,
      },
    });

    this.logger.log(`Driver ${id} verified by admin ${adminId}`);
    return updated;
  }

  /**
   * Reject driver KYC.
   * State Transition: UNDER_REVIEW -> REJECTED per docs/12_STATE_MACHINES.md.
   */
  async rejectDriver(id: string, adminId: string, dto: RejectDriverKycDto) {
    const driver = await this.db.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Validate state transition
    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.REJECTED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.REJECTED,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_DRIVER_REJECTED',
      entityType: 'DRIVER',
      entityId: id,
      metadata: {
        previousStatus: driver.verificationStatus,
        nextStatus: VerificationStatus.REJECTED,
        reason: dto.reason,
      },
    });

    this.logger.log(`Driver ${id} rejected by admin ${adminId}: ${dto.reason}`);
    return updated;
  }

  /**
   * Suspend verified driver.
   * State Transition: VERIFIED -> SUSPENDED per docs/12_STATE_MACHINES.md.
   */
  async suspendDriver(id: string, adminId: string, dto: SuspendDriverDto) {
    const driver = await this.db.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.SUSPENDED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.SUSPENDED,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_DRIVER_SUSPENDED',
      entityType: 'DRIVER',
      entityId: id,
      metadata: {
        previousStatus: driver.verificationStatus,
        nextStatus: VerificationStatus.SUSPENDED,
        reason: dto.reason,
      },
    });

    this.logger.log(`Driver ${id} suspended by admin ${adminId}: ${dto.reason}`);
    return updated;
  }

  /**
   * Reactivate suspended driver.
   * State Transition: SUSPENDED -> VERIFIED per docs/12_STATE_MACHINES.md.
   */
  async reactivateDriver(id: string, adminId: string, dto: ReactivateDriverDto) {
    const driver = await this.db.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.VERIFIED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_DRIVER_REACTIVATED',
      entityType: 'DRIVER',
      entityId: id,
      metadata: {
        previousStatus: driver.verificationStatus,
        nextStatus: VerificationStatus.VERIFIED,
        notes: dto.notes,
      },
    });

    this.logger.log(`Driver ${id} reactivated by admin ${adminId}`);
    return updated;
  }

  /**
   * List vendors with filtering and pagination for admin review.
   */
  async listVendors(query: AdminVendorQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.verificationStatus) {
      where.verificationStatus = query.verificationStatus;
    }
    if (query.search) {
      where.OR = [
        { organizationName: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.vendor.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Get vendor details for admin review.
   */
  async getVendorDetails(id: string) {
    const vendor = await this.db.vendor.findUnique({
      where: { id },
      include: {
        user: true,
        requirements: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  /**
   * Verify / Approve vendor organization.
   * State Transition: UNDER_REVIEW/PENDING -> VERIFIED per docs/12_STATE_MACHINES.md.
   */
  async verifyVendor(id: string, adminId: string, dto: VerifyVendorDto) {
    const vendor = await this.db.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updated = await this.db.vendor.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        approvedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_VENDOR_VERIFIED',
      entityType: 'VENDOR',
      entityId: id,
      metadata: {
        previousStatus: vendor.verificationStatus,
        nextStatus: VerificationStatus.VERIFIED,
        notes: dto.notes,
      },
    });

    this.logger.log(`Vendor ${id} verified by admin ${adminId}`);
    return updated;
  }

  /**
   * Reject vendor organization.
   */
  async rejectVendor(id: string, adminId: string, dto: RejectVendorDto) {
    const vendor = await this.db.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updated = await this.db.vendor.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.REJECTED,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_VENDOR_REJECTED',
      entityType: 'VENDOR',
      entityId: id,
      metadata: {
        previousStatus: vendor.verificationStatus,
        nextStatus: VerificationStatus.REJECTED,
        reason: dto.reason,
      },
    });

    this.logger.log(`Vendor ${id} rejected by admin ${adminId}: ${dto.reason}`);
    return updated;
  }

  /**
   * Get operational KPI metrics across the platform.
   */
  async getOperationalMetrics() {
    const [
      totalDrivers,
      verifiedDrivers,
      pendingDriversKyc,
      totalVendors,
      verifiedVendors,
      activeRequirements,
      activeTrips,
      completedTrips,
      pendingSettlements,
    ] = await Promise.all([
      this.db.driver.count(),
      this.db.driver.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
      this.db.driver.count({ where: { verificationStatus: VerificationStatus.UNDER_REVIEW } }),
      this.db.vendor.count(),
      this.db.vendor.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
      this.db.requirement.count({
        where: { status: { in: ['POSTED', 'DISPATCHING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'IN_PROGRESS'] } },
      }),
      this.db.trip.count({
        where: { status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] } },
      }),
      this.db.trip.count({ where: { status: 'COMPLETED' } }),
      this.db.settlement.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalDrivers,
      verifiedDrivers,
      pendingDriversKyc,
      totalVendors,
      verifiedVendors,
      activeRequirements,
      activeTrips,
      completedTrips,
      pendingSettlements,
    };
  }

  /**
   * Get recent platform audit logs.
   */
  async getAuditLogs(limit = 50) {
    const logs = await this.db.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, phone: true, role: true } },
      },
    });

    return logs.map((log: any) => ({
      id: log.id,
      actorId: log.actorId,
      actorPhone: log.actor?.phone,
      actorRole: log.actor?.role || log.actorRole,
      action: log.action,
      entityName: log.entityName,
      entityId: log.entityId,
      payload: log.payload,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}

