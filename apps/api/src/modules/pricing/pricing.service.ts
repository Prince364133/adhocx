import { Injectable, Logger, OnModuleInit, Optional, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Vehicle category catalogue + platform policy settings.
 *
 * Trip prices are NOT here: every vendor charge and driver payout comes from the distance pricing
 * engine (DistancePricingService, pricing_plans / pricing_slabs). The legacy per-km columns of
 * vehicle_pricing_tiers are no longer read or written.
 */
export interface VehicleCategoryDto {
  id: string;
  vehicleType: string;
  categoryLabel: string;
  seatingCapacity: string;
  maxSeats: number;
  description: string;
  iconKey?: string | null;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

/** @deprecated name kept for existing imports: the catalogue no longer carries prices. */
export type VehiclePricingTierDto = VehicleCategoryDto;

export function calculateTierMaxSeats(_vehicleType: string, seatingCapacity: string = ''): number {
  const capacity = String(seatingCapacity || '');
  const splitCapacity = capacity.match(/(\d+)\s*\+\s*(\d+)/);
  if (splitCapacity) return Number(splitCapacity[1]) + Number(splitCapacity[2]);
  const numericCapacity = capacity.match(/\d+/);
  if (numericCapacity && Number(numericCapacity[0]) > 0) return Number(numericCapacity[0]);
  return 4;
}

export interface PlatformPolicyConfigDto {
  driverMonthlyFee: number;
  driverTrialDays: number;
  minWithdrawalAmount: number;
  escortFee: number;
  updatedAt: string;
}

const DEFAULT_POLICY = { driverMonthlyFee: 499, driverTrialDays: 15, minWithdrawalAmount: 1000, escortFee: 300 };

@Injectable()
export class PricingService implements OnModuleInit {
  protected readonly logger = new Logger(PricingService.name);
  private policyCache: PlatformPolicyConfigDto | null = null;

  constructor(@Optional() private readonly db?: DatabaseService) {}

  async onModuleInit() {
    await this.seedPolicyIfMissing();
  }

  /** First boot only: seed the default driver policy. Vehicle categories are admin-managed. */
  async seedPolicyIfMissing(): Promise<void> {
    if (!this.db) return;
    try {
      if (!(await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } }))) {
        await this.db.systemPolicyConfig.create({ data: { key: 'GLOBAL_POLICY', ...DEFAULT_POLICY } });
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed platform policy: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Vehicle category catalogue
  // ---------------------------------------------------------------------------

  async getAllPricingTiers(): Promise<VehicleCategoryDto[]> {
    if (!this.db) return [];
    const rows = await this.db.vehiclePricingTier.findMany({ orderBy: { vehicleType: 'asc' } });
    return rows.map((r) => this.toDto(r));
  }

  async getPricingTier(vehicleType: string): Promise<VehicleCategoryDto> {
    const slug = vehicleType.trim().toUpperCase();
    const row = this.db ? await this.db.vehiclePricingTier.findUnique({ where: { vehicleType: slug } }) : null;
    if (!row) throw new NotFoundException(`Vehicle category '${slug}' not found`);
    return this.toDto(row);
  }

  async createPricingTier(
    dto: { vehicleType: string; categoryLabel: string; seatingCapacity: string; description?: string; iconKey?: string },
    updatedBy = 'ADMIN',
  ): Promise<VehicleCategoryDto> {
    if (!this.db) throw new BadRequestException('Database unavailable');
    const slug = String(dto.vehicleType ?? '').trim().toUpperCase().replace(/\s+/g, '_');
    if (!slug) throw new BadRequestException('Vehicle category code is required');
    if (await this.db.vehiclePricingTier.findUnique({ where: { vehicleType: slug } })) {
      throw new ConflictException(`Vehicle category '${slug}' already exists`);
    }
    const created = await this.db.vehiclePricingTier.create({
      data: {
        vehicleType: slug,
        categoryLabel: dto.categoryLabel,
        seatingCapacity: dto.seatingCapacity,
        description: dto.description || dto.categoryLabel,
        iconKey: dto.iconKey || 'car',
        ...legacyZeroPrices(),
        isActive: true,
        updatedBy,
      },
    });
    return this.toDto(created);
  }

  async updatePricingTier(
    vehicleType: string,
    dto: Partial<Pick<VehicleCategoryDto, 'categoryLabel' | 'seatingCapacity' | 'description' | 'iconKey' | 'isActive'>> & { updatedBy?: string },
  ): Promise<VehicleCategoryDto> {
    if (!this.db) throw new BadRequestException('Database unavailable');
    const slug = vehicleType.trim().toUpperCase();
    const data: any = { updatedBy: dto.updatedBy || 'ADMIN' };
    for (const key of ['categoryLabel', 'seatingCapacity', 'description', 'iconKey'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);
    const existing = await this.db.vehiclePricingTier.findUnique({ where: { vehicleType: slug } });
    if (!existing) throw new NotFoundException(`Vehicle category '${slug}' not found`);
    if (data.isActive === false && existing.isActive !== false) await this.assertNoRunningTrips(slug);
    return this.toDto(await this.db.vehiclePricingTier.update({ where: { vehicleType: slug }, data }));
  }

  /** Deactivates a category (kept for history); refused while trips in that category are running. */
  async deletePricingTier(vehicleType: string): Promise<{ success: boolean; message: string }> {
    if (!this.db) throw new BadRequestException('Database unavailable');
    const slug = vehicleType.trim().toUpperCase();
    await this.assertNoRunningTrips(slug);
    const existing = await this.db.vehiclePricingTier.findUnique({ where: { vehicleType: slug } });
    if (!existing) throw new NotFoundException(`Vehicle category '${slug}' not found`);
    await this.db.vehiclePricingTier.update({ where: { vehicleType: slug }, data: { isActive: false } });
    return { success: true, message: `Vehicle category '${slug}' deactivated` };
  }

  private async assertNoRunningTrips(slug: string): Promise<void> {
    const active = await this.db!.trip.count({
      where: { vehicleType: slug as any, status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] as any } },
    });
    if (active > 0) {
      throw new BadRequestException(`Cannot deactivate '${slug}': ${active} active trip(s) use it`);
    }
  }

  // ---------------------------------------------------------------------------
  // Driver policy (subscription fee, trial, withdrawal minimum, escort fee)
  // ---------------------------------------------------------------------------

  async getPolicyConfig(): Promise<PlatformPolicyConfigDto> {
    if (this.db) {
      try {
        const policy = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
        if (policy) {
          this.policyCache = {
            driverMonthlyFee: Number(policy.driverMonthlyFee),
            driverTrialDays: policy.driverTrialDays,
            minWithdrawalAmount: Number(policy.minWithdrawalAmount),
            escortFee: Number((policy as any).escortFee ?? DEFAULT_POLICY.escortFee),
            updatedAt: policy.updatedAt.toISOString(),
          };
          return this.policyCache;
        }
      } catch (err: any) {
        this.logger.warn(`Could not read policy config: ${err.message}`);
      }
    }
    return this.policyCache ?? { ...DEFAULT_POLICY, updatedAt: new Date().toISOString() };
  }

  async updatePolicyConfig(
    dto: {
      driverMonthlyFee?: number;
      driverTrialDays?: number;
      minWithdrawalAmount?: number;
      escortFee?: number;
    },
    actor?: { id?: string; name?: string },
  ): Promise<PlatformPolicyConfigDto> {
    if (!this.db) throw new BadRequestException('Database unavailable');
    // The controller DTO validates too; this guards other callers (and NaN reaching Decimal columns).
    const limits: Record<string, { max: number; integer?: boolean }> = {
      driverMonthlyFee: { max: 100000 },
      driverTrialDays: { max: 365, integer: true },
      minWithdrawalAmount: { max: 1000000 },
      escortFee: { max: 100000 },
    };
    const data: Record<string, number> = {};
    for (const [field, rule] of Object.entries(limits)) {
      const raw = (dto as Record<string, unknown>)[field];
      if (raw === undefined || raw === null) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > rule.max || (rule.integer && !Number.isInteger(value))) {
        throw new BadRequestException(
          `${field} must be ${rule.integer ? 'a whole number' : 'a number'} between 0 and ${rule.max}`,
        );
      }
      data[field] = value;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No policy fields to update');
    }
    const before = await this.getPolicyConfig();
    const res = await this.db.systemPolicyConfig.upsert({
      where: { key: 'GLOBAL_POLICY' },
      create: { key: 'GLOBAL_POLICY', ...DEFAULT_POLICY, ...data },
      update: data,
    });
    try {
      await this.db.pricingAudit.create({
        data: {
          actorId: actor?.id ?? null,
          actorName: actor?.name ?? null,
          action: 'UPDATE_POLICY',
          entityType: 'PLATFORM_POLICY',
          entityId: 'GLOBAL_POLICY',
          oldValueJson: Object.fromEntries(Object.keys(data).map((k) => [k, (before as any)[k]])) as any,
          newValueJson: data as any,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Policy updated but audit row failed: ${err?.message ?? err}`);
    }
    this.logger.log(`[pricing] metric=policy_updated actor=${actor?.id ?? 'unknown'} fields=${Object.keys(data).join(',')}`);
    this.policyCache = {
      driverMonthlyFee: Number(res.driverMonthlyFee),
      driverTrialDays: res.driverTrialDays,
      minWithdrawalAmount: Number(res.minWithdrawalAmount),
      escortFee: Number((res as any).escortFee ?? DEFAULT_POLICY.escortFee),
      updatedAt: res.updatedAt.toISOString(),
    };
    return this.policyCache;
  }

  private toDto(r: any): VehicleCategoryDto {
    return {
      id: r.id,
      vehicleType: r.vehicleType,
      categoryLabel: r.categoryLabel,
      seatingCapacity: r.seatingCapacity,
      maxSeats: calculateTierMaxSeats(r.vehicleType, r.seatingCapacity),
      description: r.description,
      iconKey: r.iconKey,
      isActive: r.isActive,
      updatedAt: r.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      updatedBy: r.updatedBy,
    };
  }
}

/** Legacy per-km columns are NOT NULL in the database; they are written as 0 and never read. */
function legacyZeroPrices() {
  return { baseFare: 0, baseKm: 0, perKmRate: 0, surgeMultiplier: 1 };
}
