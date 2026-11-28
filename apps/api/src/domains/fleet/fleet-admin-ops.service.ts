import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminFleetPayoutQueryDto,
  AdminFleetSupportQueryDto,
  AdminReplyFleetSupportDto,
  AdminUpdateFleetSupportStatusDto,
  AuthUserDto,
  CreateFleetAdminUserDto,
  CreateFleetShortfallDto,
  FleetAdminRole,
  FleetNotificationEventType,
  FleetPayoutStatus,
  FleetSupportTicketStatus,
  ProcessFleetPayoutDto,
  UpdateFleetAdminUserDto,
} from '@adhocx/contracts';
import { hashPassword } from '../../common/utils/password.util';
import { DatabaseService } from '../../database/database.service';
import { buildFleetPhoneVariants, normalizeFleetPhone } from './fleet-phone.util';
import { FleetNotificationsService } from './portal/notifications/fleet-notifications.service';
import { FleetSupportService } from './portal/support/fleet-support.service';

const VALID_PAYOUT_TRANSITIONS: Record<FleetPayoutStatus, FleetPayoutStatus[]> = {
  [FleetPayoutStatus.REQUESTED]: [
    FleetPayoutStatus.UNDER_REVIEW,
    FleetPayoutStatus.APPROVED,
    FleetPayoutStatus.SETTLED,
    FleetPayoutStatus.REJECTED,
  ],
  [FleetPayoutStatus.UNDER_REVIEW]: [
    FleetPayoutStatus.APPROVED,
    FleetPayoutStatus.SETTLED,
    FleetPayoutStatus.REJECTED,
  ],
  [FleetPayoutStatus.APPROVED]: [
    FleetPayoutStatus.SETTLED,
    FleetPayoutStatus.REJECTED,
  ],
  [FleetPayoutStatus.SETTLED]: [],
  [FleetPayoutStatus.REJECTED]: [],
};

