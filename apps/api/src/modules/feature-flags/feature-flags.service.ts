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
          metadata: {
            android: true,
            web: true,
          },
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
        } else if (!existing.metadata || typeof existing.metadata !== 'object' || (existing.metadata as any).android === undefined) {
          const currentMeta = (existing.metadata && typeof existing.metadata === 'object') ? (existing.metadata as any) : {};
          await this.prisma.featureFlag.update({
            where: { key: flag.key },
            data: {
              metadata: {
                ...currentMeta,
                android: currentMeta.android ?? existing.isEnabled,
                web: currentMeta.web ?? existing.isEnabled,
              },
            },
          });
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
      if (f.metadata && typeof f.metadata === 'object') {
        const meta = f.metadata as any;
        if (typeof meta.android === 'boolean') {
          map[`${f.key}_android`] = meta.android;
        }
        if (typeof meta.web === 'boolean') {
          map[`${f.key}_web`] = meta.web;
        }
      }
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
  async isEnabled(key: string, defaultValue = false, platform?: 'android' | 'web'): Promise<boolean> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { key },
        select: { isEnabled: true, metadata: true },
      });
      if (!flag) return defaultValue;
      if (platform && flag.metadata && typeof flag.metadata === 'object') {
        const meta = flag.metadata as any;
        if (typeof meta[platform] === 'boolean') {
          return meta[platform];
        }
      }
      return flag.isEnabled;
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
   * Toggle feature flag enabled state with optional platform-level targeting ('android' | 'web' | 'all').
   */
  async toggleFlag(key: string, isEnabled: boolean, actorEmail?: string, platform?: string) {
    const flag = await this.getFlagByKey(key);

    const currentMeta = (flag.metadata && typeof flag.metadata === 'object') ? { ...(flag.metadata as any) } : {};
    const nextMeta = { ...currentMeta };
    let nextIsEnabled: boolean;

    if (platform === 'android') {
      nextMeta.android = isEnabled;
      if (nextMeta.web === undefined) nextMeta.web = flag.isEnabled;
      nextIsEnabled = Boolean(nextMeta.android || nextMeta.web);
    } else if (platform === 'web') {
      nextMeta.web = isEnabled;
      if (nextMeta.android === undefined) nextMeta.android = flag.isEnabled;
      nextIsEnabled = Boolean(nextMeta.android || nextMeta.web);
    } else {
      nextMeta.android = isEnabled;
      nextMeta.web = isEnabled;
      nextIsEnabled = isEnabled;
    }

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        isEnabled: nextIsEnabled,
        metadata: nextMeta,
        updatedBy: actorEmail || 'Admin',
      },
    });

    this.logger.log(`Feature flag '${key}' toggled: isEnabled=${nextIsEnabled}, platform=${platform || 'all'} by ${actorEmail || 'Admin'}`);
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
