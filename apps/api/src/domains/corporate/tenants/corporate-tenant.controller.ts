import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CorporateTenantService } from './corporate-tenant.service';
import {
  CreateCorporateTenantDto,
  UpdateCorporateTenantDto,
  CreateCorporateOfficeDto,
  CreateCorporateEmployeeDto,
  UpdateCorporateEmployeeDto,
  CreateEmployeeLocationDto,
  CorporateTenantStatus,
} from '@adhocx/contracts';

@ApiTags('Corporate ETS - Tenants, Offices & Employees')
@Controller('corporate/tenants')
export class CorporateTenantController {
  constructor(private readonly tenantService: CorporateTenantService) {}

  // ---------------------------------------------------------------------------
  // TENANTS
  // ---------------------------------------------------------------------------

  @Post()
  @ApiOperation({ summary: 'Onboard a new corporate tenant' })
  @ApiResponse({ status: 201, description: 'Tenant successfully onboarded' })
  public async createTenant(@Body() dto: CreateCorporateTenantDto, @Req() req: any) {
    return this.tenantService.createTenant(dto, req.user?.id);
  }

  @Get()
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
  @ApiOperation({ summary: 'Get corporate tenant profile with offices and metrics' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  public async getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Patch(':id')
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
  // OFFICES
  // ---------------------------------------------------------------------------

  @Post(':id/offices')
  @ApiOperation({ summary: 'Create an office campus for a corporate tenant' })
  @ApiResponse({ status: 201, description: 'Office campus created' })
  public async createOffice(
    @Param('id') tenantId: string,
    @Body() dto: CreateCorporateOfficeDto,
    @Req() req: any,
  ) {
    return this.tenantService.createOffice(tenantId, dto, req.user?.id);
  }

  @Get(':id/offices')
  @ApiOperation({ summary: 'List all office campuses for a corporate tenant' })
  @ApiResponse({ status: 200, description: 'List of offices' })
  public async listOffices(@Param('id') tenantId: string) {
    return this.tenantService.listOffices(tenantId);
  }

  @Get(':id/offices/:officeId')
  @ApiOperation({ summary: 'Get office campus details' })
  @ApiResponse({ status: 200, description: 'Office details' })
  public async getOfficeById(
    @Param('id') tenantId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.tenantService.getOfficeById(tenantId, officeId);
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEES & GEOCODING
  // ---------------------------------------------------------------------------

  @Post(':id/employees')
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
  @ApiOperation({ summary: 'List corporate employees with search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of employees' })
  public async listEmployees(
    @Param('id') tenantId: string,
    @Query('search') search?: string,
    @Query('officeId') officeId?: string,
    @Query('department') department?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.listEmployees(tenantId, {
      search,
      officeId,
      department,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id/employees/:employeeId')
  @ApiOperation({ summary: 'Get employee details and pickup locations' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  public async getEmployeeById(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.tenantService.getEmployeeById(tenantId, employeeId);
  }

  @Patch(':id/employees/:employeeId')
  @ApiOperation({ summary: 'Update employee details or active status' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  public async updateEmployee(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateCorporateEmployeeDto,
    @Req() req: any,
  ) {
    return this.tenantService.updateEmployee(tenantId, employeeId, dto, req.user?.id);
  }

  @Post(':id/employees/:employeeId/locations')
  @ApiOperation({ summary: 'Add an alternate or default pickup/drop location for employee' })
  @ApiResponse({ status: 201, description: 'Location saved' })
  public async addEmployeeLocation(
    @Param('id') tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeLocationDto,
    @Req() req: any,
  ) {
    return this.tenantService.addEmployeeLocation(tenantId, employeeId, dto, req.user?.id);
  }
}
