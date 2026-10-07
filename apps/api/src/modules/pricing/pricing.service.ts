import { Injectable, Logger, OnModuleInit, Optional, BadRequestException, NotFoundException } from '@nestjs/common';
import { VehicleType } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';

export interface VehiclePricingTierDto {
  id: string;
  vehicleType: string;
  categoryLabel: string;
  seatingCapacity: string;
  description: string;
  iconKey?: string | null;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  perMinuteRate?: number;
  driverSharePercent: number;
  platformFeePercent: number;
  surgeMultiplier: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface PlatformPolicyConfigDto {
  commissionPercent: number;
  driverMonthlyFee: number;
  driverTrialDays: number;
  minWithdrawalAmount: number;
  updatedAt: string;
}

export const DEFAULT_PRICING_TIERS: Record<VehicleType, Omit<VehiclePricingTierDto, 'id' | 'updatedAt'>> = {
  [VehicleType.SEDAN]: {
    vehicleType: VehicleType.SEDAN,
    categoryLabel: 'Prime Sedan',
    seatingCapacity: '4 + 1 Passengers',
    description: 'Compact & executive 4-seater sedans (Dzire, Aura, Etios, Tigor)',
    baseFare: 800,
    baseKm: 40,
    perKmRate: 14.5,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.SUV]: {
    vehicleType: VehicleType.SUV,
    categoryLabel: 'SUV 7 Seater',
    seatingCapacity: '6 + 1 Passengers',
    description: '6-7 seater commercial SUVs (Innova Crysta, Ertiga, Carens, Marazzo)',
    baseFare: 1400,
    baseKm: 40,
    perKmRate: 19.0,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.TEMPO_TRAVELLER]: {
    vehicleType: VehicleType.TEMPO_TRAVELLER,
    categoryLabel: 'Tempo Mini Coach',
    seatingCapacity: '12 - 16 Passengers',
    description: '12-16 seater minibuses for corporate team transport & pilgrimages',
    baseFare: 3200,
    baseKm: 80,
    perKmRate: 28.0,
    driverSharePercent: 88,
    platformFeePercent: 12,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.BUS]: {
    vehicleType: VehicleType.BUS,
    categoryLabel: 'Commercial Coach Bus',
    seatingCapacity: '24 - 40 Passengers',
    description: '24-40 seater commercial coaches with pushback seating & luggage hold',
    baseFare: 6500,
    baseKm: 100,
    perKmRate: 45.0,
    driverSharePercent: 88,
    platformFeePercent: 12,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.HATCHBACK]: {
    vehicleType: VehicleType.HATCHBACK,
    categoryLabel: 'Compact Hatchback',
    seatingCapacity: '4 + 1 Passengers',
    description: 'Budget city runabout cabs (WagonR, Tiago, Celerio)',
    baseFare: 500,
    baseKm: 20,
    perKmRate: 11.0,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.TATA_ACE]: {
    vehicleType: VehicleType.TATA_ACE,
    categoryLabel: 'Mini Logistics Truck',
    seatingCapacity: 'Driver + 1 Helper',
    description: 'Sub-1 ton intra-city cargo transport (Tata Ace, Mahindra Bolero Maxi)',
    baseFare: 600,
    baseKm: 15,
    perKmRate: 16.0,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    isActive: true,
  },
  [VehicleType.PICKUP_TRUCK]: {
    vehicleType: VehicleType.PICKUP_TRUCK,
    categoryLabel: 'Heavy Commercial Pickup',
    seatingCapacity: 'Driver + 1 Helper',
    description: '1.5-2 ton commercial flatbed & container transport',
    baseFare: 900,
    baseKm: 20,
    perKmRate: 22.0,
    driverSharePercent: 88,
    platformFeePercent: 12,
    surgeMultiplier: 1.0,
    isActive: true,
  },
};

@Injectable()
export class PricingService implements OnModuleInit {
  protected readonly logger = new Logger(PricingService.name);
  private memoryCache: Map<string, VehiclePricingTierDto> = new Map();
  private policyCache: PlatformPolicyConfigDto | null = null;

  constructor(@Optional() private readonly db?: DatabaseService) {}

  async onModuleInit() {
    await this.seedDefaultTiersIfEmpty();
    await this.loadCacheFromDb();
  }

