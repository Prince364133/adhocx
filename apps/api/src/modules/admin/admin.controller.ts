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
import { UserStatus as PrismaUserStatus } from '@prisma/client';
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

  @Post('drivers/:id/clear-cooldown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift an active dispatch cooldown and reset the decline streak' })
  @SwaggerResponse({ status: 200, description: 'Cooldown cleared' })
  async clearDriverCooldown(@Param('id') id: string, @CurrentUser() admin: AuthUserDto) {
    return this.adminService.clearDriverCooldown(id, admin.id);
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

  // --- Platform User Management Workflows ---

  @Get('users')
  @ApiOperation({ summary: 'List platform users with filtering, role, status, and search' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of platform users' })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      status,
      role,
      search,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details including orders, location, and activity history' })
  @SwaggerResponse({ status: 200, description: 'User profile details retrieved' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user profile details' })
  @SwaggerResponse({ status: 200, description: 'User profile updated' })
  async updateUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { fullName?: string; phone?: string; email?: string; status?: any; address?: string },
  ) {
    return this.adminService.updateUser(id, admin.id, dto);
  }

  @Post('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, DEACTIVATED)' })
  @SwaggerResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { status: PrismaUserStatus; reason?: string },
  ) {
    return this.adminService.updateUserStatus(id, admin.id, dto.status, dto.reason);
  }

  @Post('vendors/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vendor account status (ACTIVE, SUSPENDED, DEACTIVATED, VERIFIED)' })
  @SwaggerResponse({ status: 200, description: 'Vendor status updated' })
  async updateVendorStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: { status: string; reason?: string },
  ) {
    return this.adminService.updateVendorStatus(id, admin.id, dto.status, dto.reason);
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

  // --- Platform Finance & Accounting Workflows ---

  @Get('finance/dashboard')
  @ApiOperation({ summary: 'Get aggregated financial dashboard metrics, revenue trends, and driver payouts' })
  async getFinanceDashboard(
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getFinanceDashboard(range, startDate, endDate);
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: 'Get unified financial transactions with pagination and search' })
  async getFinanceTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getFinanceTransactions({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      status,
      search,
      range,
      startDate,
      endDate,
    });
  }

  @Get('finance/driver/:id')
  @ApiOperation({ summary: 'Get individual driver earnings, payout history, and ledger breakdown' })
  async getDriverFinancialHistory(@Param('id') id: string) {
    return this.adminService.getDriverFinancialHistory(id);
  }

  // --- Reports & Operational SLA Telemetry ---

  @Get('reports/corridors')
  @Get('corridors')
  @ApiOperation({ summary: 'Get corridor demand density and route fulfillment analytics' })
  async getCorridors(@Query('range') range?: string) {
    return this.adminService.getCorridorAnalytics(range);
  }

  @Get('reports/trips')
  @ApiOperation({ summary: 'Get monthly trip frequency and an optional selected-day trip report' })
  async getTripFrequencyReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('day') day?: string,
  ) {
    return this.adminService.getTripFrequencyReport(year, month, day);
  }

  @Get('reports/trips/weekly')
  @ApiOperation({ summary: 'Get a Monday-to-Sunday trip report and an optional selected-day report' })
  async getWeeklyTripFrequencyReport(
    @Query('weekStart') weekStart: string,
    @Query('day') day?: string,
  ) {
    return this.adminService.getWeeklyTripFrequencyReport(weekStart, day);
  }

  @Get('reports/financial-daily')
  @ApiOperation({ summary: 'Get date-filtered booking volume, platform revenue, payouts, and active escrow holds' })
  async getDailyFinancialReport(@Query('date') date: string) {
    return this.adminService.getDailyFinancialReport(date);
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
