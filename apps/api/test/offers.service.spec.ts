import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OffersService } from '../src/modules/offers/offers.service';

import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  OfferStatus,
  RequirementStatus,
  AssignmentStatus,
  TripStatus,
  DriverAvailability,
  VehicleType,
} from '@adhocx/contracts';

describe('OffersService Unit Tests', () => {
  let service: OffersService;
  let db: any;
  let dispatchService: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn(),
      },
      offer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      requirement: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 1 }),
    };

    notifications = {
      emitEvent: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('should accept offer atomically, create assignment, trip, and lock driver availability to BUSY', async () => {
    const now = new Date();
    const futureExpiry = new Date(Date.now() + 60000);

    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-drv-1',
      fullName: 'Rajesh Driver',
      phone: '+919876543210',
    });

    db.offer.findUnique.mockResolvedValue({
      id: 'off-1',
      requirementId: 'req-1',
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      offeredRate: 1500,
      status: OfferStatus.SENT,
      expiresAt: futureExpiry,
      requirement: {
        id: 'req-1',
        vendorId: 'vnd-1',
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'CP',
        dropLat: 28.5355,
        dropLng: 77.3910,
        dropAddress: 'Noida',
        reportingTime: now,
        quantity: 1,
        assignedQuantity: 0,
      },
    });

    // Mock Prisma $transaction
    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        requirement: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'req-1',
            vendorId: 'vnd-1',
            quantity: 1,
            assignedQuantity: 0,
            vehicleType: VehicleType.SEDAN,
            pickupAddress: 'CP',
            dropAddress: 'Noida',
            reportingTime: now,
          }),
          update: jest.fn().mockResolvedValue({ id: 'req-1', assignedQuantity: 1, status: RequirementStatus.FULFILLED }),
        },
        offer: {
          update: jest.fn().mockResolvedValue({
            id: 'off-1',
            requirementId: 'req-1',
            driverId: 'drv-1',
            vehicleType: VehicleType.SEDAN,
            offeredRate: 1500,
            status: OfferStatus.ACCEPTED,
            expiresAt: futureExpiry,
            createdAt: now,
          }),
        },
        assignment: {
          create: jest.fn().mockResolvedValue({
            id: 'asg-1',
            requirementId: 'req-1',
            offerId: 'off-1',
            driverId: 'drv-1',
            status: AssignmentStatus.CONFIRMED,
          }),
        },
        trip: {
          create: jest.fn().mockResolvedValue({
            id: 'trip-1',
            requirementId: 'req-1',
            assignmentId: 'asg-1',
            vendorId: 'vnd-1',
            driverId: 'drv-1',
            status: TripStatus.ASSIGNED,
            otp: '4321',
          }),
        },
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', availabilityStatus: DriverAvailability.BUSY }),
        },
      };

      return callback(tx);
    });

    db.offer.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.acceptOffer('off-1', 'usr-drv-1');

    expect(result.status).toBe(OfferStatus.ACCEPTED);
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { driverId: 'drv-1', status: OfferStatus.SENT, id: { not: 'off-1' } },
        data: { status: OfferStatus.CANCELLED },
      }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'REQUIREMENT_FULFILLMENT_UPDATED',
      expect.objectContaining({ status: RequirementStatus.FULFILLED }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'ASSIGNMENT_CONFIRMED',
      expect.objectContaining({ assignmentId: 'asg-1', tripId: 'trip-1' }),
    );
  });

  it('should reject offer acceptance if offer has expired', async () => {
    const pastExpiry = new Date(Date.now() - 10000);

    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });
    db.offer.findUnique.mockResolvedValue({
      id: 'off-expired',
      driverId: 'drv-1',
      status: OfferStatus.SENT,
      expiresAt: pastExpiry,
      requirement: { vendor: {} },
    });
    db.offer.update.mockResolvedValue({ id: 'off-expired', status: OfferStatus.EXPIRED });

    await expect(service.acceptOffer('off-expired', 'usr-drv-1')).rejects.toThrow(ConflictException);
    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'off-expired' },
        data: { status: OfferStatus.EXPIRED },
      }),
    );
  });

  it('should reject offer acceptance if requirement capacity is already full', async () => {
    const futureExpiry = new Date(Date.now() + 60000);

    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });
    db.offer.findUnique.mockResolvedValue({
      id: 'off-1',
      requirementId: 'req-full',
      driverId: 'drv-1',
      status: OfferStatus.SENT,
      expiresAt: futureExpiry,
      requirement: { vendor: {} },
    });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        requirement: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'req-full',
            quantity: 2,
            assignedQuantity: 2, // Full!
          }),
        },
        offer: {
          update: jest.fn().mockResolvedValue({ id: 'off-1', status: OfferStatus.EXPIRED }),
        },
      };
      return callback(tx);
    });

    await expect(service.acceptOffer('off-1', 'usr-drv-1')).rejects.toThrow(ConflictException);
  });

  it('should decline offer and trigger redispatch wave', async () => {
    const now = new Date();
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });
    db.offer.findUnique.mockResolvedValue({
      id: 'off-1',
      requirementId: 'req-1',
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      offeredRate: 1500,
      status: OfferStatus.SENT,
      expiresAt: new Date(Date.now() + 60000),
      requirement: {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'CP',
        dropLat: 28.5355,
        dropLng: 77.3910,
        dropAddress: 'Noida',
        reportingTime: now,
      },
    });

    db.offer.update.mockResolvedValue({
      id: 'off-1',
      requirementId: 'req-1',
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      offeredRate: 1500,
      status: OfferStatus.DECLINED,
      expiresAt: now,
      createdAt: now,
    });

    const result = await service.declineOffer('off-1', 'usr-drv-1', 'Vehicle under maintenance');

    expect(result.status).toBe(OfferStatus.DECLINED);
    expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('req-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OFFER_DECLINED' }),
    );
  });
});