  /**
   * Seed default database pricing tiers and system policy config if not present.
   */
  async seedDefaultTiersIfEmpty(): Promise<void> {
    if (!this.db) return;
    try {
      const existingCount = await this.db.vehiclePricingTier.count();
      if (existingCount === 0) {
        this.logger.log('Database vehicle pricing tiers table is empty. Seeding defaults...');
        for (const [vType, tier] of Object.entries(DEFAULT_PRICING_TIERS)) {
          await this.db.vehiclePricingTier.create({
            data: {
              vehicleType: vType as VehicleType,
              categoryLabel: tier.categoryLabel,
              seatingCapacity: tier.seatingCapacity,
              description: tier.description,
              baseFare: tier.baseFare,
              baseKm: tier.baseKm,
              perKmRate: tier.perKmRate,
              driverSharePercent: tier.driverSharePercent,
              platformFeePercent: tier.platformFeePercent,
              surgeMultiplier: tier.surgeMultiplier,
              isActive: tier.isActive,
            },
          });
        }
        this.logger.log('Seeded 7 authoritative vehicle pricing tiers to PostgreSQL database.');
      }

      // Seed default SystemPolicyConfig if missing
      const policyConfig = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
      if (!policyConfig) {
        await this.db.systemPolicyConfig.create({
          data: {
            key: 'GLOBAL_POLICY',
            commissionPercent: 10.00,
            driverMonthlyFee: 499.00,
            driverTrialDays: 15,
            minWithdrawalAmount: 1000.00,
          },
        });
        this.logger.log('Seeded default Global Platform Policy Config (10% commission, ₹499/mo fee, 15 days trial, ₹1000 min withdrawal).');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed pricing tiers in DB: ${err.message}`);
    }
  }

  private async loadCacheFromDb(): Promise<void> {
    if (!this.db) return;
    try {
      const tiers = await this.db.vehiclePricingTier.findMany();
      for (const t of tiers) {
        this.memoryCache.set(t.vehicleType, {
          id: t.id,
          vehicleType: t.vehicleType,
          categoryLabel: t.categoryLabel,
          seatingCapacity: t.seatingCapacity,
          description: t.description,
          iconKey: t.iconKey,
          baseFare: Number(t.baseFare),
          baseKm: Number(t.baseKm),
          perKmRate: Number(t.perKmRate),
          driverSharePercent: Number(t.driverSharePercent),
          platformFeePercent: Number(t.platformFeePercent),
          surgeMultiplier: Number(t.surgeMultiplier),
          isActive: t.isActive,
          updatedAt: t.updatedAt.toISOString(),
          updatedBy: t.updatedBy,
        });
      }

      const policy = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
      if (policy) {
        this.policyCache = {
          commissionPercent: Number(policy.commissionPercent ?? 10.0),
          driverMonthlyFee: Number(policy.driverMonthlyFee),
          driverTrialDays: policy.driverTrialDays,
          minWithdrawalAmount: Number(policy.minWithdrawalAmount),
          updatedAt: policy.updatedAt.toISOString(),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Failed loading pricing cache from database: ${err.message}`);
    }
  }

