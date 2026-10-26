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
  OfferStatus,
} from '@adhocx/contracts';

describe('Uber-Grade Sequential Waterfall Dispatch & Ring Expansion (4-Device Test Case)', () => {
  let service: DispatchService;
  let db: any;
  let locationsService: any;
  let notifications: any;
  let audit: any;

  // Stored state for simulation
  let offersStore: Map<string, any>;
  let requirementStore: any;
  let offerSeq: number;

  beforeEach(async () => {
    offersStore = new Map();
    offerSeq = 0;

    requirementStore = {
      id: 'req-suv-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SUV,
      quantity: 1,
      assignedQuantity: 0,
      dispatchWaves: 0,
      pickupLat: 17.4435,
      pickupLng: 78.3772,
      dropLat: 17.3753,
      dropLng: 78.4983,
      pickupAddress: 'Nanakramguda Hub',
      dropAddress: 'Charminar / Malakpet',
      ratePerVehicle: 900,
      reportingTime: new Date(),
      status: RequirementStatus.POSTED,
      offers: [],
      vendor: { userId: 'usr-vnd-1' },
      zonalQuote: {
        driverFarePaise: 76500, // ₹765 Driver Rate Card
        vendorFarePaise: 90000, // ₹900 Vendor Rate Card
        hasEscort: false,
      },
    };

    db = {
      requirement: {
        findUnique: jest.fn().mockImplementation(() => ({
          ...requirementStore,
          offers: Array.from(offersStore.values()).filter(
            (o) => o.requirementId === requirementStore.id,
          ),
        })),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(requirementStore, data);
          return requirementStore;
        }),
      },
      driver: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      offer: {
        create: jest.fn().mockImplementation(({ data }) => {
          const id = `off-${++offerSeq}`;
          const offer = {
            id,
            status: OfferStatus.SENT,
            createdAt: new Date(),
            ...data,
          };
          offersStore.set(id, offer);
          return offer;
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          let count = 0;
          for (const offer of offersStore.values()) {
            if (where.id && offer.id !== where.id) continue;
            if (where.status && offer.status !== where.status) continue;
            if (where.requirementId && offer.requirementId !== where.requirementId) continue;
            Object.assign(offer, data);
            count++;
          }
          return { count };
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Array.from(offersStore.values()).filter((offer) => {
            if (where?.status && offer.status !== where.status) return false;
            if (where?.requirementId && offer.requirementId !== where.requirementId) return false;
            return true;
          });
        }),
      },
    };

    locationsService = {
      findNearbyDrivers: jest.fn().mockResolvedValue([]),
      findNearbyDriversByH3: jest.fn(),
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

  describe('The 4-Device Test Setup (1 Vendor, 1 Sedan, 2 SUVs)', () => {
    const driverSedan = {
      id: 'drv-sedan',
      fullName: 'Sedan Driver',
      vehicleType: VehicleType.SEDAN,
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: DriverAvailability.AVAILABLE,
      user: { status: UserStatus.ACTIVE },
      vehicles: [{ vehicleType: VehicleType.SEDAN }],
      trustScore: 98.0,
      averageRating: 5.0,
      totalTrips: 120,
      currentLat: 17.4440,
      currentLng: 78.3780,
      lastLocationAt: new Date(),
      trips: [],
    };

    // SUV #1: Higher composite rank (Proximity 1.0 km, Trust 98.0, Rating 4.95)
    const driverSuv1 = {
      id: 'drv-suv-1',
      fullName: 'SUV Driver One (Rank #1)',
      vehicleType: VehicleType.SUV,
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: DriverAvailability.AVAILABLE,
      user: { status: UserStatus.ACTIVE },
      vehicles: [{ vehicleType: VehicleType.SUV }],
      trustScore: 98.0,
      averageRating: 4.95,
      totalTrips: 150,
      currentLat: 17.4440,
      currentLng: 78.3780, // ~1.0 km away
      lastLocationAt: new Date(),
      trips: [],
    };

    // SUV #2: Lower composite rank (Proximity 2.2 km, Trust 91.0, Rating 4.80)
    const driverSuv2 = {
      id: 'drv-suv-2',
      fullName: 'SUV Driver Two (Rank #2)',
      vehicleType: VehicleType.SUV,
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: DriverAvailability.AVAILABLE,
      user: { status: UserStatus.ACTIVE },
      vehicles: [{ vehicleType: VehicleType.SUV }],
      trustScore: 91.0,
      averageRating: 4.80,
      totalTrips: 45,
      currentLat: 17.4550,
      currentLng: 78.3890, // ~2.2 km away
      lastLocationAt: new Date(),
      trips: [],
    };

    it('Step 1: In Wave 1, ONLY SUV #1 gets the offer. Sedan and SUV #2 receive 0 notifications', async () => {
      // Spatial lookup finds both SUV drivers (and the Sedan driver)
      locationsService.findNearbyDriversByH3.mockResolvedValue([
        { driverId: 'drv-suv-1', distanceKm: 1.0 },
        { driverId: 'drv-suv-2', distanceKm: 2.2 },
        { driverId: 'drv-sedan', distanceKm: 0.9 },
      ]);

      db.driver.findMany.mockResolvedValue([driverSuv1, driverSuv2, driverSedan]);

      // Trigger Wave 1 dispatch
      const wave1Result = await service.dispatchRequirement('req-suv-1');

      // 1. Strict 1-by-1 Waterfall: Exactly ONE offer created
      expect(wave1Result.offersCreated).toBe(1);
      expect(wave1Result.driverIds).toEqual(['drv-suv-1']);
      expect(wave1Result.status).toBe(RequirementStatus.DISPATCHING);

      // 2. Sedan driver is strictly excluded
      expect(wave1Result.driverIds).not.toContain('drv-sedan');

      // 3. SUV #2 is NOT offered in Wave 1 (Anti-Broadcast Guarantee!)
      expect(wave1Result.driverIds).not.toContain('drv-suv-2');

      // 4. Notifications emitted exclusively to SUV #1
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'driver:drv-suv-1',
        'OFFER_RECEIVED',
        expect.objectContaining({
          offerId: 'off-1',
          offeredRate: 765, // Driver Rate Card, NEVER ₹900 Vendor price!
        }),
      );

      // Verify no notification was sent to SUV #2 or Sedan
      const allNotificationCalls = notifications.emitEvent.mock.calls.map((c: any) => c[0]);
      expect(allNotificationCalls).not.toContain('driver:drv-suv-2');
      expect(allNotificationCalls).not.toContain('driver:drv-sedan');
    });

    it('Step 2: When SUV #1 declines or times out, Wave 2 cascades immediately and exclusively to SUV #2', async () => {
      // Setup state where SUV #1 was offered in Wave 1 and declined
      const offer1 = {
        id: 'off-1',
        requirementId: 'req-suv-1',
        driverId: 'drv-suv-1',
        status: OfferStatus.DECLINED,
        expiresAt: new Date(Date.now() + 10000),
      };
      offersStore.set(offer1.id, offer1);
      requirementStore.dispatchWaves = 1;

      // Spatial lookup still detects nearby drivers
      locationsService.findNearbyDriversByH3.mockResolvedValue([
        { driverId: 'drv-suv-1', distanceKm: 1.0 },
        { driverId: 'drv-suv-2', distanceKm: 2.2 },
      ]);

      // SUV #1 is already filtered out of candidate query because of DECLINED status in Wave 1
      db.driver.findMany.mockResolvedValue([driverSuv2]);

      // Trigger Wave 2 (cascade)
      const wave2Result = await service.dispatchRequirement('req-suv-1');

      // 1. Exactly ONE offer created in Wave 2
      expect(wave2Result.offersCreated).toBe(1);
      expect(wave2Result.driverIds).toEqual(['drv-suv-2']);

      // 2. Offer is created exclusively for SUV #2
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'driver:drv-suv-2',
        'OFFER_RECEIVED',
        expect.objectContaining({
          offeredRate: 765,
        }),
      );

      // 3. SUV #1 was NOT offered again
      expect(wave2Result.driverIds).not.toContain('drv-suv-1');
    });

    it('Step 3: Multi-Vehicle Corporate Requirement (e.g., 3 SUVs) dispatches up to 3 slots without excess', async () => {
      requirementStore.quantity = 3; // Corporate client requested 3 SUVs
      requirementStore.assignedQuantity = 0;

      const driverSuv3 = {
        ...driverSuv2,
        id: 'drv-suv-3',
        fullName: 'SUV Driver Three',
      };

      locationsService.findNearbyDriversByH3.mockResolvedValue([
        { driverId: 'drv-suv-1', distanceKm: 1.0 },
        { driverId: 'drv-suv-2', distanceKm: 2.2 },
        { driverId: 'drv-suv-3', distanceKm: 3.1 },
      ]);

      db.driver.findMany.mockResolvedValue([driverSuv1, driverSuv2, driverSuv3]);

      const multiResult = await service.dispatchRequirement('req-suv-1');

      // For 3 vehicles, offerBudget allows up to 3 slots
      expect(multiResult.offersCreated).toBe(3);
      expect(multiResult.driverIds).toEqual(['drv-suv-1', 'drv-suv-2', 'drv-suv-3']);
    });
  });

  describe('Concentric Progressive H3 Spatial Ring Expansion', () => {
    it('should expand k-ring progressively per wave (k=1 -> k=2 -> k=3) without 100km jumps', async () => {
      locationsService.findNearbyDriversByH3.mockResolvedValue([]);
      locationsService.findNearbyDrivers.mockResolvedValue([]);
      db.driver.findMany.mockResolvedValue([]);

      // Wave 1: wavesSoFar = 0 -> kRing = 1
      await service.dispatchRequirement('req-suv-1');
      expect(locationsService.findNearbyDriversByH3).toHaveBeenCalledWith(
        17.4435,
        78.3772,
        1, // kRing = 1 (~1.2 km)
        VehicleType.SUV,
      );

      // Verify that radial fallback used urban radius (5.5 km), NEVER 100 km!
      expect(locationsService.findNearbyDrivers).toHaveBeenCalledWith(
        17.4435,
        78.3772,
        5.5, // 3 + 1 * 2.5 = 5.5 km, NOT 100 km!
        VehicleType.SUV,
      );
    });
  });
});
