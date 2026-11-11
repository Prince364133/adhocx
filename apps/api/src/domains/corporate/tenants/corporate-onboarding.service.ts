import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CorporateTenantStatus,
  OnboardCorporateCompanyDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { H3Service } from '../../../modules/locations/h3.service';
import { GoogleGeocodingAdapter } from '../routing/google-geocoding.adapter';
import { sanitizeRealName } from '../../../common/utils/name.util';
import { assertPhoneAvailable } from '../../../common/utils/uniqueness.util';
import { hashPassword } from '../../../common/utils/password.util';
import { isValidShiftTime } from '../replanning/cutoff-policy';
import { isOvernightShift } from '../scheduling/shift-calendar';
import {
  CORPORATE_ROLES,
  CorporateRole,
  userRoleForCorporateRole,
} from './corporate-permissions';
import { DEFAULT_TENANT_POLICY, validateTenantPolicyValues } from './corporate-tenant-policy.service';
import { normalizeIndianPhone } from '../../../common/utils/uniqueness.util';

/** Portal password minimum (spec: 8). */
export const CORPORATE_PORTAL_PASSWORD_MIN = 8;
/** Seats a policy may assign per category. */
const CATEGORY_MAX_CAPACITY: Record<string, number> = { SEDAN: 4, SUV: 7 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TENANT_CODE_RE = /^[A-Z0-9_-]{2,32}$/;

/**
 * Atomic end-to-end Corporate Client Onboarding workflow:
 * Creates Tenant + Primary Office (auto-geocoded if needed) + Policy v1 +
 * Optional Shift Template + Primary Corporate Portal Admin credentials.
 */
@Injectable()
export class CorporateOnboardingService {
  private readonly logger = new Logger(CorporateOnboardingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly h3Service: H3Service,
    private readonly geocoding: GoogleGeocodingAdapter,
  ) {}

  async onboardCompany(
    dto: OnboardCorporateCompanyDto,
    actor?: { id?: string; role?: string },
  ) {
    const code = String(dto?.code ?? '').trim().toUpperCase();
    const name = String(dto?.name ?? '').trim();
    const legalEntityName = String(dto?.legalEntityName ?? '').trim();
    const gstin = dto?.gstin ? String(dto.gstin).trim().toUpperCase() : null;

    if (!TENANT_CODE_RE.test(code)) {
      throw new BadRequestException(
        'Company code must be 2-32 uppercase alphanumeric characters, hyphens, or underscores',
      );
    }
    if (name.length < 2) {
      throw new BadRequestException('Company name must be at least 2 characters');
    }
    if (legalEntityName.length < 2) {
      throw new BadRequestException('Legal entity name must be at least 2 characters');
    }
    if (gstin && gstin.length !== 15) {
      throw new BadRequestException('GSTIN must be 15 characters when provided');
    }

    // 1. Validate & resolve primary office coordinates
    const officeCode = String(dto?.office?.code ?? '').trim().toUpperCase();
    const officeName = String(dto?.office?.name ?? '').trim();
    const officeAddress = String(dto?.office?.addressText ?? '').trim();
    if (!officeCode || officeCode.length > 32) {
      throw new BadRequestException('Primary office code is required (max 32 chars)');
    }
    if (officeName.length < 2) {
      throw new BadRequestException('Primary office name must be at least 2 characters');
    }
    if (officeAddress.length < 4) {
      throw new BadRequestException('Primary office addressText is required');
    }

    let officeLat = Number(dto?.office?.latitude);
    let officeLng = Number(dto?.office?.longitude);
    const coordsGiven =
      dto?.office?.latitude !== undefined &&
      dto?.office?.latitude !== null &&
      dto?.office?.longitude !== undefined &&
      dto?.office?.longitude !== null &&
      Number.isFinite(officeLat) &&
      Number.isFinite(officeLng);
    if (!coordsGiven) {
      let geo;
      try {
        geo = await this.geocoding.geocode(officeAddress);
      } catch (err: any) {
        throw new BadRequestException(
          `Could not locate the office address on Google Maps (${err?.message ?? 'geocoding failed'}). ` +
            'Check the address or enter the office latitude/longitude manually.',
        );
      }
      if (!geo.isRealGeocode && !GoogleGeocodingAdapter.fallbackAllowed()) {
        throw new BadRequestException('Office address could not be verified; enter latitude/longitude manually.');
      }
      officeLat = geo.lat;
      officeLng = geo.lng;
    }
    if (
      !Number.isFinite(officeLat) ||
      !Number.isFinite(officeLng) ||
      officeLat < -90 ||
      officeLat > 90 ||
      officeLng < -180 ||
      officeLng > 180
    ) {
      throw new BadRequestException('Invalid geographic coordinates for primary office');
    }
    const h3Res8Index = this.h3Service.latLngToCell(officeLat, officeLng, 8);

    // 2. Validate primary Corporate Portal admin account
    const adminName = sanitizeRealName(dto?.adminUser?.fullName ?? '');
    const adminEmail = String(dto?.adminUser?.email ?? '').trim().toLowerCase();
    const adminPhone = normalizeIndianPhone(String(dto?.adminUser?.phone ?? '').replace(/[\s-]/g, '')) ?? '';
    const rawPassword =
      dto?.adminUser?.password !== undefined && dto.adminUser.password !== null
        ? String(dto.adminUser.password)
        : '';

    if (!adminName || adminName.length < 2) {
      throw new BadRequestException('Corporate admin fullName must be at least 2 characters');
    }
    if (!EMAIL_RE.test(adminEmail)) {
      throw new BadRequestException('A valid corporate admin email is required');
    }
    if (adminPhone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('A valid corporate admin phone number (>= 10 digits) is required');
    }
    if (rawPassword && rawPassword.length < CORPORATE_PORTAL_PASSWORD_MIN) {
      throw new BadRequestException(
        `Initial portal password must be at least ${CORPORATE_PORTAL_PASSWORD_MIN} characters`,
      );
    }

    const rawCorpRole = String(dto?.adminUser?.corporateRole ?? CorporateRole.CORP_SUPER_ADMIN)
      .trim()
      .toUpperCase() as CorporateRole;
    if (!CORPORATE_ROLES.includes(rawCorpRole)) {
      throw new BadRequestException(`Invalid corporateRole: ${rawCorpRole}`);
    }

    // 3. Validate policy defaults
    const policy = this.normalizePolicy(dto?.policy);

    // 4. Validate optional initial shift template
    let shiftInput:
      | { name: string; loginTime: string; logoutTime: string; weekdays: number[]; isOvernight: boolean }
      | undefined;
    if (dto?.shiftTemplate && (dto.shiftTemplate.name || dto.shiftTemplate.loginTime || dto.shiftTemplate.logoutTime)) {
      const shiftName = String(dto.shiftTemplate.name ?? 'Primary Shift').trim();
      const loginTime = String(dto.shiftTemplate.loginTime ?? '').trim();
      const logoutTime = String(dto.shiftTemplate.logoutTime ?? '').trim();
      if (!isValidShiftTime(loginTime) || !isValidShiftTime(logoutTime)) {
        throw new BadRequestException('Shift loginTime and logoutTime must be HH:mm');
      }
      if (loginTime === logoutTime) {
        throw new BadRequestException('Shift loginTime and logoutTime must differ');
      }
      const weekdays = [...new Set(dto.shiftTemplate.weekdays ?? [1, 2, 3, 4, 5])].sort();
      if (weekdays.length === 0 || weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
        throw new BadRequestException('Shift weekdays must be ISO weekdays 1..7');
      }
      const overnight = isOvernightShift(loginTime, logoutTime);
      if (dto.shiftTemplate.isOvernight !== undefined && dto.shiftTemplate.isOvernight !== overnight) {
        throw new BadRequestException('Shift isOvernight contradicts loginTime -> logoutTime');
      }
      shiftInput = {
        name: shiftName,
        loginTime,
        logoutTime,
        weekdays,
        isOvernight: overnight,
      };
    }

    const passwordHash = rawPassword ? await hashPassword(rawPassword) : undefined;
    const status = dto?.status ?? CorporateTenantStatus.ACTIVE;
    // Onboarding creates a live tenant; suspension is a separate, audited tenant update.
    if (String(status) !== CorporateTenantStatus.ACTIVE) {
      throw new BadRequestException('A company can only be onboarded as ACTIVE');
    }

    const result = await this.runOnboardingTransaction(async (tx: any) => {
      const existingTenant = await tx.corporateTenant.findUnique({ where: { code } });
      if (existingTenant) {
        throw new ConflictException(`Corporate tenant with code '${code}' already exists`);
      }

      await assertPhoneAvailable(tx, adminPhone);
      const emailTaken = await tx.user.findFirst({
        where: { email: { equals: adminEmail, mode: 'insensitive' } },
        select: { id: true },
      });
      if (emailTaken) {
        throw new ConflictException('Admin email is already registered to another account');
      }

      const tenant = await tx.corporateTenant.create({
        data: {
          code,
          name,
          legalEntityName,
          gstin,
          status: status as any,
        },
      });

      const office = await tx.corporateOffice.create({
        data: {
          tenantId: tenant.id,
          code: officeCode,
          name: officeName,
          addressText: officeAddress,
          latitude: officeLat,
          longitude: officeLng,
          h3Res8Index,
        },
      });

      const policyRow = await tx.corporateTenantPolicy.create({
        data: {
          tenantId: tenant.id,
          version: 1,
          effectiveFrom: new Date(),
          createdById: actor?.id ?? null,
          ...policy,
        },
      });

      let shiftTemplate: any = null;
      if (shiftInput) {
        shiftTemplate = await tx.corporateShiftTemplate.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            name: shiftInput.name,
            loginTime: shiftInput.loginTime,
            logoutTime: shiftInput.logoutTime,
            weekdays: shiftInput.weekdays,
            isOvernight: shiftInput.isOvernight,
            isActive: true,
          },
        });
      }

      const adminUser = await tx.user.create({
        data: {
          fullName: adminName,
          email: adminEmail,
          phone: adminPhone,
          ...(passwordHash ? { passwordHash } : {}),
          role: userRoleForCorporateRole(rawCorpRole) as any,
          status: 'ACTIVE',
          corporateTenantId: tenant.id,
          corporateRole: rawCorpRole as any,
          corporateOfficeIds: [],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          corporateTenantId: true,
          corporateRole: true,
          corporateOfficeIds: true,
          createdAt: true,
        },
      });

      return {
        tenant,
        office: {
          ...office,
          latitude: Number(office.latitude),
          longitude: Number(office.longitude),
        },
        policy: policyRow,
        shiftTemplate,
        adminUser,
      };
    });

    await this.audit.log({
      action: 'CORPORATE_COMPANY_ONBOARDED',
      userId: actor?.id,
      actorRole: actor?.role,
      entityId: result.tenant.id,
      entityType: 'CORPORATE_TENANT',
      metadata: {
        code: result.tenant.code,
        officeCode: result.office.code,
        adminEmail: result.adminUser.email,
        passwordConfigured: Boolean(passwordHash),
      } as any,
    });

    this.logger.log(
      `Onboarded corporate client ${result.tenant.name} (${result.tenant.code}) with office ${result.office.code} and admin ${result.adminUser.email}`,
    );

    return {
      ...result,
      portalAccess: {
        loginPath: '/login',
        email: result.adminUser.email,
        phone: result.adminUser.phone,
        passwordConfigured: Boolean(passwordHash),
        corporateRole: result.adminUser.corporateRole,
      },
    };
  }

  /** Concurrent onboards race on unique code / email / phone: report a 409, not a 500. */
  private async runOnboardingTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    try {
      return await this.db.$transaction(fn);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(', ') : String(err?.meta?.target ?? 'a unique field');
        throw new ConflictException(`A company or portal user with the same ${target} already exists`);
      }
      throw err;
    }
  }

  private normalizePolicy(input?: OnboardCorporateCompanyDto['policy']) {
    const raw: any = { ...(input ?? {}) };
    const category = String(raw.defaultVehicleCategory ?? DEFAULT_TENANT_POLICY.defaultVehicleCategory)
      .trim()
      .toUpperCase();
    // Capacity follows the category unless given: SEDAN 4, SUV 6.
    if (raw.defaultCapacity === undefined || raw.defaultCapacity === null || raw.defaultCapacity === '') {
      raw.defaultCapacity = category === 'SUV' ? 6 : 4;
    }
    for (const key of Object.keys(raw)) {
      if (raw[key] === undefined || raw[key] === null || raw[key] === '') delete raw[key];
    }
    const values = validateTenantPolicyValues({ ...raw, defaultVehicleCategory: category });
    const maxSeats = CATEGORY_MAX_CAPACITY[values.defaultVehicleCategory] ?? 7;
    if (values.defaultCapacity > maxSeats) {
      throw new BadRequestException(
        `defaultCapacity ${values.defaultCapacity} exceeds the ${maxSeats} seats of a ${values.defaultVehicleCategory}`,
      );
    }
    return values;
  }
}

