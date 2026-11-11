import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { RESCHEDULE_CUTOFF_HOURS, isValidShiftTime } from '../replanning/cutoff-policy';

/** Operating policy of a corporate tenant at a point in time (CP-ROS-03, CP-ADM-03). */
export interface CorporateTenantPolicyValues {
  cancelCutoffHours: number;
  maxRideMinutes: number;
  defaultVehicleCategory: string;
  defaultCapacity: number;
  escalationLeadMinutes: number;
  officeArrivalBufferMinutes: number;
  stopDwellMinutes: number;
  approachLeadMinutes: number;
  dispatchWindowMinutes: number;
  dispatchRetryIntervalMinutes: number;
  searchRadiusKm: number;
  nightShiftStart: string;
  nightShiftEnd: string;
}

export interface EffectiveTenantPolicy extends CorporateTenantPolicyValues {
  tenantId: string;
  /** null when no policy row applies and the platform defaults are used. */
  version: number | null;
  effectiveFrom: Date | null;
  source: 'TENANT_POLICY' | 'DEFAULT';
}

export type CreateTenantPolicyInput = Partial<CorporateTenantPolicyValues> & { effectiveFrom?: string | Date };

/** Platform defaults. They match the constants the planner, replanner, and 30m+30m dispatch lifecycle use. */
export const DEFAULT_TENANT_POLICY: Readonly<CorporateTenantPolicyValues> = Object.freeze({
  cancelCutoffHours: RESCHEDULE_CUTOFF_HOURS,
  maxRideMinutes: 120,
  defaultVehicleCategory: 'SEDAN',
  defaultCapacity: 4,
  escalationLeadMinutes: 30,
  officeArrivalBufferMinutes: 10,
  stopDwellMinutes: 10,
  approachLeadMinutes: 30,
  dispatchWindowMinutes: 30,
  dispatchRetryIntervalMinutes: 5,
  searchRadiusKm: 10,
  nightShiftStart: '20:00',
  nightShiftEnd: '06:00',
});

const VEHICLE_CATEGORIES = ['SEDAN', 'SUV'];
const INT_RANGES: Record<string, [number, number]> = {
  cancelCutoffHours: [0, 72],
  maxRideMinutes: [15, 240],
  defaultCapacity: [1, 12],
  escalationLeadMinutes: [0, 240],
  officeArrivalBufferMinutes: [0, 120],
  stopDwellMinutes: [1, 10],
  approachLeadMinutes: [5, 120],
  dispatchWindowMinutes: [5, 120],
  dispatchRetryIntervalMinutes: [1, 30],
  searchRadiusKm: [1, 25],
};
/** effectiveFrom may lag `now` by this much (clock skew between client and server). */
const PAST_EFFECTIVE_TOLERANCE_MS = 5 * 60_000;
const MAX_VERSION_ATTEMPTS = 3;

/**
 * Versioned tenant policy. A new version never edits an old one: it applies from its
 * effectiveFrom, so a cutoff change can't retroactively change already-evaluated requests.
 */
