import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CorporateTicketPriority, CorporateTicketStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { CreateSupportTicketDto, SupportTicketResponse } from '../rider/corporate-rider.types';
import { SupportTicketListQuery, TICKET_NEXT_STATUS } from './safety.types';

export interface SupportTicketActor {
  userId?: string;
  role: string;
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
    const limit = Number.isFinite(query.limit) ? Math.min(200, Math.max(1, Number(query.limit))) : 50;
    const offset = Number.isFinite(query.offset) ? Math.max(0, Number(query.offset)) : 0;

    const tickets = await this.db.corporateSupportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return tickets as SupportTicketResponse[];
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
    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${id} not found`);
    }
    return ticket as SupportTicketResponse;
  }

  /**
   * Guarded status change OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED. Only the next status is legal
   * (409 otherwise). Compare-and-set on the current status so two agents cannot both move it.
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
    if (TICKET_NEXT_STATUS[from] !== toStatus) {
      throw new ConflictException(`Illegal ticket transition ${from} -> ${toStatus}`);
    }

    const now = new Date();
    const trimmed = notes?.trim() || undefined;
    const data: Record<string, unknown> = { status: toStatus };
    if (toStatus === CorporateTicketStatus.IN_PROGRESS) {
      data.assignedToUserId = actor.userId ?? ticket.assignedToUserId ?? null;
      if (trimmed) data.adminNotes = trimmed;
    } else if (toStatus === CorporateTicketStatus.RESOLVED) {
      data.resolvedAt = now;
      data.resolvedByUserId = actor.userId ?? null;
      if (trimmed) data.resolutionNotes = trimmed;
    } else if (trimmed) {
      data.adminNotes = trimmed;
    }

    const res = await this.db.corporateSupportTicket.updateMany({
      where: { id, status: from },
      data: data as any,
    });
    if (res.count !== 1) {
      throw new ConflictException(`Support ticket ${id} changed concurrently; reload and retry`);
    }
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
}
