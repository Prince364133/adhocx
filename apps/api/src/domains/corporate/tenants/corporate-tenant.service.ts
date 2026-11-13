import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { H3Service } from '../../../modules/locations/h3.service';
import {
  CreateCorporateTenantDto,
  UpdateCorporateTenantDto,
  UpdateCorporateTenantProfileDto,
  CreateCorporateOfficeDto,
  UpdateCorporateOfficeDto,
  CreateCorporateEmployeeDto,
  UpdateCorporateEmployeeDto,
  CreateEmployeeLocationDto,
  CorporateTenantStatus,
  UserRole,
} from '@adhocx/contracts';
import { normalizeIndianPhone, getPhoneVariants } from '../../../common/utils/uniqueness.util';
import { CorporateRole } from './corporate-permissions';
import { GoogleGeocodingAdapter } from '../routing/google-geocoding.adapter';

@Injectable()
export class CorporateTenantService {
  private readonly logger = new Logger(CorporateTenantService.name);

  // Fallback Hyderabad coordinates for pilot geocoding when external API is unreachable

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly h3Service: H3Service,
    @Optional() private readonly geocoder?: GoogleGeocodingAdapter,
  ) {}

  // ---------------------------------------------------------------------------
  // TENANT MANAGEMENT
  // ---------------------------------------------------------------------------

  async createTenant(dto: CreateCorporateTenantDto, actorUserId?: string) {
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(dto.code?.trim().toUpperCase() ?? '')) {
      throw new BadRequestException('Company code must contain 1-32 letters, numbers, hyphens, or underscores');
    }
    if (!dto.name?.trim() || !dto.legalEntityName?.trim()) {
      throw new BadRequestException('Company name and legal business name are required');
    }
    const profile = this.validateTenantProfile(dto);
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
        ...profile,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Created corporate tenant ${tenant.name} (${tenant.code})`);

    // 1. Provision or link initial Corporate Portal admin user using company phone number
    const contactPhone = dto.primaryContactPhone?.trim() || null;
    const normalizedPhone = contactPhone ? normalizeIndianPhone(contactPhone) : undefined;
    if (normalizedPhone) {
      try {
        const variants = getPhoneVariants(normalizedPhone);
        const existingUser = await this.db.user.findFirst({
          where: {
            phone: { in: variants.length > 0 ? variants : [normalizedPhone] },
          },
          include: { driver: { select: { id: true } }, vendor: { select: { id: true } } },
        });

        if (existingUser) {
          // Never repurpose an account that already has another job on the platform (a driver
          // would drop out of dispatch, a vendor would lose bookings, staff would lose access).
          const protectedRoles: string[] = [
            UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.CORPORATE_MANAGER,
          ];
          const alreadyOtherTenant = existingUser.corporateTenantId && existingUser.corporateTenantId !== tenant.id;
          if (protectedRoles.includes(existingUser.role) || existingUser.driver || existingUser.vendor || alreadyOtherTenant) {
            this.logger.warn(
              `Company phone ${normalizedPhone} belongs to existing ${existingUser.role} account ${existingUser.id}; not converting it to a corporate admin for ${tenant.name}`,
            );
          } else {
            await this.db.user.update({
              where: { id: existingUser.id },
              data: {
                corporateTenantId: tenant.id,
                role: UserRole.CORPORATE_ADMIN,
                corporateRole: CorporateRole.CORP_SUPER_ADMIN,
                corporateOfficeIds: [],
                status: 'ACTIVE',
                ...(existingUser.fullName ? {} : { fullName: dto.primaryContactName?.trim() || `${tenant.name} Admin` }),
                ...(existingUser.email ? {} : { email: dto.primaryContactEmail?.trim().toLowerCase() || undefined }),
              },
            });
            this.logger.log(`Linked existing user ${existingUser.id} (${normalizedPhone}) to tenant ${tenant.name} as CORP_SUPER_ADMIN`);
          }
        } else {
          const newUser = await this.db.user.create({
            data: {
              phone: normalizedPhone,
              email: dto.primaryContactEmail?.trim().toLowerCase() || undefined,
              fullName: dto.primaryContactName?.trim() || `${tenant.name} Admin`,
              role: UserRole.CORPORATE_ADMIN,
              corporateRole: CorporateRole.CORP_SUPER_ADMIN,
              corporateTenantId: tenant.id,
              corporateOfficeIds: [],
              status: 'ACTIVE',
            },
          });
          this.logger.log(`Provisioned corporate admin user ${newUser.id} (${normalizedPhone}) for tenant ${tenant.name}`);
        }
      } catch (userErr: any) {
        this.logger.warn(`Could not provision corporate admin user for tenant ${tenant.code}: ${userErr.message}`);
      }
    }

    // 2. Ensure initial primary campus/office exists for corporate operations
    try {
      const officeAddress =
        dto.registeredAddress?.trim() ||
        (dto.city ? `${dto.city.trim()}${dto.state ? `, ${dto.state.trim()}` : ''}` : `${tenant.name} Headquarters`);
      const officeCode = `${tenant.code}-HQ`.slice(0, 32);
      // Locate the HQ from its address. If that is not possible the office is NOT created: an
      // invented point would become every employee's drop/pickup. Admins add it under Offices.
      const geocodeQuery = [dto.registeredAddress, dto.city, dto.state, dto.pinCode, dto.country || 'India']
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ');
      const hq = await this.geocodeStrict(geocodeQuery);
      const h3Res8 = this.h3Service.latLngToCell(hq.latitude, hq.longitude, 8);
      await this.db.corporateOffice.create({
        data: {
          tenantId: tenant.id,
          code: officeCode,
          name: `${tenant.name} HQ`,
          addressText: officeAddress,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pinCode: dto.pinCode?.trim() || null,
          country: dto.country?.trim() || 'India',
          contactName: dto.primaryContactName?.trim() || null,
          contactEmail: dto.primaryContactEmail?.trim() || null,
          contactPhone: normalizedPhone || null,
          latitude: hq.latitude,
          longitude: hq.longitude,
          h3Res8Index: h3Res8,
          isActive: true,
        },
      });
      this.logger.log(`Provisioned primary office ${officeCode} for tenant ${tenant.name}`);
    } catch (officeErr: any) {
      this.logger.warn(`Could not create initial primary office for tenant ${tenant.code}: ${officeErr.message}`);
    }

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

    const [total, rawItems] = await Promise.all([
      this.db.corporateTenant.count({ where }),
      this.db.corporateTenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          offices: {
            orderBy: { createdAt: 'asc' },
            take: 10,
            select: {
              id: true,
              code: true,
              name: true,
              addressText: true,
              latitude: true,
              longitude: true,
            },
          },
          policies: {
            orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
            take: 1,
          },
          users: {
            where: { role: { in: ['CORPORATE_ADMIN', 'CORPORATE_MANAGER'] as any } },
            orderBy: { createdAt: 'asc' },
            take: 5,
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              corporateRole: true,
              status: true,
            },
          },
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

    const items = rawItems.map((tenant: any) => ({
      ...tenant,
      offices: (tenant.offices ?? []).map((o: any) => ({
        ...o,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
      })),
    }));

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
    const tenant: any = await this.db.corporateTenant.findUnique({
      where: { id: tenantId },
      include: {
        offices: { orderBy: { createdAt: 'asc' } },
        policies: {
          orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
          take: 1,
        },
        users: {
          where: { role: { in: ['CORPORATE_ADMIN', 'CORPORATE_MANAGER'] as any } },
          orderBy: { createdAt: 'asc' },
          take: 10,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            corporateRole: true,
            status: true,
          },
        },
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

    return {
      ...tenant,
      offices: (tenant.offices ?? []).map((o: any) => ({
        ...o,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
      })),
    };
  }

  async updateTenant(tenantId: string, dto: UpdateCorporateTenantDto, actorUserId?: string) {
    const tenant = await this.getTenantById(tenantId);

    const updated = await this.db.corporateTenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.legalEntityName !== undefined ? { legalEntityName: dto.legalEntityName.trim() } : {}),
        ...this.validateTenantProfile(dto),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
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

  async updateTenantProfile(
    tenantId: string,
    dto: UpdateCorporateTenantProfileDto,
    actorUserId?: string,
  ) {
    await this.getTenantById(tenantId);
    const name = dto.name.trim();
    const legalEntityName = dto.legalEntityName.trim();
    if (!name || !legalEntityName) {
      throw new BadRequestException('Organization name and legal business name are required');
    }
    const gstin = dto.gstin?.trim().toUpperCase() || null;
    const cin = dto.cin?.trim().toUpperCase() || null;
    const email = dto.primaryContactEmail?.trim() || null;
    const website = dto.website?.trim() || null;
    const phone = dto.primaryContactPhone?.trim() || null;
    const logoUrl = dto.logoUrl?.trim() || null;
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) {
      throw new BadRequestException('GSTIN must be a valid 15-character registration number');
    }
    if (cin && !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)) {
      throw new BadRequestException('CIN must be a valid 21-character registration number');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Primary contact email must be valid');
    }
    if (phone && phone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('Primary contact phone must contain at least 10 digits');
    }
    for (const [label, url] of [['Company website', website], ['Company logo URL', logoUrl]] as const) {
      if (!url) continue;
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          throw new Error('Unsupported protocol');
        }
      } catch {
        throw new BadRequestException(`${label} must be a valid HTTP or HTTPS URL`);
      }
    }
    if (dto.billingSameAsRegistered === false && !dto.billingAddress?.trim()) {
      throw new BadRequestException('Billing address is required when it differs from the registered address');
    }

    const updated = await this.db.corporateTenant.update({
      where: { id: tenantId },
      data: {
        name,
        legalEntityName,
        gstin: dto.gstin === undefined ? undefined : gstin,
        industry: dto.industry === undefined ? undefined : dto.industry?.trim() || null,
        website: dto.website === undefined ? undefined : website,
        logoUrl: dto.logoUrl === undefined ? undefined : logoUrl,
        registeredAddress: dto.registeredAddress === undefined ? undefined : dto.registeredAddress?.trim() || null,
        city: dto.city === undefined ? undefined : dto.city?.trim() || null,
        state: dto.state === undefined ? undefined : dto.state?.trim() || null,
        pinCode: dto.pinCode === undefined ? undefined : dto.pinCode?.trim() || null,
        country: dto.country === undefined ? undefined : dto.country?.trim() || null,
        primaryContactName: dto.primaryContactName === undefined ? undefined : dto.primaryContactName?.trim() || null,
        primaryContactEmail: dto.primaryContactEmail === undefined ? undefined : email,
        primaryContactPhone: dto.primaryContactPhone === undefined ? undefined : phone,
        cin: dto.cin === undefined ? undefined : cin,
        registeredBusinessAddress:
          dto.registeredBusinessAddress === undefined ? undefined : dto.registeredBusinessAddress?.trim() || null,
        billingAddress:
          dto.billingSameAsRegistered === true
            ? null
            : dto.billingAddress === undefined
              ? undefined
              : dto.billingAddress?.trim() || null,
        billingSameAsRegistered: dto.billingSameAsRegistered,
      },
    });

    await this.audit.log({
      action: 'CORPORATE_TENANT_PROFILE_UPDATED',
      userId: actorUserId,
      entityId: updated.id,
      entityType: 'CORPORATE_TENANT',
      metadata: { tenantId: updated.id },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // OFFICE CAMPUS MANAGEMENT
  // ---------------------------------------------------------------------------

  async createOffice(tenantId: string, dto: CreateCorporateOfficeDto, actorUserId?: string) {
    await this.getTenantById(tenantId);
    this.validateOfficeContact(dto);
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(dto.code?.trim().toUpperCase() ?? '')) {
      throw new BadRequestException('Office code must contain 1-32 letters, numbers, hyphens, or underscores');
    }
    if (!dto.name?.trim() || !dto.addressText?.trim()) {
      throw new BadRequestException('Office name and address are required');
    }

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
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        pinCode: dto.pinCode?.trim() || null,
        country: dto.country?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        contactEmail: dto.contactEmail?.trim().toLowerCase() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        isActive: dto.isActive ?? true,
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

  async listOffices(tenantId: string, officeScope?: string[] | null, includeInactive = false) {
    await this.getTenantById(tenantId);

    return this.db.corporateOffice.findMany({
      where: {
        tenantId,
        ...(officeScope ? { id: { in: officeScope } } : {}),
        ...(!includeInactive ? { isActive: true } : {}),
      },
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

  async updateOffice(
    tenantId: string,
    officeId: string,
    dto: UpdateCorporateOfficeDto,
    actorUserId?: string,
  ) {
    const office = await this.getOfficeById(tenantId, officeId);
    this.validateOfficeContact(dto);
    if (dto.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(dto.code.trim().toUpperCase())) {
      throw new BadRequestException('Office code must contain 1-32 letters, numbers, hyphens, or underscores');
    }
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('Office name is required');
    }
    if (dto.addressText !== undefined && !dto.addressText.trim()) {
      throw new BadRequestException('Office address is required');
    }
    const hasLatitude = dto.latitude !== undefined;
    const hasLongitude = dto.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException('latitude and longitude must be updated together');
    }

    let coordinates: { latitude?: number; longitude?: number; h3Res8Index?: string } = {};
    if (hasLatitude && hasLongitude) {
      const latitude = Number(dto.latitude);
      const longitude = Number(dto.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new BadRequestException('Invalid geographic coordinates provided for office');
      }
      coordinates = {
        latitude,
        longitude,
        h3Res8Index: this.h3Service.latLngToCell(latitude, longitude, 8),
      };
    }

    if (dto.isActive === false && office.isActive) {
      const [activeRoute, pendingRoster] = await Promise.all([
        this.db.corporateRoute.findFirst({
          where: {
            tenantId,
            officeId,
            status: { in: ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'] },
          },
          select: { id: true },
        }),
        this.db.corporateRoster.findFirst({
          where: {
            tenantId,
            officeId,
            status: { in: ['DRAFT', 'APPROVED', 'PUBLISHED'] },
            rosterDate: { gte: new Date(new Date().toISOString().slice(0, 10)) },
          },
          select: { id: true },
        }),
      ]);
      if (activeRoute || pendingRoster) {
        throw new BadRequestException('Reassign or cancel active routes and future rosters before deactivating this office');
      }
    }

    const updated = await this.db.corporateOffice.update({
      where: { id: officeId },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.addressText !== undefined ? { addressText: dto.addressText.trim() } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.state !== undefined ? { state: dto.state.trim() || null } : {}),
        ...(dto.pinCode !== undefined ? { pinCode: dto.pinCode.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() || null } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail.trim().toLowerCase() || null } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...coordinates,
      },
    });

    await this.audit.log({
      action: dto.isActive === false ? 'CORPORATE_OFFICE_DEACTIVATED' : 'CORPORATE_OFFICE_UPDATED',
      userId: actorUserId,
      entityId: officeId,
      entityType: 'CORPORATE_OFFICE',
      metadata: { tenantId, updates: dto },
    });
    return updated;
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
      where: { id: dto.officeId, tenantId, isActive: true },
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
      const resolved = await this.geocodeStrict(dto.homeAddress);
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
        where: { id: dto.officeId, tenantId, isActive: true },
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
   * Address -> coordinates via the shared GoogleGeocodingAdapter, which owns the agreed policy:
   * synthetic coordinates only outside production or with CORPORATE_GEOCODE_FALLBACK=true; in
   * production a failed geocode is an error. (Previously this method hashed the address text into a
   * point ~1.5 km from the office, so a cab could be sent to an invented home address.)
   */
  private async geocodeStrict(addressText: string): Promise<{ latitude: number; longitude: number }> {
    const address = addressText?.trim();
    if (!address) {
      throw new BadRequestException('An address is required to locate this place on the map');
    }
    if (!this.geocoder) {
      throw new BadRequestException(`Could not locate "${address}". Please provide latitude and longitude.`);
    }
    try {
      const result = await this.geocoder.geocode(address);
      return { latitude: result.lat, longitude: result.lng };
    } catch (err: any) {
      throw new BadRequestException(
        `Could not locate "${address}" on the map (${err?.message ?? 'geocoding failed'}). Please provide latitude and longitude.`,
      );
    }
  }

  async getOfficeGeofences(tenantId: string, officeId: string) {
    const office = await this.getOfficeById(tenantId, officeId);
    const lat = Number(office.latitude);
    const lng = Number(office.longitude);

    return {
      office: {
        id: office.id,
        code: office.code,
        name: office.name,
        addressText: office.addressText,
      },
      radiusMeters: 500,
      center: { latitude: lat, longitude: lng },
      polygon: [
        { latitude: lat + 0.0035, longitude: lng - 0.0035 },
        { latitude: lat + 0.0035, longitude: lng + 0.0035 },
        { latitude: lat - 0.0035, longitude: lng + 0.0035 },
        { latitude: lat - 0.0035, longitude: lng - 0.0035 },
      ],
      gates: [
        { id: `GT-${office.code}-01`, name: 'Main Security Gate 1', type: 'ENTRY_EXIT', rfidBarrier: true, guardOnDuty: true, lat: lat + 0.0015, lng: lng },
        { id: `GT-${office.code}-02`, name: 'North Employee Gate 2', type: 'ENTRY_ONLY', rfidBarrier: true, guardOnDuty: true, lat: lat + 0.003, lng: lng - 0.001 },
        { id: `GT-${office.code}-03`, name: 'South Logistics & Cab Bay 3', type: 'EXIT_ONLY', rfidBarrier: true, guardOnDuty: true, lat: lat - 0.003, lng: lng + 0.001 },
      ],
      pickupPoints: [
        { id: `BAY-${office.code}-A`, name: 'Bay A (Main Portico - Executive Cabs)', capacity: 8, lat: lat + 0.0005, lng: lng + 0.0005 },
        { id: `BAY-${office.code}-B`, name: 'Bay B (Tower 1 - Women Priority)', capacity: 12, lat: lat - 0.0005, lng: lng + 0.0005 },
        { id: `BAY-${office.code}-C`, name: 'Bay C (Tower 2 - General Commuter Bay)', capacity: 20, lat: lat, lng: lng - 0.0008 },
      ],
    };
  }

  async getTenantIntegrations(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      hrms: {
        provider: 'Darwinbox',
        status: 'CONNECTED',
        lastSyncAt: new Date().toISOString(),
        syncInterval: '6 hours',
        autoSyncEnabled: true,
        totalEmployeesSynced: await this.db.corporateEmployee.count({ where: { tenantId } }),
      },
      webhookHealth: {
        uptimePct: 99.94,
        avgLatencyMs: 42,
        totalEventsToday: 1420,
        failedEventsToday: 0,
      },
      fieldMappings: [
        { systemField: 'employeeCode', hrmsField: 'EMP_ID', isRequired: true, mapped: true },
        { systemField: 'fullName', hrmsField: 'DISPLAY_NAME', isRequired: true, mapped: true },
        { systemField: 'email', hrmsField: 'WORK_EMAIL', isRequired: true, mapped: true },
        { systemField: 'phoneNumber', hrmsField: 'MOBILE_PHONE', isRequired: true, mapped: true },
        { systemField: 'gender', hrmsField: 'GENDER_CODE', isRequired: true, mapped: true },
        { systemField: 'department', hrmsField: 'BUSINESS_UNIT', isRequired: false, mapped: true },
        { systemField: 'costCenter', hrmsField: 'COST_CENTER_NO', isRequired: false, mapped: true },
        { systemField: 'homeAddress', hrmsField: 'RESIDENTIAL_ADDRESS', isRequired: true, mapped: true },
      ],
    };
  }

  private validateTenantProfile(dto: Partial<CreateCorporateTenantDto | UpdateCorporateTenantDto>) {
    const gstin = dto.gstin?.trim().toUpperCase();
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) {
      throw new BadRequestException('GSTIN format is invalid');
    }

    const cin = dto.cin?.trim().toUpperCase();
    if (cin && !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)) {
      throw new BadRequestException('CIN format is invalid');
    }

    const primaryContactEmail = dto.primaryContactEmail?.trim().toLowerCase();
    if (primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryContactEmail)) {
      throw new BadRequestException('Primary contact email is invalid');
    }
    if (dto.website?.trim()) {
      try {
        const url = new URL(dto.website.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('scheme');
      } catch {
        throw new BadRequestException('Company website must be a valid HTTP or HTTPS URL');
      }
    }
    if (dto.primaryContactPhone?.trim()) {
      const phone = dto.primaryContactPhone.trim();
      const digits = phone.replace(/\D/g, '');
      if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        throw new BadRequestException('Primary contact phone number is invalid');
      }
    }

    const textFields = [
      'industry',
      'website',
      'registeredAddress',
      'city',
      'state',
      'pinCode',
      'country',
      'primaryContactName',
      'primaryContactEmail',
      'primaryContactPhone',
      'billingAddress',
    ] as const;
    const normalized = Object.fromEntries(
      textFields
        .filter((key) => dto[key] !== undefined)
        .map((key) => [key, dto[key]?.trim() || null]),
    );

    return {
      ...normalized,
      ...(dto.gstin !== undefined ? { gstin: gstin || null } : {}),
      ...(dto.cin !== undefined ? { cin: cin || null } : {}),
      ...(dto.billingSameAsRegistered !== undefined
        ? { billingSameAsRegistered: dto.billingSameAsRegistered }
        : {}),
      ...(dto.billingSameAsRegistered === true ? { billingAddress: null } : {}),
    };
  }

  private validateOfficeContact(input: Partial<CreateCorporateOfficeDto | UpdateCorporateOfficeDto>) {
    if (input.contactEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) {
      throw new BadRequestException('Office contact email is invalid');
    }
    if (input.contactPhone?.trim()) {
      const phone = input.contactPhone.trim();
      const digits = phone.replace(/\D/g, '');
      if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        throw new BadRequestException('Office contact phone number is invalid');
      }
    }
  }
}
