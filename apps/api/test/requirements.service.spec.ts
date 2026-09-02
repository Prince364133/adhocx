import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RequirementsService } from '../src/modules/requirements/requirements.service';

import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  RequirementStatus,
  VerificationStatus,
  VehicleType,
  OfferStatus,
  InvalidStateTransitionError,
} from '@adhocx/contracts';

describe('RequirementsService Unit Tests', () => {
  let service: RequirementsService;
  let db: any;
  let dispatchService: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      vendor: {
        findUnique: jest.fn(),
      },
      requirement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      offer: {
        updateMany: jest.fn(),
      },
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 2 }),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPush: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
  });

  it('should reject requirement creation if vendor is not VERIFIED', async () => {
    db.vendor.findUnique.mockResolvedValue({
      id: 'vnd-1',
      userId: 'usr-vnd-1',
      verificationStatus: VerificationStatus.PENDING,
    });

    await expect(
      service.createRequirement('usr-vnd-1', {
        vehicleType: VehicleType.SEDAN,
        quantity: 3,
        pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place' },
        dropLocation: { latitude: 28.5355, longitude: 77.3910, address: 'Noida Sector 62' },
        reportingTime: new Date(Date.now() + 3600000).toISOString(),
        ratePerVehicle: 1500,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create requirement, compute totalAmount, and trigger auto-dispatch for VERIFIED vendor', async () => {
    db.vendor.findUnique.mockResolvedValue({
      id: 'vnd-1',
      userId: 'usr-vnd-1',
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const now = new Date();
    db.requirement.create.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 2,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'Connaught Place',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida Sector 62',
      reportingTime: now,
      ratePerVehicle: 1500,
      totalAmount: 3000,
      status: RequirementStatus.POSTED,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createRequirement('usr-vnd-1', {
      vehicleType: VehicleType.SEDAN,
      quantity: 2,
      pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place' },
      dropLocation: { latitude: 28.5355, longitude: 77.3910, address: 'Noida Sector 62' },
      reportingTime: now.toISOString(),
      ratePerVehicle: 1500,
    });

    expect(result.id).toBe('req-1');
    expect(result.totalAmount).toBe(3000);
    expect(result.status).toBe(RequirementStatus.POSTED);
    expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('req-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REQUIREMENT_CREATED' }),
    );
  });

  it('should return requirement details with remaining quantity and offers count', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 5,
      assignedQuantity: 2,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1200,
      totalAmount: 6000,
      status: RequirementStatus.PARTIALLY_FULFILLED,
      createdAt: now,
      updatedAt: now,
      offers: [{ id: 'off-1' }, { id: 'off-2' }, { id: 'off-3' }],
      assignments: [
        {
          id: 'asg-1',
          driverId: 'drv-1',
          driver: { fullName: 'Driver One', phone: '+919876543210', vehiclePlate: 'DL01A1234' },
          trip: { status: 'ASSIGNED' },
        },
      ],
    });

    const result = await service.getRequirementDetails('req-1', 'usr-vnd-1');
    expect(result.remainingQuantity).toBe(3);
    expect(result.offersCount).toBe(3);
    expect(result.assignedDrivers).toHaveLength(1);
    expect(result.assignedDrivers![0].driverName).toBe('Driver One');
  });

  it('should cancel requirement and invalidate pending SENT offers', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      status: RequirementStatus.POSTED,
      offers: [{ id: 'off-1', driverId: 'drv-1', status: OfferStatus.SENT }],
    });

    db.requirement.update.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1000,
      totalAmount: 1000,
      status: RequirementStatus.CANCELLED,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.cancelRequirement('req-1', 'usr-vnd-1', {
      reason: 'Client cancelled event',
    });

    expect(result.status).toBe(RequirementStatus.CANCELLED);
    expect(db.offer.updateMany).toHaveBeenCalledWith({
      where: { requirementId: 'req-1', status: OfferStatus.SENT },
      data: { status: OfferStatus.CANCELLED },
    });
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'OFFER_CANCELLED',
      expect.anything(),
    );
  });

  it('should reject cancellation if requirement is already COMPLETED', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      status: RequirementStatus.COMPLETED,
      offers: [],
    });

    await expect(
      service.cancelRequirement('req-1', 'usr-vnd-1', { reason: 'Late cancel' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
