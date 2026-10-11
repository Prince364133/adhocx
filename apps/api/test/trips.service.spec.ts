import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TripsService } from '../src/modules/trips/trips.service';
import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  TripStatus,
  RequirementStatus,
  AssignmentStatus,
  DriverAvailability,
  VehicleType,
  UserRole,
  InvalidStateTransitionError,
} from '@adhocx/contracts';

describe('TripsService Unit Tests', () => {
  let service: TripsService;
  let db: any;
  let dispatchService: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      trip: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      requirement: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      assignment: {
        update: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'vnd-user-1' }),
      },
      tripEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      },
      $transaction: jest.fn(),
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 1 }),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendTripOtp: jest.fn().mockResolvedValue(undefined),
      sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  it('should mark trip as ARRIVED, send OTP to vendor, and record event', async () => {
    const now = new Date();
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      status: TripStatus.ASSIGNED,
      otp: '5678',
      driver: { currentLat: 28.6, currentLng: 77.2, fullName: 'Driver Ram', phone: '+919876543210' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });

    db.trip.update.mockResolvedValue({
      id: 'trip-1',
      requirementId: 'req-1',
      assignmentId: 'asg-1',
      vendorId: 'vnd-1',
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      pickupAddress: 'Connaught Place',
      dropAddress: 'Noida',
      reportingTime: now,
      status: TripStatus.ARRIVED,
      otp: '5678',
      driverRate: 1500,
      totalDriverEarnings: 1500,
      createdAt: now,
      updatedAt: now,
      requirement: {
        pickupLat: 28.6,
        pickupLng: 77.2,
        dropLat: 28.5,
        dropLng: 77.3,
        vendor: { phone: '+919999988888', user: {} },
      },
      driver: { fullName: 'Driver Ram', vehiclePlate: 'DL01AB1234' },
    });

    const result = await service.markArrived('trip-1', 'usr-drv-1');

    expect(result.status).toBe(TripStatus.ARRIVED);
    expect(notifications.sendTripOtp).toHaveBeenCalledWith('+919999988888', '5678');
    expect(db.tripEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'DRIVER_ARRIVED' }),
      }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'TRIP_DRIVER_ARRIVED',
      expect.objectContaining({ otp: '5678' }),
    );
  });

  it('should start trip with valid OTP and transition status to IN_PROGRESS', async () => {
    const now = new Date();
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      status: TripStatus.ARRIVED,
      otp: '1234',
      driver: { id: 'drv-1' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });
    db.driver.update.mockResolvedValue({ id: 'drv-1' });

    db.trip.update.mockResolvedValue({
      id: 'trip-1',
      requirementId: 'req-1',
      assignmentId: 'asg-1',
      vendorId: 'vnd-1',
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      pickupAddress: 'Pickup',
      dropAddress: 'Drop',
      reportingTime: now,
      status: TripStatus.IN_PROGRESS,
      startedAt: now,
      driverRate: 1500,
      createdAt: now,
      updatedAt: now,
      requirement: { status: RequirementStatus.FULFILLED },
    });

    const result = await service.startTrip('trip-1', 'usr-drv-1', {
      otp: '1234',
      currentLocation: { latitude: 28.6139, longitude: 77.2090 },
    });

    expect(result.status).toBe(TripStatus.IN_PROGRESS);
    expect(db.tripEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRIP_STARTED' }),
      }),
    );
    expect(db.requirement.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { status: RequirementStatus.IN_PROGRESS },
    });
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'TRIP_STARTED',
      expect.anything(),
    );
  });

  it('should reject starting trip if OTP does not match', async () => {
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      status: TripStatus.ARRIVED,
      otp: '4321',
      driver: { id: 'drv-1' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });

    await expect(
      service.startTrip('trip-1', 'usr-drv-1', {
        otp: '9999',
        currentLocation: { latitude: 28.5, longitude: 77.2 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid transition (e.g. COMPLETED -> ARRIVED)', async () => {
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      status: TripStatus.COMPLETED,
      driver: { id: 'drv-1' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });

    await expect(service.markArrived('trip-1', 'usr-drv-1')).rejects.toThrow(
      InvalidStateTransitionError,
    );
  });

  it('should complete trip, compute total earnings, and release driver to AVAILABLE', async () => {
    const now = new Date();
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      assignmentId: 'asg-1',
      requirementId: 'req-1',
      driverRate: 1500,
      status: TripStatus.IN_PROGRESS,
      driver: { id: 'drv-1' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        trip: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'trip-1',
            requirementId: 'req-1',
            assignmentId: 'asg-1',
            vendorId: 'vnd-1',
            driverId: 'drv-1',
            vehicleType: VehicleType.SEDAN,
            pickupAddress: 'Pickup',
            dropAddress: 'Drop',
            status: TripStatus.COMPLETED,
            completedAt: now,
            driverRate: 1500,
            tollCharges: 100,
            parkingCharges: 50,
            totalDriverEarnings: 1500,
            createdAt: now,
            updatedAt: now,
          }),
          count: jest.fn().mockResolvedValue(0), // All trips completed
        },
        assignment: {
          update: jest.fn().mockResolvedValue({ id: 'asg-1', status: AssignmentStatus.COMPLETED }),
        },
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', availabilityStatus: DriverAvailability.AVAILABLE }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        requirement: {
          update: jest.fn().mockResolvedValue({ id: 'req-1', status: RequirementStatus.COMPLETED }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-1' }),
        },
      };

      return callback(tx);
    });

    const result = await service.completeTrip('trip-1', 'usr-drv-1', {
      tollCharges: 100,
      parkingCharges: 50,
      currentLocation: { latitude: 28.5355, longitude: 77.3910 },
    });

    expect(result.status).toBe(TripStatus.COMPLETED);
    expect(result.totalDriverEarnings).toBe(1500);
    expect(db.tripEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRIP_COMPLETED' }),
      }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'TRIP_COMPLETED',
      expect.objectContaining({ totalEarnings: 1500 }),
    );
  });

  it('should cancel pre-start trip, reopen requirement capacity, and trigger redispatch', async () => {
    const now = new Date();
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      assignmentId: 'asg-1',
      requirementId: 'req-1',
      status: TripStatus.ASSIGNED,
      requirement: { assignedQuantity: 1 },
    });

    let tx: any;
    db.$transaction.mockImplementation(async (callback: any) => {
      tx = {
        trip: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'trip-1',
            requirementId: 'req-1',
            assignmentId: 'asg-1',
            vendorId: 'vnd-1',
            driverId: 'drv-1',
            vehicleType: VehicleType.SEDAN,
            pickupAddress: 'Pickup',
            dropAddress: 'Drop',
            status: TripStatus.CANCELLED,
            driverRate: 1500,
            totalDriverEarnings: 0,
            createdAt: now,
            updatedAt: now,
          }),
        },
        assignment: {
          update: jest.fn().mockResolvedValue({ id: 'asg-1', status: AssignmentStatus.CANCELLED }),
        },
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', availabilityStatus: DriverAvailability.AVAILABLE }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        requirement: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue({ id: 'req-1', assignedQuantity: 0, status: RequirementStatus.FULFILLED }),
          update: jest.fn().mockResolvedValue({ id: 'req-1', assignedQuantity: 0 }),
        },
      };
      return callback(tx);
    });

    const result = await service.cancelTrip('trip-1', 'usr-drv-1', UserRole.DRIVER, {
      reason: 'Flat tyre',
    });

    expect(result.status).toBe(TripStatus.CANCELLED);
    // Atomic decrement, never an absolute stale write; driver penalty is an atomic decrement too
    expect(tx.requirement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assignedQuantity: { decrement: 1 } } }),
    );
    expect(tx.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ trustScore: { decrement: 5.0 } }) }),
    );
    // Replacement wave gets a fresh wave budget
    expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('req-1', true);
    expect(db.tripEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRIP_CANCELLED' }),
      }),
    );
  });

  it('should report passenger no-show when trip is ARRIVED', async () => {
    const now = new Date();
    db.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'drv-1',
      assignmentId: 'asg-1',
      requirementId: 'req-1',
      status: TripStatus.ARRIVED,
      driver: { id: 'drv-1' },
    });
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        trip: {
          update: jest.fn().mockResolvedValue({
            id: 'trip-1',
            requirementId: 'req-1',
            assignmentId: 'asg-1',
            vendorId: 'vnd-1',
            driverId: 'drv-1',
            vehicleType: VehicleType.SEDAN,
            pickupAddress: 'Pickup',
            dropAddress: 'Drop',
            status: TripStatus.NO_SHOW,
            driverRate: 1500,
            totalDriverEarnings: 0,
            createdAt: now,
            updatedAt: now,
          }),
        },
        assignment: {
          update: jest.fn().mockResolvedValue({ id: 'asg-1' }),
        },
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1' }),
        },
      };
      return callback(tx);
    });

    const result = await service.reportNoShow('trip-1', 'usr-drv-1');
    expect(result.status).toBe(TripStatus.NO_SHOW);
    expect(db.tripEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'PASSENGER_NO_SHOW' }),
      }),
    );
  });

  describe('corporate zonal completion', () => {
    const now = new Date();
    const zonalTrip = (status: TripStatus) => ({
      id: 'trip-z1',
      driverId: 'drv-1',
      vendorId: 'vnd-1',
      assignmentId: 'asg-1',
      requirementId: 'req-z1',
      vehicleType: VehicleType.SUV,
      pickupAddress: 'Kokapet',
      dropAddress: 'Shamirpet',
      driverRate: 1275,
      status,
      createdAt: now,
      updatedAt: now,
      driver: { id: 'drv-1', trustScore: 90 },
      requirement: {
        fulfillmentMode: 'DIRECT_DISPATCH',
        pickupLat: 17.385,
        pickupLng: 78.3245,
        dropLat: 17.604,
        dropLng: 78.5714,
        zonalQuote: {
          hubId: 'KOKAPET',
          zoneId: 'ZONE_1',
          rateVersion: '2026.1',
          hasEscort: true,
          baseFarePaise: 150000,
          escortFarePaise: 50000,
          totalFarePaise: 200000,
          driverFarePaise: 127500,
          platformFeePaise: 22500,
        },
      },
    });

    let tx: any;
    beforeEach(() => {
      db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1' });
      tx = {
        trip: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue({ ...zonalTrip(TripStatus.COMPLETED), completedAt: now, totalDriverEarnings: 1275 }),
          count: jest.fn().mockResolvedValue(0),
        },
        assignment: { update: jest.fn() },
        driver: { update: jest.fn().mockResolvedValue({ walletBalance: 1275 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        requirement: { update: jest.fn() },
        ledgerEntry: { create: jest.fn() },
      };
      db.$transaction.mockImplementation(async (cb: any) => cb(tx));
    });

    it('Simulation 2 / D AT03: credits the fixed driver quote, books spread and escort payable separately', async () => {
      db.trip.findUnique.mockResolvedValue(zonalTrip(TripStatus.IN_PROGRESS));

      await service.completeTrip('trip-z1', 'usr-drv-1', { tollCharges: 150, parkingCharges: 40 } as any);

      expect(tx.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ walletBalance: { increment: 1275 } }) }),
      );
      const entries = tx.ledgerEntry.create.mock.calls.map((c: any) => c[0].data);
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountType: 'DRIVER', amount: 1275 }),
          expect.objectContaining({ accountType: 'PLATFORM', referenceType: 'ZONAL_PLATFORM_SPREAD', amount: 225 }),
          expect.objectContaining({ accountType: 'ESCORT_PAYABLE', referenceType: 'ZONAL_ESCORT_PAYABLE', amount: 500 }),
        ]),
      );
      // Tolls/parking are recorded as claims for ops approval, never auto-paid on zonal trips.
      expect(tx.trip.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tollCharges: 0, parkingCharges: 0, totalDriverEarnings: 1275 }) }),
      );
      expect(db.tripEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ pendingOpsApproval: { tollCharges: 150, parkingCharges: 40 } }),
          }),
        }),
      );
      // Vendor channel never receives the driver payout.
      const vendorEvent = notifications.emitEvent.mock.calls.find((c: any) => c[0] === 'vendor:vnd-1' && c[1] === 'TRIP_COMPLETED');
      expect(vendorEvent[2].totalEarnings).toBeUndefined();
    });

    it('D AT07: a concurrent duplicate completion does not credit twice', async () => {
      db.trip.findUnique
        .mockResolvedValueOnce(zonalTrip(TripStatus.IN_PROGRESS))
        .mockResolvedValueOnce({ ...zonalTrip(TripStatus.COMPLETED), completedAt: now });
      tx.trip.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.completeTrip('trip-z1', 'usr-drv-1', {} as any);

      expect(result.status).toBe(TripStatus.COMPLETED);
      expect(tx.driver.update).not.toHaveBeenCalled();
      expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('D AT07: a retried completion of an already completed trip is a no-op', async () => {
      db.trip.findUnique.mockResolvedValue({ ...zonalTrip(TripStatus.COMPLETED), completedAt: now });

      const result = await service.completeTrip('trip-z1', 'usr-drv-1', {} as any);

      expect(result.status).toBe(TripStatus.COMPLETED);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });
});
