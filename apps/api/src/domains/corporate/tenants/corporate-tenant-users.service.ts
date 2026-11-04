import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { assertPhoneAvailable } from '../../../common/utils/uniqueness.util';
import { sanitizeRealName } from '../../../common/utils/name.util';
import {
  CorporateRole,
  corporateOfficeScope,
  effectiveCorporateRole,
  isCorporateRole,
  userRoleForCorporateRole,
} from './corporate-permissions';

export interface InviteCorporateUserInput {
  fullName: string;
  email?: string;
  phone?: string;
  corporateRole: CorporateRole | string;
  /** Office scope. Omitted / empty => all offices of the tenant. */
  officeIds?: string[];
}

export interface UpdateCorporateUserInput {
  corporateRole?: CorporateRole | string;
  officeIds?: string[];
}

/** The authenticated caller (request.user) of an invite / update. */
export interface CorporateActor {
  id: string;
  role: string;
  corporateRole?: string | null;
  corporateOfficeIds?: string[] | null;
}

const PUBLIC_USER_SELECT = {
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
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CORPORATE_USER_ROLES = [UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER];

/**
 * Corporate portal users (CP-ADM-01/02). An invited user is an ordinary `users` row
 * (CORPORATE_ADMIN for CORP_SUPER_ADMIN, CORPORATE_MANAGER otherwise) linked to the tenant, with
 * `corporateRole` + `corporateOfficeIds`. No password is set: the user signs in with the existing
 * OTP flow (POST /auth/otp/request + /auth/otp/verify finds the account by phone / email) and the
 * token carries the role / scope claims (AuthService.buildCorporateClaims).
 */
@Injectable()
export class CorporateTenantUsersService {
  private readonly logger = new Logger(CorporateTenantUsersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listUsers(tenantId: string) {
    return this.db.user.findMany({
      where: { corporateTenantId: tenantId, role: { in: CORPORATE_USER_ROLES as any } },
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteUser(tenantId: string, input: InviteCorporateUserInput, actor: CorporateActor) {
    const corporateRole = this.parseRole(input?.corporateRole);
    const fullName = sanitizeRealName(input?.fullName);
    if (!fullName || fullName.length < 2) throw new BadRequestException('fullName must be at least 2 characters');
    const email = input?.email ? String(input.email).trim().toLowerCase() : undefined;
    const phone = input?.phone ? String(input.phone).trim().replace(/[\s-]/g, '') : undefined;
    if (!email && !phone) throw new BadRequestException('email or phone is required');
    if (email && !EMAIL_RE.test(email)) throw new BadRequestException('email is invalid');
    if (phone && phone.replace(/\D/g, '').length < 10) throw new BadRequestException('phone must have at least 10 digits');

    await this.assertTenantActive(tenantId);
    const officeIds = await this.validateOffices(tenantId, input?.officeIds);
    this.assertActorMayGrant(actor, corporateRole, officeIds);

    if (phone) await assertPhoneAvailable(this.db, phone);
    if (email) {
      const taken = await this.db.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('This email address is already registered to another account');
    }

    let user: any;
    try {
      user = await this.db.user.create({
        data: {
          fullName,
          email: email ?? undefined,
          phone: phone ?? undefined,
          role: userRoleForCorporateRole(corporateRole) as any,
          status: 'ACTIVE',
          corporateTenantId: tenantId,
          corporateRole: corporateRole as any,
          corporateOfficeIds: officeIds,
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('An account with this email or phone already exists');
      throw err;
    }

    await this.audit.log({
      action: 'CORPORATE_USER_INVITED',
      userId: actor.id,
      actorRole: actor.role,
      entityId: user.id,
      entityType: 'USER',
      metadata: { tenantId, corporateRole, officeIds },
    });
    this.logger.log(`Corporate user ${user.id} invited to tenant ${tenantId} as ${corporateRole}`);
    return user;
  }

  /** Changes the role / office scope of a corporate user of the tenant. */
  async updateUser(tenantId: string, userId: string, input: UpdateCorporateUserInput, actor: CorporateActor) {
    const existing: any = await this.db.user.findFirst({
      where: { id: userId, corporateTenantId: tenantId, role: { in: CORPORATE_USER_ROLES as any } },
      select: PUBLIC_USER_SELECT,
    });
    if (!existing) throw new NotFoundException(`Corporate user ${userId} not found in tenant ${tenantId}`);
    if (userId === actor.id) throw new ForbiddenException('You cannot change your own corporate role or office scope');

    const corporateRole =
      input?.corporateRole !== undefined
        ? this.parseRole(input.corporateRole)
        : (effectiveCorporateRole(existing) as CorporateRole);
    const officeIds =
      input?.officeIds !== undefined ? await this.validateOffices(tenantId, input.officeIds) : existing.corporateOfficeIds ?? [];
    this.assertActorMayGrant(actor, corporateRole, officeIds);
    // A scoped actor may not edit a user who reaches outside the actor's own scope either.
    this.assertActorMayGrant(actor, effectiveCorporateRole(existing) as CorporateRole, existing.corporateOfficeIds ?? []);

    const updated = await this.db.user.update({
      where: { id: userId },
      data: {
        role: userRoleForCorporateRole(corporateRole) as any,
        corporateRole: corporateRole as any,
        corporateOfficeIds: officeIds,
      },
      select: PUBLIC_USER_SELECT,
    });
    await this.audit.log({
      action: 'CORPORATE_USER_ROLE_CHANGED',
      userId: actor.id,
      actorRole: actor.role,
      entityId: userId,
      entityType: 'USER',
      metadata: {
        tenantId,
        from: { corporateRole: existing.corporateRole, officeIds: existing.corporateOfficeIds },
        to: { corporateRole, officeIds },
        note: 'Takes effect on the next token refresh / login',
      } as any,
    });
    return updated;
  }

  private parseRole(value: unknown): CorporateRole {
    const role = typeof value === 'string' ? value.trim().toUpperCase() : value;
    if (!isCorporateRole(role)) {
      throw new BadRequestException(`corporateRole must be one of ${Object.values(CorporateRole).join(', ')}`);
    }
    return role;
  }

  private async assertTenantActive(tenantId: string): Promise<void> {
    const tenant: any = await this.db.corporateTenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true },
    });
    if (!tenant) throw new NotFoundException(`Corporate tenant ${tenantId} not found`);
    if (tenant.status !== 'ACTIVE') throw new BadRequestException(`Corporate tenant is ${tenant.status}`);
  }

  private async validateOffices(tenantId: string, officeIds: unknown): Promise<string[]> {
    if (officeIds === undefined || officeIds === null) return [];
    if (!Array.isArray(officeIds) || officeIds.some((id) => typeof id !== 'string' || !id)) {
      throw new BadRequestException('officeIds must be an array of office ids');
    }
    const unique = [...new Set(officeIds as string[])];
    if (unique.length === 0) return [];
    const found = await this.db.corporateOffice.findMany({
      where: { tenantId, id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException('Every officeId must be an office of this tenant');
    }
    return unique;
  }

  /**
   * Platform ADMIN may grant anything. A corporate caller (already holding users:invite, i.e.
   * CORP_SUPER_ADMIN) that is office-scoped may only grant a subset of its own offices, never
   * "all offices".
   */
  private assertActorMayGrant(actor: CorporateActor, _role: CorporateRole, officeIds: string[]): void {
    if (String(actor.role).toUpperCase() === UserRole.ADMIN) return;
    const actorScope = corporateOfficeScope(actor);
    if (!actorScope) return;
    if (officeIds.length === 0 || officeIds.some((id) => !actorScope.includes(id))) {
      throw new ForbiddenException('You can only grant access to offices inside your own office scope');
    }
  }
}
