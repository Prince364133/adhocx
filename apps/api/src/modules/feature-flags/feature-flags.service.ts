import { Injectable, Logger, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '@adhocx/contracts';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async onModuleInit() {
    await this.seedDefaultFlags();
  }

  /**
   * Ensure standard platform feature flags exist upon service startup.
   */
  async seedDefaultFlags() {
    try {
      const defaultFlags = [
        {
          key: 'vendor_wallet',
          name: 'Vendor Wallet & Payment Access',
          description:
            'Controls visibility of the Wallet/Payments tab, balance top-ups, and payment routes in Vendor mode (Mobile & Web).',
          category: 'PAYMENTS',
          isEnabled: true,
          createdBy: 'System Seed',
        },
      ];

      for (const flag of defaultFlags) {
        const existing = await this.prisma.featureFlag.findUnique({
          where: { key: flag.key },
        });

        if (!existing) {
          await this.prisma.featureFlag.create({
            data: flag,
          });
          this.logger.log(`Initialized default feature flag: ${flag.key} (enabled=${flag.isEnabled})`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to seed default feature flags: ${err?.message || err}`);
    }
  }

  /**
   * Get all feature flags for Admin management.
   */
  async getAllFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get client-facing active feature flags map and list.
   */
  async getActiveFlags() {
    const flags = await this.prisma.featureFlag.findMany();
    const map: Record<string, boolean> = {};
    for (const f of flags) {
      map[f.key] = f.isEnabled;
    }
    return {
      flags: map,
      list: flags,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get single feature flag by key.
   */
  async getFlagByKey(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!flag) {
      throw new NotFoundException(`Feature flag '${key}' not found`);
    }
    return flag;
  }

  /**
   * Check if a specific feature flag is enabled.
   */
  async isEnabled(key: string, defaultValue = false): Promise<boolean> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { key },
        select: { isEnabled: true },
      });
      return flag ? flag.isEnabled : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Create a new feature flag.
   */
  async createFlag(dto: CreateFeatureFlagDto, actorEmail?: string) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`Feature flag with key '${dto.key}' already exists`);
    }

    return this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        category: (dto.category || 'GENERAL').toUpperCase(),
        isEnabled: dto.isEnabled ?? false,
        metadata: dto.metadata as any,
        createdBy: actorEmail || 'Admin',
        updatedBy: actorEmail || 'Admin',
      },
    });
  }

  /**
   * Update feature flag metadata.
   */
  async updateFlag(key: string, dto: UpdateFeatureFlagDto, actorEmail?: string) {
    await this.getFlagByKey(key);

    return this.prisma.featureFlag.update({
      where: { key },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category.toUpperCase() }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as any }),
        updatedBy: actorEmail || 'Admin',
      },
    });
  }

  /**
   * Toggle feature flag enabled state.
   */
  async toggleFlag(key: string, isEnabled: boolean, actorEmail?: string) {
    await this.getFlagByKey(key);

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        isEnabled,
        updatedBy: actorEmail || 'Admin',
      },
    });

    this.logger.log(`Feature flag '${key}' toggled to ${isEnabled} by ${actorEmail || 'Admin'}`);
    return updated;
  }

  /**
   * Delete feature flag.
   */
  async deleteFlag(key: string) {
    await this.getFlagByKey(key);
    return this.prisma.featureFlag.delete({
      where: { key },
    });
  }
}
