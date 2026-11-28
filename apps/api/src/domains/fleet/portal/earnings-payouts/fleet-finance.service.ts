import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  FleetEarningsQueryDto,
  FleetEarningsResponseDto,
  FleetPayoutQueryDto,
  FleetPayoutRecordDto,
  FleetPayoutStatus,
  FleetShortfallRecordDto,
  RequestFleetPayoutDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetFinanceService {
  constructor(private readonly db: DatabaseService) {}

  async getEarnings(
    fleetId: string,
    query: FleetEarningsQueryDto,
  ): Promise<FleetEarningsResponseDto> {
    const drivers = await this.db.driver.findMany({
      where: { fleetId },
      select: { id: true, fullName: true },
    });
    const driverIds = drivers.map((d) => d.id);
    const driverNameMap = new Map(drivers.map((d) => [d.id, d.fullName]));

    const dateFilter =
      query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {};

    const trips = driverIds.length
      ? await this.db.trip.findMany({
          where: {
            driverId: { in: driverIds },
            status: 'COMPLETED',
            ...dateFilter,
          },
          select: {
            driverId: true,
            totalDriverEarnings: true,
            driverRate: true,
            createdAt: true,
          },
        })
      : [];

    const monthlyMap = new Map<string, { grossEarnings: number; trips: number }>();
    const driverTotals = new Map<string, { trips: number; earnings: number }>();
    let totalEarnings = 0;

    for (const t of trips) {
      const amt = Number(t.totalDriverEarnings ?? t.driverRate ?? 0);
      totalEarnings += amt;

      const month = t.createdAt.toISOString().slice(0, 7);
      const mEntry = monthlyMap.get(month) || { grossEarnings: 0, trips: 0 };
      mEntry.grossEarnings += amt;
      mEntry.trips++;
      monthlyMap.set(month, mEntry);

      const dEntry = driverTotals.get(t.driverId) || { trips: 0, earnings: 0 };
      dEntry.trips++;
      dEntry.earnings += amt;
      driverTotals.set(t.driverId, dEntry);
    }

    const payoutRequests = await this.db.fleetPayoutRequest.findMany({
      where: {
        fleetId,
        status: { in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'] },
      },
      select: { amount: true },
    });
    const pendingAmount = payoutRequests.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalEarnings,
      netAmount: totalEarnings,
      pendingAmount,
      monthlySummary: Array.from(monthlyMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, v]) => ({ month, ...v })),
      driverBreakdown: Array.from(driverTotals.entries())
        .map(([driverId, v]) => ({
          driverId,
          driverName: driverNameMap.get(driverId) || 'Fleet Driver',
          trips: v.trips,
          earnings: v.earnings,
        }))
        .sort((a, b) => b.earnings - a.earnings),
    };
  }

  async exportEarningsCsv(fleetId: string, query: FleetEarningsQueryDto): Promise<string> {
    const earnings = await this.getEarnings(fleetId, query);
    const header = ['Driver ID', 'Driver Name', 'Completed Trips', 'Earnings (INR)'];
    const rows = earnings.driverBreakdown.map((d) =>
      [
        d.driverId,
        `"${(d.driverName || '').replace(/"/g, '""')}"`,
        String(d.trips),
        d.earnings.toFixed(2),
      ].join(','),
    );
    return [header.join(','), ...rows].join('\n');
  }

  async listPayouts(
    fleetId: string,
    query: FleetPayoutQueryDto,
  ): Promise<{ items: FleetPayoutRecordDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { fleetId };
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const [rows, total] = await Promise.all([
      this.db.fleetPayoutRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.fleetPayoutRequest.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status as FleetPayoutStatus,
        rejectionReason: r.rejectionReason || undefined,
        periodStart: r.periodStart?.toISOString(),
        periodEnd: r.periodEnd?.toISOString(),
        settledAt: r.settledAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async requestPayout(
    ctx: FleetRequestContext,
    dto: RequestFleetPayoutDto,
  ): Promise<FleetPayoutRecordDto> {
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException({
        errorCode: 'INVALID_PAYOUT_AMOUNT',
        message: 'Payout amount must be greater than zero.',
      });
    }

    const refCode = `FPR-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

    const created = await this.db.$transaction(async (tx) => {
      const fleetDrivers = await tx.driver.findMany({
        where: { fleetId: ctx.fleetId },
        select: { id: true },
      });
      const driverIds = fleetDrivers.map((d) => d.id);
      const completedTrips = driverIds.length
        ? await tx.trip.findMany({
            where: { driverId: { in: driverIds }, status: 'COMPLETED' },
            select: { totalDriverEarnings: true, driverRate: true },
          })
        : [];
      const totalEarned = completedTrips.reduce(
        (sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0),
        0,
      );

      const committedPayouts = await tx.fleetPayoutRequest.findMany({
        where: {
          fleetId: ctx.fleetId,
          status: { in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'SETTLED'] },
        },
        select: { amount: true },
      });
      const totalCommitted = committedPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      const eligibleBalance = Math.max(0, totalEarned - totalCommitted);
      if (dto.amount > eligibleBalance) {
        throw new BadRequestException({
          errorCode: 'INSUFFICIENT_FLEET_BALANCE',
          message: `Requested payout (₹${dto.amount}) exceeds eligible fleet balance (₹${eligibleBalance.toFixed(2)}).`,
        });
      }

      return tx.fleetPayoutRequest.create({
        data: {
          fleetId: ctx.fleetId,
          requestedById: ctx.userId,
          referenceCode: refCode,
          amount: dto.amount,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          notes: dto.notes || null,
          status: 'REQUESTED',
        },
      });
    });

    if (this.db.auditLog?.create) {
      await this.db.auditLog
        .create({
          data: {
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'FLEET_PAYOUT_REQUESTED',
            entityName: 'FleetPayoutRequest',
            entityId: created.id,
            payload: {
              fleetId: ctx.fleetId,
              referenceCode: created.referenceCode,
              amount: Number(created.amount),
            },
          },
        })
        .catch(() => null);
    }

    return {
      id: created.id,
      referenceCode: created.referenceCode,
      amount: Number(created.amount),
      currency: created.currency,
      status: created.status as FleetPayoutStatus,
      periodStart: created.periodStart?.toISOString(),
      periodEnd: created.periodEnd?.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listShortfallClaims(fleetId: string): Promise<FleetShortfallRecordDto[]> {
    const records = await this.db.fleetShortfallRecord.findMany({
      where: { fleetId },
      orderBy: { periodEnd: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      minimumTripsRequired: r.minimumTripsRequired,
      actualTripsOffered: r.actualTripsOffered,
      shortfallTrips: r.shortfallTrips,
      compensationAmount: r.compensationAmount != null ? Number(r.compensationAmount) : undefined,
      status: r.status,
      notes: r.notes || undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
