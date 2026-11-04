import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CorporateTicketPriority, CorporateTicketStatus, UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard, resolveScopedTenantId } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateSupportTicketService } from './corporate-support-ticket.service';
import { CreateCorporateSupportTicketDto, UpdateSupportTicketStatusDto } from './safety.types';

const parseIntOrUndefined = (v?: string): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

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
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Raise a support ticket on behalf of an employee of the caller\'s tenant' })
  @ApiResponse({ status: 201, description: 'Ticket created with priority-based SLA' })
  @ApiResponse({ status: 403, description: 'Employee belongs to another tenant' })
  public async createTicket(@Body() dto: CreateCorporateSupportTicketDto, @Req() req: any) {
    const tenantId = resolveScopedTenantId(req, dto?.tenantId);
    return this.tickets.createForEmployee(dto?.employeeId, tenantId, dto, { userId: req.user?.id, role: req.user?.role });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List support tickets (corporate roles: own tenant only; ADMIN: all tenants or ?tenantId=)' })
  public async listTickets(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: CorporateTicketStatus,
    @Query('priority') priority?: CorporateTicketPriority,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tickets.listTickets({
      tenantId: resolveScopedTenantId(req, tenantId),
      status,
      priority,
      employeeId,
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Get one ticket (employee: own tickets only; corporate roles: own tenant)' })
  public async getTicket(@Param('id') id: string) {
    return this.tickets.getTicket(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
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
    return this.tickets.transitionStatus(id, dto?.status, { userId: req.user?.id, role: req.user?.role }, dto?.notes);
  }
}
