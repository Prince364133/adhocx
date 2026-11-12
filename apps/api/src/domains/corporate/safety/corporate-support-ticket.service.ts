import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CorporateTicketPriority, CorporateTicketStatus, UserRole } from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { CreateSupportTicketDto, SupportTicketResponse } from '../rider/corporate-rider.types';
import {
  AssignCorporateTicketDto,
  CorporateTicketActivityResponse,
  CorporateTicketMessageResponse,
  CreateCorporateTicketMessageDto,
  ReopenCorporateTicketDto,
  SupportTicketListQuery,
  TICKET_NEXT_STATUS,
} from './safety.types';

export interface SupportTicketActor {
  userId?: string;
  role: string;
  corporateTenantId?: string;
  corporateEmployeeId?: string;
}

const TICKET_STATUSES = new Set<string>(Object.values(CorporateTicketStatus));

/**
 * Single owner of CorporateSupportTicket writes (doc 19 §0: safety/ owns support tickets).
 * Used by the rider self-service API (/corporate/me/tickets) and the corporate / admin support
 * desk (/corporate/support/tickets).
 */
@Injectable()
export class CorporateSupportTicketService {
  private readonly logger = new Logger(CorporateSupportTicketService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** SLA by priority: CRITICAL = 30m, HIGH = 60m, others = 240m (4h). */
  static slaMinutesFor(priority: CorporateTicketPriority): number {
    if (priority === CorporateTicketPriority.CRITICAL) return 30;
    if (priority === CorporateTicketPriority.HIGH) return 60;
    return 240;
  }

  /** Creates a ticket for an already-resolved employee (tenant comes from the employee row). */
  async createTicket(
    employee: { id: string; tenantId: string },
    dto: CreateSupportTicketDto,
    actor?: SupportTicketActor,
  ): Promise<SupportTicketResponse> {
    if (!dto.subject || dto.subject.trim() === '') {
      throw new BadRequestException('Subject is required');
    }
    if (!dto.description || dto.description.trim() === '') {
      throw new BadRequestException('Description is required');
    }

    const priority = dto.priority || CorporateTicketPriority.MEDIUM;
    const slaMinutes = CorporateSupportTicketService.slaMinutesFor(priority);
    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await this.db.corporateSupportTicket.create({
      data: {
        ticketNumber,
        tenantId: employee.tenantId,
        employeeId: employee.id,
        routeId: dto.routeId ?? null,
        stopId: dto.stopId ?? null,
        category: dto.category,
        priority,
        status: 'OPEN',
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        slaMinutes,
      },
    });

    this.notifications.emitEvent('admin:support', 'CORPORATE_TICKET_CREATED', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      tenantId: employee.tenantId,
      employeeId: employee.id,
      priority,
      category: dto.category,
      subject: ticket.subject,
    });

    if (actor) {
      await this.audit.log({
        action: 'CORPORATE_SUPPORT_TICKET_CREATED',
        userId: actor.userId,
        actorRole: actor.role,
        entityId: ticket.id,
        entityType: 'CORPORATE_SUPPORT_TICKET',
        metadata: { tenantId: employee.tenantId, employeeId: employee.id, priority, category: dto.category },
      });
    }

    return ticket as SupportTicketResponse;
  }

  /**
   * Corporate portal create on behalf of an employee. `tenantId` is the caller's tenant for corporate
   * roles (forced by CorporateAccessGuard) and optional for ADMIN; the employee must belong to it.
   */
  async createForEmployee(
    employeeId: string | undefined,
    tenantId: string | undefined,
    dto: CreateSupportTicketDto,
    actor: SupportTicketActor,
  ): Promise<SupportTicketResponse> {
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    const employee = await this.db.corporateEmployee.findUnique({
      where: { id: employeeId },
      select: { id: true, tenantId: true },
    });
    if (!employee) {
      throw new NotFoundException(`Corporate employee ${employeeId} not found`);
    }
    if (tenantId && employee.tenantId !== tenantId) {
      throw new ForbiddenException('Employee belongs to another tenant');
    }
    return this.createTicket(employee, dto, actor);
  }

