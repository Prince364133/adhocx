import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ITripRepository, IDriverRepository, Money } from '@adhocx/domain-core';
import { AuditService } from '../../modules/audit/audit.service';

export interface CompleteTripCommand {
  tripId: string;
  driverUserId: string;
  totalDistanceMeters: number;
  tollAmountPaise?: number;
}

export interface CompleteTripResult {
  tripId: string;
  status: string;
  totalDistanceMeters: number;
  actualEndTime: Date;
}

@Injectable()
export class CompleteTripUseCase {
  constructor(
    @Inject('ITripRepository') private readonly tripRepo: ITripRepository,
    @Inject('IDriverRepository') private readonly driverRepo: IDriverRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: CompleteTripCommand): Promise<CompleteTripResult> {
    const trip = await this.tripRepo.findById(command.tripId);
    if (!trip) {
      throw new NotFoundException(`Trip '${command.tripId}' not found`);
    }

    const driver = await this.driverRepo.findByUserId(command.driverUserId);
    if (!driver || trip.driverId !== driver.id) {
      throw new BadRequestException('Authenticated driver is not assigned to this trip');
    }

    const tollMoney = command.tollAmountPaise ? Money.create(command.tollAmountPaise).getValue() : undefined;
    const now = new Date();

    const completeResult = trip.completeTrip(command.totalDistanceMeters, tollMoney, now);
    if (completeResult.isFailure) {
      throw new BadRequestException(completeResult.error);
    }

    // Persist trip state
    await this.tripRepo.save(trip);

    // Release driver back to ONLINE
    driver.releaseTrip();
    await this.driverRepo.save(driver);

    // Audit logging
    await this.audit.log({
      userId: command.driverUserId,
      action: 'TRIP_COMPLETED_USE_CASE',
      entityType: 'TRIP',
      entityId: trip.id,
      metadata: {
        totalDistanceMeters: command.totalDistanceMeters,
        tollAmountPaise: command.tollAmountPaise,
        completedAt: now.toISOString(),
      },
    });

    return {
      tripId: trip.id,
      status: trip.status,
      totalDistanceMeters: trip.totalDistanceMeters,
      actualEndTime: now,
    };
  }
}

