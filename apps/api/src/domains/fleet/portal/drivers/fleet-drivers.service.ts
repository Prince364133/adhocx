import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FleetDriverDetailDto,
  FleetDriverSummaryDto,
  FleetPortalDriverQueryDto,
  ReassignFleetVehicleDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetDriversService {
  constructor(private readonly db: DatabaseService) {}

  async listDrivers(
    fleetId: string,
    query: FleetPortalDriverQueryDto,
  ): Promise<{ items: FleetDriverSummaryDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { fleetId };
    if (query.status && query.status !== 'ALL') {
      where.availabilityStatus = query.status;
    }
    if (query.vehiclePlate) {
      where.vehiclePlate = { contains: query.vehiclePlate.trim(), mode: 'insensitive' };
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { vehiclePlate: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [drivers, total] = await Promise.all([
      this.db.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trips: {
            where: {
              ...(query.from || query.to
                ? {
                    createdAt: {
                      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
                      ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
                    },
                  }
                : {}),
            },
            select: { status: true, totalDriverEarnings: true, driverRate: true },
          },
        },
      }),
      this.db.driver.count({ where }),
    ]);

    const items: FleetDriverSummaryDto[] = drivers.map((d) => {
      const tripsInPeriod = d.trips.length;
      const earningsInPeriod = d.trips
        .filter((t) => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0), 0);

      return {
        id: d.id,
        fullName: d.fullName,
        phone: d.phone || '',
        verificationStatus: d.verificationStatus,
        availabilityStatus: d.availabilityStatus,
        vehiclePlate: d.vehiclePlate || undefined,
        vehicleType: d.vehicleType || undefined,
        vehicleModel: d.vehicleModel || undefined,
        tripsInPeriod,
        earningsInPeriod,
      };
    });

    return { items, total, page, limit };
  }

  async getDriverDetail(fleetId: string, driverId: string): Promise<FleetDriverDetailDto> {
    const driver = await this.db.driver.findFirst({
      where: { id: driverId, fleetId },
      include: {
        user: { select: { email: true } },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            pickupAddress: true,
            dropAddress: true,
            totalDriverEarnings: true,
            driverRate: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
        },
        settlements: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException({
        errorCode: 'FLEET_DRIVER_NOT_FOUND',
        message: 'Driver does not exist in your fleet.',
      });
    }

    const monthlyMap = new Map<string, { trips: number; earnings: number }>();
    for (const t of driver.trips) {
      const month = t.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(month) || { trips: 0, earnings: 0 };
      entry.trips++;
      if (t.status === 'COMPLETED') {
        entry.earnings += Number(t.totalDriverEarnings ?? t.driverRate ?? 0);
      }
      monthlyMap.set(month, entry);
    }

    const completedEarnings = driver.trips
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0), 0);

    return {
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone || '',
      email: driver.user?.email || undefined,
      verificationStatus: driver.verificationStatus,
      availabilityStatus: driver.availabilityStatus,
      vehiclePlate: driver.vehiclePlate || undefined,
      vehicleType: driver.vehicleType || undefined,
      vehicleModel: driver.vehicleModel || undefined,
      fleetAssignedAt: driver.fleetAssignedAt?.toISOString(),
      tripsInPeriod: driver.trips.length,
      earningsInPeriod: completedEarnings,
      trips: driver.trips.map((t) => ({
        id: t.id,
        status: t.status,
        pickupAddress: t.pickupAddress,
        dropAddress: t.dropAddress,
        earnings: t.status === 'COMPLETED' ? Number(t.totalDriverEarnings ?? t.driverRate ?? 0) : undefined,
        startedAt: t.startedAt?.toISOString(),
        completedAt: t.completedAt?.toISOString(),
      })),
      monthlyActivity: Array.from(monthlyMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, v]) => ({ month, ...v })),
      payouts: driver.settlements.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async reassignVehicle(
    ctx: FleetRequestContext,
    driverId: string,
    dto: ReassignFleetVehicleDto,
  ) {
    const driver = await this.db.driver.findFirst({
      where: { id: driverId, fleetId: ctx.fleetId },
    });
    if (!driver) {
      throw new NotFoundException({
        errorCode: 'FLEET_DRIVER_NOT_FOUND',
        message: 'Driver does not exist in your fleet.',
      });
    }

    const normalizedPlate = dto.vehiclePlate.trim().toUpperCase();
    const conflict = await this.db.driver.findFirst({
      where: {
        fleetId: ctx.fleetId,
        id: { not: driverId },
        vehiclePlate: { equals: normalizedPlate, mode: 'insensitive' },
      },
      select: { id: true, fullName: true },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: 'VEHICLE_ALREADY_ASSIGNED',
        message: `Vehicle ${normalizedPlate} is already assigned to ${conflict.fullName}. Each vehicle can only be assigned to one driver.`,
      });
    }

    return this.db.driver.update({
      where: { id: driverId },
      data: {
        vehiclePlate: normalizedPlate,
        ...(dto.vehicleType ? { vehicleType: dto.vehicleType.trim().toUpperCase() } : {}),
        ...(dto.vehicleModel ? { vehicleModel: dto.vehicleModel.trim() } : {}),
      },
      select: {
        id: true,
        fullName: true,
        vehiclePlate: true,
        vehicleType: true,
        vehicleModel: true,
      },
    });
  }

  async removeDriver(ctx: FleetRequestContext, driverId: string, notes?: string) {
    const driver = await this.db.driver.findFirst({
      where: { id: driverId, fleetId: ctx.fleetId },
    });
    if (!driver) {
      throw new NotFoundException({
        errorCode: 'FLEET_DRIVER_NOT_FOUND',
        message: 'Driver does not exist in your fleet.',
      });
    }

    await this.db.$transaction([
      this.db.driver.update({
        where: { id: driverId },
        data: { fleetId: null, fleetAssignedAt: null },
      }),
      this.db.fleetDriverHistory.create({
        data: {
          fleetId: ctx.fleetId,
          driverId,
          action: 'REMOVED',
          fromFleetId: ctx.fleetId,
          performedByAdminId: ctx.userId,
          notes: notes || `Removed from fleet by ${ctx.fullName}`,
        },
      }),
    ]);

    return { removed: true, driverId };
  }
}
