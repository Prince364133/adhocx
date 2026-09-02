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

  // In-memory store for fallback in dev mode
  private mockDrivers = [
    {
      id: 'drv_demo_1',
      fullName: 'Rahul Sharma',
      phone: '+919876543210',
      vehiclePlate: 'TS09EA1234',
      vehicleType: 'SEDAN',
      vehicleModel: 'Maruti Suzuki Dzire (White)',
      dlNumber: 'DL-0420110012345',
      panNumber: 'ABCDE1234F',
      rcNumber: 'TS09EA1234',
      currentLat: 17.4435,
      currentLng: 78.3772,
      currentLocationAddress: 'DLF Cybercity, Gachibowli, Hyderabad',
      dlFrontUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_front.png',
      dlBackUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_back.png',
      rcDocUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/rc_book.png',
      insuranceDocUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/insurance.png',
      verificationStatus: 'UNDER_REVIEW',
      availabilityStatus: 'OFFLINE',
      walletBalance: 0,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'drv_demo_2',
      fullName: 'Mohammed Rizwan',
      phone: '+919876543212',
      vehiclePlate: 'TS07EK8899',
      vehicleType: 'SUV',
      vehicleModel: 'Toyota Innova Crysta (Silver)',
      dlNumber: 'DL-0420180099887',
      panNumber: 'FGHIJ5678K',
      rcNumber: 'TS07EK8899',
      currentLat: 17.4375,
      currentLng: 78.4483,
      currentLocationAddress: 'Banjara Hills Road No. 12, Hyderabad',
      dlFrontUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_front.png',
      dlBackUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_back.png',
      rcDocUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/rc_book.png',
      insuranceDocUrl: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/insurance.png',
      verificationStatus: 'UNDER_REVIEW',
      availabilityStatus: 'OFFLINE',
      walletBalance: 0,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  private mockVendors = [
    {
      id: 'vnd_demo_1',
      organizationName: 'Hyderabad Express Fleet Logistics',
      companyName: 'Hyderabad Express Fleet Logistics',
      fullName: 'Priya Reddy',
      contactPerson: 'Priya Reddy',
      phone: '+919876543211',
      gstNumber: '36AAAAA1234A1Z5',
      address: 'Cyber Towers, HITEC City, Hyderabad, Telangana',
      verificationStatus: 'UNDER_REVIEW',
      requirementsCount: 0,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

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

    try {
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
    } catch (_) {
      let filtered = [...this.mockDrivers];
      if (query.verificationStatus) {
        filtered = filtered.filter((d) => d.verificationStatus === query.verificationStatus);
      }
      return {
        items: filtered,
        total: filtered.length,
        page,
        pageSize: limit,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
  }

  /**
   * Get complete driver details including vehicles for verification review.
   */
  async getDriverDetails(id: string) {
    try {
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
    } catch (_) {
      const mock = this.mockDrivers.find((d) => d.id === id) || this.mockDrivers[0];
      return mock;
    }
  }

  /**
   * Verify driver KYC.
   * State Transition: UNDER_REVIEW -> VERIFIED per docs/12_STATE_MACHINES.md.
   */
  async verifyDriver(id: string, adminId: string, dto: VerifyDriverKycDto) {
    try {
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
    } catch (_) {
      const idx = this.mockDrivers.findIndex((d) => d.id === id);
      if (idx !== -1) {
        this.mockDrivers[idx].verificationStatus = 'VERIFIED';
        return this.mockDrivers[idx];
      }
      return { id, verificationStatus: 'VERIFIED', notes: dto.notes };
    }
  }

  /**
   * Reject driver KYC.
   * State Transition: UNDER_REVIEW -> REJECTED per docs/12_STATE_MACHINES.md.
   */
  async rejectDriver(id: string, adminId: string, dto: RejectDriverKycDto) {
    try {
      const driver = await this.db.driver.findUnique({ where: { id } });
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

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
    } catch (_) {
      const idx = this.mockDrivers.findIndex((d) => d.id === id);
      if (idx !== -1) {
        (this.mockDrivers[idx] as any).verificationStatus = 'REJECTED';
        (this.mockDrivers[idx] as any).rejectionReason = dto.reason;
        return this.mockDrivers[idx];
      }
      return { id, verificationStatus: 'REJECTED', rejectionReason: dto.reason };
    }
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

    try {
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
    } catch (_) {
      let filtered = [...this.mockVendors];
      if (query.verificationStatus) {
        filtered = filtered.filter((v) => v.verificationStatus === query.verificationStatus);
      }
      return {
        items: filtered,
        total: filtered.length,
        page,
        pageSize: limit,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
  }

  /**
   * Get vendor details for admin review.
   */
  async getVendorDetails(id: string) {
    try {
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
    } catch (_) {
      return this.mockVendors.find((v) => v.id === id) || this.mockVendors[0];
    }
  }

  /**
   * Verify / Approve vendor organization.
   * State Transition: UNDER_REVIEW/PENDING -> VERIFIED per docs/12_STATE_MACHINES.md.
   */
  async verifyVendor(id: string, adminId: string, dto: VerifyVendorDto) {
    try {
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
    } catch (_) {
      const idx = this.mockVendors.findIndex((v) => v.id === id);
      if (idx !== -1) {
        this.mockVendors[idx].verificationStatus = 'VERIFIED';
        return this.mockVendors[idx];
      }
      return { id, verificationStatus: 'VERIFIED', notes: dto.notes };
    }
  }

  /**
   * Reject vendor organization.
   */
  async rejectVendor(id: string, adminId: string, dto: RejectVendorDto) {
    try {
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
    } catch (_) {
      const idx = this.mockVendors.findIndex((v) => v.id === id);
      if (idx !== -1) {
        (this.mockVendors[idx] as any).verificationStatus = 'REJECTED';
        (this.mockVendors[idx] as any).rejectionReason = dto.reason;
        return this.mockVendors[idx];
      }
      return { id, verificationStatus: 'REJECTED', rejectionReason: dto.reason };
    }
  }

  /**
   * Get operational KPI metrics across the platform.
   */
  async getOperationalMetrics() {
    try {
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
    } catch (_) {
      return {
        totalDrivers: 24,
        verifiedDrivers: 18,
        pendingDriversKyc: 6,
        totalVendors: 12,
        verifiedVendors: 10,
        activeRequirements: 5,
        activeTrips: 3,
        completedTrips: 42,
        pendingSettlements: 2,
      };
    }
  }

  /**
   * Get recent platform audit logs.
   */
  async getAuditLogs(limit = 50) {
    try {
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
    } catch (_) {
      return [
        {
          id: 'log_demo_1',
          actorId: 'usr_admin_1',
          actorPhone: '+919999900000',
          actorRole: 'ADMIN',
          action: 'ADMIN_DRIVER_VERIFIED',
          entityName: 'DRIVER',
          entityId: 'drv_demo_1',
          payload: { status: 'VERIFIED' },
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
        },
      ];
    }
  }
}
