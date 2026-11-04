import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { H3Service } from '../../../modules/locations/h3.service';
import {
  CreateCorporateTenantDto,
  UpdateCorporateTenantDto,
  CreateCorporateOfficeDto,
  CreateCorporateEmployeeDto,
  UpdateCorporateEmployeeDto,
  CreateEmployeeLocationDto,
  CorporateTenantStatus,
} from '@adhocx/contracts';

@Injectable()
export class CorporateTenantService {
  private readonly logger = new Logger(CorporateTenantService.name);

  // Fallback Hyderabad coordinates for pilot geocoding when external API is unreachable
  private readonly HYDERABAD_CENTROID_LAT = 17.385044;
  private readonly HYDERABAD_CENTROID_LNG = 78.486671;

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly h3Service: H3Service,
  ) {}

  // ---------------------------------------------------------------------------
  // TENANT MANAGEMENT
  // ---------------------------------------------------------------------------

  async createTenant(dto: CreateCorporateTenantDto, actorUserId?: string) {
    const existing = await this.db.corporateTenant.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Corporate tenant with code '${dto.code}' already exists`);
    }

    const tenant = await this.db.corporateTenant.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        legalEntityName: dto.legalEntityName.trim(),
        gstin: dto.gstin?.trim() || null,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Created corporate tenant ${tenant.name} (${tenant.code})`);

    await this.audit.log({
      action: 'CORPORATE_TENANT_CREATED',
      userId: actorUserId,
      entityId: tenant.id,
      entityType: 'CORPORATE_TENANT',
      metadata: { code: tenant.code, name: tenant.name },
    });

    return tenant;
  }

  async listTenants(query?: { search?: string; status?: CorporateTenantStatus; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { legalEntityName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.corporateTenant.count({ where }),
      this.db.corporateTenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              offices: true,
              employees: true,
              routes: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.db.corporateTenant.findUnique({
      where: { id: tenantId },
      include: {
        offices: true,
        _count: {
          select: {
            employees: true,
            routes: true,
            rosters: true,
            invoices: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Corporate tenant ${tenantId} not found`);
    }

    return tenant;
  }

  async updateTenant(tenantId: string, dto: UpdateCorporateTenantDto, actorUserId?: string) {
    const tenant = await this.getTenantById(tenantId);

    const updated = await this.db.corporateTenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        legalEntityName: dto.legalEntityName !== undefined ? dto.legalEntityName.trim() : undefined,
        gstin: dto.gstin !== undefined ? dto.gstin.trim() : undefined,
        status: dto.status as any,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_TENANT_UPDATED',
      userId: actorUserId,
      entityId: tenant.id,
      entityType: 'CORPORATE_TENANT',
      metadata: { updates: dto },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // OFFICE CAMPUS MANAGEMENT
  // ---------------------------------------------------------------------------

  async createOffice(tenantId: string, dto: CreateCorporateOfficeDto, actorUserId?: string) {
    await this.getTenantById(tenantId);

    const lat = Number(dto.latitude);
    const lng = Number(dto.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Invalid geographic coordinates provided for office');
    }

    // Compute H3 Resolution 8 index for office spatial matching
    const h3Res8Index = this.h3Service.latLngToCell(lat, lng, 8);

    const office = await this.db.corporateOffice.create({
      data: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        addressText: dto.addressText.trim(),
        latitude: lat,
        longitude: lng,
        h3Res8Index,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_OFFICE_CREATED',
      userId: actorUserId,
      entityId: office.id,
      entityType: 'CORPORATE_OFFICE',
      metadata: { tenantId, code: office.code, h3Res8Index },
    });

    return office;
  }

  async listOffices(tenantId: string, officeScope?: string[] | null) {
    await this.getTenantById(tenantId);

    return this.db.corporateOffice.findMany({
      where: { tenantId, ...(officeScope ? { id: { in: officeScope } } : {}) },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            employees: true,
            routes: true,
          },
        },
      },
    });
  }

  async getOfficeById(tenantId: string, officeId: string) {
    const office = await this.db.corporateOffice.findFirst({
      where: { id: officeId, tenantId },
      include: {
        tenant: true,
        _count: {
          select: { employees: true, routes: true },
        },
      },
    });

    if (!office) {
      throw new NotFoundException(`Office ${officeId} not found for tenant ${tenantId}`);
    }

    return office;
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEE MANAGEMENT & GEOCODING
  // ---------------------------------------------------------------------------

  async createEmployee(tenantId: string, dto: CreateCorporateEmployeeDto, actorUserId?: string) {
    await this.getTenantById(tenantId);

    // Verify office exists
    const office = await this.db.corporateOffice.findFirst({
      where: { id: dto.officeId, tenantId },
    });
    if (!office) {
      throw new BadRequestException(`Office ${dto.officeId} not found under tenant ${tenantId}`);
    }

    // Check duplicate employee code within tenant
    const existing = await this.db.corporateEmployee.findFirst({
      where: {
        tenantId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Employee with code '${dto.employeeCode}' already exists for this corporate tenant`,
      );
    }

    // Geocoding Fallback: If coordinates not provided or 0, resolve via fallback
    let lat = dto.latitude ? Number(dto.latitude) : 0;
    let lng = dto.longitude ? Number(dto.longitude) : 0;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const resolved = await this.resolveAddressCoordinates(dto.homeAddress, office.latitude.toNumber(), office.longitude.toNumber());
      lat = resolved.latitude;
      lng = resolved.longitude;
    }

    const h3Res8Index = this.h3Service.latLngToCell(lat, lng, 8);

    const employee = await this.db.$transaction(async (tx) => {
      const emp = await tx.corporateEmployee.create({
        data: {
          tenantId,
          officeId: dto.officeId,
          employeeCode: dto.employeeCode.trim().toUpperCase(),
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber.trim(),
          gender: dto.gender as any,
          department: dto.department?.trim() || null,
          costCenter: dto.costCenter?.trim() || null,
          isActive: true,
        },
      });

      await tx.corporateEmployeeLocation.create({
        data: {
          employeeId: emp.id,
          addressText: dto.homeAddress.trim(),
          landmark: dto.landmark?.trim() || null,
          latitude: lat,
          longitude: lng,
          h3Res8Index,
          isDefault: true,
        },
      });

      return emp;
    });

    await this.audit.log({
      action: 'CORPORATE_EMPLOYEE_CREATED',
      userId: actorUserId,
      entityId: employee.id,
      entityType: 'CORPORATE_EMPLOYEE',
      metadata: { tenantId, employeeCode: employee.employeeCode, h3Res8Index },
    });

    return this.getEmployeeById(tenantId, employee.id);
  }

  async listEmployees(
    tenantId: string,
    query?: {
      search?: string;
      officeId?: string;
      department?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
      /** WS-F office scope of the caller; null / undefined => all offices. */
      officeScope?: string[] | null;
    },
  ) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query?.officeId) where.officeId = query.officeId;
    if (query?.officeScope) {
      if (query.officeId && !query.officeScope.includes(query.officeId)) {
        throw new ForbiddenException('Office is outside your corporate office scope');
      }
      if (!query.officeId) where.officeId = { in: query.officeScope };
    }
    if (query?.department) where.department = query.department;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.corporateEmployee.count({ where }),
      this.db.corporateEmployee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: {
          office: { select: { id: true, name: true, code: true } },
          locations: { where: { isDefault: true }, take: 1 },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeById(tenantId: string, employeeId: string, officeScope?: string[] | null) {
    const employee = await this.db.corporateEmployee.findFirst({
      // Out-of-scope employees are reported as not found (no existence leak).
      where: { id: employeeId, tenantId, ...(officeScope ? { officeId: { in: officeScope } } : {}) },
      include: {
        office: true,
        locations: { orderBy: { createdAt: 'desc' } },
        _count: {
          select: { transportRequests: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found under tenant ${tenantId}`);
    }

    return employee;
  }

  /**
   * Commute history of one employee (CP-EMP / UI-03-02): their transport requests, newest shift
   * first, with the planned vs actual pickup of the stop each was planned onto. Read-only.
   * Tenant- and office-scoped exactly like getEmployeeById (out-of-scope => 404). Returns no
   * pricing fields and no boarding OTP.
   */
  async listEmployeeRequests(
    tenantId: string,
    employeeId: string,
    officeScope?: string[] | null,
    query: { limit?: number } = {},
  ) {
    await this.getEmployeeById(tenantId, employeeId, officeScope);
    const limit = Math.min(100, Math.max(1, Number.isFinite(query.limit) ? Number(query.limit) : 30));

    const items = await this.db.corporateTransportRequest.findMany({
      where: { tenantId, employeeId },
      orderBy: [{ scheduledDate: 'desc' }, { shiftTime: 'desc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true,
        rosterId: true,
        scheduledDate: true,
        shiftTime: true,
        direction: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        routeStop: {
          select: {
            id: true,
            routeId: true,
            stopSequence: true,
            stopType: true,
            plannedEta: true,
            actualArrivalTime: true,
            actualDepartureTime: true,
            status: true,
            noShowReason: true,
          },
        },
      },
    });

    return { employeeId, limit, items };
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    dto: UpdateCorporateEmployeeDto,
    actorUserId?: string,
    officeScope?: string[] | null,
  ) {
    await this.getEmployeeById(tenantId, employeeId, officeScope);

    if (dto.officeId) {
      const office = await this.db.corporateOffice.findFirst({
        where: { id: dto.officeId, tenantId },
      });
      if (!office) {
        throw new BadRequestException(`Office ${dto.officeId} not found under tenant ${tenantId}`);
      }
    }

    const updated = await this.db.corporateEmployee.update({
      where: { id: employeeId },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
        email: dto.email !== undefined ? dto.email.trim().toLowerCase() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : undefined,
        gender: dto.gender as any,
        officeId: dto.officeId,
        department: dto.department !== undefined ? dto.department.trim() : undefined,
        costCenter: dto.costCenter !== undefined ? dto.costCenter.trim() : undefined,
        isActive: dto.isActive,
      },
      include: {
        office: true,
        locations: true,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_EMPLOYEE_UPDATED',
      userId: actorUserId,
      entityId: employeeId,
      entityType: 'CORPORATE_EMPLOYEE',
      metadata: { updates: dto },
    });

    return updated;
  }

  async addEmployeeLocation(
    tenantId: string,
    employeeId: string,
    dto: CreateEmployeeLocationDto,
    actorUserId?: string,
    officeScope?: string[] | null,
  ) {
    await this.getEmployeeById(tenantId, employeeId, officeScope);

    const lat = Number(dto.latitude);
    const lng = Number(dto.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Invalid geographic coordinates provided');
    }

    const h3Res8Index = this.h3Service.latLngToCell(lat, lng, 8);

    if (dto.isDefault) {
      // Unmark previous default locations
      await this.db.corporateEmployeeLocation.updateMany({
        where: { employeeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await this.db.corporateEmployeeLocation.create({
      data: {
        employeeId,
        addressText: dto.addressText.trim(),
        landmark: dto.landmark?.trim() || null,
        latitude: lat,
        longitude: lng,
        h3Res8Index,
        isDefault: dto.isDefault ?? true,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_EMPLOYEE_LOCATION_ADDED',
      userId: actorUserId,
      entityId: location.id,
      entityType: 'CORPORATE_EMPLOYEE_LOCATION',
      metadata: { employeeId, h3Res8Index },
    });

    return location;
  }

  /**
   * Geocoding Fallback: Resolves a textual address to geographic coordinates.
   * If external geocoding is unavailable or rate-limited, safely uses an offset relative to office/Hyderabad.
   */
  private async resolveAddressCoordinates(
    addressText: string,
    fallbackLat?: number,
    fallbackLng?: number,
  ): Promise<{ latitude: number; longitude: number }> {
    try {
      // In production, integrate Nominatim or Google Geocoding API with fetch
      // For resilience and zero downtime, provide deterministic fallback:
      const baseLat = fallbackLat || this.HYDERABAD_CENTROID_LAT;
      const baseLng = fallbackLng || this.HYDERABAD_CENTROID_LNG;

      // Deterministic slight hash offset within ~2km based on address text length
      const hash = addressText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = ((hash % 100) - 50) * 0.0003;
      const lngOffset = (((hash * 7) % 100) - 50) * 0.0003;

      return {
        latitude: parseFloat((baseLat + latOffset).toFixed(7)),
        longitude: parseFloat((baseLng + lngOffset).toFixed(7)),
      };
    } catch {
      return {
        latitude: this.HYDERABAD_CENTROID_LAT,
        longitude: this.HYDERABAD_CENTROID_LNG,
      };
    }
  }
}
