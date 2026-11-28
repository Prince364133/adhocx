import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateFleetIncentiveDto,
  FleetIncentiveDto,
  FleetIncentiveEligibility,
  FleetIncentiveProgressDto,
  FleetIncentiveStatus,
  FleetIncentiveType,
  UpdateFleetIncentiveDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetIncentivesService {
  constructor(private readonly db: DatabaseService) {}

  async listIncentives(
    fleetId: string,
    query?: { status?: string; type?: string },
  ): Promise<FleetIncentiveDto[]> {
    const where: any = { fleetId };
    if (query?.status && query.status !== 'ALL') where.status = query.status;
    if (query?.type && query.type !== 'ALL') where.type = query.type;

    const rows = await this.db.fleetIncentive.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDto(r));
  }

  async createIncentive(
    ctx: FleetRequestContext,
    dto: CreateFleetIncentiveDto,
  ): Promise<FleetIncentiveDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      throw new BadRequestException({
        errorCode: 'INVALID_INCENTIVE_DATES',
        message: 'Incentive start date must be earlier than end date.',
      });
    }

    if (dto.type === FleetIncentiveType.TARGET_BASED && (!dto.targetTrips || dto.targetTrips < 1)) {
      throw new BadRequestException({
        errorCode: 'TARGET_TRIPS_REQUIRED',
        message: 'Target-based incentives require targetTrips >= 1.',
      });
    }

    if (
      dto.type === FleetIncentiveType.TIME_BASED &&
      (!dto.requiredDurationMinutes || dto.requiredDurationMinutes < 1)
    ) {
      throw new BadRequestException({
        errorCode: 'DURATION_REQUIRED',
        message: 'Time-based incentives require requiredDurationMinutes >= 1.',
      });
    }

    let eligibleIds: string[] = [];
    if (dto.eligibilityScope === FleetIncentiveEligibility.SELECTED) {
      eligibleIds = Array.from(new Set(dto.eligibleDriverIds || []));
      if (eligibleIds.length === 0) {
        throw new BadRequestException({
          errorCode: 'ELIGIBLE_DRIVERS_REQUIRED',
          message: 'Select at least one fleet driver for SELECTED eligibility scope.',
        });
      }
      const matchedCount = await this.db.driver.count({
        where: { id: { in: eligibleIds }, fleetId: ctx.fleetId },
      });
      if (matchedCount !== eligibleIds.length) {
        throw new BadRequestException({
          errorCode: 'FOREIGN_DRIVER_IN_INCENTIVE',
          message: 'All selected drivers must belong to your fleet.',
        });
      }
    }

    const created = await this.db.fleetIncentive.create({
      data: {
        fleetId: ctx.fleetId,
        name: dto.name.trim(),
        type: dto.type,
        eligibilityScope: dto.eligibilityScope,
        eligibleDriverIds: eligibleIds,
        targetTrips: dto.targetTrips ?? null,
        requiredDurationMinutes: dto.requiredDurationMinutes ?? null,
        timeWindowStart: dto.timeWindowStart ?? null,
        timeWindowEnd: dto.timeWindowEnd ?? null,
        rewardAmount: dto.rewardAmount,
        startsAt,
        endsAt,
        status: 'ACTIVE',
      },
    });

    await this.db.fleetNotification.create({
      data: {
        fleetId: ctx.fleetId,
        eventType: 'INCENTIVE_LIFECYCLE',
        title: 'Driver Incentive Started',
        message: `Incentive "${created.name}" is now ACTIVE.`,
        entityType: 'INCENTIVE',
        entityId: created.id,
        actionUrl: '/incentives',
      },
    });

    return this.mapToDto(created);
  }

  async updateIncentive(
    ctx: FleetRequestContext,
    id: string,
    dto: UpdateFleetIncentiveDto,
  ): Promise<FleetIncentiveDto> {
    const existing = await this.db.fleetIncentive.findFirst({
      where: { id, fleetId: ctx.fleetId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'INCENTIVE_NOT_FOUND',
        message: 'Incentive does not exist in your fleet.',
      });
    }

    const updated = await this.db.fleetIncentive.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.rewardAmount != null ? { rewardAmount: dto.rewardAmount } : {}),
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
      },
    });

    await this.db.fleetNotification.create({
      data: {
        fleetId: ctx.fleetId,
        eventType: 'INCENTIVE_LIFECYCLE',
        title: 'Incentive Updated',
        message: `Incentive "${updated.name}" status is now ${updated.status}.`,
        entityType: 'INCENTIVE',
        entityId: updated.id,
        actionUrl: '/incentives',
      },
    });

    return this.mapToDto(updated);
  }

  async getIncentiveProgress(
    fleetId: string,
    incentiveId: string,
  ): Promise<FleetIncentiveProgressDto[]> {
    const incentive = await this.db.fleetIncentive.findFirst({
      where: { id: incentiveId, fleetId },
    });
    if (!incentive) {
      throw new NotFoundException({
        errorCode: 'INCENTIVE_NOT_FOUND',
        message: 'Incentive does not exist in your fleet.',
      });
    }

    const rows = await this.db.fleetIncentiveProgress.findMany({
      where: { incentiveId, fleetId },
      include: { driver: { select: { fullName: true } } },
      orderBy: [{ qualified: 'desc' }, { completedCount: 'desc' }],
    });

    return rows.map((r) => ({
      incentiveId: r.incentiveId,
      driverId: r.driverId,
      driverName: r.driver?.fullName || 'Fleet Driver',
      completedCount: r.completedCount,
      activeMinutes: r.activeMinutes,
      qualified: r.qualified,
      qualifiedAt: r.qualifiedAt?.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  private mapToDto(r: any): FleetIncentiveDto {
    return {
      id: r.id,
      fleetId: r.fleetId,
      name: r.name,
      type: r.type as FleetIncentiveType,
      eligibilityScope: r.eligibilityScope as FleetIncentiveEligibility,
      eligibleDriverIds: Array.isArray(r.eligibleDriverIds)
        ? (r.eligibleDriverIds as string[])
        : [],
      targetTrips: r.targetTrips ?? undefined,
      requiredDurationMinutes: r.requiredDurationMinutes ?? undefined,
      timeWindowStart: r.timeWindowStart ?? undefined,
      timeWindowEnd: r.timeWindowEnd ?? undefined,
      rewardAmount: Number(r.rewardAmount),
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      status: r.status as FleetIncentiveStatus,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