  /**
   * Get all vehicle rate cards from PostgreSQL database.
   */
  async getAllPricingTiers(): Promise<VehiclePricingTierDto[]> {
    if (this.db) {
      try {
        const tiers = await this.db.vehiclePricingTier.findMany({
          orderBy: { vehicleType: 'asc' },
        });
        if (tiers.length > 0) {
          return tiers.map((t) => ({
            id: t.id,
            vehicleType: t.vehicleType,
            categoryLabel: t.categoryLabel,
            seatingCapacity: t.seatingCapacity,
            description: t.description,
            iconKey: t.iconKey,
            baseFare: Number(t.baseFare),
            baseKm: Number(t.baseKm),
            perKmRate: Number(t.perKmRate),
            driverSharePercent: Number(t.driverSharePercent),
            platformFeePercent: Number(t.platformFeePercent),
            surgeMultiplier: Number(t.surgeMultiplier),
            isActive: t.isActive,
            updatedAt: t.updatedAt.toISOString(),
            updatedBy: t.updatedBy,
          }));
        }
      } catch (err: any) {
        this.logger.warn(`DB query failed for getAllPricingTiers, falling back to cache: ${err.message}`);
      }
    }

    if (this.memoryCache.size > 0) {
      return Array.from(this.memoryCache.values());
    }

    return Object.values(DEFAULT_PRICING_TIERS).map((d, index) => ({
      ...d,
      id: `fallback-${index}`,
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get single rate card for specific vehicle type from DB.
   */
  async getPricingTier(vehicleType: string): Promise<VehiclePricingTierDto> {
    const slug = vehicleType.trim().toUpperCase();
    if (this.db) {
      try {
        const tier = await this.db.vehiclePricingTier.findUnique({
          where: { vehicleType: slug },
        });
        if (tier) {
          return {
            id: tier.id,
            vehicleType: tier.vehicleType,
            categoryLabel: tier.categoryLabel,
            seatingCapacity: tier.seatingCapacity,
            description: tier.description,
            iconKey: tier.iconKey,
            baseFare: Number(tier.baseFare),
            baseKm: Number(tier.baseKm),
            perKmRate: Number(tier.perKmRate),
            driverSharePercent: Number(tier.driverSharePercent),
            platformFeePercent: Number(tier.platformFeePercent),
            surgeMultiplier: Number(tier.surgeMultiplier),
            isActive: tier.isActive,
            updatedAt: tier.updatedAt.toISOString(),
            updatedBy: tier.updatedBy,
          };
        }
      } catch (err: any) {
        this.logger.warn(`DB query failed for getPricingTier(${slug}): ${err.message}`);
      }
    }

    if (this.memoryCache.has(slug)) {
      return this.memoryCache.get(slug)!;
    }

    const fallback = (DEFAULT_PRICING_TIERS as any)[slug] || DEFAULT_PRICING_TIERS[VehicleType.SEDAN];
    return {
      ...fallback,
      id: `fallback-${slug}`,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a brand new vehicle category & tariff schedule in database (Admin only).
   */
  async createPricingTier(
    dto: {
      vehicleType: string;
      categoryLabel: string;
      seatingCapacity: string;
      description: string;
      iconKey?: string;
      baseFare: number;
      baseKm: number;
      perKmRate: number;
      perMinuteRate?: number;
      driverSharePercent?: number;
      platformFeePercent?: number;
      surgeMultiplier?: number;
    },
    updatedBy = 'ADMIN',
  ): Promise<VehiclePricingTierDto> {
    const slug = dto.vehicleType.trim().toUpperCase().replace(/\s+/g, '_');
    if (!slug) {
      throw new Error('Vehicle category slug cannot be empty');
    }

    if (!this.db) {
      throw new Error('Database service is unavailable');
    }

    const existing = await this.db.vehiclePricingTier.findUnique({
      where: { vehicleType: slug },
    });
    if (existing) {
      throw new Error(`Vehicle category '${slug}' already exists in database`);
    }

    const platformFee = dto.platformFeePercent !== undefined ? Number(dto.platformFeePercent) : 10;
    const driverShare = dto.driverSharePercent !== undefined ? Number(dto.driverSharePercent) : 100 - platformFee;

    const created = await this.db.vehiclePricingTier.create({
      data: {
        vehicleType: slug,
        categoryLabel: dto.categoryLabel,
        seatingCapacity: dto.seatingCapacity,
        description: dto.description,
        iconKey: dto.iconKey || 'car',
        baseFare: Number(dto.baseFare),
        baseKm: Number(dto.baseKm),
        perKmRate: Number(dto.perKmRate),
        driverSharePercent: driverShare,
        platformFeePercent: platformFee,
        surgeMultiplier: Number(dto.surgeMultiplier || 1.0),
        isActive: true,
        updatedBy,
      },
    });

    const tierDto: VehiclePricingTierDto = {
      id: created.id,
      vehicleType: created.vehicleType,
      categoryLabel: created.categoryLabel,
      seatingCapacity: created.seatingCapacity,
      description: created.description,
      iconKey: created.iconKey,
      baseFare: Number(created.baseFare),
      baseKm: Number(created.baseKm),
      perKmRate: Number(created.perKmRate),
      perMinuteRate: Number(dto.perMinuteRate || 0),
      driverSharePercent: Number(created.driverSharePercent),
      platformFeePercent: Number(created.platformFeePercent),
      surgeMultiplier: Number(created.surgeMultiplier),
      isActive: created.isActive,
      updatedAt: created.updatedAt.toISOString(),
      updatedBy: created.updatedBy,
    };

    this.memoryCache.set(slug, tierDto);
    this.logger.log(
      `Created new vehicle category '${slug}' (${tierDto.categoryLabel}) with baseFare=₹${tierDto.baseFare}, perKm=₹${tierDto.perKmRate}`,
    );
    return tierDto;
  }

  /**
   * Delete or deactivate a vehicle category from database (Admin only).
   */
  async deletePricingTier(vehicleType: string): Promise<{ success: boolean; message: string }> {
    const slug = vehicleType.trim().toUpperCase();
    if (!this.db) {
      throw new Error('Database service is unavailable');
    }

    // Check if any active trips or requirements are using this category
    const activeTripsCount = await this.db.trip.count({
      where: {
        vehicleType: slug,
        status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] },
      },
    });
    if (activeTripsCount > 0) {
      throw new BadRequestException(`Cannot delete category '${slug}' because ${activeTripsCount} active trip(s) are using it`);
    }

    const tier = await this.db.vehiclePricingTier.findFirst({
      where: {
        OR: [
          { vehicleType: slug },
          { vehicleType: vehicleType },
          ...(vehicleType.length === 36 ? [{ id: vehicleType }] : []),
        ],
      },
    });
    if (!tier) {
      throw new NotFoundException(`Vehicle category '${vehicleType}' not found`);
    }

    await this.db.vehiclePricingTier.delete({
      where: { id: tier.id },
    });

    this.memoryCache.delete(tier.vehicleType);
    this.memoryCache.delete(slug);
    this.logger.log(`Deleted vehicle category '${tier.vehicleType}' from database and cache`);
    return { success: true, message: `Vehicle category '${tier.vehicleType}' deleted successfully` };
  }

  /**
   * Update rate card & tariff schedule in database (Admin only).
   */
  async updatePricingTier(
    vehicleType: string,
    dto: Partial<VehiclePricingTierDto> & { updatedBy?: string },
  ): Promise<VehiclePricingTierDto> {
    const slug = vehicleType.trim().toUpperCase();
    const platformFee = dto.platformFeePercent !== undefined ? Number(dto.platformFeePercent) : undefined;
    const driverShare =
      dto.driverSharePercent !== undefined
        ? Number(dto.driverSharePercent)
        : platformFee !== undefined
          ? 100 - platformFee
          : undefined;

    let updatedTier: VehiclePricingTierDto;

    if (this.db) {
      const data: any = {
        updatedAt: new Date(),
        updatedBy: dto.updatedBy || 'ADMIN',
      };
      if (dto.categoryLabel !== undefined) data.categoryLabel = dto.categoryLabel;
      if (dto.seatingCapacity !== undefined) data.seatingCapacity = dto.seatingCapacity;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.baseFare !== undefined) data.baseFare = Number(dto.baseFare);
      if (dto.baseKm !== undefined) data.baseKm = Number(dto.baseKm);
      if (dto.perKmRate !== undefined) data.perKmRate = Number(dto.perKmRate);
      if (driverShare !== undefined) data.driverSharePercent = driverShare;
      if (platformFee !== undefined) data.platformFeePercent = platformFee;
      if (dto.surgeMultiplier !== undefined) data.surgeMultiplier = Number(dto.surgeMultiplier);
      if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);

      const dbTier = await this.db.vehiclePricingTier.upsert({
        where: { vehicleType: slug },
        create: {
          vehicleType: slug,
          categoryLabel: dto.categoryLabel || (DEFAULT_PRICING_TIERS as any)[slug]?.categoryLabel || 'Vehicle',
          seatingCapacity: dto.seatingCapacity || (DEFAULT_PRICING_TIERS as any)[slug]?.seatingCapacity || '4 Passengers',
          description: dto.description || (DEFAULT_PRICING_TIERS as any)[slug]?.description || 'Commercial Vehicle',
          iconKey: dto.iconKey || 'car',
          baseFare: data.baseFare ?? (DEFAULT_PRICING_TIERS as any)[slug]?.baseFare ?? 800,
          baseKm: data.baseKm ?? (DEFAULT_PRICING_TIERS as any)[slug]?.baseKm ?? 40,
          perKmRate: data.perKmRate ?? (DEFAULT_PRICING_TIERS as any)[slug]?.perKmRate ?? 14.5,
          driverSharePercent: data.driverSharePercent ?? 90,
          platformFeePercent: data.platformFeePercent ?? 10,
          surgeMultiplier: data.surgeMultiplier ?? 1.0,
          isActive: data.isActive ?? true,
          updatedBy: data.updatedBy,
        },
        update: data,
      });

      updatedTier = {
        id: dbTier.id,
        vehicleType: dbTier.vehicleType,
        categoryLabel: dbTier.categoryLabel,
        seatingCapacity: dbTier.seatingCapacity,
        description: dbTier.description,
        iconKey: dbTier.iconKey,
        baseFare: Number(dbTier.baseFare),
        baseKm: Number(dbTier.baseKm),
        perKmRate: Number(dbTier.perKmRate),
        driverSharePercent: Number(dbTier.driverSharePercent),
        platformFeePercent: Number(dbTier.platformFeePercent),
        surgeMultiplier: Number(dbTier.surgeMultiplier),
        isActive: dbTier.isActive,
        updatedAt: dbTier.updatedAt.toISOString(),
        updatedBy: dbTier.updatedBy,
      };
    } else {
      const existing = await this.getPricingTier(slug);
      updatedTier = {
        ...existing,
        ...dto,
        driverSharePercent: driverShare ?? existing.driverSharePercent,
        platformFeePercent: platformFee ?? existing.platformFeePercent,
        updatedAt: new Date().toISOString(),
      };
    }

    this.memoryCache.set(slug, updatedTier);
    this.logger.log(
      `Pricing tier updated in DB for ${slug}: perKm=₹${updatedTier.perKmRate}, baseFare=₹${updatedTier.baseFare}, driverShare=${updatedTier.driverSharePercent}%`,
    );
    return updatedTier;
  }

  /**
   * Get dynamic platform commission rate (percentage, e.g. 10.0 for 10%).
   */
  async getPlatformCommissionRate(): Promise<number> {
    const policy = await this.getPolicyConfig();
    return policy.commissionPercent ?? 10.0;
  }

  /**
   * Get global platform policy config (monthly subscription fee, trial days, min withdrawal, commission).
   */
  async getPolicyConfig(): Promise<PlatformPolicyConfigDto> {
    if (this.db) {
      try {
        const policy = await this.db.systemPolicyConfig.findUnique({
          where: { key: 'GLOBAL_POLICY' },
        });
        if (policy) {
          this.policyCache = {
            commissionPercent: Number(policy.commissionPercent ?? 10.0),
            driverMonthlyFee: Number(policy.driverMonthlyFee),
            driverTrialDays: policy.driverTrialDays,
            minWithdrawalAmount: Number(policy.minWithdrawalAmount),
            updatedAt: policy.updatedAt.toISOString(),
          };
          return this.policyCache;
        }
      } catch (err: any) {
        this.logger.warn(`Could not query policy config from DB: ${err.message}`);
      }
    }

    return this.policyCache || {
      commissionPercent: 10.0,
      driverMonthlyFee: 499.00,
      driverTrialDays: 15,
      minWithdrawalAmount: 1000.00,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update global platform policy config (Admin only).
   */
  async updatePolicyConfig(dto: {
    commissionPercent?: number;
    driverMonthlyFee?: number;
    driverTrialDays?: number;
    minWithdrawalAmount?: number;
  }): Promise<PlatformPolicyConfigDto> {
    const data: any = { updatedAt: new Date() };
    if (dto.commissionPercent !== undefined) data.commissionPercent = Number(dto.commissionPercent);
    if (dto.driverMonthlyFee !== undefined) data.driverMonthlyFee = Number(dto.driverMonthlyFee);
    if (dto.driverTrialDays !== undefined) data.driverTrialDays = Number(dto.driverTrialDays);
    if (dto.minWithdrawalAmount !== undefined) data.minWithdrawalAmount = Number(dto.minWithdrawalAmount);

    let updated: PlatformPolicyConfigDto;

    if (this.db) {
      const res = await this.db.systemPolicyConfig.upsert({
        where: { key: 'GLOBAL_POLICY' },
        create: {
          key: 'GLOBAL_POLICY',
          commissionPercent: data.commissionPercent ?? 10.00,
          driverMonthlyFee: data.driverMonthlyFee ?? 499.00,
          driverTrialDays: data.driverTrialDays ?? 15,
          minWithdrawalAmount: data.minWithdrawalAmount ?? 1000.00,
        },
        update: data,
      });

      updated = {
        commissionPercent: Number(res.commissionPercent ?? 10.0),
        driverMonthlyFee: Number(res.driverMonthlyFee),
        driverTrialDays: res.driverTrialDays,
        minWithdrawalAmount: Number(res.minWithdrawalAmount),
        updatedAt: res.updatedAt.toISOString(),
      };
    } else {
      const prev = await this.getPolicyConfig();
      updated = {
        ...prev,
        ...dto,
        updatedAt: new Date().toISOString(),
      };
    }

    this.policyCache = updated;
    this.logger.log(
      `Platform policy config updated: commission=${updated.commissionPercent}%, fee=₹${updated.driverMonthlyFee}/mo, trial=${updated.driverTrialDays} days, minWithdrawal=₹${updated.minWithdrawalAmount}`,
    );
    return updated;
  }

  /**
   * Calculate distance between two coordinate pairs using Haversine formula in kilometers.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.max(1, Number(dist.toFixed(2)));
  }

  /**
   * Calculate recommended minimum base fare floor for a route and vehicle class.
   * Single source of truth query from DB.
   */
  calculateMinimumFare(vehicleType: string, distanceKm: number): number {
    const slug = vehicleType.trim().toUpperCase();
    const tier = this.memoryCache.get(slug) || (DEFAULT_PRICING_TIERS as any)[slug] || DEFAULT_PRICING_TIERS[VehicleType.SEDAN];
    const billableKm = Math.max(distanceKm, tier.baseKm);
    const computedFare = (tier.baseFare + (billableKm - tier.baseKm) * tier.perKmRate) * (tier.surgeMultiplier || 1.0);
    return Math.round(computedFare);
  }

  /**
   * Calculate driver rate for a trip.
   */
  calculateDriverRate(vehicleType: string, distanceKm?: number): number {
    const slug = vehicleType.trim().toUpperCase();
    if (distanceKm && distanceKm > 0) {
      return this.calculateMinimumFare(slug, distanceKm);
    }

    const tier = this.memoryCache.get(slug) || (DEFAULT_PRICING_TIERS as any)[slug] || DEFAULT_PRICING_TIERS[VehicleType.SEDAN];
    return tier.baseFare;
  }

  /**
   * Calculate full requirement price for N vehicles over a given distance.
   */
  calculateRequirementTotal(vehicleType: string, distanceKm: number, quantity = 1): {
    ratePerVehicle: number;
    totalAmount: number;
    tier: VehiclePricingTierDto;
  } {
    const slug = vehicleType.trim().toUpperCase();
    const tier = (this.memoryCache.get(slug) || {
      ...((DEFAULT_PRICING_TIERS as any)[slug] || DEFAULT_PRICING_TIERS[VehicleType.SEDAN]),
      id: 'default',
      updatedAt: new Date().toISOString(),
    }) as VehiclePricingTierDto;

    const ratePerVehicle = this.calculateMinimumFare(slug, distanceKm);
    const totalAmount = ratePerVehicle * Math.max(1, quantity);

    return {
      ratePerVehicle,
      totalAmount,
      tier,
    };
  }

  /**
   * Dynamic calculation endpoint helper for quotation & simulation
   */
  calculateTripFare(vehicleType: string, distanceKm: number, durationMinutes = 0, quantity = 1) {
    const slug = vehicleType.trim().toUpperCase();
    const tier = (this.memoryCache.get(slug) || {
      ...((DEFAULT_PRICING_TIERS as any)[slug] || DEFAULT_PRICING_TIERS[VehicleType.SEDAN]),
      id: 'default',
      updatedAt: new Date().toISOString(),
    }) as VehiclePricingTierDto;

    const ratePerVehicle = this.calculateMinimumFare(vehicleType, distanceKm);
    const estimatedTotal = ratePerVehicle * Math.max(1, quantity);
    const platformFee = Math.round((estimatedTotal * (tier.platformFeePercent || 10)) / 100);
    const driverNetPayout = estimatedTotal - platformFee;

    return {
      vehicleType,
      distanceKm,
      durationMinutes,
      quantity,
      ratePerVehicle,
      estimatedTotal,
      platformFee,
      driverNetPayout,
      tier,
    };
  }
}
