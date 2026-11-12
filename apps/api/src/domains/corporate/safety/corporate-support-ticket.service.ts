import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CorporateTicketCategory,
  CorporateTicketCommentVisibility,
  CorporateTicketPriority,
  CorporateTicketStatus,
  UserRole,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { RedisService } from '../../../redis/redis.service';
import { StorageService } from '../../../common/storage/storage.service';
import { CreateSupportTicketDto, SupportTicketResponse } from '../rider/corporate-rider.types';
import {
  AssignCorporateTicketDto,
  CorporateTicketActivityResponse,
  CorporateTicketMessageResponse,
  CreateCorporateTicketMessageDto,
  ReopenCorporateTicketDto,
  SupportTicketListQuery,
  TicketAttachmentInput,
  TICKET_ALLOWED_TRANSITIONS,
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
    @Optional()
    private readonly redis?: RedisService,
    @Optional()
    private readonly storage?: StorageService,
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
    attachments: TicketAttachmentInput[] = [],
    idempotencyKey?: string,
  ): Promise<SupportTicketResponse> {
    const subject = dto.subject?.trim();
    const description = dto.description?.trim();
    if (!subject) {
      throw new BadRequestException('Ticket title is required');
    }
    if (subject.length > 200) {
      throw new BadRequestException('Ticket title must be 200 characters or fewer');
    }
    if (!description) {
      throw new BadRequestException('Description is required');
    }
    if (description.length > 10_000) {
      throw new BadRequestException('Description must be 10,000 characters or fewer');
    }
    if (!Object.values(CorporateTicketCategory).includes(dto.category)) {
      throw new BadRequestException('A valid ticket category is required');
    }
    if (!Object.values(CorporateTicketPriority).includes(dto.priority || CorporateTicketPriority.MEDIUM)) {
      throw new BadRequestException('A valid ticket priority is required');
    }
    if (attachments.length > 5) {
      throw new BadRequestException('A ticket can have at most 5 images');
    }
    if (actor?.userId) {
      await this.consumeRateLimit(`support:create:${actor.userId}`, 'SUPPORT_TICKET_CREATE_LIMIT', 5, 3600);
    }

    if (idempotencyKey) {
      const prior = await this.db.corporateSupportTicket.findUnique({ where: { idempotencyKey } });
      if (prior) {
        if (prior.tenantId !== employee.tenantId) throw new ConflictException('Idempotency key already used');
        if (attachments.length) throw new ConflictException('Ticket submission already processed; retry without attachments');
        return prior as SupportTicketResponse;
      }
    }

    const priority = dto.priority || CorporateTicketPriority.MEDIUM;
    const slaMinutes = CorporateSupportTicketService.slaMinutesFor(priority);
    const ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const ticket = await this.db.$transaction(async (tx) => {
      const created = await tx.corporateSupportTicket.create({
        data: {
          ticketNumber,
          tenantId: employee.tenantId,
          employeeId: employee.id,
          routeId: dto.routeId ?? null,
          stopId: dto.stopId ?? null,
          category: dto.category,
          priority,
          status: 'OPEN',
          subject,
          description,
          raisedByUserId: actor?.userId,
          idempotencyKey,
          slaMinutes,
        },
      });
      if (actor?.userId) {
        await tx.corporateSupportTicketActivity.create({
          data: {
            ticketId: created.id,
            performedBy: actor.userId,
            action: 'CREATED',
            description: 'Ticket created',
            visibility: CorporateTicketCommentVisibility.PUBLIC,
          },
        });
      }
      if (attachments.length) {
        await tx.corporateSupportTicketAttachment.createMany({
          data: attachments.map((attachment) => ({ ...attachment, ticketId: created.id })),
        });
      }
      return created;
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

    return this.getTicket(ticket.id, actor);
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
    attachments: TicketAttachmentInput[] = [],
    idempotencyKey?: string,
  ): Promise<SupportTicketResponse> {
    const employee = employeeId
      ? await this.db.corporateEmployee.findUnique({
          where: { id: employeeId },
          select: { id: true, tenantId: true, userId: true },
        })
      : actor.userId
        ? await this.db.corporateEmployee.findUnique({
            where: { userId: actor.userId },
            select: { id: true, tenantId: true, userId: true },
          })
        : null;
    if (!employee) {
      throw new BadRequestException('A valid employee must be selected for this ticket');
    }
    if (actor.role === 'EMPLOYEE' && employee.userId !== actor.userId) {
      throw new ForbiddenException('Employees may only raise tickets for themselves');
    }
    if (!employeeId && actor.role !== 'EMPLOYEE') {
      throw new BadRequestException('employeeId is required for corporate staff');
    }
    if (tenantId && employee.tenantId !== tenantId) {
      throw new ForbiddenException('Employee belongs to another tenant');
    }
    return this.createTicket(employee, dto, actor, attachments, idempotencyKey);
  }

  async findIdempotentTicket(key: string | undefined, tenantId: string | undefined, actor: SupportTicketActor) {
    if (!key) return null;
    if (key.length > 64) throw new BadRequestException('Idempotency-Key must be 64 characters or fewer');
    const prior = await this.db.corporateSupportTicket.findUnique({ where: { idempotencyKey: key } });
    if (!prior) return null;
    if (prior.tenantId !== tenantId || (actor.role === 'EMPLOYEE' && prior.raisedByUserId !== actor.userId)) {
      throw new ConflictException('Idempotency key already used');
    }
    return this.getTicket(prior.id, actor);
  }

  private async consumeRateLimit(key: string, envName: string, defaultLimit: number, defaultWindow: number) {
    if (!this.redis) return;
    const limit = Number(process.env[envName] || defaultLimit);
    const windowSeconds = Number(process.env.SUPPORT_RATE_LIMIT_WINDOW_SECONDS || defaultWindow);
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) {
      throw new Error('Support rate-limit configuration must use positive integer limits and windows');
    }
    const result = await this.redis.checkRateLimit(key, limit, windowSeconds);
    if (!result.allowed) {
      throw new HttpException(
        `Too many support requests. Try again in ${result.resetAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async listTickets(query: SupportTicketListQuery = {}, actor?: SupportTicketActor): Promise<SupportTicketResponse[]> {
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
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
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

    const mapped = tickets.map((t) => {
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

      const item: any = {
        ...t,
        assignedToUser: t.assignedToUserId ? assigneeMap.get(t.assignedToUserId) || null : null,
        route,
        driver,
      };
      if (actor?.role !== 'ADMIN' && actor?.role !== 'OPS') {
        delete item.adminNotes;
      }
      return item;
    });

    return mapped as SupportTicketResponse[];
  }

  async ticketSummary(query: Pick<SupportTicketListQuery, 'tenantId' | 'employeeId'> = {}) {
    const where = {
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };
    const [total, open, reopened, assigned, inProgress, waitingForCorporate, resolved, closed] = await Promise.all([
      this.db.corporateSupportTicket.count({ where }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.OPEN } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.REOPENED } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.ASSIGNED } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.IN_PROGRESS } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.WAITING_FOR_CORPORATE } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.RESOLVED } }),
      this.db.corporateSupportTicket.count({ where: { ...where, status: CorporateTicketStatus.CLOSED } }),
    ]);
    return {
      total,
      open: open + reopened + assigned,
      assigned,
      unassigned: await this.db.corporateSupportTicket.count({
        where: {
          ...where,
          assignedTeam: null,
          assignedToUserId: null,
          status: { notIn: [CorporateTicketStatus.RESOLVED, CorporateTicketStatus.CLOSED] },
        },
      }),
      inProgress,
      waitingForCorporate,
      resolved,
      closed,
    };
  }

  /** Tickets of one employee, newest first (rider self-service). */
  async listEmployeeTickets(employeeId: string): Promise<SupportTicketResponse[]> {
    const tickets = await this.db.corporateSupportTicket.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map(({ adminNotes: _adminNotes, ...ticket }) => ticket) as SupportTicketResponse[];
  }

  async getEmployeeIdForUser(userId: string): Promise<string> {
    const employee = await this.db.corporateEmployee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) throw new ForbiddenException('No corporate employee profile is linked to this account');
    return employee.id;
  }

  async assertOpsTicket(id: string, actor: SupportTicketActor) {
    const ticket = await this.db.corporateSupportTicket.findUnique({
      where: { id },
      select: { id: true, assignedTeam: true, assignedToUserId: true },
    });
    if (!ticket) throw new NotFoundException(`Support ticket ${id} not found`);
    if (ticket.assignedToUserId !== actor.userId && ticket.assignedTeam?.toUpperCase() !== 'OPS') {
      throw new ForbiddenException('This ticket is not assigned to your operational team');
    }
    return ticket;
  }

  async getOpsTicket(id: string, actor: SupportTicketActor): Promise<SupportTicketResponse> {
    await this.assertOpsTicket(id, actor);
    return this.getTicket(id, actor);
  }

  async getTicket(id: string, actor?: SupportTicketActor): Promise<SupportTicketResponse> {
    const ticket: any = await this.db.corporateSupportTicket.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true, phoneNumber: true, email: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
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

    const canSeeInternal = actor?.role === 'ADMIN' || actor?.role === 'OPS';
    const allComments = ticket.comments ?? [];
    const allActivities = ticket.activities ?? [];
    const ticketAttachments = ticket.attachments ?? [];
    const comments = canSeeInternal
      ? allComments
      : allComments.filter((comment: any) => comment.visibility === CorporateTicketCommentVisibility.PUBLIC);
    const activities = canSeeInternal
      ? allActivities
      : allActivities.filter((activity: any) => activity.visibility === CorporateTicketCommentVisibility.PUBLIC);
    const attachments = await Promise.all(ticketAttachments.map(async (attachment: any) => ({
      ...attachment,
      url: this.storage ? await this.storage.getPrivateDocumentAccessUrl(attachment.storageReference) : '',
      storageReference: undefined,
    })));
    const result = { ...ticket, comments, activities, attachments };
    if (!canSeeInternal) delete (result as Partial<typeof result>).adminNotes;
    return result as unknown as SupportTicketResponse;
  }

  async addComment(
    id: string,
    message: string,
    actor: SupportTicketActor,
    visibility: CorporateTicketCommentVisibility,
    attachments: TicketAttachmentInput[] = [],
  ): Promise<SupportTicketResponse> {
    const trimmed = message?.trim();
    if (!trimmed) throw new BadRequestException('Reply is required');
    if (trimmed.length > 1000) throw new BadRequestException('Reply must be 1,000 characters or fewer');
    if (!actor.userId) throw new ForbiddenException('An authenticated user is required to reply');
    if (attachments.length > 5) throw new BadRequestException('A reply can have at most 5 images');
    await this.consumeRateLimit(`support:comment:${actor.userId}`, 'SUPPORT_COMMENT_LIMIT', 30, 3600);

    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id }, select: { id: true, tenantId: true, ticketNumber: true } });
    if (!ticket) throw new NotFoundException(`Support ticket ${id} not found`);
    await this.db.$transaction([
      this.db.corporateSupportTicketComment.create({
        data: { ticketId: id, userId: actor.userId, message: trimmed, visibility },
      }),
      this.db.corporateSupportTicketActivity.create({
        data: {
          ticketId: id,
          performedBy: actor.userId,
          action: visibility === CorporateTicketCommentVisibility.INTERNAL ? 'INTERNAL_NOTE' : 'REPLY',
          description: visibility === CorporateTicketCommentVisibility.INTERNAL ? 'Internal note added' : 'Ticket reply added',
          visibility,
        },
      }),
      ...(attachments.length
        ? [this.db.corporateSupportTicketAttachment.createMany({ data: attachments.map((attachment) => ({ ...attachment, ticketId: id })) })]
        : []),
    ]);
    await this.db.corporateSupportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
    const audience = visibility === CorporateTicketCommentVisibility.INTERNAL
      ? 'admin:support'
      : `corporate:${ticket.tenantId}:support`;
    this.notifications.emitEvent(audience, 'CORPORATE_TICKET_UPDATED', { ticketId: id, ticketNumber: ticket.ticketNumber });
    return this.getTicket(id, actor);
  }

  async assignTicket(
    id: string,
    teamOrDto: string | null | undefined | AssignCorporateTicketDto,
    userIdOrActor?: string | null | undefined | SupportTicketActor,
    maybeActor?: SupportTicketActor,
  ): Promise<SupportTicketResponse> {
    if (teamOrDto && typeof teamOrDto === 'object' && ('assignedToUserId' in teamOrDto || 'notes' in teamOrDto)) {
      const dto = teamOrDto as AssignCorporateTicketDto;
      const actor = (userIdOrActor as SupportTicketActor) || { role: 'ADMIN' };
      const isPlatformStaff = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;
      if (!isPlatformStaff) {
        throw new ForbiddenException('Only platform administrators and ops staff can assign tickets');
      }

      const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
      if (!ticket) {
        throw new NotFoundException(`Support ticket ${id} not found`);
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
      if (ticket.status === CorporateTicketStatus.OPEN && dto.assignedToUserId) {
        data.status = CorporateTicketStatus.IN_PROGRESS;
      }

      const updated = await this.db.corporateSupportTicket.update({
        where: { id },
        data: data as any,
      });

      this.logger.log(`Support ticket ${ticket.ticketNumber} assigned to ${dto.assignedToUserId} by ${actor.userId}`);

      await this.audit.log({
        action: 'CORPORATE_SUPPORT_TICKET_ASSIGNED',
        userId: actor.userId,
        actorRole: actor.role,
        entityId: id,
        entityType: 'CORPORATE_SUPPORT_TICKET',
        metadata: {
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          tenantId: ticket.tenantId,
          previousAssignee: ticket.assignedToUserId,
          newAssignee: dto.assignedToUserId,
          notes: trimmedNotes,
        },
      });

      this.notifications.emitEvent('admin:support', 'CORPORATE_TICKET_ASSIGNED', {
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        assignedToUserId: dto.assignedToUserId,
        status: updated.status,
      });

      return updated as SupportTicketResponse;
    }

    const team = teamOrDto as string | null | undefined;
    const userId = userIdOrActor as string | null | undefined;
    const actor = maybeActor || { role: 'ADMIN' };
    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Support ticket ${id} not found`);
    const assignedTeam = team?.trim() || null;
    if (assignedTeam && assignedTeam.length > 64) throw new BadRequestException('Assigned team must be 64 characters or fewer');
    const assignedToUserId = userId || null;
    if (assignedToUserId) {
      const assignee = await this.db.user.findUnique({ where: { id: assignedToUserId }, select: { id: true, role: true } });
      if (!assignee || !['ADMIN', 'OPS'].includes(assignee.role)) {
        throw new BadRequestException('Assignee must be an authorized Admin or OPS user');
      }
    }
    const status = assignedTeam || assignedToUserId
      ? ticket.status === CorporateTicketStatus.OPEN ? CorporateTicketStatus.ASSIGNED : ticket.status
      : ticket.status === CorporateTicketStatus.ASSIGNED ? CorporateTicketStatus.OPEN : ticket.status;
    await this.db.$transaction([
      this.db.corporateSupportTicket.update({
        where: { id },
        data: { assignedTeam, assignedToUserId, status },
      }),
      this.db.corporateSupportTicketActivity.create({
        data: {
          ticketId: id,
          performedBy: actor.userId!,
          action: 'ASSIGNED',
          previousValue: ticket.assignedTeam,
          newValue: assignedTeam,
          description: `Ticket assigned${assignedTeam ? ` to ${assignedTeam}` : ''}`,
        },
      }),
    ]);
    this.notifications.emitEvent('admin:support', 'CORPORATE_TICKET_ASSIGNED', { ticketId: id, ticketNumber: ticket.ticketNumber, assignedTeam });
    this.notifications.emitEvent(`corporate:${ticket.tenantId}:support`, 'CORPORATE_TICKET_UPDATED', { ticketId: id });
    return this.getTicket(id, actor);
  }

  async changePriority(id: string, priority: CorporateTicketPriority, actor: SupportTicketActor) {
    if (!Object.values(CorporateTicketPriority).includes(priority)) throw new BadRequestException('Invalid priority');
    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Support ticket ${id} not found`);
    await this.db.$transaction([
      this.db.corporateSupportTicket.update({ where: { id }, data: { priority, slaMinutes: CorporateSupportTicketService.slaMinutesFor(priority) } }),
      this.db.corporateSupportTicketActivity.create({
        data: { ticketId: id, performedBy: actor.userId!, action: 'PRIORITY_CHANGED', previousValue: ticket.priority, newValue: priority, description: `Priority changed to ${priority}` },
      }),
    ]);
    return this.getTicket(id, actor);
  }

  async listOpsTickets(actor: SupportTicketActor) {
    if (!actor.userId) throw new ForbiddenException();
    const tickets = await this.db.corporateSupportTicket.findMany({
      where: { OR: [{ assignedTeam: { equals: 'OPS', mode: 'insensitive' } }, { assignedToUserId: actor.userId }] },
      include: {
        tenant: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return tickets as SupportTicketResponse[];
  }

  async updateTicketStatus(
    id: string,
    toStatus: CorporateTicketStatus,
    actor: SupportTicketActor,
    notes?: string,
    allowedStatuses?: CorporateTicketStatus[],
  ): Promise<SupportTicketResponse> {
    if (!toStatus || !TICKET_STATUSES.has(toStatus)) {
      throw new BadRequestException(`status must be one of ${[...TICKET_STATUSES].join(', ')}`);
    }
    const ticket = await this.db.corporateSupportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Support ticket ${id} not found`);
    if (allowedStatuses && !allowedStatuses.includes(toStatus)) throw new ForbiddenException('OPS cannot set this ticket status');
    const from = ticket.status as CorporateTicketStatus;

    if (!TICKET_ALLOWED_TRANSITIONS[from]?.includes(toStatus) && from !== toStatus) {
      throw new ConflictException(`Illegal ticket transition ${from} -> ${toStatus}`);
    }
    const now = new Date();
    const resolution = notes?.trim() || undefined;

    if (from === toStatus) {
      if (resolution) {
        const updateData: Record<string, unknown> = {};
        if (toStatus === CorporateTicketStatus.RESOLVED) {
          updateData.resolutionNotes = resolution;
        } else {
          updateData.adminNotes = resolution;
        }
        await this.db.corporateSupportTicket.update({
          where: { id },
          data: updateData as any,
        });
      }
      return this.getTicket(id, actor);
    }

    if (toStatus === CorporateTicketStatus.RESOLVED && !resolution) {
      throw new BadRequestException('Resolution details are required when resolving a ticket');
    }
    await this.db.$transaction(async (tx) => {
      const updated = await tx.corporateSupportTicket.updateMany({
        where: { id, status: from },
        data: {
          status: toStatus,
          ...(toStatus === CorporateTicketStatus.IN_PROGRESS && (actor.role === 'ADMIN' || actor.role === 'OPS')
            ? { assignedToUserId: actor.userId ?? ticket.assignedToUserId }
            : {}),
          ...(toStatus === CorporateTicketStatus.IN_PROGRESS && resolution
            ? { adminNotes: resolution }
            : {}),
          ...(toStatus === CorporateTicketStatus.RESOLVED
            ? { resolvedAt: now, resolvedByUserId: actor.userId ?? null, resolutionNotes: resolution }
            : toStatus === CorporateTicketStatus.REOPENED
              ? { resolvedAt: null, resolvedByUserId: null, resolutionNotes: null }
              : {}),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(`Support ticket ${id} changed concurrently; reload and retry`);
      }
      await tx.corporateSupportTicketActivity.create({
        data: {
          ticketId: id,
          performedBy: actor.userId!,
          action: 'STATUS_CHANGED',
          previousValue: from,
          newValue: toStatus,
          description: `Status changed from ${from} to ${toStatus}`,
        },
      });
    });

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
      metadata: { tenantId: ticket.tenantId, fromStatus: from, toStatus, notes: resolution },
    });
    return this.getTicket(id, actor);
  }

  /**
   * Legacy call site retained for compatibility; workflow validation is centralized above.
   */
  async transitionStatus(
    id: string,
    toStatus: CorporateTicketStatus,
    actor: SupportTicketActor,
    notes?: string,
  ): Promise<SupportTicketResponse> {
    return this.updateTicketStatus(id, toStatus, actor, notes);
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
