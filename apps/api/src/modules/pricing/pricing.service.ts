import { Injectable, Logger, OnModuleInit, Optional, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { VehicleType } from '@adhocx/contracts';
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

export function calculateTierMaxSeats(vehicleType: string, seatingCapacity: string = ''): number {
  const norm = (vehicleType || '').toUpperCase();
  if (norm.includes('SUV') || norm.includes('7')) return 7;
  if (norm.includes('TEMPO')) return 12;
  if (norm.includes('BUS')) return 24;
  if (seatingCapacity.includes('7') || seatingCapacity.includes('6 + 1')) return 7;
  if (seatingCapacity.includes('12')) return 12;
  if (seatingCapacity.includes('24')) return 24;
  return 4;
}

export interface PlatformPolicyConfigDto {
  commissionPercent: number;
  driverMonthlyFee: number;
  driverTrialDays: number;
  minWithdrawalAmount: number;
  updatedAt: string;
}

/** Category names and seating shown in the apps on a fresh database (no prices). */
const DEFAULT_CATEGORIES: Array<Pick<VehicleCategoryDto, 'vehicleType' | 'categoryLabel' | 'seatingCapacity' | 'description' | 'iconKey'>> = [
  { vehicleType: VehicleType.SEDAN, categoryLabel: 'Prime Sedan', seatingCapacity: '4 + 1 Passengers', description: 'Executive 4-seater sedans', iconKey: 'car' },
  { vehicleType: VehicleType.SUV, categoryLabel: 'SUV 7 Seater', seatingCapacity: '6 + 1 Passengers', description: '6-7 seater SUVs', iconKey: 'suv' },
  { vehicleType: VehicleType.HATCHBACK, categoryLabel: 'Compact Hatchback', seatingCapacity: '4 + 1 Passengers', description: 'Compact city cabs', iconKey: 'car' },
  { vehicleType: VehicleType.TEMPO_TRAVELLER, categoryLabel: 'Tempo Traveller', seatingCapacity: '12 - 16 Passengers', description: '12-16 seater minibuses', iconKey: 'bus' },
  { vehicleType: VehicleType.BUS, categoryLabel: 'Coach Bus', seatingCapacity: '24 - 40 Passengers', description: '24-40 seater coaches', iconKey: 'bus' },
];

const DEFAULT_POLICY = { commissionPercent: 10, driverMonthlyFee: 499, driverTrialDays: 15, minWithdrawalAmount: 1000 };

@Injectable()
export class PricingService implements OnModuleInit {
  protected readonly logger = new Logger(PricingService.name);
  private policyCache: PlatformPolicyConfigDto | null = null;

  constructor(@Optional() private readonly db?: DatabaseService) {}

  async onModuleInit() {
    await this.seedCatalogueIfEmpty();
  }

  /** First boot only: category names (no prices) and the default platform policy. */
  async seedCatalogueIfEmpty(): Promise<void> {
    if (!this.db) return;
    try {
      if ((await this.db.vehiclePricingTier.count()) === 0) {
        for (const c of DEFAULT_CATEGORIES) {
          await this.db.vehiclePricingTier.create({ data: { ...c, ...legacyZeroPrices(), isActive: true, updatedBy: 'SYSTEM' } });
        }
        this.logger.log(`Seeded ${DEFAULT_CATEGORIES.length} vehicle categories (catalogue only, no prices).`);
      }
      if (!(await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } }))) {
        await this.db.systemPolicyConfig.create({ data: { key: 'GLOBAL_POLICY', ...DEFAULT_POLICY } });
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed vehicle categories: ${err.message}`);
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
  // Platform policy (subscription fee, trial, withdrawal minimum, commission on legacy trips)
  // ---------------------------------------------------------------------------

  async getPlatformCommissionRate(): Promise<number> {
    return (await this.getPolicyConfig()).commissionPercent;
  }

  async getPolicyConfig(): Promise<PlatformPolicyConfigDto> {
    if (this.db) {
      try {
        const policy = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
        if (policy) {
          this.policyCache = {
            commissionPercent: Number(policy.commissionPercent ?? DEFAULT_POLICY.commissionPercent),
            driverMonthlyFee: Number(policy.driverMonthlyFee),
            driverTrialDays: policy.driverTrialDays,
            minWithdrawalAmount: Number(policy.minWithdrawalAmount),
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

  async updatePolicyConfig(dto: {
    commissionPercent?: number;
    driverMonthlyFee?: number;
    driverTrialDays?: number;
    minWithdrawalAmount?: number;
  }): Promise<PlatformPolicyConfigDto> {
    if (!this.db) throw new BadRequestException('Database unavailable');
    const data: any = {};
    if (dto.commissionPercent !== undefined) data.commissionPercent = Number(dto.commissionPercent);
    if (dto.driverMonthlyFee !== undefined) data.driverMonthlyFee = Number(dto.driverMonthlyFee);
    if (dto.driverTrialDays !== undefined) data.driverTrialDays = Number(dto.driverTrialDays);
    if (dto.minWithdrawalAmount !== undefined) data.minWithdrawalAmount = Number(dto.minWithdrawalAmount);
    const res = await this.db.systemPolicyConfig.upsert({
      where: { key: 'GLOBAL_POLICY' },
      create: { key: 'GLOBAL_POLICY', ...DEFAULT_POLICY, ...data },
      update: data,
    });
    this.policyCache = {
      commissionPercent: Number(res.commissionPercent),
      driverMonthlyFee: Number(res.driverMonthlyFee),
      driverTrialDays: res.driverTrialDays,
      minWithdrawalAmount: Number(res.minWithdrawalAmount),
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

/** The legacy per-km columns are NOT NULL in the database; they are written as 0 and never read. */
function legacyZeroPrices() {
  return { baseFare: 0, baseKm: 0, perKmRate: 0, driverSharePercent: 0, platformFeePercent: 0, surgeMultiplier: 1 };
}
