import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StartTripUseCase } from '../src/application/trips/start-trip.use-case';
import { AcceptBidUseCase } from '../src/application/marketplace/accept-bid.use-case';
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
  RequirementAggregate,
} from '@adhocx/domain-core';

describe('Application Layer - Use Cases (Hexagonal Architecture)', () => {
  let startTripUseCase: StartTripUseCase;
  let acceptBidUseCase: AcceptBidUseCase;

  const mockTripRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockRequirementRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockDb = {
    bid: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
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
        AcceptBidUseCase,
        { provide: PrismaTripRepository, useValue: mockTripRepo },
        { provide: PrismaRequirementRepository, useValue: mockRequirementRepo },
        { provide: DatabaseService, useValue: mockDb },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    startTripUseCase = module.get<StartTripUseCase>(StartTripUseCase);
    acceptBidUseCase = module.get<AcceptBidUseCase>(AcceptBidUseCase);
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
          driverId: 'drv-different',
          otp: '1234',
          driverLatitude: 17.44,
          driverLongitude: 78.38,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully execute start trip and persist state', async () => {
      const stop = TripStop.create('stop-1', {
        sequence: 1,
        stopType: StopType.PICKUP,
        location: GeoPoint.create(17.44, 78.38).getValue(),
        passengerEmployeeId: 'p-1',
        plannedEta: new Date(),
        boardingOtp: OtpCode.create('4829').getValue(),
        dwellBuffer: DwellBuffer.create(300).getValue(),
        status: StopStatus.ARRIVED,
      }).getValue();

      const mockTrip = TripAggregate.reconstitute('trip-valid', {
        tenantId: 'vendor-1',
        routeId: 'req-1',
        driverId: 'drv-1',
        status: TripLifecycleStatus.DRIVER_ARRIVED,
        stops: [stop],
        totalDistanceMeters: 0,
      });
      mockTripRepo.findById.mockResolvedValue(mockTrip);

      const result = await startTripUseCase.execute({
        tripId: 'trip-valid',
        driverId: 'drv-1',
        otp: '4829',
        driverLatitude: 17.44,
        driverLongitude: 78.38,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(TripLifecycleStatus.IN_PROGRESS);
      expect(mockTripRepo.save).toHaveBeenCalledWith(mockTrip);
      expect(mockNotifications.emitEvent).toHaveBeenCalled();
    });
  });

  describe('AcceptBidUseCase', () => {
    it('should throw NotFoundException if requirement does not exist', async () => {
      mockRequirementRepo.findById.mockResolvedValue(null);

      await expect(
        acceptBidUseCase.execute({
          requirementId: 'non-existent',
          bidId: 'bid-1',
          requesterId: 'vendor-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if non-owner attempts to accept bid', async () => {
      const mockReq = RequirementAggregate.reconstitute('req-1', {
        requesterId: 'vendor-actual-owner',
        pickupLocation: GeoPoint.create(17.44, 78.38).getValue(),
        dropLocation: GeoPoint.create(17.41, 78.40).getValue(),
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'BIDDING',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 10000,
        status: 'OPEN_FOR_BIDDING',
        createdAt: new Date(),
      });
      mockRequirementRepo.findById.mockResolvedValue(mockReq);

      await expect(
        acceptBidUseCase.execute({
          requirementId: 'req-1',
          bidId: 'bid-1',
          requesterId: 'vendor-imposter',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should atomically accept bid, reject competitors, and update requirement', async () => {
      const mockReq = RequirementAggregate.reconstitute('req-ok', {
        requesterId: 'vendor-1',
        pickupLocation: GeoPoint.create(17.44, 78.38).getValue(),
        dropLocation: GeoPoint.create(17.41, 78.40).getValue(),
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'BIDDING',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 10000,
        status: 'OPEN_FOR_BIDDING',
        createdAt: new Date(),
      });
      mockRequirementRepo.findById.mockResolvedValue(mockReq);

      mockDb.bid.findUnique.mockResolvedValue({
        id: 'bid-win',
        requirementId: 'req-ok',
        driverId: 'drv-winner',
        bidAmount: 850.0,
        status: 'PENDING',
      });

      const result = await acceptBidUseCase.execute({
        requirementId: 'req-ok',
        bidId: 'bid-win',
        requesterId: 'vendor-1',
      });

      expect(result.success).toBe(true);
      expect(mockDb.bid.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bid-win' },
          data: { status: 'ACCEPTED' },
        }),
      );
      expect(mockDb.bid.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requirementId: 'req-ok',
            id: { not: 'bid-win' },
            status: 'PENDING',
          },
          data: { status: 'REJECTED' },
        }),
      );
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'driver:drv-winner',
        'BID_WON',
        expect.objectContaining({ fare: 850.0 }),
      );
    });
  });
});
