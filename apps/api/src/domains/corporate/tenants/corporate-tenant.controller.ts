import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CorporateTenantService } from './corporate-tenant.service';
import {
  CreateCorporateTenantDto,
  UpdateCorporateTenantDto,
  CreateCorporateOfficeDto,
  CreateCorporateEmployeeDto,
  UpdateCorporateEmployeeDto,
  CreateEmployeeLocationDto,
  CorporateTenantStatus,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource } from '../../../common/decorators/corporate-resource.decorator';
import { CorporatePermission } from './corporate-permissions';
import { CorporateTenantPolicyService, CreateTenantPolicyInput } from './corporate-tenant-policy.service';
import { CorporateOrgStructureService, CreateOrgUnitInput } from './corporate-org-structure.service';
import {
  CorporateTenantUsersService,
  InviteCorporateUserInput,
  UpdateCorporateUserInput,
} from './corporate-tenant-users.service';

const CORPORATE_PORTAL_ROLES = [UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER] as const;

/** Office scope bound by CorporateAccessGuard (null = all offices / platform admin). */
const scopeOf = (req: any): string[] | null => req?.corporateOfficeScope ?? null;

@ApiTags('Corporate ETS - Tenants, Offices & Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/tenants')
export class CorporateTenantController {
  constructor(
    private readonly tenantService: CorporateTenantService,
    private readonly policyService: CorporateTenantPolicyService,
    private readonly orgService: CorporateOrgStructureService,
    private readonly usersService: CorporateTenantUsersService,
  ) {}

