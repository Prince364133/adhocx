import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CorporateTicketCategory, CorporateTicketPriority, CorporateTicketStatus, UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard, resolveScopedTenantId } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateSupportTicketService, SupportTicketActor } from './corporate-support-ticket.service';
import {
  AssignCorporateTicketDto,
  CreateCorporateSupportTicketDto,
  CreateCorporateTicketMessageDto,
  ReopenCorporateTicketDto,
  UpdateSupportTicketStatusDto,
} from './safety.types';

const parseIntOrUndefined = (v?: string): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

const resolveActor = (req: any): SupportTicketActor => ({
  userId: req.user?.id || req.user?.sub,
  role: req.user?.role,
  corporateTenantId: req.user?.corporateTenantId,
  corporateEmployeeId: req.user?.corporateEmployeeId,
});

/**
 * Corporate / platform support desk over CorporateSupportTicket (employees raise tickets through
 * /corporate/me/tickets). Corporate roles are confined to their own tenant by CorporateAccessGuard;
 * platform ADMIN sees every tenant and is the only role that moves a ticket through
 * OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.
 */
@ApiTags('Corporate ETS - Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/support/tickets')
export class CorporateSupportTicketController {
  constructor(private readonly tickets: CorporateSupportTicketService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Raise a support ticket on behalf of an employee of the caller\'s tenant' })
  @ApiResponse({ status: 201, description: 'Ticket created with priority-based SLA' })
  @ApiResponse({ status: 403, description: 'Employee belongs to another tenant' })
  public async createTicket(@Body() dto: CreateCorporateSupportTicketDto, @Req() req: any) {
    const tenantId = resolveScopedTenantId(req, dto?.tenantId);
    return this.tickets.createForEmployee(dto?.employeeId, tenantId, dto, resolveActor(req));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List support tickets (corporate roles: own tenant only; ADMIN: all tenants or ?tenantId=)' })
  public async listTickets(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: CorporateTicketStatus,
    @Query('priority') priority?: CorporateTicketPriority,
    @Query('category') category?: CorporateTicketCategory,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tickets.listTickets({
      tenantId: resolveScopedTenantId(req, tenantId),
      status,
      priority,
      category,
      employeeId,
      search,
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Get one ticket (employee: own tickets only; corporate roles: own tenant)' })
  public async getTicket(@Param('id') id: string) {
    return this.tickets.getTicket(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Move a ticket to its next status: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(CorporateTicketStatus) },
        notes: { type: 'string' },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 409, description: 'Illegal ticket transition' })
  public async updateStatus(@Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto, @Req() req: any) {
    return this.tickets.transitionStatus(id, dto?.status, resolveActor(req), dto?.notes);
  }

  @Get(':id/messages')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'List conversation messages for a support ticket' })
  public async listMessages(@Param('id') id: string, @Req() req: any) {
    return this.tickets.listMessages(id, resolveActor(req));
  }

  @Post(':id/messages')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Post a reply or internal note on a support ticket' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        isInternal: { type: 'boolean' },
      },
      required: ['message'],
    },
  })
  public async createMessage(@Param('id') id: string, @Body() dto: CreateCorporateTicketMessageDto, @Req() req: any) {
    return this.tickets.createMessage(id, dto, resolveActor(req));
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Assign or reassign a support ticket to an administrator or ops staff' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedToUserId: { type: 'string', nullable: true },
        notes: { type: 'string' },
      },
    },
  })
  public async assignTicket(@Param('id') id: string, @Body() dto: AssignCorporateTicketDto, @Req() req: any) {
    return this.tickets.assignTicket(id, dto, resolveActor(req));
  }

  @Post(':id/reopen')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Reopen an eligible resolved or closed support ticket' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  })
  public async reopenTicket(@Param('id') id: string, @Body() dto: ReopenCorporateTicketDto, @Req() req: any) {
    return this.tickets.reopenTicket(id, dto, resolveActor(req));
  }

  @Get(':id/activity')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Get ticket audit and activity history' })
  public async getActivity(@Param('id') id: string, @Req() req: any) {
    return this.tickets.getActivity(id, resolveActor(req));
  }
}
