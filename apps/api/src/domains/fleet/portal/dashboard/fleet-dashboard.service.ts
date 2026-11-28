import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FleetDashboardQueryDto,
  FleetDashboardResponseDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';

@Injectable()
export class FleetDashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboard(
    fleetId: string,
    query: FleetDashboardQueryDto,
  ): Promise<FleetDashboardResponseDto> {
    const fleet = await this.db.fleet.findUnique({
      where: { id: fleetId },
      select: { id: true, name: true, code: true, codeStatus: true },
    });
    if (!fleet) {
      throw new NotFoundException({
        errorCode: 'FLEET_NOT_FOUND',
        message: 'Fleet record not found.',
      });
    }

    const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
    const start = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const drivers = await this.db.driver.findMany({
      where: { fleetId },
      select: { id: true, availabilityStatus: true },
    });
    const driverIds = drivers.map((d) => d.id);

    const trips = driverIds.length
      ? await this.db.trip.findMany({
          where: {
            driverId: { in: driverIds },
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            status: true,
            totalDriverEarnings: true,
            driverRate: true,
            createdAt: true,
          },
        })
      : [];

    const activeDrivers = drivers.filter((d) => d.availabilityStatus === 'AVAILABLE').length;
    const driversOnTrip = drivers.filter((d) => d.availabilityStatus === 'BUSY').length;

    const statusCounts = new Map<string, number>();
    for (const d of drivers) {
      statusCounts.set(
        d.availabilityStatus,
        (statusCounts.get(d.availabilityStatus) || 0) + 1,
      );
    }

    const dayBuckets = new Map<string, { trips: number; completed: number; cancelled: number }>();
    let tripsToday = 0;
    let completedTrips = 0;
    let cancelledTrips = 0;
    let periodEarnings = 0;

    for (const t of trips) {
      if (t.createdAt >= todayStart) tripsToday++;
      if (t.status === 'COMPLETED') {
        completedTrips++;
        periodEarnings += Number(t.totalDriverEarnings ?? t.driverRate ?? 0);
      } else if (t.status === 'CANCELLED') {
        cancelledTrips++;
      }

      const dayKey = t.createdAt.toISOString().slice(0, 10);
      const bucket = dayBuckets.get(dayKey) || { trips: 0, completed: 0, cancelled: 0 };
      bucket.trips++;
      if (t.status === 'COMPLETED') bucket.completed++;
      if (t.status === 'CANCELLED') bucket.cancelled++;
      dayBuckets.set(dayKey, bucket);
    }

    const activitySeries = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    const notifications = await this.db.fleetNotification.findMany({
      where: { fleetId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      fleetId: fleet.id,
      fleetName: fleet.name,
      fleetCode: fleet.code,
      codeStatus: fleet.codeStatus,
      kpis: {
        totalDrivers: drivers.length,
        activeDrivers,
        driversOnTrip,
        tripsToday,
        completedTrips,
        cancelledTrips,
        periodEarnings,
      },
      activitySeries,
      statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      recentActivity: notifications.map((n) => ({
        id: n.id,
        type: n.eventType,
        message: n.message,
        occurredAt: n.createdAt.toISOString(),
        entityId: n.entityId || undefined,
      })),
    };
  }
}