  async listTickets(query: SupportTicketListQuery = {}): Promise<SupportTicketResponse[]> {
    const where: Record<string, unknown> = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tenant: { name: { contains: q, mode: 'insensitive' } } },
        { tenant: { code: { contains: q, mode: 'insensitive' } } },
        { employee: { fullName: { contains: q, mode: 'insensitive' } } },
        { employee: { phoneNumber: { contains: q } } },
        { employee: { employeeCode: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const limit = Number.isFinite(query.limit) ? Math.min(200, Math.max(1, Number(query.limit))) : 50;
    const offset = Number.isFinite(query.offset) ? Math.max(0, Number(query.offset)) : 0;

    const tickets: any[] = await this.db.corporateSupportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true, phoneNumber: true, email: true } },
      },
    });

    const assigneeIds = Array.from(new Set(tickets.map((t) => t.assignedToUserId).filter(Boolean)));
    const assignees = assigneeIds.length > 0 && this.db.user?.findMany
      ? await this.db.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : [];
    const assigneeMap = new Map((assignees || []).map((u: any) => [u.id, u]));

    const routeIds = Array.from(new Set(tickets.map((t) => t.routeId).filter(Boolean)));
    const routes = routeIds.length > 0 && this.db.corporateRoute?.findMany
      ? await this.db.corporateRoute.findMany({
          where: { id: { in: routeIds } },
          include: {
            driver: {
              include: {
                user: { select: { fullName: true, phone: true, email: true } },
              },
            },
            vehicle: { select: { id: true, registrationNumber: true, model: true, make: true } },
          },
        })
      : [];
    const routeMap = new Map((routes || []).map((r: any) => [r.id, r]));

    return tickets.map((t) => {
      const route = t.routeId ? routeMap.get(t.routeId) || null : null;
      const driver = route?.driver
        ? {
            id: route.driver.id,
            name: route.driver.user?.fullName || 'Driver',
            phone: route.driver.user?.phone || null,
            email: route.driver.user?.email || null,
            licenseNumber: route.driver.licenseNumber || null,
            vehiclePlate: route.vehicle?.registrationNumber || null,
          }
        : null;

      return {
        ...t,
        assignedToUser: t.assignedToUserId ? assigneeMap.get(t.assignedToUserId) || null : null,
        route,
        driver,
      };
    }) as SupportTicketResponse[];
  }

  /** Tickets of one employee, newest first (rider self-service). */
  async listEmployeeTickets(employeeId: string): Promise<SupportTicketResponse[]> {
    const tickets = await this.db.corporateSupportTicket.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return tickets as SupportTicketResponse[];
  }

  async getTicket(id: string): Promise<SupportTicketResponse> {
    const ticket: any = await this.db.corporateSupportTicket.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true, phoneNumber: true, email: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${id} not found`);
    }
    if (ticket.assignedToUserId && this.db.user?.findUnique) {
      ticket.assignedToUser = await this.db.user.findUnique({
        where: { id: ticket.assignedToUserId },
        select: { id: true, fullName: true, email: true, role: true },
      });
    }
    if (ticket.routeId && this.db.corporateRoute?.findUnique) {
      ticket.route = await this.db.corporateRoute.findUnique({
        where: { id: ticket.routeId },
        include: {
          driver: {
            include: {
              user: { select: { fullName: true, phone: true, email: true } },
            },
          },
          vehicle: { select: { id: true, registrationNumber: true, model: true, make: true } },
        },
      });
      if (ticket.route?.driver) {
        ticket.driver = {
          id: ticket.route.driver.id,
          name: ticket.route.driver.user?.fullName || 'Driver',
          phone: ticket.route.driver.user?.phone || null,
          email: ticket.route.driver.user?.email || null,
          licenseNumber: ticket.route.driver.licenseNumber || null,
          vehiclePlate: ticket.route.vehicle?.registrationNumber || null,
        };
      }
    }
    return ticket as SupportTicketResponse;
  }

  /**
   * Status change OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.
   * Platform administrators and OPS staff may move tickets to any valid status.
   */
  async transitionStatus(
    id: string,
    toStatus: CorporateTicketStatus,
    actor: SupportTicketActor,
    notes?: string,
  ): Promise<SupportTicketResponse> {
    if (!toStatus || !TICKET_STATUSES.has(toStatus)) {
      throw new BadRequestException(`status must be one of ${[...TICKET_STATUSES].join(', ')}`);
    }
    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${id} not found`);
    }
    const from = ticket.status as CorporateTicketStatus;
    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
    if (!isPlatformStaff && TICKET_NEXT_STATUS[from] !== toStatus) {
      throw new ConflictException(`Illegal ticket transition ${from} -> ${toStatus}`);
    }

    const now = new Date();
    const trimmed = notes?.trim() || undefined;

    if (from === toStatus) {
      if (trimmed) {
        const updateData: Record<string, unknown> = {};
        if (toStatus === CorporateTicketStatus.RESOLVED) {
          updateData.resolutionNotes = trimmed;
        } else {
          updateData.adminNotes = trimmed;
        }
        await this.db.corporateSupportTicket.update({
          where: { id },
          data: updateData as any,
        });
      }
      return this.getTicket(id);
    }

    const data: Record<string, unknown> = { status: toStatus };
    if (toStatus === CorporateTicketStatus.OPEN) {
      data.resolvedAt = null;
      data.resolvedByUserId = null;
      if (trimmed) data.adminNotes = trimmed;
    } else if (toStatus === CorporateTicketStatus.IN_PROGRESS) {
      data.assignedToUserId = actor.userId ?? ticket.assignedToUserId ?? null;
      data.resolvedAt = null;
      data.resolvedByUserId = null;
      if (trimmed) data.adminNotes = trimmed;
    } else if (toStatus === CorporateTicketStatus.RESOLVED) {
      data.resolvedAt = now;
      data.resolvedByUserId = actor.userId ?? null;
      if (trimmed) data.resolutionNotes = trimmed;
    } else if (toStatus === CorporateTicketStatus.CLOSED) {
      data.resolvedAt = ticket.resolvedAt || now;
      data.resolvedByUserId = ticket.resolvedByUserId || actor.userId || null;
      if (trimmed) data.adminNotes = trimmed;
    }

    await this.db.corporateSupportTicket.update({
      where: { id },
      data: data as any,
    });
    const updated = { ...ticket, ...data, updatedAt: now };

    this.logger.log(`Support ticket ${ticket.ticketNumber} ${from} -> ${toStatus} by ${actor.userId}`);
    this.notifications.emitEvent(`corporate:${ticket.tenantId}:support`, 'CORPORATE_TICKET_STATUS_CHANGED', {
      ticketId: id,
      ticketNumber: ticket.ticketNumber,
      employeeId: ticket.employeeId,
      fromStatus: from,
      toStatus,
    });
    await this.audit.log({
      action: 'CORPORATE_SUPPORT_TICKET_STATUS_CHANGED',
      userId: actor.userId,
      actorRole: actor.role,
      entityId: id,
      entityType: 'CORPORATE_SUPPORT_TICKET',
      metadata: { tenantId: ticket.tenantId, fromStatus: from, toStatus, notes: trimmed },
    });

    return updated as SupportTicketResponse;
  }

  /**
   * Enforces tenant and employee ownership for non-platform staff.
   */
  private assertTicketAccess(
    ticket: { id: string; tenantId: string; employeeId: string },
    actor: SupportTicketActor,
  ): void {
    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
    if (isPlatformStaff) return;

    if (actor.corporateTenantId && ticket.tenantId !== actor.corporateTenantId) {
      throw new ForbiddenException('Cross-tenant ticket access denied');
    }
    if (actor.role === UserRole.EMPLOYEE && actor.corporateEmployeeId && ticket.employeeId !== actor.corporateEmployeeId) {
      throw new ForbiddenException('Access denied to this ticket');
    }
  }

  /**
   * Fetches conversation messages for a ticket. Non-platform actors never see internal notes.
   */
  async listMessages(ticketId: string, actor: SupportTicketActor): Promise<CorporateTicketMessageResponse[]> {
    const ticket = await this.db.corporateSupportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, employeeId: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }
    this.assertTicketAccess(ticket, actor);

    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
    const where: Record<string, unknown> = { ticketId };
    if (!isPlatformStaff) {
      where.isInternal = false;
    }

    const messages = await this.db.corporateTicketMessage.findMany({
      where: where as any,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderRole: m.senderRole,
      senderName: m.senderName || m.sender?.fullName || m.sender?.email || 'Support User',
      message: m.message,
      isInternal: m.isInternal,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Posts a reply on a ticket. Only ADMIN/OPS can post internal notes.
   */
  async createMessage(
    ticketId: string,
    dto: CreateCorporateTicketMessageDto,
    actor: SupportTicketActor,
  ): Promise<CorporateTicketMessageResponse> {
    if (!dto?.message || dto.message.trim() === '') {
      throw new BadRequestException('Message is required and cannot be empty');
    }

    const ticket = await this.db.corporateSupportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, employeeId: true, ticketNumber: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }
    this.assertTicketAccess(ticket, actor);

    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
    const isInternal = isPlatformStaff && Boolean(dto.isInternal);

    let senderName: string | undefined;
    let senderUserId: string | undefined = actor.userId || undefined;

    if (actor.userId && this.db.user?.findUnique) {
      const u = await this.db.user.findUnique({
        where: { id: actor.userId },
        select: { id: true, fullName: true, email: true },
      });
      if (u) {
        senderName = u.fullName || u.email || undefined;
      }
    }

    if (!senderUserId) {
      if (this.db.corporateEmployee?.findUnique) {
        const emp = await this.db.corporateEmployee.findUnique({
          where: { id: ticket.employeeId },
          select: { userId: true, fullName: true },
        });
        if (emp?.userId) {
          senderUserId = emp.userId;
          if (!senderName) senderName = emp.fullName;
        }
      }
      if (!senderUserId && this.db.user?.findFirst) {
        const fallbackUser = await this.db.user.findFirst({
          where: { role: { in: ['ADMIN', 'OPS', 'CORPORATE_ADMIN'] } },
          select: { id: true, fullName: true },
        });
        senderUserId = fallbackUser?.id;
        if (!senderName) senderName = isPlatformStaff ? 'AdhocX Support Desk' : 'Corporate User';
      }
    }
    if (!senderUserId) {
      senderUserId = ticket.employeeId;
    }

    const created = await this.db.corporateTicketMessage.create({
      data: {
        ticketId,
        senderId: senderUserId!,
        senderRole: actor.role,
        senderName,
        message: dto.message.trim(),
        isInternal,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_SUPPORT_TICKET_MESSAGE_ADDED',
      userId: actor.userId,
      actorRole: actor.role,
      entityId: ticket.id,
      entityType: 'CORPORATE_SUPPORT_TICKET',
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        tenantId: ticket.tenantId,
        messageId: created.id,
        isInternal,
      },
    });

    if (!isInternal) {
      this.notifications.emitEvent(`corporate:${ticket.tenantId}:support`, 'CORPORATE_TICKET_REPLY_ADDED', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        senderRole: actor.role,
        senderName,
      });
    }

    return {
      id: created.id,
      ticketId: created.ticketId,
      senderId: created.senderId,
      senderRole: created.senderRole,
      senderName: created.senderName,
      message: created.message,
      isInternal: created.isInternal,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Assigns or reassigns a support ticket to an administrative agent.
   */
  async assignTicket(
    ticketId: string,
    dto: AssignCorporateTicketDto,
    actor: SupportTicketActor,
  ): Promise<SupportTicketResponse> {
    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
    if (!isPlatformStaff) {
      throw new ForbiddenException('Only platform administrators and ops staff can assign tickets');
    }

    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }

    if (dto.assignedToUserId) {
      const assignee = await this.db.user.findUnique({
        where: { id: dto.assignedToUserId },
        select: { id: true, fullName: true, email: true, role: true },
      });
      if (!assignee) {
        throw new NotFoundException(`Assignee user ${dto.assignedToUserId} not found`);
      }
    }

    const trimmedNotes = dto.notes?.trim() || undefined;
    const data: Record<string, unknown> = {
      assignedToUserId: dto.assignedToUserId ?? null,
    };
    if (trimmedNotes) {
      data.adminNotes = trimmedNotes;
    }
    // If ticket was unassigned and OPEN, assigning moves it to IN_PROGRESS
    if (ticket.status === CorporateTicketStatus.OPEN && dto.assignedToUserId) {
      data.status = CorporateTicketStatus.IN_PROGRESS;
    }

    const updated = await this.db.corporateSupportTicket.update({
      where: { id: ticketId },
      data: data as any,
    });

    this.logger.log(`Support ticket ${ticket.ticketNumber} assigned to ${dto.assignedToUserId} by ${actor.userId}`);

    await this.audit.log({
      action: 'CORPORATE_SUPPORT_TICKET_ASSIGNED',
      userId: actor.userId,
      actorRole: actor.role,
      entityId: ticketId,
      entityType: 'CORPORATE_SUPPORT_TICKET',
      metadata: {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        tenantId: ticket.tenantId,
        previousAssignee: ticket.assignedToUserId,
        newAssignee: dto.assignedToUserId,
        notes: trimmedNotes,
      },
    });

    this.notifications.emitEvent('admin:support', 'CORPORATE_TICKET_ASSIGNED', {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      assignedToUserId: dto.assignedToUserId,
      status: updated.status,
    });

    return updated as SupportTicketResponse;
  }

  /**
   * Reopens an eligible ticket from RESOLVED or CLOSED status into IN_PROGRESS.
   */
  async reopenTicket(
    ticketId: string,
    dto: ReopenCorporateTicketDto,
    actor: SupportTicketActor,
  ): Promise<SupportTicketResponse> {
    if (!dto?.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Reopen reason is required');
    }

    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }
    this.assertTicketAccess(ticket, actor);

    if (ticket.status !== CorporateTicketStatus.RESOLVED && ticket.status !== CorporateTicketStatus.CLOSED) {
      throw new ConflictException(
        `Cannot reopen ticket in ${ticket.status} status; only RESOLVED or CLOSED tickets can be reopened`,
      );
    }

    const fromStatus = ticket.status;
    const reopenNote = `[REOPENED by ${actor.role} on ${new Date().toISOString()}]: ${dto.reason.trim()}`;
    const newAdminNotes = ticket.adminNotes ? `${ticket.adminNotes}\n\n${reopenNote}` : reopenNote;

    const updated = await this.db.corporateSupportTicket.update({
      where: { id: ticketId },
      data: {
        status: CorporateTicketStatus.IN_PROGRESS,
        resolvedAt: null,
        resolvedByUserId: null,
        adminNotes: newAdminNotes,
      },
    });

    this.logger.log(`Support ticket ${ticket.ticketNumber} reopened from ${fromStatus} by ${actor.userId}`);

    await this.audit.log({
      action: 'CORPORATE_SUPPORT_TICKET_REOPENED',
      userId: actor.userId,
      actorRole: actor.role,
      entityId: ticketId,
      entityType: 'CORPORATE_SUPPORT_TICKET',
      metadata: {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        tenantId: ticket.tenantId,
        fromStatus,
        toStatus: CorporateTicketStatus.IN_PROGRESS,
        reason: dto.reason.trim(),
      },
    });

    this.notifications.emitEvent(`corporate:${ticket.tenantId}:support`, 'CORPORATE_TICKET_STATUS_CHANGED', {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      employeeId: ticket.employeeId,
      fromStatus,
      toStatus: CorporateTicketStatus.IN_PROGRESS,
      reopened: true,
    });

    return updated as SupportTicketResponse;
  }

  /**
   * Fetches chronological activity and audit history for a support ticket.
   */
  async getActivity(ticketId: string, actor: SupportTicketActor): Promise<CorporateTicketActivityResponse[]> {
    const ticket = await this.db.corporateSupportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, employeeId: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }
    this.assertTicketAccess(ticket, actor);

    const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;

    const logs = await this.db.auditLog.findMany({
      where: {
        entityName: 'CORPORATE_SUPPORT_TICKET',
        entityId: ticketId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      take: 100,
    });

    return logs.map((log) => {
      let metadata = log.payload as Record<string, unknown> | undefined;
      if (!isPlatformStaff && metadata) {
        const sanitized = { ...metadata };
        delete sanitized.adminNotes;
        delete sanitized.notes;
        metadata = sanitized;
      }

      return {
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        actorName: log.actor?.fullName || log.actor?.email || null,
        actorRole: log.actorRole || log.actor?.role || null,
        timestamp: log.createdAt.toISOString(),
        metadata,
      };
    });
  }
}
