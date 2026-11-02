import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ITripRepository, TripAggregate, TripLifecycleStatus } from '@adhocx/domain-core';
import { PrismaTripMapper } from '../mappers/prisma-trip.mapper';

@Injectable()
export class PrismaTripRepository implements ITripRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(tripId: string): Promise<TripAggregate | null> {
    const raw = await this.db.trip.findUnique({
      where: { id: tripId },
      include: { events: true },
    });
    return raw ? PrismaTripMapper.toDomain(raw) : null;
  }

  async findByRouteId(routeId: string): Promise<TripAggregate | null> {
    const raw = await this.db.trip.findFirst({
      where: { requirementId: routeId },
      include: { events: true },
    });
    return raw ? PrismaTripMapper.toDomain(raw) : null;
  }

  async findActiveByDriverId(driverId: string): Promise<TripAggregate | null> {
    const raw = await this.db.trip.findFirst({
      where: {
        driverId,
        status: { in: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      include: { events: true },
    });
    return raw ? PrismaTripMapper.toDomain(raw) : null;
  }

  async findByTenantId(tenantId: string, status?: TripLifecycleStatus[]): Promise<TripAggregate[]> {
    const where: any = { vendorId: tenantId };
    if (status && status.length > 0) {
      where.status = { in: status };
    }
    const raws = await this.db.trip.findMany({ where, include: { events: true } });
    return raws.map((r) => PrismaTripMapper.toDomain(r));
  }

  async save(trip: TripAggregate): Promise<void> {
    const data = PrismaTripMapper.toPersistence(trip);
    await this.db.trip.update({
      where: { id: trip.id },
      data: {
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      },
    });
  }

  async delete(tripId: string): Promise<void> {
    await this.db.trip.delete({ where: { id: tripId } });
  }
}
