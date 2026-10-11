import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OffersService } from '../src/modules/offers/offers.service';

import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { DriverBehaviorService } from '../src/modules/dispatch/driver-behavior.service';
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
  let behavior: any;

  const now = new Date();
  const futureExpiry = () => new Date(Date.now() + 60000);

  const baseRequirement = {
    id: 'req-1',
    vendorId: 'vnd-1',
    pickupLat: 28.6139,
    pickupLng: 77.209,
    pickupAddress: 'CP',
    dropLat: 28.5355,
    dropLng: 77.391,
    dropAddress: 'Noida',
    reportingTime: now,
    vehicleType: VehicleType.SEDAN,
    quantity: 1,
    assignedQuantity: 0,
    status: RequirementStatus.DISPATCHING,
  };

  const sentOffer = (overrides: Record<string, unknown> = {}) => ({
    id: 'off-1',
    requirementId: 'req-1',
    driverId: 'drv-1',
    vehicleType: VehicleType.SEDAN,
    offeredRate: 1500,
    status: OfferStatus.SENT,
    expiresAt: futureExpiry(),
    distanceKm: 1.8,
    seenAt: now,
    createdAt: now,
    requirement: { ...baseRequirement, vendor: { userId: 'vnd-user-1' } },
    ...overrides,
  });

  /** Transaction double reflecting the real accept sequence. */
  const buildTx = (opts: { offerClaimed?: number; capacity?: number; activeTrips?: number; assignedAfter?: number } = {}) => ({
    offer: {
      updateMany: jest.fn().mockResolvedValue({ count: opts.offerClaimed ?? 1 }),
      findUnique: jest.fn().mockResolvedValue({ ...sentOffer(), status: OfferStatus.ACCEPTED }),
    },
    driver: {
      update: jest.fn().mockResolvedValue({ id: 'drv-1', availabilityStatus: DriverAvailability.BUSY }),
    },
    requirement: {
      updateMany: jest.fn().mockResolvedValue({ count: opts.capacity ?? 1 }),
      findUnique: jest.fn().mockResolvedValue({ ...baseRequirement, assignedQuantity: opts.assignedAfter ?? 1 }),
      update: jest.fn().mockResolvedValue({}),
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
      count: jest.fn().mockResolvedValue(opts.activeTrips ?? 0),
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
  });

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1', fullName: 'Rajesh Driver', phone: '+919876543210' }),
      },
      offer: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      requirement: {
        findUnique: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'vnd-user-1' }),
      },
      $transaction: jest.fn(),
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 1 }),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    behavior = {
      recordOutcome: jest.fn().mockResolvedValue({ counted: true, penalized: false, cooldownApplied: false, reason: 'x' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: DriverBehaviorService, useValue: behavior },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('accepts atomically: claims offer, locks driver, reserves capacity, creates assignment + trip', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());
    const tx = buildTx();
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await service.acceptOffer('off-1', 'usr-drv-1');

    expect(result.status).toBe(OfferStatus.ACCEPTED);
    expect(tx.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'off-1', status: OfferStatus.SENT }) }),
    );
    expect(tx.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availabilityStatus: DriverAvailability.BUSY } }),
    );
    // Never writes a stale absolute assignedQuantity (only status after atomic increment)
    expect(tx.requirement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RequirementStatus.FULFILLED } }),
    );
    expect(db.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { driverId: 'drv-1', status: OfferStatus.SENT, id: { not: 'off-1' } },
        data: { status: OfferStatus.CANCELLED },
      }),
    );
    expect(behavior.recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'ACCEPTED', driverId: 'drv-1', offerId: 'off-1' }),
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

  it('multi-cab accept reports PARTIALLY_FULFILLED from the read-back count', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer({ requirement: { ...baseRequirement, quantity: 3, vendor: {} } }));
    const tx = buildTx({ assignedAfter: 2 });
    tx.requirement.findUnique.mockResolvedValue({ ...baseRequirement, quantity: 3, assignedQuantity: 2 });
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await service.acceptOffer('off-1', 'usr-drv-1');
    expect(tx.requirement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RequirementStatus.PARTIALLY_FULFILLED } }),
    );
  });

  it('rejects acceptance of an expired offer without touching state (reaper owns expiry accounting)', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer({ expiresAt: new Date(Date.now() - 10000) }));

    await expect(service.acceptOffer('off-1', 'usr-drv-1')).rejects.toThrow(ConflictException);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.offer.update).not.toHaveBeenCalled();
  });

  it('rejects when the offer was concurrently expired/declined (conditional claim lost)', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());
    const tx = buildTx({ offerClaimed: 0 });
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(service.acceptOffer('off-1', 'usr-drv-1')).rejects.toThrow('no longer available');
    expect(tx.requirement.updateMany).not.toHaveBeenCalled();
  });

  it('rejects when the driver already holds an active trip (same-driver double accept)', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());
    const tx = buildTx({ activeTrips: 1 });
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(service.acceptOffer('off-1', 'usr-drv-1')).rejects.toThrow('active trip');
    expect(tx.trip.create).not.toHaveBeenCalled();
  });

  it('rejects when requirement capacity is already full', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());
    const tx = buildTx({ capacity: 0 });
    db.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(service.acceptOffer('off-1', 'usr-drv-1')).rejects.toThrow('fully fulfilled');
    expect(tx.assignment.create).not.toHaveBeenCalled();
  });

  it('declines via conditional transition, records behaviour with dispatch-time distance, and redispatches', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());

    const result = await service.declineOffer('off-1', 'usr-drv-1', 'Vehicle under maintenance');

    expect(result.status).toBe(OfferStatus.DECLINED);
    expect(db.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'off-1', status: OfferStatus.SENT } }),
    );
    expect(behavior.recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'DECLINED', distanceKm: 1.8 }),
    );
    expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('req-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'OFFER_DECLINED' }));
  });

  it('decline loses cleanly to a concurrent expiry: no behaviour accounting, no redispatch', async () => {
    db.offer.findUnique.mockResolvedValue(sentOffer());
    db.offer.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.declineOffer('off-1', 'usr-drv-1')).rejects.toThrow(ConflictException);
    expect(behavior.recordOutcome).not.toHaveBeenCalled();
    expect(dispatchService.dispatchRequirement).not.toHaveBeenCalled();
  });

  it('marks an offer seen only once and only for its own driver', async () => {
    db.offer.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(service.markOfferSeen('off-1', 'usr-drv-1')).resolves.toEqual({ seen: true });
    await expect(service.markOfferSeen('off-1', 'usr-drv-1')).resolves.toEqual({ seen: false });
    expect(db.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'off-1', driverId: 'drv-1', seenAt: null } }),
    );
  });
});