@Injectable()
export class CorporateTenantPolicyService {
  private readonly logger = new Logger(CorporateTenantPolicyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async getEffectivePolicy(tenantId: string, at: Date = new Date()): Promise<EffectiveTenantPolicy> {
    const row: any = await this.db.corporateTenantPolicy.findFirst({
      where: { tenantId, effectiveFrom: { lte: at } },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    });
    if (!row) {
      return { tenantId, version: null, effectiveFrom: null, source: 'DEFAULT', ...DEFAULT_TENANT_POLICY };
    }
    return {
      tenantId,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      source: 'TENANT_POLICY',
      cancelCutoffHours: row.cancelCutoffHours,
      maxRideMinutes: row.maxRideMinutes,
      defaultVehicleCategory: row.defaultVehicleCategory,
      defaultCapacity: row.defaultCapacity,
      escalationLeadMinutes: row.escalationLeadMinutes,
      officeArrivalBufferMinutes: row.officeArrivalBufferMinutes,
      stopDwellMinutes: row.stopDwellMinutes ?? DEFAULT_TENANT_POLICY.stopDwellMinutes,
      approachLeadMinutes: row.approachLeadMinutes ?? DEFAULT_TENANT_POLICY.approachLeadMinutes,
      dispatchWindowMinutes: row.dispatchWindowMinutes ?? DEFAULT_TENANT_POLICY.dispatchWindowMinutes,
      dispatchRetryIntervalMinutes: row.dispatchRetryIntervalMinutes ?? DEFAULT_TENANT_POLICY.dispatchRetryIntervalMinutes,
      searchRadiusKm: row.searchRadiusKm ?? DEFAULT_TENANT_POLICY.searchRadiusKm,
      nightShiftStart: row.nightShiftStart,
      nightShiftEnd: row.nightShiftEnd,
    };
  }

  async listPolicyVersions(tenantId: string) {
    return this.db.corporateTenantPolicy.findMany({
      where: { tenantId },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    });
  }

  /** Adds a policy version. Omitted fields inherit from the policy effective at effectiveFrom. */
  async createPolicyVersion(tenantId: string, input: CreateTenantPolicyInput, actorUserId?: string, now: Date = new Date()) {
    const tenant = await this.db.corporateTenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException(`Corporate tenant ${tenantId} not found`);

    const effectiveFrom = input?.effectiveFrom !== undefined ? new Date(input.effectiveFrom) : now;
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('effectiveFrom must be an ISO date-time');
    }
    if (effectiveFrom.getTime() < now.getTime() - PAST_EFFECTIVE_TOLERANCE_MS) {
      throw new BadRequestException('effectiveFrom cannot be in the past (policies are never applied retroactively)');
    }

    const base = await this.getEffectivePolicy(tenantId, effectiveFrom);
    const values = this.validate({ ...this.pickValues(base), ...this.pickValues(input ?? {}) });

    for (let attempt = 1; ; attempt++) {
      try {
        const created = await this.db.$transaction(async (tx: any) => {
          const latest = await tx.corporateTenantPolicy.findFirst({
            where: { tenantId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          return tx.corporateTenantPolicy.create({
            data: {
              tenantId,
              version: (latest?.version ?? 0) + 1,
              effectiveFrom,
              createdById: actorUserId ?? null,
              ...values,
            },
          });
        });
        await this.audit.log({
          action: 'CORPORATE_TENANT_POLICY_VERSIONED',
          userId: actorUserId,
          entityId: created.id,
          entityType: 'CORPORATE_TENANT_POLICY',
          metadata: { tenantId, version: created.version, effectiveFrom, previousVersion: base.version, values } as any,
        });
        this.logger.log(`Tenant ${tenantId} policy v${created.version} effective ${effectiveFrom.toISOString()}`);
        return created;
      } catch (err: any) {
        // Two concurrent writers picked the same version number: (tenantId, version) is unique.
        if (err?.code === 'P2002' && attempt < MAX_VERSION_ATTEMPTS) continue;
        if (err?.code === 'P2002') throw new ConflictException('Tenant policy changed concurrently; please retry');
        throw err;
      }
    }
  }

  private pickValues(src: any): Partial<CorporateTenantPolicyValues> {
    const out: any = {};
    for (const key of Object.keys(DEFAULT_TENANT_POLICY)) {
      if (src[key] !== undefined && src[key] !== null) out[key] = src[key];
    }
    return out;
  }

  private validate(v: Partial<CorporateTenantPolicyValues>): CorporateTenantPolicyValues {
    return validateTenantPolicyValues(v);
  }
}

/** Shared validation for every policy write (versioned updates and company onboarding). */
export function validateTenantPolicyValues(v: Partial<CorporateTenantPolicyValues>): CorporateTenantPolicyValues {
  const out: any = { ...DEFAULT_TENANT_POLICY, ...v };
  for (const [key, [min, max]] of Object.entries(INT_RANGES)) {
    const n = Number(out[key]);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new BadRequestException(`${key} must be an integer between ${min} and ${max}`);
    }
    out[key] = n;
  }
  out.defaultVehicleCategory = String(out.defaultVehicleCategory).trim().toUpperCase();
  if (!VEHICLE_CATEGORIES.includes(out.defaultVehicleCategory)) {
    throw new BadRequestException(`defaultVehicleCategory must be one of ${VEHICLE_CATEGORIES.join(', ')}`);
  }
  for (const key of ['nightShiftStart', 'nightShiftEnd']) {
    if (!isValidShiftTime(out[key])) throw new BadRequestException(`${key} must be HH:mm`);
  }
  return out;
}
