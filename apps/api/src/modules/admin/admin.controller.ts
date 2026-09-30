import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  AdminDriverQueryDto,
  AdminVendorQueryDto,
  VerifyDriverKycDto,
  RejectDriverKycDto,
  SuspendDriverDto,
  ReactivateDriverDto,
  VerifyVendorDto,
  RejectVendorDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { AdminService } from './admin.service';

@ApiTags('Admin Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Driver Verification Workflows ---

  @Get('drivers')
  @ApiOperation({ summary: 'List drivers for verification and operational review' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of drivers' })
  async listDrivers(@Query() query: AdminDriverQueryDto) {
    return this.adminService.listDrivers(query);
  }

  @Get('drivers/:id')
  @ApiOperation({ summary: 'Get full driver details including vehicles and KYC documents' })
  @SwaggerResponse({ status: 200, description: 'Driver details retrieved' })
  async getDriverDetails(@Param('id') id: string, @CurrentUser() user: AuthUserDto) {
    return this.adminService.getDriverDetails(id, user.role);
  }

  @Patch('drivers/:id')
  @ApiOperation({ summary: 'Update driver profile details (admin override)' })
  @SwaggerResponse({ status: 200, description: 'Driver details updated' })
  async updateDriver(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { fullName?: string; phone?: string; vehiclePlate?: string; vehicleModel?: string; vehicleType?: string },
  ) {
    return this.adminService.updateDriver(id, admin.id, dto);
  }

  @Post('drivers/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve driver KYC (UNDER_REVIEW -> VERIFIED)' })
  @SwaggerResponse({ status: 200, description: 'Driver verified successfully' })
  async verifyDriver(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: VerifyDriverKycDto,
  ) {
    return this.adminService.verifyDriver(id, admin.id, dto);
  }

  @Post('drivers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject driver KYC with mandatory reason (UNDER_REVIEW -> REJECTED)' })
  @SwaggerResponse({ status: 200, description: 'Driver rejected' })
  async rejectDriver(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: RejectDriverKycDto,
  ) {
    return this.adminService.rejectDriver(id, admin.id, dto);
  }

  @Post('drivers/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend verified driver (VERIFIED -> SUSPENDED)' })
  @SwaggerResponse({ status: 200, description: 'Driver suspended' })
  async suspendDriver(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: SuspendDriverDto,
  ) {
    return this.adminService.suspendDriver(id, admin.id, dto);
  }

  @Post('drivers/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate suspended driver (SUSPENDED -> VERIFIED)' })
  @SwaggerResponse({ status: 200, description: 'Driver reactivated' })
  async reactivateDriver(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: ReactivateDriverDto,
  ) {
    return this.adminService.reactivateDriver(id, admin.id, dto);
  }

  // --- Vendor Verification Workflows ---

  @Get('vendors')
  @ApiOperation({ summary: 'List vendors for onboarding review' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of vendors' })
  async listVendors(@Query() query: AdminVendorQueryDto) {
    return this.adminService.listVendors(query);
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get full vendor details including requirements' })
  @SwaggerResponse({ status: 200, description: 'Vendor details retrieved' })
  async getVendorDetails(@Param('id') id: string) {
    return this.adminService.getVendorDetails(id);
  }

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update vendor profile details (admin override)' })
  @SwaggerResponse({ status: 200, description: 'Vendor details updated' })
  async updateVendor(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string },
  ) {
    return this.adminService.updateVendor(id, admin.id, dto);
  }

  @Post('vendors/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify vendor organization' })
  @SwaggerResponse({ status: 200, description: 'Vendor verified successfully' })
  async verifyVendor(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: VerifyVendorDto,
  ) {
    return this.adminService.verifyVendor(id, admin.id, dto);
  }

  @Post('vendors/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject vendor organization with mandatory reason' })
  @SwaggerResponse({ status: 200, description: 'Vendor rejected' })
  async rejectVendor(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: RejectVendorDto,
  ) {
    return this.adminService.rejectVendor(id, admin.id, dto);
  }

  @Delete('vendors/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete vendor account and cascade records' })
  @SwaggerResponse({ status: 200, description: 'Vendor deleted permanently' })
  async deleteVendor(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.adminService.deleteVendor(id, admin.id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete user account and cascade records' })
  @SwaggerResponse({ status: 200, description: 'User deleted permanently' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.adminService.deleteUser(id, admin.id);
  }

  // --- Platform Analytics & Audit Logs ---

  @Get('metrics')
  @ApiOperation({ summary: 'Get operational KPI metrics across the platform' })
  @SwaggerResponse({ status: 200, description: 'KPI metrics retrieved' })
  async getMetrics() {
    return this.adminService.getOperationalMetrics();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get platform audit logs' })
  @SwaggerResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit ? Number(limit) : 50);
  }

  // --- Reports & Operational SLA Telemetry ---

  @Get('reports/corridors')
  @Get('corridors')
  @ApiOperation({ summary: 'Get corridor demand density and route fulfillment analytics' })
  async getCorridors(@Query('range') range?: string) {
    return this.adminService.getCorridorAnalytics(range);
  }

  @Get('reports/analytics')
  @Get('reports')
  @ApiOperation({ summary: 'Get operational SLA performance and platform GMV breakdown' })
  async getOperationalReports() {
    return this.adminService.getOperationalReports();
  }

  // --- Operational Helpdesk & Support Interventions ---

  @Get('support/tickets')
  @ApiOperation({ summary: 'List support helpdesk and conflict tickets' })
  async getSupportTickets(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSupportTickets(status, search);
  }

  @Post('support/tickets/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve support helpdesk ticket' })
  async resolveSupportTicket(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string },
  ) {
    return this.adminService.resolveSupportTicket(id, admin.id, dto);
  }
}


