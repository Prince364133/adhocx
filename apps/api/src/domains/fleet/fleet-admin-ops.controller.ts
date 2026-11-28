import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminFleetPayoutQueryDto,
  AdminFleetSupportQueryDto,
  AdminReplyFleetSupportDto,
  AdminUpdateFleetSupportStatusDto,
  AuthUserDto,
  CreateFleetAdminUserDto,
  CreateFleetShortfallDto,
  ProcessFleetPayoutDto,
  UpdateFleetAdminUserDto,
  UserRole,
} from '@adhocx/contracts';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common';
import { FleetAdminOperationsService } from './fleet-admin-ops.service';

/**
 * Admin operations for Fleet Portal credentials, payout disbursals,
 * shortfall claims, and fleet support tickets.
 *
 * Registered BEFORE FleetController so static subpaths ('payouts', 'support')
 * are matched ahead of FleetController's '@Get(':id')'.
 */
@ApiTags('Admin Fleet Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPS)
@Controller('admin/fleets')
export class FleetAdminOperationsController {
  constructor(private readonly ops: FleetAdminOperationsService) {}

  // ── Fleet Payout Requests ────────────────────────────────────────────────────

  @Get('payouts')
  @ApiOperation({ summary: 'List all fleet payout requests across fleets' })
  @SwaggerResponse({ status: 200, description: 'Paginated fleet payout requests' })
  async listPayouts(@Query() query: AdminFleetPayoutQueryDto) {
    return this.ops.listPayouts(query);
  }

  @Patch('payouts/:payoutId')
  @ApiOperation({ summary: 'Approve, review, settle, or reject a fleet payout request' })
  @SwaggerResponse({ status: 200, description: 'Fleet payout request updated' })
  async processPayout(
    @Param('payoutId') payoutId: string,
    @Body() dto: ProcessFleetPayoutDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.processPayout(payoutId, dto, user);
  }

  // ── Fleet Support Desk ───────────────────────────────────────────────────────

  @Get('support/tickets')
  @ApiOperation({ summary: 'List fleet portal support tickets for Admin triage' })
  @SwaggerResponse({ status: 200, description: 'Paginated fleet support tickets' })
  async listSupportTickets(@Query() query: AdminFleetSupportQueryDto) {
    return this.ops.listSupportTickets(query);
  }

  @Get('support/tickets/:ticketId')
  @ApiOperation({ summary: 'Get fleet support ticket conversation and attachments' })
  @SwaggerResponse({ status: 200, description: 'Fleet support ticket detail' })
  async getSupportTicketDetail(@Param('ticketId') ticketId: string) {
    return this.ops.getSupportTicketDetail(ticketId);
  }

  @Post('support/tickets/:ticketId/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a fleet support ticket as AdhocX Support' })
  @SwaggerResponse({ status: 200, description: 'Reply recorded and fleet notified' })
  async replySupportTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminReplyFleetSupportDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.replySupportTicket(ticketId, dto, user);
  }

  @Patch('support/tickets/:ticketId/status')
  @ApiOperation({ summary: 'Update fleet support ticket status (OPEN/IN_PROGRESS/RESOLVED/CLOSED)' })
  @SwaggerResponse({ status: 200, description: 'Ticket status updated' })
  async updateSupportTicketStatus(
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminUpdateFleetSupportStatusDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.updateSupportTicketStatus(ticketId, dto, user);
  }

  // ── Fleet Portal Users (FleetAdminUser) ──────────────────────────────────────

  @Get(':fleetId/users')
  @ApiOperation({ summary: 'List portal administrator accounts for a fleet' })
  @SwaggerResponse({ status: 200, description: 'List of fleet portal users' })
  async listFleetUsers(@Param('fleetId') fleetId: string) {
    return this.ops.listFleetUsers(fleetId);
  }

  @Post(':fleetId/users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision a new Fleet Portal user account' })
  @SwaggerResponse({ status: 201, description: 'Fleet portal user provisioned' })
  async createFleetUser(
    @Param('fleetId') fleetId: string,
    @Body() dto: CreateFleetAdminUserDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.createFleetUser(fleetId, dto, user);
  }

  @Patch(':fleetId/users/:userId')
  @ApiOperation({ summary: 'Update role, active status, or reset password for a Fleet Portal user' })
  @SwaggerResponse({ status: 200, description: 'Fleet portal user updated' })
  async updateFleetUser(
    @Param('fleetId') fleetId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateFleetAdminUserDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.updateFleetUser(fleetId, userId, dto, user);
  }

  // ── Fleet Shortfall Claims (FleetShortfallRecord) ────────────────────────────

  @Get(':fleetId/shortfalls')
  @ApiOperation({ summary: 'List shortfall compensation records for a fleet' })
  @SwaggerResponse({ status: 200, description: 'Shortfall records for the fleet' })
  async listShortfalls(@Param('fleetId') fleetId: string) {
    return this.ops.listShortfalls(fleetId);
  }

  @Post(':fleetId/shortfalls')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shortfall compensation claim record for a fleet' })
  @SwaggerResponse({ status: 201, description: 'Shortfall claim recorded' })
  async createShortfall(
    @Param('fleetId') fleetId: string,
    @Body() dto: CreateFleetShortfallDto,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.ops.createShortfall(fleetId, dto, user);
  }
}
