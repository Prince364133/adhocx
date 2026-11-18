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
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { H3Service } from '../../../modules/locations/h3.service';
import { sanitizeRealName } from '../../../common/utils/name.util';
import { assertPhoneAvailable, normalizeIndianPhone, getPhoneVariants } from '../../../common/utils/uniqueness.util';
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
import { CorporateRole, userRoleForCorporateRole } from './corporate-permissions';
import { GoogleGeocodingAdapter } from '../routing/google-geocoding.adapter';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class CorporateTenantService {
  private readonly logger = new Logger(CorporateTenantService.name);

  // Fallback Hyderabad coordinates for pilot geocoding when external API is unreachable

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly h3Service: H3Service,
    @Optional() private readonly geocoder?: GoogleGeocodingAdapter,
    @Optional() private readonly redis?: RedisService,
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
    let portalAdmin: { fullName: string; email: string; phone: string } | undefined;

    if (dto.createPortalAdmin) {
      const fullName = sanitizeRealName(dto.primaryContactName);
      const email = dto.primaryContactEmail?.trim().toLowerCase();
      const phone = normalizeIndianPhone(dto.primaryContactPhone);
      if (!fullName) {
        throw new BadRequestException('A valid primary contact name is required to create the Corporate Super Admin account');
      }
      if (!email || !EMAIL_PATTERN.test(email)) {
        throw new BadRequestException('A valid primary contact email is required to create the Corporate Super Admin account');
      }
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        throw new BadRequestException('A valid primary contact phone number is required to create the Corporate Super Admin account');
      }
      portalAdmin = { fullName, email, phone };
    }

    const created = await this.db.$transaction(async (tx) => {
      const existing = await tx.corporateTenant.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(`Corporate tenant with code '${dto.code}' already exists`);
      }

      const tenant = await tx.corporateTenant.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          legalEntityName: dto.legalEntityName.trim(),
          gstin: dto.gstin?.trim() || null,
          ...profile,
          status: 'ACTIVE',
        },
      });

      if (typeof (tx as any).corporateTenantPolicy?.create === 'function') {
        await tx.corporateTenantPolicy.create({
          data: {
            tenantId: tenant.id,
            version: 1,
            effectiveFrom: new Date(),
            createdById: actorUserId ?? null,
            defaultVehicleCategory: 'SEDAN',
            defaultCapacity: 4,
          },
        });
      }

      let portalUser;
      if (portalAdmin) {
        await assertPhoneAvailable(tx, portalAdmin.phone);
        const existingEmail = await tx.user.findFirst({
          where: { email: { equals: portalAdmin.email, mode: 'insensitive' } },
          select: { id: true },
        });
        if (existingEmail) {
          throw new ConflictException('This primary contact email is already registered to another account');
        }

        const corporateRole = CorporateRole.CORP_SUPER_ADMIN;
        portalUser = await tx.user.create({
          data: {
            fullName: portalAdmin.fullName,
            email: portalAdmin.email,
            phone: portalAdmin.phone,
            role: userRoleForCorporateRole(corporateRole) as any,
            corporateRole: corporateRole as any,
            corporateTenantId: tenant.id,
            corporateOfficeIds: [],
            status: 'ACTIVE',
          },
        });
      }

      return { tenant, portalUser };
    }).catch((error: any) => {
      if (error?.code === 'P2002') {
        throw new ConflictException('A company or primary contact account with these details already exists');
      }
      throw error;
    });

    const { tenant } = created;
    let portalUser = created.portalUser;

    this.logger.log(
      `Created corporate tenant ${tenant.name} (${tenant.code})${portalUser ? ' with Corporate Super Admin access' : ''}`,
    );

    // 1. Provision or link initial Corporate Portal admin user using company phone number (if not already created above)
    const contactPhone = dto.primaryContactPhone?.trim() || null;
    const normalizedPhone = contactPhone ? normalizeIndianPhone(contactPhone) : undefined;
    if (!portalUser && normalizedPhone) {
      try {
        const variants = getPhoneVariants(normalizedPhone);
        const existingUser = await this.db.user.findFirst({
          where: {
            phone: { in: variants.length > 0 ? variants : [normalizedPhone] },
          },
          include: { driver: { select: { id: true } }, vendor: { select: { id: true } } },
        });

        if (existingUser) {
          const protectedRoles: string[] = [
            UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.CORPORATE_MANAGER,
          ];
          const alreadyOtherTenant = existingUser.corporateTenantId && existingUser.corporateTenantId !== tenant.id;
          if (protectedRoles.includes(existingUser.role) || existingUser.driver || existingUser.vendor || alreadyOtherTenant) {
            this.logger.warn(
              `Company phone ${normalizedPhone} belongs to existing ${existingUser.role} account ${existingUser.id}; not converting it to a corporate admin for ${tenant.name}`,
            );
          } else {
            portalUser = await this.db.user.update({
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
          portalUser = await this.db.user.create({
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
          this.logger.log(`Provisioned corporate admin user ${portalUser.id} (${normalizedPhone}) for tenant ${tenant.name}`);
        }
      } catch (userErr: any) {
        this.logger.warn(`Could not provision corporate admin user for tenant ${tenant.code}: ${userErr.message}`);
      }
    }

    // 2. Ensure initial primary campus/office exists for corporate operations
    let hqOfficeCreated = false;
    let hqOfficeWarning: string | undefined;
    try {
      const officeAddress =
        dto.registeredAddress?.trim() ||
        (dto.city ? `${dto.city.trim()}${dto.state ? `, ${dto.state.trim()}` : ''}` : `${tenant.name} Headquarters`);
      const officeCode = `${tenant.code}-HQ`.slice(0, 32);
      let lat = dto.officeLatitude !== undefined ? Number(dto.officeLatitude) : NaN;
      let lng = dto.officeLongitude !== undefined ? Number(dto.officeLongitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        const geocodeQuery = [dto.registeredAddress, dto.city, dto.state, dto.pinCode, dto.country || 'India']
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(', ');
        const hq = await this.geocodeStrict(geocodeQuery);
        lat = hq.latitude;
        lng = hq.longitude;
      }
      const h3Res8 = this.h3Service.latLngToCell(lat, lng, 8);
      await this.db.corporateOffice.create({
        data: {
          tenantId: tenant.id,
          code: officeCode,
          name: dto.officeName?.trim() || `${tenant.name} HQ`,
          addressText: officeAddress,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pinCode: dto.pinCode?.trim() || null,
          country: dto.country?.trim() || 'India',
          contactName: dto.primaryContactName?.trim() || null,
          contactEmail: dto.primaryContactEmail?.trim() || null,
          contactPhone: normalizedPhone || null,
          latitude: lat,
          longitude: lng,
          h3Res8Index: h3Res8,
          isActive: true,
        },
      });
      hqOfficeCreated = true;
      this.logger.log(`Provisioned primary office ${officeCode} for tenant ${tenant.name}`);
    } catch (officeErr: any) {
      hqOfficeWarning = `Primary HQ office could not be auto-geocoded (${officeErr.message}). Please add office coordinates under Offices before committing routes.`;
      this.logger.warn(`Could not create initial primary office for tenant ${tenant.code}: ${officeErr.message}`);
    }

    await this.audit.log({
      action: 'CORPORATE_TENANT_CREATED',
      userId: actorUserId,
      entityId: tenant.id,
      entityType: 'CORPORATE_TENANT',
      metadata: { code: tenant.code, name: tenant.name, hqOfficeCreated },
    });

    if (portalUser) {
      await this.audit.log({
        action: 'CORPORATE_USER_INVITED',
        userId: actorUserId,
        actorRole: UserRole.ADMIN,
        entityId: portalUser.id,
        entityType: 'USER',
        metadata: {
          tenantId: tenant.id,
          corporateRole: CorporateRole.CORP_SUPER_ADMIN,
          autoProvisionedFromPrimaryContact: true,
        },
      });
    }

    return {
      ...tenant,
      hqOfficeCreated,
      ...(hqOfficeWarning ? { hqOfficeWarning } : {}),
      ...(portalUser
        ? {
            portalAccess: {
              created: true,
              corporateRole: CorporateRole.CORP_SUPER_ADMIN,
              loginMethod: 'SMS_OTP' as const,
            },
          }
        : {}),
    };
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

    const tenantIds = rawItems.map((t: any) => t.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const liveRoutes =
      tenantIds.length > 0 && typeof (this.db as any).corporateRoute?.findMany === 'function'
        ? await this.db.corporateRoute.findMany({
            where: {
              tenantId: { in: tenantIds },
              shiftDate: { gte: thirtyDaysAgo },
            },
            select: {
              tenantId: true,
              status: true,
              driverId: true,
              assignedPassengerCount: true,
              targetOfficeArrivalTime: true,
              updatedAt: true,
            },
          })
        : [];

    const statsByTenant = new Map<
      string,
      {
        activeCabsCount: number;
        inTransitCount: number;
        inTransitPassengersCount: number;
        delayedCount: number;
        unassignedCount: number;
        completedCount: number;
        onTimeCompletedCount: number;
      }
    >();

    const now = Date.now();
    for (const r of liveRoutes) {
      const bucket = statsByTenant.get(r.tenantId) ?? {
        activeCabsCount: 0,
        inTransitCount: 0,
        inTransitPassengersCount: 0,
        delayedCount: 0,
        unassignedCount: 0,
        completedCount: 0,
        onTimeCompletedCount: 0,
      };
      const status = String(r.status);
      if (['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'].includes(status)) {
        bucket.activeCabsCount += 1;
      }
      if (status === 'IN_TRANSIT') {
        bucket.inTransitCount += 1;
        bucket.inTransitPassengersCount += Number((r as any).assignedPassengerCount ?? 0);
        if (r.targetOfficeArrivalTime && new Date(r.targetOfficeArrivalTime).getTime() + 10 * 60_000 < now) {
          bucket.delayedCount += 1;
        }
      }
      if ((status === 'PLANNED' || status === 'DISPATCHING') && !r.driverId) {
        bucket.unassignedCount += 1;
      }
      if (status === 'COMPLETED') {
        bucket.completedCount += 1;
        if (
          !r.targetOfficeArrivalTime ||
          !r.updatedAt ||
          new Date(r.updatedAt).getTime() <= new Date(r.targetOfficeArrivalTime).getTime() + 10 * 60_000
        ) {
          bucket.onTimeCompletedCount += 1;
        }
      }
      statsByTenant.set(r.tenantId, bucket);
    }

    const items = rawItems.map((tenant: any) => {
      const s = statsByTenant.get(tenant.id);
      const onTimePunctualityPct =
        s && s.completedCount > 0 ? Math.round((s.onTimeCompletedCount / s.completedCount) * 1000) / 10 : null;
      return {
        ...tenant,
        activeCabsCount: s?.activeCabsCount ?? 0,
        inTransitCount: s?.inTransitCount ?? 0,
        inTransitPassengersCount: s?.inTransitPassengersCount ?? 0,
        delayedCount: s?.delayedCount ?? 0,
        unassignedCount: s?.unassignedCount ?? 0,
        onTimePunctualityPct,
        offices: (tenant.offices ?? []).map((o: any) => ({
          ...o,
          latitude: Number(o.latitude),
          longitude: Number(o.longitude),
        })),
      };
    });

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

    const normalizedPhone = normalizeIndianPhone(dto.phoneNumber) || dto.phoneNumber.trim();
    const cleanedEmail = dto.email.trim().toLowerCase();

    const employee = await this.db.$transaction(async (tx) => {
      const emp = await tx.corporateEmployee.create({
        data: {
          tenantId,
          officeId: dto.officeId,
          employeeCode: dto.employeeCode.trim().toUpperCase(),
          fullName: dto.fullName.trim(),
          email: cleanedEmail,
          phoneNumber: normalizedPhone,
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

    await this.ensureEmployeeLoginAccount(employee.id, tenantId, {
      fullName: employee.fullName,
      phoneNumber: normalizedPhone,
      email: cleanedEmail,
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

  private async ensureEmployeeLoginAccount(
    employeeId: string,
    tenantId: string,
    info: { fullName: string; phoneNumber?: string | null; email?: string | null },
  ): Promise<void> {
    const normalizedPhone = info.phoneNumber ? normalizeIndianPhone(info.phoneNumber) : null;
    if (!normalizedPhone || normalizedPhone.replace(/\D/g, '').length < 10 || /^0+$/.test(normalizedPhone.replace(/\D/g, ''))) {
      return;
    }
    const variants = getPhoneVariants(normalizedPhone);
    const existingUser = await this.db.user.findFirst({
      where: { phone: { in: variants.length > 0 ? variants : [normalizedPhone] } },
      select: { id: true, role: true, corporateTenantId: true, status: true },
    });

    if (existingUser) {
      if (existingUser.role === UserRole.EMPLOYEE) {
        const alreadyLinked = await this.db.corporateEmployee.findUnique({
          where: { userId: existingUser.id },
          select: { id: true },
        });
        if (!alreadyLinked || alreadyLinked.id === employeeId) {
          await this.db.corporateEmployee.update({
            where: { id: employeeId },
            data: { userId: existingUser.id },
          });
          await this.db.user.update({
            where: { id: existingUser.id },
            data: {
              corporateTenantId: tenantId,
              fullName: info.fullName || undefined,
              status: 'ACTIVE',
            },
          });
        }
      } else {
        this.logger.warn(
          `Employee ${employeeId} phone ${normalizedPhone} belongs to ${existingUser.role} account ${existingUser.id}; skipping auto-link`,
        );
      }
      return;
    }

    const rawEmail = (info.email || '').trim().toLowerCase();
    let safeEmail: string | undefined;
    if (rawEmail && EMAIL_PATTERN.test(rawEmail) && !rawEmail.endsWith('@roster.corporate.local')) {
      const emailTaken = await this.db.user.findFirst({
        where: { email: { equals: rawEmail, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!emailTaken) safeEmail = rawEmail;
    }

    const createdUser = await this.db.user.create({
      data: {
        phone: normalizedPhone,
        ...(safeEmail ? { email: safeEmail } : {}),
        fullName: info.fullName || undefined,
        role: UserRole.EMPLOYEE as any,
        corporateTenantId: tenantId,
        status: 'ACTIVE',
      },
    });
    if (createdUser?.id && typeof this.db.corporateEmployee?.update === 'function') {
      await this.db.corporateEmployee.update({
        where: { id: employeeId },
        data: { userId: createdUser.id },
      });
    }
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
    const existing = await this.getEmployeeById(tenantId, employeeId, officeScope);

    if (dto.officeId) {
      const office = await this.db.corporateOffice.findFirst({
        where: { id: dto.officeId, tenantId, isActive: true },
      });
      if (!office) {
        throw new BadRequestException(`Office ${dto.officeId} not found under tenant ${tenantId}`);
      }
    }

    const normalizedPhone =
      dto.phoneNumber !== undefined
        ? normalizeIndianPhone(dto.phoneNumber) || dto.phoneNumber.trim()
        : undefined;
    const cleanedEmail = dto.email !== undefined ? dto.email.trim().toLowerCase() : undefined;

    if (normalizedPhone && existing.userId) {
      const variants = getPhoneVariants(normalizedPhone);
      const phoneClash = await this.db.user.findFirst({
        where: {
          phone: { in: variants.length > 0 ? variants : [normalizedPhone] },
          id: { not: existing.userId },
        },
        select: { id: true, role: true },
      });
      if (phoneClash) {
        throw new ConflictException(
          `Phone number ${normalizedPhone} is already registered to another ${phoneClash.role} account`,
        );
      }
    }

    const currentDefaultAddress = (
      existing.locations?.find((l: any) => l.isDefault)?.addressText ??
      existing.locations?.[0]?.addressText ??
      ''
    ).trim().toLowerCase();
    const nextAddressTrimmed = dto.homeAddress !== undefined ? dto.homeAddress.trim() : '';
    const addressChanged =
      Boolean(nextAddressTrimmed) &&
      (nextAddressTrimmed.toLowerCase() !== currentDefaultAddress ||
        (dto.latitude !== undefined && dto.longitude !== undefined));

    if (addressChanged) {
      let lat = dto.latitude !== undefined ? Number(dto.latitude) : 0;
      let lng = dto.longitude !== undefined ? Number(dto.longitude) : 0;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const resolved = await this.geocodeStrict(nextAddressTrimmed);
        lat = resolved.latitude;
        lng = resolved.longitude;
      }
      const h3Res8Index = this.h3Service.latLngToCell(lat, lng, 8);
      await this.db.corporateEmployeeLocation.updateMany({
        where: { employeeId, isDefault: true },
        data: { isDefault: false },
      });
      await this.db.corporateEmployeeLocation.create({
        data: {
          employeeId,
          addressText: nextAddressTrimmed,
          landmark: dto.landmark?.trim() || null,
          latitude: lat,
          longitude: lng,
          h3Res8Index,
          isDefault: true,
        },
      });
    }

    const updated = await this.db.corporateEmployee.update({
      where: { id: employeeId },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
        email: cleanedEmail,
        phoneNumber: normalizedPhone,
        gender: dto.gender as any,
        officeId: dto.officeId,
        department: dto.department !== undefined ? dto.department.trim() : undefined,
        costCenter: dto.costCenter !== undefined ? dto.costCenter.trim() : undefined,
        isActive: dto.isActive,
      },
      include: {
        office: true,
        locations: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (updated.userId) {
      const userPatch: Record<string, any> = {};
      if (dto.fullName !== undefined) userPatch.fullName = dto.fullName.trim();
      if (normalizedPhone !== undefined) userPatch.phone = normalizedPhone;
      if (cleanedEmail !== undefined && EMAIL_PATTERN.test(cleanedEmail) && !cleanedEmail.endsWith('@roster.corporate.local')) {
        const emailClash = await this.db.user.findFirst({
          where: { email: { equals: cleanedEmail, mode: 'insensitive' }, id: { not: updated.userId } },
          select: { id: true },
        });
        if (!emailClash) userPatch.email = cleanedEmail;
      }
      if (dto.isActive !== undefined) {
        userPatch.status = dto.isActive ? 'ACTIVE' : 'SUSPENDED';
      }
      if (Object.keys(userPatch).length > 0) {
        await this.db.user.update({
          where: { id: updated.userId },
          data: userPatch,
        });
        if (dto.isActive === false && typeof this.redis?.revokeUserSessions === 'function') {
          await this.redis.revokeUserSessions(updated.userId).catch(() => undefined);
        }
      }
    } else if (updated.isActive) {
      await this.ensureEmployeeLoginAccount(updated.id, tenantId, {
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        email: updated.email,
      });
    }

    await this.audit.log({
      action: 'CORPORATE_EMPLOYEE_UPDATED',
      userId: actorUserId,
      entityId: employeeId,
      entityType: 'CORPORATE_EMPLOYEE',
      metadata: { updates: dto },
    });

    return updated;
  }

  async deleteEmployee(
    tenantId: string,
    employeeId: string,
    actorUserId?: string,
    officeScope?: string[] | null,
  ) {
    const existing = await this.getEmployeeById(tenantId, employeeId, officeScope);

    const activeInTransitStops = await this.db.corporateRouteStop.count({
      where: {
        employeeId,
        status: { in: ['PENDING', 'ARRIVED', 'BOARDED'] as any },
        route: { status: 'IN_TRANSIT' as any },
      },
    });
    if (activeInTransitStops > 0) {
      throw new ConflictException(
        'Cannot delete or deactivate an employee while they are on an active IN_TRANSIT route.',
      );
    }

    const [historicalStopsCount, ticketsCount, completedReqsCount, feedbackCount, rosterEntriesCount] = await Promise.all([
      this.db.corporateRouteStop.count({
        where: {
          employeeId,
          status: { in: ['BOARDED', 'NO_SHOW'] as any },
        },
      }),
      this.db.corporateSupportTicket.count({
        where: { employeeId },
      }),
      typeof (this.db as any).corporateTransportRequest?.count === 'function'
        ? this.db.corporateTransportRequest.count({
            where: { employeeId, status: { in: ['COMPLETED', 'IN_PROGRESS'] as any } },
          })
        : Promise.resolve(0),
      typeof (this.db as any).corporateTripFeedback?.count === 'function'
        ? (this.db as any).corporateTripFeedback.count({ where: { employeeId } })
        : Promise.resolve(0),
      typeof (this.db as any).corporateRosterEntry?.count === 'function'
        ? (this.db as any).corporateRosterEntry.count({ where: { employeeId } })
        : Promise.resolve(0),
    ]);

    if (
      historicalStopsCount > 0 ||
      ticketsCount > 0 ||
      completedReqsCount > 0 ||
      feedbackCount > 0 ||
      rosterEntriesCount > 0
    ) {
      await this.db.$transaction(async (tx) => {
        await tx.corporateEmployee.update({
          where: { id: employeeId },
          data: { isActive: false },
        });
        await tx.corporateRouteStop.updateMany({
          where: {
            employeeId,
            status: { in: ['PENDING', 'ARRIVED'] as any },
          },
          data: { status: 'CANCELLED' as any },
        });
        await tx.corporateTransportRequest.updateMany({
          where: {
            employeeId,
            status: { in: ['APPROVED', 'PLANNED', 'ASSIGNED'] as any },
          },
          data: { status: 'CANCELLED' as any },
        });
        if (existing.userId) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { status: 'SUSPENDED' },
          });
        }
      });

      if (existing.userId && typeof this.redis?.revokeUserSessions === 'function') {
        await this.redis.revokeUserSessions(existing.userId).catch(() => undefined);
      }

      await this.audit.log({
        action: 'CORPORATE_EMPLOYEE_DEACTIVATED',
        userId: actorUserId,
        entityId: employeeId,
        entityType: 'CORPORATE_EMPLOYEE',
        metadata: {
          tenantId,
          reason: 'historical_records_present',
          historicalStopsCount,
          ticketsCount,
          completedReqsCount,
          feedbackCount,
          rosterEntriesCount,
        },
      });

      return {
        id: employeeId,
        deleted: false,
        deactivated: true,
        message: 'Employee has historical trip or support records and was deactivated instead of hard-deleted.',
      };
    }

    await this.db.$transaction(async (tx) => {
      const pendingStops = await tx.corporateRouteStop.findMany({
        where: { employeeId },
        select: { routeId: true },
      });
      const affectedRouteIds = Array.from(new Set(pendingStops.map((s) => s.routeId)));

      await tx.corporateRouteStop.deleteMany({ where: { employeeId } });
      await tx.corporateTransportRequest.deleteMany({ where: { employeeId } });
      await tx.corporateEmployeeLocation.deleteMany({ where: { employeeId } });
      await tx.corporateEmployee.delete({ where: { id: employeeId } });

      for (const rId of affectedRouteIds) {
        const remaining = await tx.corporateRouteStop.findMany({
          where: { routeId: rId },
          orderBy: { stopSequence: 'asc' },
        });
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].stopSequence !== i + 1) {
            await tx.corporateRouteStop.update({
              where: { id: remaining[i].id },
              data: { stopSequence: i + 1 },
            });
          }
        }
        const empCount = remaining.filter((s) => Boolean(s.employeeId)).length;
        await tx.corporateRoute.update({
          where: { id: rId },
          data: { assignedPassengerCount: empCount },
        });
      }
    });

    if (existing.userId) {
      if (typeof this.redis?.revokeUserSessions === 'function') {
        await this.redis.revokeUserSessions(existing.userId).catch(() => undefined);
      }
      const linkedUser = await this.db.user.findUnique({
        where: { id: existing.userId },
        select: { id: true, role: true },
      });
      if (linkedUser?.role === UserRole.EMPLOYEE) {
        try {
          await this.db.user.delete({ where: { id: linkedUser.id } });
        } catch {
          await this.db.user.update({
            where: { id: linkedUser.id },
            data: { status: 'SUSPENDED', corporateTenantId: null },
          });
        }
      }
    }

    await this.audit.log({
      action: 'CORPORATE_EMPLOYEE_DELETED',
      userId: actorUserId,
      entityId: employeeId,
      entityType: 'CORPORATE_EMPLOYEE',
      metadata: { tenantId, employeeCode: existing.employeeCode },
    });

    return {
      id: employeeId,
      deleted: true,
      deactivated: false,
      message: 'Employee account permanently deleted.',
    };
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

    return {
      office: {
        id: office.id,
        code: office.code,
        name: office.name,
        addressText: office.addressText,
      },
      geofence: null,
      gates: [],
      pickupPoints: [],
    };
  }

  async getTenantIntegrations(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      hrms: {
        provider: null,
        status: 'NOT_CONFIGURED',
        lastSyncAt: null,
        syncInterval: null,
        autoSyncEnabled: false,
        totalEmployeesSynced: null,
      },
      webhookHealth: {
        uptimePct: null,
        avgLatencyMs: null,
        totalEventsToday: null,
        failedEventsToday: null,
      },
      fieldMappings: [],
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
