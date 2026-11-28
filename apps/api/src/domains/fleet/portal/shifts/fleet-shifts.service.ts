import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateFleetShiftDto,
  FleetShiftDto,
  FleetShiftStatus,
  UpdateFleetShiftDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';

@Injectable()
export class FleetShiftsService {
  constructor(private readonly db: DatabaseService) {}

  private assertEnabled() {
    if (process.env.ENABLE_FLEET_SHIFTS !== 'true') {
      throw new ForbiddenException({
        errorCode: 'SHIFTS_DISABLED',
        message: 'Shift & Ride Management is not enabled for this environment.',
      });
    }
  }

  async listShifts(fleetId: string): Promise<FleetShiftDto[]> {
    this.assertEnabled();
    const shifts = await this.db.fleetShift.findMany({
      where: { fleetId },
      include: { driver: { select: { fullName: true, vehiclePlate: true } } },
      orderBy: { shiftStart: 'asc' },
      take: 100,
    });
    return shifts.map((s) => this.mapToDto(s));
  }

  async createShift(fleetId: string, dto: CreateFleetShiftDto): Promise<FleetShiftDto> {
    this.assertEnabled();
    const start = new Date(dto.shiftStart);
    const end = new Date(dto.shiftEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException({
        errorCode: 'INVALID_SHIFT_WINDOW',
        message: 'Shift start must be before shift end.',
      });
    }

    const driver = await this.db.driver.findFirst({
      where: { id: dto.driverId, fleetId },
      select: { id: true, fullName: true, vehiclePlate: true },
    });
    if (!driver) {
      throw new NotFoundException({
        errorCode: 'FLEET_DRIVER_NOT_FOUND',
        message: 'Driver does not belong to your fleet.',
      });
    }

    const conflict = await this.db.fleetShift.findFirst({
      where: {
        driverId: dto.driverId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        shiftStart: { lt: end },
        shiftEnd: { gt: start },
      },
      select: { id: true, title: true },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: 'SHIFT_CONFLICT',
        message: `${driver.fullName} already has an overlapping shift ("${conflict.title}").`,
      });
    }

    const created = await this.db.fleetShift.create({
      data: {
        fleetId,
        driverId: dto.driverId,
        title: dto.title.trim(),
        shiftStart: start,
        shiftEnd: end,
        notes: dto.notes || null,
        status: 'SCHEDULED',
      },
      include: { driver: { select: { fullName: true, vehiclePlate: true } } },
    });

    if (this.db.fleetNotification?.create) {
      await this.db.fleetNotification
        .create({
          data: {
            fleetId,
            eventType: 'SHIFT_ASSIGNMENT_EVENT',
            title: 'Shift Assigned',
            message: `${driver.fullName} scheduled for shift "${created.title}".`,
            entityType: 'SHIFT',
            entityId: created.id,
            actionUrl: '/shifts',
          },
        })
        .catch(() => null);
    }

    return this.mapToDto(created);
  }

  async updateShift(
    fleetId: string,
    id: string,
    dto: UpdateFleetShiftDto,
  ): Promise<FleetShiftDto> {
    this.assertEnabled();
    const existing = await this.db.fleetShift.findFirst({
      where: { id, fleetId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'SHIFT_NOT_FOUND',
        message: 'Shift record not found in your fleet.',
      });
    }

    const updated = await this.db.fleetShift.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.shiftStart ? { shiftStart: new Date(dto.shiftStart) } : {}),
        ...(dto.shiftEnd ? { shiftEnd: new Date(dto.shiftEnd) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { driver: { select: { fullName: true, vehiclePlate: true } } },
    });

    if (this.db.fleetNotification?.create) {
      await this.db.fleetNotification
        .create({
          data: {
            fleetId,
            eventType: 'SHIFT_ASSIGNMENT_EVENT',
            title: 'Shift Updated',
            message: `Shift "${updated.title}" for ${updated.driver?.fullName || 'driver'} updated (${updated.status}).`,
            entityType: 'SHIFT',
            entityId: updated.id,
            actionUrl: '/shifts',
          },
        })
        .catch(() => null);
    }

    return this.mapToDto(updated);
  }

  private mapToDto(s: any): FleetShiftDto {
    return {
      id: s.id,
      fleetId: s.fleetId,
      driverId: s.driverId,
      driverName: s.driver?.fullName || undefined,
      vehiclePlate: s.driver?.vehiclePlate || undefined,
      title: s.title,
      shiftStart: s.shiftStart.toISOString(),
      shiftEnd: s.shiftEnd.toISOString(),
      status: s.status as FleetShiftStatus,
      notes: s.notes || undefined,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
