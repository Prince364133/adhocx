import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StartTripUseCase } from '../src/application/trips/start-trip.use-case';
import { PrismaTripRepository } from '../src/infrastructure/repositories/prisma-trip.repository';
import { PrismaRequirementRepository } from '../src/infrastructure/repositories/prisma-requirement.repository';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  TripAggregate,
  TripLifecycleStatus,
  TripStop,
  StopStatus,
  StopType,
  GeoPoint,
  OtpCode,
  DwellBuffer,
} from '@adhocx/domain-core';

describe('Application Layer - Use Cases (Hexagonal Architecture)', () => {
  let startTripUseCase: StartTripUseCase;

  const mockTripRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockRequirementRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockDb = {
    requirement: {
      update: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => callback(mockDb)),
  };

  const mockNotifications = {
    emitEvent: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartTripUseCase,
        { provide: PrismaTripRepository, useValue: mockTripRepo },
        { provide: PrismaRequirementRepository, useValue: mockRequirementRepo },
        { provide: DatabaseService, useValue: mockDb },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    startTripUseCase = module.get<StartTripUseCase>(StartTripUseCase);
  });

  describe('StartTripUseCase', () => {
    it('should throw NotFoundException if trip is not found', async () => {
      mockTripRepo.findById.mockResolvedValue(null);

      await expect(
        startTripUseCase.execute({
          tripId: 'non-existent',
          driverId: 'drv-1',
          otp: '1234',
          driverLatitude: 17.44,
          driverLongitude: 78.38,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if authenticated driver does not match assigned driver', async () => {
      const mockTrip = TripAggregate.reconstitute('trip-1', {
        tenantId: 'vendor-1',
        routeId: 'req-1',
        driverId: 'drv-assigned',
        status: TripLifecycleStatus.DRIVER_ARRIVED,
        stops: [],
        totalDistanceMeters: 0,
      });
      mockTripRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        startTripUseCase.execute({
          tripId: 'trip-1',
          driverId: 'drv-imposter',
          otp: '1234',
          driverLatitude: 17.44,
          driverLongitude: 78.38,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully start trip when OTP and geofence are valid', async () => {
      const pickupCoord = GeoPoint.create(17.4474, 78.3762).getValue();
      const dropCoord = GeoPoint.create(17.4123, 78.4089).getValue();
      const otp = OtpCode.create('4829').getValue();
      const dwell = DwellBuffer.create(300).getValue();

      const pickupStop = TripStop.create('stop-1', {
        sequence: 1,
        stopType: StopType.PICKUP,
        passengerEmployeeId: 'emp-1',
        location: pickupCoord,
        plannedEta: new Date(),
        boardingOtp: otp,
        dwellBuffer: dwell,
        status: StopStatus.ARRIVED,
      }).getValue();

      const dropStop = TripStop.create('stop-2', {
        sequence: 2,
        stopType: StopType.DROPOFF,
        passengerEmployeeId: 'emp-1',
        location: dropCoord,
        plannedEta: new Date(),
        boardingOtp: otp,
        dwellBuffer: dwell,
        status: StopStatus.PENDING,
      }).getValue();

      const mockTrip = TripAggregate.reconstitute('trip-valid', {
        tenantId: 'vendor-1',
        routeId: 'req-1',
        driverId: 'drv-1',
        status: TripLifecycleStatus.DRIVER_ARRIVED,
        stops: [pickupStop, dropStop],
        totalDistanceMeters: 5000,
      });
      mockTripRepo.findById.mockResolvedValue(mockTrip);

      const result = await startTripUseCase.execute({
        tripId: 'trip-valid',
        driverId: 'drv-1',
        otp: '4829',
        driverLatitude: 17.4474,
        driverLongitude: 78.3762,
      });

      expect(result.success).toBe(true);
      expect(result.tripId).toBe('trip-valid');
      expect(mockTripRepo.save).toHaveBeenCalledWith(mockTrip);
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'user:vendor-1',
        'TRIP_STARTED',
        expect.any(Object),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TRIP_STARTED' }),
      );
    });
  });
});
