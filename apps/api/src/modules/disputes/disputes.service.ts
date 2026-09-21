import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  DisputeResponseDto,
  DisputeQueryDto,
  DisputeStatus,
  TripStatus,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * File a dispute ticket for an issue on a trip (e.g. route deviation, fare disagreement, vehicle condition).
   */
  async createDispute(reporterUserId: string, dto: CreateDisputeDto): Promise<DisputeResponseDto> {
    const trip = await this.db.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        vendor: { include: { user: true } },
        driver: { include: { user: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const isVendor = trip.vendor.userId === reporterUserId;
    const isDriver = trip.driver.userId === reporterUserId;

    if (!isVendor && !isDriver) {
      throw new ForbiddenException('Only trip participants can file a dispute ticket');
    }

    // QA-09: Require trip to be commenced or finished before dispute can be filed
    const allowedStatuses: TripStatus[] = [
      TripStatus.ARRIVED,
      TripStatus.IN_PROGRESS,
      TripStatus.COMPLETED,
      TripStatus.CANCELLED,
    ];
    if (!allowedStatuses.includes(trip.status as TripStatus)) {
      throw new BadRequestException('Disputes can only be filed once the trip has commenced, arrived, completed, or cancelled');
    }

    // QA-09: Prevent duplicate active disputes from the same reporter
    const existingActiveDispute = await this.db.dispute.findFirst({
      where: {
        tripId: trip.id,
        reporterId: reporterUserId,
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
    });
    if (existingActiveDispute) {
      throw new ConflictException('You already have an active dispute ticket under review for this trip');
    }

    const accusedUserId = isVendor ? trip.driver.userId : trip.vendor.userId;

    const dispute = await this.db.dispute.create({
      data: {
        tripId: trip.id,
        reporterId: reporterUserId,
        accusedId: accusedUserId,
        reason: dto.reason,
        description: dto.description,
        status: DisputeStatus.OPEN,
      },
      include: {
        reporter: true,
        accused: true,
      },
    });

    // Notify operations/admin & accused participant
    this.notifications.emitEvent('admin:disputes', 'NEW_DISPUTE_FILED', {
      disputeId: dispute.id,
      tripId: trip.id,
      reason: dto.reason,
      reporterName: dispute.reporter.fullName || 'User',
    });

    this.notifications.emitEvent(`user:${accusedUserId}`, 'DISPUTE_FILED_AGAINST_TRIP', {
      disputeId: dispute.id,
      tripId: trip.id,
      reason: dto.reason,
    });

    await this.audit.log({
      userId: reporterUserId,
      action: 'DISPUTE_FILED',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      metadata: { tripId: trip.id, reason: dto.reason, accusedUserId },
    });

    this.logger.log(`Dispute ${dispute.id} filed for trip ${trip.id} by user ${reporterUserId}`);
    return this.mapToDto(dispute);
  }

  /**
   * List disputes with status filtering (for Admin and Support desks).
   */
  async getDisputes(query?: DisputeQueryDto): Promise<{ items: DisputeResponseDto[]; total: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.tripId) {
      where.tripId = query.tripId;
    }

    const [items, total] = await Promise.all([
      this.db.dispute.findMany({
        where,
        include: {
          reporter: true,
          accused: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.dispute.count({ where }),
    ]);

    return {
      items: items.map((d) => this.mapToDto(d)),
      total,
    };
  }

  /**
   * Admin or Support agent resolves a dispute ticket.
   */
  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    dto: ResolveDisputeDto,
  ): Promise<DisputeResponseDto> {
    const dispute = await this.db.dispute.findUnique({
      where: { id: disputeId },
      include: { reporter: true, accused: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute ticket not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.REJECTED) {
      throw new BadRequestException(`Dispute is already closed with status ${dispute.status}`);
    }

    const updated = await this.db.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolutionText: dto.resolutionText,
      },
      include: { reporter: true, accused: true },
    });

    // Notify both participants
    for (const userId of [dispute.reporterId, dispute.accusedId]) {
      this.notifications.emitEvent(`user:${userId}`, 'DISPUTE_RESOLVED', {
        disputeId,
        status: dto.status,
        resolutionText: dto.resolutionText,
      });
    }

    await this.audit.log({
      userId: adminUserId,
      action: 'DISPUTE_RESOLVED',
      entityType: 'DISPUTE',
      entityId: disputeId,
      metadata: { status: dto.status, resolutionText: dto.resolutionText },
    });

    this.logger.log(`Dispute ${disputeId} marked as ${dto.status} by admin ${adminUserId}`);
    return this.mapToDto(updated);
  }

  async getUserDisputes(userId: string): Promise<DisputeResponseDto[]> {
    const items = await this.db.dispute.findMany({
      where: {
        OR: [{ reporterId: userId }, { accusedId: userId }],
      },
      include: { reporter: true, accused: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => this.mapToDto(i));
  }

  async getDisputeById(disputeId: string, userId: string, isAdmin = false): Promise<DisputeResponseDto> {
    const dispute = await this.db.dispute.findUnique({
      where: { id: disputeId },
      include: { reporter: true, accused: true },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute ticket not found');
    }
    if (!isAdmin && dispute.reporterId !== userId && dispute.accusedId !== userId) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }
    return this.mapToDto(dispute);
  }

  private mapToDto(d: any): DisputeResponseDto {
    return {
      id: d.id,
      tripId: d.tripId,
      reporterId: d.reporterId,
      accusedId: d.accusedId,
      reason: d.reason,
      description: d.description || undefined,
      status: d.status as DisputeStatus,
      resolutionText: d.resolutionText || undefined,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      reporterName: d.reporter?.fullName || undefined,
      accusedName: d.accused?.fullName || undefined,
    };
  }
}
