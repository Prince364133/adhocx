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
import { CreateSupportQueryDto } from './dto/create-support-query.dto';
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

  /**
   * File a general support query or ticket from corporate app / booker
   */
  async createSupportQuery(userId: string, dto: CreateSupportQueryDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });

    // If tripId is provided and valid, attempt to create a dispute ticket
    if (dto.tripId && dto.tripId.trim().length > 0) {
      try {
        const trip = await this.db.trip.findUnique({
          where: { id: dto.tripId },
          include: { vendor: { include: { user: true } }, driver: { include: { user: true } } },
        });

        if (trip) {
          const accusedUserId = trip.vendor.userId === userId ? trip.driver.userId : trip.vendor.userId;
          const dispute = await this.db.dispute.create({
            data: {
              tripId: trip.id,
              reporterId: userId,
              accusedId: accusedUserId,
              reason: `[${dto.category}] ${dto.subject}`,
              description: dto.description,
              status: DisputeStatus.OPEN,
            },
            include: { reporter: true, accused: true },
          });

          this.notifications.emitEvent('admin:disputes', 'NEW_SUPPORT_TICKET_FILED', {
            disputeId: dispute.id,
            tripId: trip.id,
            reason: dispute.reason,
            reporterName: dispute.reporter.fullName || 'Corporate User',
          });

          await this.audit.log({
            userId,
            action: 'SUPPORT_TICKET_FILED',
            entityType: 'SUPPORT_TICKET',
            entityId: dispute.id,
            metadata: { tripId: trip.id, category: dto.category, subject: dto.subject },
          });

          return {
            id: dispute.id,
            category: dto.category,
            subject: dto.subject,
            description: dto.description,
            tripId: trip.id,
            status: 'PENDING',
            createdAt: dispute.createdAt.toISOString(),
          };
        }
      } catch (_) {}
    }

    // Otherwise create general corporate support inquiry via leadCapture
    const email = user?.email || dto.contactEmail || 'user@adhocx.com';
    const phone = user?.phone || dto.contactPhone || '';
    const companyName = user?.vendor?.organizationName || dto.companyName || 'Corporate Client';
    const contactName = user?.fullName || dto.contactPerson || 'Requester';

    const formattedNotes = `Subject: ${dto.subject}\nPriority: ${dto.priority || 'NORMAL'}\n\n${dto.description}`;

    const ticket = await this.db.leadCapture.create({
      data: {
        type: 'SUPPORT_TICKET',
        email,
        phone,
        companyName,
        contactName,
        fleetRequirements: dto.category,
        notes: formattedNotes,
        status: 'NEW',
      },
    });

    this.notifications.emitEvent('admin:disputes', 'NEW_SUPPORT_TICKET_FILED', {
      ticketId: ticket.id,
      category: dto.category,
      subject: dto.subject,
      companyName,
      reporterName: contactName,
    });

    await this.audit.log({
      userId,
      action: 'SUPPORT_TICKET_FILED',
      entityType: 'SUPPORT_TICKET',
      entityId: ticket.id,
      metadata: { category: dto.category, subject: dto.subject, companyName },
    });

    this.logger.log(`Support ticket ${ticket.id} filed by user ${userId} (${companyName})`);

    return {
      id: ticket.id,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
      status: 'PENDING',
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async getMySupportQueries(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });

    // 1. Get disputes filed by this user
    const disputes = await this.db.dispute.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 2. Get leadCapture support tickets filed by user's email, phone, or company name
    const orCond: any[] = [];
    if (user?.email) orCond.push({ email: user.email });
    if (user?.phone) orCond.push({ phone: user.phone });
    if (user?.vendor?.organizationName) orCond.push({ companyName: user.vendor.organizationName });

    let leadTickets: any[] = [];
    if (orCond.length > 0) {
      leadTickets = await this.db.leadCapture.findMany({
        where: {
          type: 'SUPPORT_TICKET',
          OR: orCond,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    const items = [
      ...disputes.map((d) => {
        let cat = 'Trip Issue';
        let subj = d.reason;
        if (d.reason.startsWith('[') && d.reason.includes(']')) {
          const endIdx = d.reason.indexOf(']');
          cat = d.reason.substring(1, endIdx);
          subj = d.reason.substring(endIdx + 1).trim();
        }
        return {
          id: d.id,
          category: cat,
          subject: subj,
          description: d.description || '',
          tripId: d.tripId,
          status: (d.status === 'OPEN' ? 'PENDING' : d.status) as string,
          resolutionText: d.resolutionText || undefined,
          createdAt: d.createdAt.toISOString(),
        };
      }),
      ...leadTickets.map((t) => {
        const raw = t.notes || '';
        let subj = t.fleetRequirements || 'General Inquiry';
        let desc = raw;
        if (raw.startsWith('Subject: ')) {
          const lines = raw.split('\n\n');
          const headerLines = lines[0].split('\n');
          subj = headerLines[0].replace('Subject: ', '').trim();
          desc = lines.slice(1).join('\n\n');
        }
        let operatorNotes: string | undefined;
        if (desc.includes('[ADMIN RESOLUTION NOTE')) {
          const splitRes = desc.split('[ADMIN RESOLUTION NOTE');
          desc = splitRes[0].trim();
          operatorNotes = ('[ADMIN RESOLUTION NOTE' + splitRes[1]).replace(/\[ADMIN RESOLUTION NOTE \([^)]+\)\]:\s*/, '').trim();
        }
        return {
          id: t.id,
          category: t.fleetRequirements || 'Support Query',
          subject: subj,
          description: desc,
          status: (t.status === 'NEW' ? 'PENDING' : t.status) as string,
          resolutionText: operatorNotes,
          createdAt: t.createdAt.toISOString(),
        };
      }),
    ];

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
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
