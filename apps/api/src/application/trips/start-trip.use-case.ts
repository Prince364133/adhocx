import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ITripRepository, GeoPoint } from '@adhocx/domain-core';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { AuditService } from '../../modules/audit/audit.service';
import { PrismaTripRepository } from '../../infrastructure/repositories/prisma-trip.repository';

export interface StartTripCommand {
  tripId: string;
  driverId: string;
  otp: string;
  driverLatitude: number;
  driverLongitude: number;
}

@Injectable()
export class StartTripUseCase {
  constructor(
    @Inject(PrismaTripRepository)
    private readonly tripRepository: ITripRepository,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  public async execute(command: StartTripCommand): Promise<{ success: boolean; tripId: string; status: string }> {
    const trip = await this.tripRepository.findById(command.tripId);
    if (!trip) {
      throw new NotFoundException(`Trip ${command.tripId} not found`);
    }

    if (trip.driverId !== command.driverId) {
      throw new BadRequestException('Authenticated driver does not match assigned trip driver');
    }

    const locResult = GeoPoint.create(command.driverLatitude, command.driverLongitude);
    if (locResult.isFailure) {
      throw new BadRequestException(locResult.error);
    }

    const startResult = trip.startTrip(command.otp, locResult.getValue());
    if (startResult.isFailure) {
      throw new BadRequestException(startResult.error);
    }

    await this.tripRepository.save(trip);

    // Audit and notify
    await this.audit.log({
      action: 'TRIP_STARTED',
      entityId: trip.id,
      entityType: 'Trip',
      userId: command.driverId,
      actorRole: 'DRIVER',
    });

    this.notifications.emitEvent(`user:${trip.tenantId}`, 'TRIP_STARTED', {
      tripId: trip.id,
      driverId: command.driverId,
      status: trip.status,
    });

    return {
      success: true,
      tripId: trip.id,
      status: trip.status,
    };
  }
}
