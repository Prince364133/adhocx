import { Test, TestingModule } from '@nestjs/testing';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { DatabaseService } from '../src/database/database.service';
import { LocationsService } from '../src/modules/locations/locations.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  RequirementStatus,
  UserStatus,
  VerificationStatus,
  DriverAvailability,
  VehicleType,
} from '@adhocx/contracts';

describe('DispatchService Unit Tests', () => {
  let service: DispatchService;
  let db: any;
  let locationsService: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      requirement: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'req-1', status: RequirementStatus.DISPATCHING }),
      },
      driver: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      offer: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: `off-${data?.driverId || '1'}`, ...data }),
        ),
      },
    };

    locationsService = {
      findNearbyDrivers: jest.fn().mockResolvedValue([]),
      findNearbyDriversByH3: jest.fn().mockResolvedValue([]),
      latLngToH3: jest.fn().mockReturnValue('8860a259bbfffff'),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPush: jest.fn().mockResolvedValue(undefined),
      sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: DatabaseService, useValue: db },
        { provide: LocationsService, useValue: locationsService },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
  });

  it('should find eligible candidates, create wave offers, and set requirement status to DISPATCHING', async () => {
    const now = new Date();
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1500,
      status: RequirementStatus.POSTED,
      offers: [],
      vendor: { userId: 'usr-vnd-1' },
    });

    locationsService.findNearbyDrivers.mockResolvedValue([
      { driverId: 'drv-1', distanceKm: 3.2 },
      { driverId: 'drv-2', distanceKm: 5.8 },
    ]);

    db.driver.findMany.mockResolvedValue([
      {
        id: 'drv-1',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailability.AVAILABLE,
        user: { status: UserStatus.ACTIVE },
        trips: [],
      },
      {
        id: 'drv-2',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailability.AVAILABLE,
        user: { status: UserStatus.ACTIVE },
        trips: [],
      },
    ]);

    db.offer.create
      .mockResolvedValueOnce({ id: 'off-1', driverId: 'drv-1' })
      .mockResolvedValueOnce({ id: 'off-2', driverId: 'drv-2' });

    db.requirement.update.mockResolvedValue({ id: 'req-1', status: RequirementStatus.DISPATCHING });

    const result = await service.dispatchRequirement('req-1');

    expect(result.offersCreated).toBe(1);
    expect(result.status).toBe(RequirementStatus.DISPATCHING);
    expect(db.offer.create).toHaveBeenCalledTimes(1);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'OFFER_RECEIVED',
      expect.objectContaining({ offerId: 'off-1' }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'REQUIREMENT_DISPATCHING',
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REQUIREMENT_DISPATCHED' }),
    );
  });

  it('should filter out drivers with conflicting active trips or unverified status', async () => {
    const now = new Date();
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1500,
      status: RequirementStatus.POSTED,
      offers: [],
      vendor: { userId: 'usr-vnd-1' },
    });

    locationsService.findNearbyDrivers.mockResolvedValue([
      { driverId: 'drv-busy', distanceKm: 2.1 },
      { driverId: 'drv-unverified', distanceKm: 3.5 },
      { driverId: 'drv-eligible', distanceKm: 4.0 },
    ]);

    db.driver.findMany.mockResolvedValueOnce([
      // Driver 1 has an active trip
      {
        id: 'drv-busy',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailability.AVAILABLE,
        user: { status: UserStatus.ACTIVE },
        trips: [{ id: 'trip-active' }],
      },
      // Driver 2 is under review / unverified
      {
        id: 'drv-unverified',
        verificationStatus: VerificationStatus.UNDER_REVIEW,
        availabilityStatus: DriverAvailability.AVAILABLE,
        user: { status: UserStatus.ACTIVE },
        trips: [],
      },
      // Driver 3 is verified, available, no active trips
      {
        id: 'drv-eligible',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailability.AVAILABLE,
        user: { status: UserStatus.ACTIVE },
        trips: [],
      },
    ]);

    db.offer.create.mockResolvedValue({ id: 'off-eligible', driverId: 'drv-eligible' });
    db.requirement.update.mockResolvedValue({ id: 'req-1', status: RequirementStatus.DISPATCHING });

    const result = await service.dispatchRequirement('req-1');

    expect(result.offersCreated).toBe(1);
    expect(result.driverIds).toEqual(['drv-eligible']);
  });

  it('should mark requirement NO_DRIVER_AVAILABLE when 0 eligible candidates exist', async () => {
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      quantity: 2,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      status: RequirementStatus.POSTED,
      offers: [],
      vendor: { userId: 'usr-vnd-1' },
    });

    locationsService.findNearbyDrivers.mockResolvedValue([]);
    db.driver.findMany.mockResolvedValue([]);
    db.requirement.update.mockResolvedValue({ id: 'req-1', status: RequirementStatus.NO_DRIVER_AVAILABLE });

    const result = await service.dispatchRequirement('req-1');

    expect(result.offersCreated).toBe(0);
    expect(result.status).toBe(RequirementStatus.NO_DRIVER_AVAILABLE);
    expect(db.requirement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: { status: RequirementStatus.NO_DRIVER_AVAILABLE },
      }),
    );
  });
});
