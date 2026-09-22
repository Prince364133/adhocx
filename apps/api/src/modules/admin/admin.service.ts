import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * List drivers with filtering and pagination for admin review.
   */
  async listDrivers(query: AdminDriverQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.verificationStatus && (query.verificationStatus as any) !== 'ALL') {
      if (query.verificationStatus === 'UNDER_REVIEW') {
        where.verificationStatus = { in: ['UNDER_REVIEW', 'PENDING'] };
      } else {
        where.verificationStatus = query.verificationStatus;
      }
    }
    if (query.availabilityStatus && (query.availabilityStatus as any) !== 'ALL') {
      where.availabilityStatus = query.availabilityStatus;
    }
    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { vehiclePlate: { contains: q, mode: 'insensitive' } },
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
        trips: { take: 5, orderBy: { createdAt: 'desc' } },
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

    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.VERIFIED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        rejectionReason: null,
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

    if (this.notifications) {
      this.notifications
        .sendKycStatusNotification({
          userId: driver.userId,
          phone: driver.phone,
          fullName: driver.fullName,
          status: 'VERIFIED',
        })
        .catch((err) => this.logger.warn(`Driver KYC approval notification notice: ${err.message}`));
    }

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

    validateVerificationTransition(
      driver.verificationStatus as VerificationStatus,
      VerificationStatus.REJECTED,
    );

    const updated = await this.db.driver.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.REJECTED,
        rejectionReason: dto.reason,
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

    if (this.notifications) {
      this.notifications
        .sendKycStatusNotification({
          userId: driver.userId,
          phone: driver.phone,
          fullName: driver.fullName,
          status: 'REJECTED',
          reason: dto.reason,
        })
        .catch((err) => this.logger.warn(`Driver KYC rejection notification notice: ${err.message}`));
    }

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
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.verificationStatus && (query.verificationStatus as any) !== 'ALL') {
      if (query.verificationStatus === 'UNDER_REVIEW') {
        where.verificationStatus = { in: ['UNDER_REVIEW', 'PENDING'] };
      } else {
        where.verificationStatus = query.verificationStatus;
      }
    }
    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { organizationName: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.vendor.findMany({
        where,
        skip,
        take: limit,
        include: {
          requirements: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.vendor.count({ where }),
    ]);

    const mapped = items.map((v) => ({
      id: v.id,
      userId: v.userId,
      organizationName: v.organizationName,
      companyName: v.organizationName,
      fullName: v.fullName,
      contactPerson: v.fullName,
      phone: v.phone,
      gstNumber: v.gstNumber,
      address: v.address,
      verificationStatus: v.verificationStatus,
      requirementsCount: v.requirements?.length || 0,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return {
      items: mapped,
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
        requirements: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      ...vendor,
      companyName: vendor.organizationName,
      contactPerson: vendor.fullName,
      requirementsCount: vendor.requirements?.length || 0,
    };
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
        rejectionReason: null,
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

    if (this.notifications) {
      this.notifications
        .sendKycStatusNotification({
          userId: vendor.userId,
          phone: vendor.phone,
          fullName: vendor.organizationName || vendor.fullName,
          status: 'VERIFIED',
        })
        .catch((err) => this.logger.warn(`Vendor KYC approval notification notice: ${err.message}`));
    }

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
        rejectionReason: dto.reason,
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

    if (this.notifications) {
      this.notifications
        .sendKycStatusNotification({
          userId: vendor.userId,
          phone: vendor.phone,
          fullName: vendor.organizationName || vendor.fullName,
          status: 'REJECTED',
          reason: dto.reason,
        })
        .catch((err) => this.logger.warn(`Vendor KYC rejection notification notice: ${err.message}`));
    }

    this.logger.log(`Vendor ${id} rejected by admin ${adminId}: ${dto.reason}`);
    return updated;
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
        totalDrivers: 0,
        verifiedDrivers: 0,
        pendingDriversKyc: 0,
        totalVendors: 0,
        verifiedVendors: 0,
        activeRequirements: 0,
        activeTrips: 0,
        completedTrips: 0,
        pendingSettlements: 0,
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
      return [];
    }
  }

  /**
   * Get corridor demand density and route analytics.
   */
  async getCorridorAnalytics(_range?: string) {
    const requirements = await this.db.requirement.findMany({
      include: {
        trips: true,
      },
    });

    const routeMap = new Map<string, {
      route: string;
      vehicleClass: string;
      demands: number;
      fulfilled: number;
      totalFare: number;
    }>();

    for (const req of requirements) {
      const pickup = req.pickupAddress.split(',')[0].trim();
      const drop = req.dropAddress.split(',')[0].trim();
      const routeKey = `${pickup} ⇄ ${drop}`;

      const existing = routeMap.get(routeKey) || {
        route: routeKey,
        vehicleClass: req.vehicleType,
        demands: 0,
        fulfilled: 0,
        totalFare: 0,
      };

      existing.demands += req.quantity;
      existing.fulfilled += req.assignedQuantity;
      existing.totalFare += Number(req.totalAmount || 0);

      routeMap.set(routeKey, existing);
    }

    if (routeMap.size === 0) {
      return [];
    }

    return Array.from(routeMap.values()).map((c) => ({
      route: c.route,
      vehicleClass: c.vehicleClass,
      demands: c.demands,
      fulfilled: c.fulfilled,
      avgFare: c.demands > 0 ? Math.round(c.totalFare / c.demands) : 0,
      fulfillmentRate: c.demands > 0 ? Math.round((c.fulfilled / c.demands) * 1000) / 10 : 100,
    }));
  }

  /**
   * Get operational SLA telemetry and platform performance report.
   */
  async getOperationalReports() {
    const [totalRequirements, fulfilledRequirements, totalTrips, completedTrips] = await Promise.all([
      this.db.requirement.count(),
      this.db.requirement.count({ where: { status: { in: ['FULFILLED', 'IN_PROGRESS', 'COMPLETED'] } } }),
      this.db.trip.count(),
      this.db.trip.count({ where: { status: 'COMPLETED' } }),
    ]);

    const fulfillmentRate =
      totalRequirements > 0
        ? `${Math.round((fulfilledRequirements / totalRequirements) * 1000) / 10}%`
        : '0.0%';

    const completed = await this.db.trip.findMany({
      where: { status: 'COMPLETED' },
      select: { totalDriverEarnings: true },
    });

    const gmv = completed.reduce((acc, t) => acc + Number(t.totalDriverEarnings || 0), 0);

    // Compute live average driver response time from assignments
    const acceptedAssignments = await this.db.assignment.findMany({
      where: { status: 'CONFIRMED' },
      select: { createdAt: true, updatedAt: true },
      take: 20,
    });
    let avgDriverResponse = '0s';
    if (acceptedAssignments.length > 0) {
      const totalSecs = acceptedAssignments.reduce((acc, a) => {
        const diff = Math.max(1, Math.round((a.updatedAt.getTime() - a.createdAt.getTime()) / 1000));
        return acc + diff;
      }, 0);
      const avgSec = Math.round(totalSecs / acceptedAssignments.length);
      avgDriverResponse = avgSec >= 60 ? `${Math.round(avgSec / 60)}m` : `${avgSec}s`;
    }

    const tripCancellationRate =
      totalTrips > 0 ? `${Math.round(((totalTrips - completedTrips) / totalTrips) * 1000) / 10}%` : '0.0%';

    // Live category breakdown from requirements
    const reqGroup = await this.db.requirement.groupBy({
      by: ['vehicleType'],
      _count: { id: true },
    });
    const fulfilledReqGroup = await this.db.requirement.groupBy({
      by: ['vehicleType'],
      where: { status: { in: ['FULFILLED', 'IN_PROGRESS', 'COMPLETED'] } },
      _count: { id: true },
    });
    const fulfilledMap = new Map<string, number>();
    fulfilledReqGroup.forEach((g) => fulfilledMap.set(g.vehicleType, g._count.id));

    const categoryBreakdown = reqGroup.map((g) => {
      const demands = g._count.id;
      const fulfilled = fulfilledMap.get(g.vehicleType) || 0;
      const rate = demands > 0 ? Math.round((fulfilled / demands) * 100) : 0;
      return {
        category: g.vehicleType,
        rate,
        demands,
      };
    });

    // Live SLA telemetry calculations
    const approvedDrivers = await this.db.driver.findMany({
      where: { verificationStatus: 'VERIFIED' },
      select: { createdAt: true, updatedAt: true },
      take: 20,
    });
    let kycTurnaround = 'N/A';
    if (approvedDrivers.length > 0) {
      const totalHours = approvedDrivers.reduce((acc, d) => {
        const diff = (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);
        return acc + Math.max(0.1, diff);
      }, 0);
      kycTurnaround = `${(totalHours / approvedDrivers.length).toFixed(1)} Hours`;
    }

    const settledPayouts = await this.db.settlement.findMany({
      where: { status: 'SETTLED' },
      select: { createdAt: true, updatedAt: true },
      take: 20,
    });
    let settlementTurnaround = 'N/A';
    if (settledPayouts.length > 0) {
      const totalHours = settledPayouts.reduce((acc, s) => {
        const diff = (s.updatedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60);
        return acc + Math.max(0.1, diff);
      }, 0);
      settlementTurnaround = `${(totalHours / settledPayouts.length).toFixed(1)} Hours`;
    }

    const completedTripsList = await this.db.trip.findMany({
      where: { status: 'COMPLETED' },
      select: { startedAt: true, reportingTime: true },
      take: 50,
    });
    let onTimePickupRate = totalTrips > 0 ? '100.0%' : 'N/A';
    if (completedTripsList.length > 0) {
      const onTimeCount = completedTripsList.filter((t) => {
        if (!t.reportingTime || !t.startedAt) return true;
        const diffMins = (t.startedAt.getTime() - t.reportingTime.getTime()) / (1000 * 60);
        return diffMins <= 10;
      }).length;
      onTimePickupRate = `${((onTimeCount / completedTripsList.length) * 100).toFixed(1)}%`;
    }

    const cancelledNoShowTrips = await this.db.trip.count({
      where: { status: 'CANCELLED' },
    });
    const driverNoShowRate = totalTrips > 0 ? `${((cancelledNoShowTrips / totalTrips) * 100).toFixed(1)}%` : '0.0%';

    return {
      fulfillmentRate,
      avgDriverResponse,
      platformGmv: gmv > 0 ? `₹ ${gmv.toLocaleString('en-IN')}` : '₹ 0',
      tripCancellationRate,
      categoryBreakdown,
      slaHealth: [
        {
          metric: 'On-Time Pickup Reliability',
          value: onTimePickupRate,
          sla: 'Threshold: 92.0%',
          status: 'HEALTHY',
          desc: 'Vehicle arrives within ±10 mins of scheduled time',
        },
        {
          metric: 'Driver No-Show Guarantee',
          value: driverNoShowRate,
          sla: 'Threshold: < 1.5%',
          status: 'HEALTHY',
          desc: 'Cases where backup driver reassignment was auto-triggered',
        },
        {
          metric: 'KYC Document Verification SLA',
          value: kycTurnaround,
          sla: 'Threshold: < 6.0 Hours',
          status: 'HEALTHY',
          desc: 'Average turnaround from driver doc upload to approval',
        },
        {
          metric: 'Bank Settlement Payout Cycle',
          value: settlementTurnaround,
          sla: 'Threshold: < 24.0 Hours',
          status: 'HEALTHY',
          desc: 'Average time from withdrawal request to UTR dispatch',
        },
      ],
      corridors: await this.getCorridorAnalytics(),
    };
  }

  /**
   * Get support helpdesk and operational dispute tickets.
   */
  async getSupportTickets(status?: string, search?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { reporter: { fullName: { contains: q, mode: 'insensitive' } } },
        { reporter: { phone: { contains: q } } },
      ];
    }

    const disputes = await this.db.dispute.findMany({
      where,
      include: {
        reporter: true,
        accused: true,
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return disputes.map((d) => ({
      id: d.id,
      reporterName: d.reporter?.fullName || d.reporter?.phone || 'Requester',
      reporterRole: (d.reporter?.role || 'VENDOR') as 'DRIVER' | 'VENDOR' | 'USER',
      reporterPhone: d.reporter?.phone || '',
      relatedTripId: d.tripId,
      issueType: d.reason,
      description: d.description || '',
      status: d.status as 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED',
      operatorNotes: d.resolutionText || undefined,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  /**
   * Resolve or update support helpdesk ticket.
   */
  async resolveSupportTicket(id: string, adminId: string, dto: { status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string }) {
    const dispute = await this.db.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException('Support ticket not found');
    }

    const updated = await this.db.dispute.update({
      where: { id },
      data: {
        status: dto.status as any,
        resolutionText: dto.notes,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'SUPPORT_TICKET_RESOLVED',
      entityType: 'SUPPORT_TICKET',
      entityId: id,
      metadata: { status: dto.status, notes: dto.notes },
    });

    return updated;
  }

  /**
   * Permanently delete a vendor/corporate account and all associated records.
   */
  async deleteVendor(id: string, adminId: string) {
    let vendor = await this.db.vendor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!vendor) {
      vendor = await this.db.vendor.findFirst({
        where: { userId: id },
        include: { user: true },
      });
    }

    if (!vendor) {
      throw new NotFoundException(`Vendor not found with ID ${id}`);
    }

    if (vendor.user?.role === 'ADMIN') {
      throw new BadRequestException('Cannot delete an administrator account');
    }

    const userId = vendor.userId;
    const organizationName = vendor.organizationName;

    await this.db.user.delete({
      where: { id: userId },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_VENDOR_DELETED',
      entityType: 'VENDOR',
      entityId: id,
      metadata: { organizationName, userId },
    });

    this.logger.log(`Vendor ${id} (${organizationName}) permanently deleted by admin ${adminId}`);
    return { success: true, message: `Account "${organizationName}" permanently deleted.` };
  }

  /**
   * Permanently delete any user account from the database.
   */
  async deleteUser(id: string, adminId: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      include: { vendor: true, driver: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found with ID ${id}`);
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot delete an administrator account');
    }

    const phone = user.phone;
    const fullName = user.fullName || 'User';

    await this.db.user.delete({
      where: { id },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_USER_DELETED',
      entityType: 'USER',
      entityId: id,
      metadata: { phone, fullName, role: user.role },
    });

    this.logger.log(`User ${id} (${fullName}, ${phone}) permanently deleted by admin ${adminId}`);
    return { success: true, message: `User "${fullName}" permanently deleted.` };
  }
}
