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
import { DEFAULT_TENANT_POLICY } from './corporate-tenant-policy.service';

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
    if (
      dto?.office?.latitude === undefined ||
      dto?.office?.longitude === undefined ||
      !Number.isFinite(officeLat) ||
      !Number.isFinite(officeLng)
    ) {
      const geo = await this.geocoding.geocode(officeAddress);
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
    const adminPhone = String(dto?.adminUser?.phone ?? '').trim().replace(/[\s-]/g, '');
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
    if (rawPassword && rawPassword.length < 6) {
      throw new BadRequestException('Initial portal password must be at least 6 characters');
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

    const result = await this.db.$transaction(async (tx: any) => {
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

  private normalizePolicy(input?: OnboardCorporateCompanyDto['policy']) {
    const merged = {
      ...DEFAULT_TENANT_POLICY,
      ...(input ?? {}),
    };
    const cat = String(merged.defaultVehicleCategory ?? 'SEDAN').toUpperCase();
    if (cat !== 'SEDAN' && cat !== 'SUV') {
      throw new BadRequestException('defaultVehicleCategory must be SEDAN or SUV');
    }
    const stopDwell = Number(merged.stopDwellMinutes);
    if (!Number.isInteger(stopDwell) || stopDwell < 1 || stopDwell > 10) {
      throw new BadRequestException('stopDwellMinutes must be an integer between 1 and 10');
    }
    const approach = Number(merged.approachLeadMinutes);
    if (!Number.isInteger(approach) || approach < 5 || approach > 120) {
      throw new BadRequestException('approachLeadMinutes must be between 5 and 120');
    }
    const dispatchWin = Number(merged.dispatchWindowMinutes);
    if (!Number.isInteger(dispatchWin) || dispatchWin < 5 || dispatchWin > 120) {
      throw new BadRequestException('dispatchWindowMinutes must be between 5 and 120');
    }
    const retryInterval = Number(merged.dispatchRetryIntervalMinutes);
    if (!Number.isInteger(retryInterval) || retryInterval < 1 || retryInterval > 30) {
      throw new BadRequestException('dispatchRetryIntervalMinutes must be between 1 and 30');
    }
    const radius = Number(merged.searchRadiusKm);
    if (!Number.isInteger(radius) || radius < 1 || radius > 25) {
      throw new BadRequestException('searchRadiusKm must be between 1 and 25');
    }

    return {
      cancelCutoffHours: Number(merged.cancelCutoffHours),
      maxRideMinutes: Number(merged.maxRideMinutes),
      defaultVehicleCategory: cat,
      defaultCapacity: input?.defaultCapacity !== undefined ? Number(input.defaultCapacity) : cat === 'SUV' ? 6 : 4,
      escalationLeadMinutes: Number(merged.escalationLeadMinutes),
      officeArrivalBufferMinutes: Number(merged.officeArrivalBufferMinutes),
      stopDwellMinutes: stopDwell,
      approachLeadMinutes: approach,
      dispatchWindowMinutes: dispatchWin,
      dispatchRetryIntervalMinutes: retryInterval,
      searchRadiusKm: radius,
      nightShiftStart: merged.nightShiftStart,
      nightShiftEnd: merged.nightShiftEnd,
    };
  }
}