@Injectable()
export class FleetAdminOperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fleetNotifications: FleetNotificationsService,
    private readonly fleetSupport: FleetSupportService,
  ) {}

  private async ensureFleetExists(fleetId: string) {
    const fleet = await this.db.fleet.findUnique({ where: { id: fleetId } });
    if (!fleet) {
      throw new NotFoundException({
        errorCode: 'FLEET_NOT_FOUND',
        message: `Fleet with ID ${fleetId} not found`,
      });
    }
    return fleet;
  }

  private async writeAudit(
    actor: Pick<AuthUserDto, 'id' | 'role'> | undefined,
    action: string,
    entityName: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    if (!this.db.auditLog?.create) return;
    await this.db.auditLog
      .create({
        data: {
          actorId: actor?.id || null,
          actorRole: actor?.role || 'ADMIN',
          action,
          entityName,
          entityId,
          payload: payload as any,
        },
      })
      .catch(() => null);
  }

  private mapPortalUser(user: any) {
    return {
      id: user.id,
      fleetId: user.fleetId,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role as FleetAdminRole,
      status: user.status,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : undefined,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  // ── Fleet Portal Users (FleetAdminUser) ──────────────────────────────────────

  async listFleetUsers(fleetId: string) {
    await this.ensureFleetExists(fleetId);
    const users = await this.db.fleetAdminUser.findMany({
      where: { fleetId },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
    return users.map((u) => this.mapPortalUser(u));
  }

  async createFleetUser(
    fleetId: string,
    dto: CreateFleetAdminUserDto,
    admin?: AuthUserDto,
  ) {
    await this.ensureFleetExists(fleetId);

    const fullName = dto.fullName.trim();
    const cleanPhone = normalizeFleetPhone(dto.phone);
    const digits = cleanPhone.replace(/\D/g, '');
    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    const password = dto.password.trim();

    if (!fullName || digits.length < 10) {
      throw new BadRequestException({
        errorCode: 'INVALID_FLEET_USER',
        message: 'A valid full name and 10+ digit phone number are required.',
      });
    }
    if (password.length < 8) {
      throw new BadRequestException({
        errorCode: 'WEAK_PASSWORD',
        message: 'Portal password must be at least 8 characters.',
      });
    }

    const variants = buildFleetPhoneVariants(cleanPhone);
    const existing = await this.db.fleetAdminUser.findFirst({
      where: {
        OR: [
          { phone: { in: variants } },
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true, phone: true, email: true },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: 'FLEET_USER_CONFLICT',
        message: 'A Fleet Portal user with this phone number or email already exists.',
      });
    }

    const passwordHash = await hashPassword(password);
    try {
      const created = await this.db.fleetAdminUser.create({
        data: {
          fleetId,
          fullName,
          phone: cleanPhone,
          email,
          passwordHash,
          role: dto.role || FleetAdminRole.FLEET_OWNER,
          status: 'ACTIVE',
          permissions: dto.permissions || [],
        },
      });

      await this.writeAudit(admin, 'FLEET_PORTAL_USER_CREATED', 'FleetAdminUser', created.id, {
        fleetId,
        role: created.role,
        phone: created.phone,
        email: created.email,
      });

      return this.mapPortalUser(created);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({
          errorCode: 'FLEET_USER_CONFLICT',
          message: 'A Fleet Portal user with this phone number or email already exists.',
        });
      }
      throw err;
    }
  }

  async updateFleetUser(
    fleetId: string,
    userId: string,
    dto: UpdateFleetAdminUserDto,
    admin?: AuthUserDto,
  ) {
    const existing = await this.db.fleetAdminUser.findFirst({
      where: { id: userId, fleetId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'FLEET_USER_NOT_FOUND',
        message: 'Fleet Portal user not found for this fleet.',
      });
    }

    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) {
      const trimmed = dto.fullName.trim();
      if (!trimmed) {
        throw new BadRequestException({
          errorCode: 'INVALID_FLEET_USER',
          message: 'Full name cannot be empty.',
        });
      }
      data.fullName = trimmed;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.permissions !== undefined) {
      data.permissions = dto.permissions;
    }
    if (dto.password !== undefined) {
      const pwd = dto.password.trim();
      if (pwd.length < 8) {
        throw new BadRequestException({
          errorCode: 'WEAK_PASSWORD',
          message: 'Portal password must be at least 8 characters.',
        });
      }
      data.passwordHash = await hashPassword(pwd);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        errorCode: 'EMPTY_UPDATE',
        message: 'Provide at least one field to update.',
      });
    }

    const updated = await this.db.fleetAdminUser.update({
      where: { id: existing.id },
      data,
    });

    await this.writeAudit(admin, 'FLEET_PORTAL_USER_UPDATED', 'FleetAdminUser', updated.id, {
      fleetId,
      updatedFields: Object.keys(data).filter((k) => k !== 'passwordHash'),
      passwordReset: Boolean(data.passwordHash),
    });

    return this.mapPortalUser(updated);
  }

  // ── Fleet Payout Requests (FleetPayoutRequest) ───────────────────────────────

  private mapAdminPayout(r: any) {
    return {
      id: r.id,
      fleetId: r.fleetId,
      referenceCode: r.referenceCode,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status as FleetPayoutStatus,
      rejectionReason: r.rejectionReason || undefined,
      notes: r.notes || undefined,
      periodStart: r.periodStart ? new Date(r.periodStart).toISOString() : undefined,
      periodEnd: r.periodEnd ? new Date(r.periodEnd).toISOString() : undefined,
      settledAt: r.settledAt ? new Date(r.settledAt).toISOString() : undefined,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      fleet: r.fleet
        ? {
            id: r.fleet.id,
            name: r.fleet.name,
            code: r.fleet.code,
            ownerName: r.fleet.ownerName,
            phone: r.fleet.phone,
          }
        : undefined,
      requestedBy: r.requestedBy
        ? {
            id: r.requestedBy.id,
            fullName: r.requestedBy.fullName,
            phone: r.requestedBy.phone,
            email: r.requestedBy.email || undefined,
          }
        : undefined,
    };
  }

  async listPayouts(query: AdminFleetPayoutQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.fleetId) {
      where.fleetId = query.fleetId;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { referenceCode: { contains: q, mode: 'insensitive' } },
        { fleet: { name: { contains: q, mode: 'insensitive' } } },
        { fleet: { code: { contains: q, mode: 'insensitive' } } },
        { fleet: { ownerName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const baseWhere = query.fleetId ? { fleetId: query.fleetId } : {};

    const [rows, total, allForMetrics] = await Promise.all([
      this.db.fleetPayoutRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fleet: {
            select: { id: true, name: true, code: true, ownerName: true, phone: true },
          },
          requestedBy: {
            select: { id: true, fullName: true, phone: true, email: true },
          },
        },
      }),
      this.db.fleetPayoutRequest.count({ where }),
      this.db.fleetPayoutRequest.findMany({
        where: baseWhere,
        select: { status: true, amount: true },
      }),
    ]);

    const metrics = {
      pendingCount: 0,
      pendingAmount: 0,
      settledCount: 0,
      settledAmount: 0,
      rejectedCount: 0,
    };
    for (const row of allForMetrics) {
      const amt = Number(row.amount || 0);
      if (row.status === 'SETTLED') {
        metrics.settledCount++;
        metrics.settledAmount += amt;
      } else if (row.status === 'REJECTED') {
        metrics.rejectedCount++;
      } else {
        metrics.pendingCount++;
        metrics.pendingAmount += amt;
      }
    }

    return {
      items: rows.map((r) => this.mapAdminPayout(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      metrics,
    };
  }

  async processPayout(
    payoutId: string,
    dto: ProcessFleetPayoutDto,
    admin?: AuthUserDto,
  ) {
    const existing = await this.db.fleetPayoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        fleet: {
          select: { id: true, name: true, code: true, ownerName: true, phone: true },
        },
        requestedBy: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException({
        errorCode: 'FLEET_PAYOUT_NOT_FOUND',
        message: 'Fleet payout request not found.',
      });
    }

    const currentStatus = existing.status as FleetPayoutStatus;
    if (dto.status === currentStatus) {
      throw new BadRequestException({
        errorCode: 'PAYOUT_STATUS_UNCHANGED',
        message: `Payout request is already in ${currentStatus} state.`,
      });
    }

    const allowedNext = VALID_PAYOUT_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException({
        errorCode: 'INVALID_PAYOUT_TRANSITION',
        message: `Cannot transition fleet payout from ${currentStatus} to ${dto.status}.`,
      });
    }

    const rejectionReason = dto.rejectionReason?.trim() || null;
    if (dto.status === FleetPayoutStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException({
        errorCode: 'REJECTION_REASON_REQUIRED',
        message: 'A rejection reason is required when rejecting a fleet payout.',
      });
    }

    const mergedNotes = dto.notes?.trim()
      ? existing.notes
        ? `${existing.notes}\n[Admin] ${dto.notes.trim()}`
        : dto.notes.trim()
      : existing.notes;

    const updated = await this.db.fleetPayoutRequest.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === FleetPayoutStatus.REJECTED ? rejectionReason : null,
        notes: mergedNotes,
        settledAt: dto.status === FleetPayoutStatus.SETTLED ? new Date() : existing.settledAt,
      },
      include: {
        fleet: {
          select: { id: true, name: true, code: true, ownerName: true, phone: true },
        },
        requestedBy: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    await this.writeAudit(admin, 'FLEET_PAYOUT_PROCESSED', 'FleetPayoutRequest', updated.id, {
      fleetId: updated.fleetId,
      referenceCode: updated.referenceCode,
      fromStatus: currentStatus,
      toStatus: dto.status,
      amount: Number(updated.amount),
      rejectionReason,
    });

    const formattedAmount = Number(updated.amount).toLocaleString('en-IN');
    await this.fleetNotifications
      .createNotification({
        fleetId: updated.fleetId,
        eventType: FleetNotificationEventType.FLEET_ANNOUNCEMENT,
        title: `Payout ${updated.referenceCode} ${dto.status.replace(/_/g, ' ')}`,
        message:
          dto.status === FleetPayoutStatus.REJECTED
            ? `Your payout request of ₹${formattedAmount} was rejected: ${rejectionReason}`
            : `Your payout request of ₹${formattedAmount} is now ${dto.status.replace(/_/g, ' ')}.`,
        entityType: 'PAYOUT',
        entityId: updated.id,
        actionUrl: '/earnings',
      })
      .catch(() => null);

    return this.mapAdminPayout(updated);
  }

  // ── Fleet Support Tickets (FleetSupportTicket & FleetSupportMessage) ─────────

  private async mapAdminTicketSummary(r: any) {
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      fleetId: r.fleetId,
      category: r.category,
      subject: r.subject,
      description: r.description,
      status: r.status as FleetSupportTicketStatus,
      attachments: await this.fleetSupport.enrichAttachmentLinks(r.attachments),
      messageCount: r._count?.messages ?? undefined,
      fleet: r.fleet
        ? {
            id: r.fleet.id,
            name: r.fleet.name,
            code: r.fleet.code,
            ownerName: r.fleet.ownerName,
            phone: r.fleet.phone,
          }
        : undefined,
      createdBy: r.createdBy
        ? {
            id: r.createdBy.id,
            fullName: r.createdBy.fullName,
            phone: r.createdBy.phone,
            email: r.createdBy.email || undefined,
          }
        : undefined,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async listSupportTickets(query: AdminFleetSupportQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category.trim();
    }
    if (query.fleetId) {
      where.fleetId = query.fleetId;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { fleet: { name: { contains: q, mode: 'insensitive' } } },
        { fleet: { code: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total, allStatuses] = await Promise.all([
      this.db.fleetSupportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          fleet: {
            select: { id: true, name: true, code: true, ownerName: true, phone: true },
          },
          createdBy: {
            select: { id: true, fullName: true, phone: true, email: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.db.fleetSupportTicket.count({ where }),
      this.db.fleetSupportTicket.findMany({ select: { status: true } }),
    ]);

    const metrics = {
      total: allStatuses.length,
      open: allStatuses.filter((t) => t.status === 'OPEN').length,
      inProgress: allStatuses.filter((t) => t.status === 'IN_PROGRESS').length,
      resolved: allStatuses.filter(
        (t) => t.status === 'RESOLVED' || t.status === 'CLOSED',
      ).length,
    };

    return {
      items: await Promise.all(rows.map((r) => this.mapAdminTicketSummary(r))),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      metrics,
    };
  }

  async getSupportTicketDetail(ticketId: string) {
    const ticket = await this.db.fleetSupportTicket.findUnique({
      where: { id: ticketId },
      include: {
        fleet: {
          select: { id: true, name: true, code: true, ownerName: true, phone: true },
        },
        createdBy: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException({
        errorCode: 'FLEET_SUPPORT_TICKET_NOT_FOUND',
        message: 'Fleet support ticket not found.',
      });
    }

    const summary = await this.mapAdminTicketSummary(ticket);
    const messages = await Promise.all(
      (ticket.messages || []).map(async (m: any) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderRole: m.senderRole,
        senderName: m.senderName || undefined,
        body: m.body,
        attachments: await this.fleetSupport.enrichAttachmentLinks(m.attachments),
        createdAt: new Date(m.createdAt).toISOString(),
      })),
    );

    return {
      ...summary,
      messages,
    };
  }

  async replySupportTicket(
    ticketId: string,
    dto: AdminReplyFleetSupportDto,
    admin?: AuthUserDto,
  ) {
    const existing = await this.db.fleetSupportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'FLEET_SUPPORT_TICKET_NOT_FOUND',
        message: 'Fleet support ticket not found.',
      });
    }

    if (existing.status === FleetSupportTicketStatus.CLOSED) {
      throw new BadRequestException({
        errorCode: 'SUPPORT_TICKET_CLOSED',
        message: `Ticket ${existing.ticketNumber} is CLOSED. Reopen or update its status before replying.`,
      });
    }

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException({
        errorCode: 'EMPTY_TICKET_REPLY',
        message: 'Reply message cannot be empty.',
      });
    }

    const nextStatus =
      existing.status === FleetSupportTicketStatus.OPEN ||
      existing.status === FleetSupportTicketStatus.RESOLVED
        ? FleetSupportTicketStatus.IN_PROGRESS
        : existing.status;

    const { message } = await this.db.$transaction(async (tx) => {
      const msg = await tx.fleetSupportMessage.create({
        data: {
          ticketId: existing.id,
          senderRole: admin?.role || 'ADMIN',
          senderName: admin?.fullName || 'AdhocX Support',
          body,
          attachments: [] as any,
        },
      });

      await tx.fleetSupportTicket.update({
        where: { id: existing.id },
        data: { status: nextStatus, updatedAt: new Date() },
      });

      return { message: msg };
    });

    await this.writeAudit(admin, 'FLEET_SUPPORT_ADMIN_REPLIED', 'FleetSupportTicket', existing.id, {
      fleetId: existing.fleetId,
      ticketNumber: existing.ticketNumber,
      messageId: message.id,
      status: nextStatus,
    });

    await this.fleetNotifications
      .createNotification({
        fleetId: existing.fleetId,
        eventType: FleetNotificationEventType.SUPPORT_TICKET_REPLY,
        title: `AdhocX Support replied on ${existing.ticketNumber}`,
        message: `${admin?.fullName || 'AdhocX Support'} responded on "${existing.subject}".`,
        entityType: 'SUPPORT_TICKET',
        entityId: existing.id,
        actionUrl: `/support?ticketId=${existing.id}`,
      })
      .catch(() => null);

    return this.getSupportTicketDetail(existing.id);
  }

  async updateSupportTicketStatus(
    ticketId: string,
    dto: AdminUpdateFleetSupportStatusDto,
    admin?: AuthUserDto,
  ) {
    const existing = await this.db.fleetSupportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'FLEET_SUPPORT_TICKET_NOT_FOUND',
        message: 'Fleet support ticket not found.',
      });
    }

    if (existing.status === dto.status) {
      throw new BadRequestException({
        errorCode: 'SUPPORT_STATUS_UNCHANGED',
        message: `Ticket ${existing.ticketNumber} is already ${dto.status}.`,
      });
    }

    const note = dto.resolutionNote?.trim();

    await this.db.$transaction(async (tx) => {
      await tx.fleetSupportTicket.update({
        where: { id: existing.id },
        data: { status: dto.status, updatedAt: new Date() },
      });

      if (note) {
        await tx.fleetSupportMessage.create({
          data: {
            ticketId: existing.id,
            senderRole: admin?.role || 'ADMIN',
            senderName: admin?.fullName || 'AdhocX Support',
            body: `[Status updated to ${dto.status}] ${note}`,
            attachments: [] as any,
          },
        });
      }
    });

    await this.writeAudit(admin, 'FLEET_SUPPORT_STATUS_UPDATED', 'FleetSupportTicket', existing.id, {
      fleetId: existing.fleetId,
      ticketNumber: existing.ticketNumber,
      fromStatus: existing.status,
      toStatus: dto.status,
      hasNote: Boolean(note),
    });

    await this.fleetNotifications
      .createNotification({
        fleetId: existing.fleetId,
        eventType: FleetNotificationEventType.SUPPORT_TICKET_REPLY,
        title: `Ticket ${existing.ticketNumber} marked ${dto.status}`,
        message: note
          ? `Status changed to ${dto.status}: ${note}`
          : `Ticket "${existing.subject}" status changed to ${dto.status}.`,
        entityType: 'SUPPORT_TICKET',
        entityId: existing.id,
        actionUrl: `/support?ticketId=${existing.id}`,
      })
      .catch(() => null);

    return this.getSupportTicketDetail(existing.id);
  }

  // ── Fleet Shortfall Compensation (FleetShortfallRecord) ────────────────────

  private mapShortfall(r: any) {
    return {
      id: r.id,
      fleetId: r.fleetId,
      periodStart: new Date(r.periodStart).toISOString(),
      periodEnd: new Date(r.periodEnd).toISOString(),
      minimumTripsRequired: r.minimumTripsRequired,
      actualTripsOffered: r.actualTripsOffered,
      shortfallTrips: r.shortfallTrips,
      compensationAmount:
        r.compensationAmount != null ? Number(r.compensationAmount) : undefined,
      status: r.status,
      notes: r.notes || undefined,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async listShortfalls(fleetId: string) {
    await this.ensureFleetExists(fleetId);
    const records = await this.db.fleetShortfallRecord.findMany({
      where: { fleetId },
      orderBy: { periodEnd: 'desc' },
    });
    return records.map((r) => this.mapShortfall(r));
  }

  async createShortfall(
    fleetId: string,
    dto: CreateFleetShortfallDto,
    admin?: AuthUserDto,
  ) {
    await this.ensureFleetExists(fleetId);

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException({
        errorCode: 'INVALID_SHORTFALL_DATES',
        message: 'Valid periodStart and periodEnd dates are required.',
      });
    }
    if (periodStart > periodEnd) {
      throw new BadRequestException({
        errorCode: 'INVALID_DATE_RANGE',
        message: 'Period start date must be on or before period end date.',
      });
    }

    if (dto.minimumTripsRequired < 0 || dto.actualTripsOffered < 0) {
      throw new BadRequestException({
        errorCode: 'INVALID_TRIP_COUNTS',
        message: 'Minimum trips and actual trips cannot be negative.',
      });
    }

    if (dto.compensationAmount != null && dto.compensationAmount < 0) {
      throw new BadRequestException({
        errorCode: 'INVALID_COMPENSATION_AMOUNT',
        message: 'Compensation amount cannot be negative.',
      });
    }

    const minimumTripsRequired = Math.floor(dto.minimumTripsRequired);
    const actualTripsOffered = Math.floor(dto.actualTripsOffered);
    const shortfallTrips = Math.max(0, minimumTripsRequired - actualTripsOffered);

    const created = await this.db.fleetShortfallRecord.create({
      data: {
        fleetId,
        periodStart,
        periodEnd,
        minimumTripsRequired,
        actualTripsOffered,
        shortfallTrips,
        compensationAmount: dto.compensationAmount ?? null,
        status: dto.status || 'RECORDED',
        notes: dto.notes?.trim() || null,
      },
    });

    await this.writeAudit(admin, 'FLEET_SHORTFALL_RECORDED', 'FleetShortfallRecord', created.id, {
      fleetId,
      shortfallTrips,
      compensationAmount: created.compensationAmount != null ? Number(created.compensationAmount) : null,
      status: created.status,
    });

    await this.fleetNotifications
      .createNotification({
        fleetId,
        eventType: FleetNotificationEventType.FLEET_ANNOUNCEMENT,
        title: 'Fleet Shortfall Claim Recorded',
        message: `Shortfall of ${shortfallTrips} trips logged for period ending ${periodEnd.toISOString().slice(0, 10)}.`,
        entityType: 'SHORTFALL',
        entityId: created.id,
        actionUrl: '/earnings',
      })
      .catch(() => null);

    return this.mapShortfall(created);
  }
}
