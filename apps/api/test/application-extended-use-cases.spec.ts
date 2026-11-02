import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CompleteTripUseCase } from '../src/application/trips/complete-trip.use-case';
import { DispatchRequirementUseCase } from '../src/application/marketplace/dispatch-requirement.use-case';
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
  DriverAggregate,
} from '@adhocx/domain-core';

describe('Application Layer - Extended Use Cases (CompleteTrip & DispatchRequirement)', () => {
  let completeTripUseCase: CompleteTripUseCase;
  let dispatchRequirementUseCase: DispatchRequirementUseCase;

  const mockTripRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockRequirementRepo = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockDriverRepo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findOnlineDriversInH3Cells: jest.fn(),
    save: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteTripUseCase,
        DispatchRequirementUseCase,
        { provide: 'ITripRepository', useValue: mockTripRepo },
        { provide: 'IRequirementRepository', useValue: mockRequirementRepo },
        { provide: 'IDriverRepository', useValue: mockDriverRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    completeTripUseCase = module.get<CompleteTripUseCase>(CompleteTripUseCase);
    dispatchRequirementUseCase = module.get<DispatchRequirementUseCase>(DispatchRequirementUseCase);
  });

  describe('CompleteTripUseCase', () => {
    it('should throw NotFoundException if trip is not found', async () => {
      mockTripRepo.findById.mockResolvedValue(null);

      await expect(
        completeTripUseCase.execute({
          tripId: 'non-existent',
          driverUserId: 'usr-1',
          totalDistanceMeters: 12500,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if authenticated driver does not match assigned driver', async () => {
      const mockTrip = TripAggregate.reconstitute('trip-c1', {
        tenantId: 'vendor-1',
        routeId: 'req-1',
        driverId: 'drv-actual',
        status: TripLifecycleStatus.IN_PROGRESS,
        stops: [],
        totalDistanceMeters: 0,
      });
      mockTripRepo.findById.mockResolvedValue(mockTrip);

      const mockDriver = DriverAggregate.reconstitute('drv-other', {
        userId: 'usr-other',
        licenseNumber: 'DL1234567890123',
        licenseExpiry: new Date(Date.now() + 10000000),
        verificationStatus: 'VERIFIED',
        dutyStatus: 'BUSY',
        trustScore: 95,
        createdAt: new Date(),
        currentLocation: GeoPoint.create(17.44, 78.38).getValue(),
      });
      mockDriverRepo.findByUserId.mockResolvedValue(mockDriver);

      await expect(
        completeTripUseCase.execute({
          tripId: 'trip-c1',
          driverUserId: 'usr-other',
          totalDistanceMeters: 12500,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully complete trip, transition status to COMPLETED, release driver to ONLINE, and log audit', async () => {
      const stop = TripStop.create('stop-c1', {
        sequence: 1,
        stopType: StopType.PICKUP,
        location: GeoPoint.create(17.44, 78.38).getValue(),
        passengerEmployeeId: 'p-1',
        plannedEta: new Date(),
        boardingOtp: OtpCode.create('4829').getValue(),
        dwellBuffer: DwellBuffer.create(300).getValue(),
        status: StopStatus.BOARDED,
      }).getValue();

      const mockTrip = TripAggregate.reconstitute('trip-c-valid', {
        tenantId: 'vendor-1',
        routeId: 'req-1',
        driverId: 'drv-1',
        status: TripLifecycleStatus.IN_PROGRESS,
        stops: [stop],
        totalDistanceMeters: 0,
      });
      mockTripRepo.findById.mockResolvedValue(mockTrip);

      const mockDriver = DriverAggregate.reconstitute('drv-1', {
        userId: 'usr-driver-1',
        licenseNumber: 'DL1234567890123',
        licenseExpiry: new Date(Date.now() + 10000000),
        verificationStatus: 'VERIFIED',
        dutyStatus: 'BUSY',
        trustScore: 95,
        createdAt: new Date(),
        currentLocation: GeoPoint.create(17.44, 78.38).getValue(),
      });
      mockDriverRepo.findByUserId.mockResolvedValue(mockDriver);

      const result = await completeTripUseCase.execute({
        tripId: 'trip-c-valid',
        driverUserId: 'usr-driver-1',
        totalDistanceMeters: 15400,
        tollAmountPaise: 8000,
      });

      expect(result.status).toBe(TripLifecycleStatus.COMPLETED);
      expect(result.totalDistanceMeters).toBe(15400);
      expect(mockTripRepo.save).toHaveBeenCalledWith(mockTrip);
      expect(mockDriverRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          dutyStatus: 'ONLINE',
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRIP_COMPLETED_USE_CASE',
          entityId: 'trip-c-valid',
        }),
      );
    });
  });

  describe('DispatchRequirementUseCase', () => {
    it('should throw NotFoundException if requirement does not exist', async () => {
      mockRequirementRepo.findById.mockResolvedValue(null);

      await expect(
        dispatchRequirementUseCase.execute({
          requirementId: 'non-existent',
          requestedByUserId: 'usr-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if pricingMode is not DIRECT_DISPATCH', async () => {
      const mockReq = RequirementAggregate.reconstitute('req-invalid-mode', {
        requesterId: 'usr-1',
        pickupLocation: GeoPoint.create(17.44, 78.38).getValue(),
        dropLocation: GeoPoint.create(17.41, 78.40).getValue(),
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'INVALID' as any,
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 10000,
        status: 'DRAFT',
        createdAt: new Date(),
      });
      mockRequirementRepo.findById.mockResolvedValue(mockReq);

      await expect(
        dispatchRequirementUseCase.execute({
          requirementId: 'req-invalid-mode',
          requestedByUserId: 'usr-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark requirement NO_DRIVER_AVAILABLE when 0 online drivers exist in primary and fallback rings', async () => {
      const mockReq = RequirementAggregate.reconstitute('req-no-drv', {
        requesterId: 'usr-1',
        pickupLocation: GeoPoint.create(17.44, 78.38).getValue(),
        dropLocation: GeoPoint.create(17.41, 78.40).getValue(),
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 10000,
        status: 'DRAFT',
        createdAt: new Date(),
      });
      mockRequirementRepo.findById.mockResolvedValue(mockReq);
      mockDriverRepo.findOnlineDriversInH3Cells.mockResolvedValue([]);

      const result = await dispatchRequirementUseCase.execute({
        requirementId: 'req-no-drv',
        requestedByUserId: 'usr-1',
      });

      expect(result.dispatched).toBe(false);
      expect(result.status).toBe('NO_DRIVER_AVAILABLE');
      expect(result.eligibleDriverCount).toBe(0);
      expect(mockRequirementRepo.save).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REQUIREMENT_DISPATCH_NO_DRIVERS',
        }),
      );
    });

    it('should successfully dispatch requirement and return candidate driver IDs when online drivers exist', async () => {
      const mockReq = RequirementAggregate.reconstitute('req-dispatch-ok', {
        requesterId: 'usr-1',
        pickupLocation: GeoPoint.create(17.44, 78.38).getValue(),
        dropLocation: GeoPoint.create(17.41, 78.40).getValue(),
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 10000,
        status: 'DRAFT',
        createdAt: new Date(),
      });
      mockRequirementRepo.findById.mockResolvedValue(mockReq);

      const mockDriver1 = DriverAggregate.reconstitute('drv-avail-1', {
        userId: 'usr-d1',
        licenseNumber: 'DL1234567890123',
        licenseExpiry: new Date(Date.now() + 10000000),
        verificationStatus: 'VERIFIED',
        dutyStatus: 'ONLINE',
        trustScore: 90,
        createdAt: new Date(),
        currentLocation: GeoPoint.create(17.44, 78.38).getValue(),
      });

      const mockDriver2 = DriverAggregate.reconstitute('drv-avail-2', {
        userId: 'usr-d2',
        licenseNumber: 'DL1234567890124',
        licenseExpiry: new Date(Date.now() + 10000000),
        verificationStatus: 'VERIFIED',
        dutyStatus: 'ONLINE',
        trustScore: 88,
        createdAt: new Date(),
        currentLocation: GeoPoint.create(17.45, 78.39).getValue(),
      });

      mockDriverRepo.findOnlineDriversInH3Cells.mockResolvedValue([mockDriver1, mockDriver2]);

      const result = await dispatchRequirementUseCase.execute({
        requirementId: 'req-dispatch-ok',
        requestedByUserId: 'usr-1',
      });

      expect(result.dispatched).toBe(true);
      expect(result.status).toBe('DIRECT_DISPATCH');
      expect(result.eligibleDriverCount).toBe(2);
      expect(result.candidateDriverIds).toEqual(['drv-avail-1', 'drv-avail-2']);
      expect(mockRequirementRepo.save).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REQUIREMENT_DISPATCH_BROADCAST',
        }),
      );
    });
  });
});