  // ---------------------------------------------------------------------------
  // TENANTS
  // ---------------------------------------------------------------------------

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Onboard a new corporate tenant' })
  @ApiResponse({ status: 201, description: 'Tenant successfully onboarded' })
  public async createTenant(@Body() dto: CreateCorporateTenantDto, @Req() req: any) {
    return this.tenantService.createTenant(dto, req.user?.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List all corporate tenants' })
  @ApiResponse({ status: 200, description: 'Paginated list of corporate tenants' })
  public async listTenants(
    @Query('search') search?: string,
    @Query('status') status?: CorporateTenantStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.listTenants({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(...CORPORATE_PORTAL_ROLES, UserRole.OPS)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('tenant:read')
  @ApiOperation({ summary: 'Get corporate tenant profile with offices and metrics' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  public async getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @CorporateResource('tenant', 'id')
  @ApiOperation({ summary: 'Update corporate tenant information or active status' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  public async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateCorporateTenantDto,
    @Req() req: any,
  ) {
    return this.tenantService.updateTenant(id, dto, req.user?.id);
  }

  // ---------------------------------------------------------------------------
  // CORPORATE USERS (6 roles + office scope)
  // ---------------------------------------------------------------------------

  @Get(':id/users')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('users:read')
  @ApiOperation({ summary: 'List corporate portal users of a tenant with their role and office scope' })
  public async listUsers(@Param('id') tenantId: string) {
    return this.usersService.listUsers(tenantId);
  }

  @Post(':id/users')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('users:invite')
  @ApiOperation({
    summary: 'Invite a corporate user (CORP_SUPER_ADMIN, HR, TRANSPORT, FINANCE, SAFETY, READ_ONLY) with an office scope',
    description: 'Creates the account; the user signs in with the existing OTP login. Empty officeIds = all offices.',
  })
  @ApiResponse({ status: 201, description: 'User invited' })
  public async inviteUser(@Param('id') tenantId: string, @Body() body: InviteCorporateUserInput, @Req() req: any) {
    return this.usersService.inviteUser(tenantId, body, req.user);
  }

  @Patch(':id/users/:userId')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('users:invite')
  @ApiOperation({ summary: 'Change the corporate role / office scope of a tenant user (effective on next token refresh)' })
  public async updateUser(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateCorporateUserInput,
    @Req() req: any,
  ) {
    return this.usersService.updateUser(tenantId, userId, body, req.user);
  }

  // ---------------------------------------------------------------------------
  // DEPARTMENTS & COST CENTERS
  // ---------------------------------------------------------------------------

  @Get(':id/departments')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('departments:read')
  @ApiOperation({ summary: 'List departments of a tenant' })
  public async listDepartments(@Param('id') tenantId: string) {
    return this.orgService.list('department', tenantId);
  }

  @Post(':id/departments')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('departments:write')
  @ApiOperation({ summary: 'Create a department (code unique per tenant); links employees whose department text matches' })
  public async createDepartment(@Param('id') tenantId: string, @Body() body: CreateOrgUnitInput, @Req() req: any) {
    return this.orgService.create('department', tenantId, body, req.user?.id);
  }

  @Get(':id/cost-centers')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('costcenters:read')
  @ApiOperation({ summary: 'List cost centers of a tenant' })
  public async listCostCenters(@Param('id') tenantId: string) {
    return this.orgService.list('costCenter', tenantId);
  }

  @Post(':id/cost-centers')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('costcenters:write')
  @ApiOperation({ summary: 'Create a cost center (code unique per tenant); links employees whose cost center text matches' })
  public async createCostCenter(@Param('id') tenantId: string, @Body() body: CreateOrgUnitInput, @Req() req: any) {
    return this.orgService.create('costCenter', tenantId, body, req.user?.id);
  }

  // ---------------------------------------------------------------------------
  // TENANT POLICY (versioned)
  // ---------------------------------------------------------------------------

  @Get(':id/policy')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('policy:read')
  @ApiOperation({ summary: 'Effective tenant policy (cancel cutoff, max ride, vehicle, capacity, escalation lead) at ?at (default now)' })
  public async getPolicy(@Param('id') tenantId: string, @Query('at') at?: string) {
    const when = at ? new Date(at) : new Date();
    if (Number.isNaN(when.getTime())) throw new BadRequestException('at must be an ISO date-time');
    return this.policyService.getEffectivePolicy(tenantId, when);
  }

  @Get(':id/policy/versions')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('policy:read')
  @ApiOperation({ summary: 'All policy versions of a tenant, newest first' })
  public async listPolicyVersions(@Param('id') tenantId: string) {
    return this.policyService.listPolicyVersions(tenantId);
  }

  @Post(':id/policy')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('policy:write')
  @ApiOperation({ summary: 'Add a tenant policy version effective from effectiveFrom (default now); omitted fields inherit' })
  public async createPolicyVersion(@Param('id') tenantId: string, @Body() body: CreateTenantPolicyInput, @Req() req: any) {
    return this.policyService.createPolicyVersion(tenantId, body, req.user?.id);
  }

  // ---------------------------------------------------------------------------
  // OFFICES
  // ---------------------------------------------------------------------------

  @Post(':id/offices')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('offices:write')
  @ApiOperation({ summary: 'Create an office campus for a corporate tenant' })
  @ApiResponse({ status: 201, description: 'Office campus created' })
  public async createOffice(
    @Param('id') tenantId: string,
    @Body() dto: CreateCorporateOfficeDto,
    @Req() req: any,
  ) {
    if (scopeOf(req)) {
      // A new office can never be inside an existing office scope.
      throw new ForbiddenException('Office-scoped users cannot create offices');
    }
    return this.tenantService.createOffice(tenantId, dto, req.user?.id);
  }

  @Get(':id/offices')
  @Roles(...CORPORATE_PORTAL_ROLES, UserRole.OPS)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('offices:read')
  @ApiOperation({ summary: 'List all office campuses for a corporate tenant (office-scoped users: their offices)' })
  @ApiResponse({ status: 200, description: 'List of offices' })
  public async listOffices(@Param('id') tenantId: string, @Req() req?: any) {
    return this.tenantService.listOffices(tenantId, scopeOf(req));
  }

  @Get(':id/offices/:officeId')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('offices:read')
  @ApiOperation({ summary: 'Get office campus details' })
  @ApiResponse({ status: 200, description: 'Office details' })
  public async getOfficeById(
    @Param('id') tenantId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.tenantService.getOfficeById(tenantId, officeId);
  }

  @Get(':id/offices/:officeId/geofences')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('offices:read')
  @ApiOperation({ summary: 'Get office geofence polygon, gates and pickup bays' })
  @ApiResponse({ status: 200, description: 'Office geofences and gates' })
  public async getOfficeGeofences(
    @Param('id') tenantId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.tenantService.getOfficeGeofences(tenantId, officeId);
  }

  @Get(':id/integrations')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('tenant:read')
  @ApiOperation({ summary: 'Get tenant HRMS connector status, webhook delivery health and field mappings' })
  @ApiResponse({ status: 200, description: 'Integration status' })
  public async getIntegrations(@Param('id') tenantId: string) {
    return this.tenantService.getTenantIntegrations(tenantId);
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEES & GEOCODING
  // ---------------------------------------------------------------------------

  @Post(':id/employees')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:write')
  @ApiOperation({ summary: 'Add an employee with address geocoding and H3 spatial cell mapping' })
  @ApiResponse({ status: 201, description: 'Employee registered' })
  public async createEmployee(
    @Param('id') tenantId: string,
    @Body() dto: CreateCorporateEmployeeDto,
    @Req() req: any,
  ) {
    return this.tenantService.createEmployee(tenantId, dto, req.user?.id);
  }

  @Get(':id/employees')
  @Roles(...CORPORATE_PORTAL_ROLES, UserRole.OPS)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:read')
  @ApiOperation({ summary: 'List corporate employees with search and filters (office-scoped users: their offices)' })
  @ApiResponse({ status: 200, description: 'Paginated list of employees' })
  public async listEmployees(
    @Param('id') tenantId: string,
    @Query('search') search?: string,
    @Query('officeId') officeId?: string,
    @Query('department') department?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.tenantService.listEmployees(tenantId, {
      search,
      officeId,
      department,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      officeScope: scopeOf(req),
    });
  }

  @Get(':id/employees/:employeeId')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:read')
  @ApiOperation({ summary: 'Get employee details and pickup locations' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  public async getEmployeeById(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Req() req?: any,
  ) {
    return this.tenantService.getEmployeeById(tenantId, employeeId, scopeOf(req));
  }

  @Get(':id/employees/:employeeId/requests')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:read')
  @ApiOperation({
    summary: 'Commute history of an employee: transport requests (newest first) with planned vs actual pickup',
  })
  @ApiResponse({ status: 200, description: 'Employee transport requests' })
  public async listEmployeeRequests(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.tenantService.listEmployeeRequests(tenantId, employeeId, scopeOf(req), {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch(':id/employees/:employeeId')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:write')
  @ApiOperation({ summary: 'Update employee details or active status' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  public async updateEmployee(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateCorporateEmployeeDto,
    @Req() req: any,
  ) {
    return this.tenantService.updateEmployee(tenantId, employeeId, dto, req.user?.id, scopeOf(req));
  }

  @Post(':id/employees/:employeeId/locations')
  @Roles(...CORPORATE_PORTAL_ROLES)
  @CorporateResource('tenant', 'id')
  @CorporatePermission('employees:write')
  @ApiOperation({ summary: 'Add an alternate or default pickup/drop location for employee' })
  @ApiResponse({ status: 201, description: 'Location saved' })
  public async addEmployeeLocation(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeLocationDto,
    @Req() req: any,
  ) {
    return this.tenantService.addEmployeeLocation(tenantId, employeeId, dto, req.user?.id, scopeOf(req));
  }
}
