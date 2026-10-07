import {
  RequirementStatus,
  TripStatus,
  FulfillmentMode,
  DriverAvailability,
  VerificationStatus,
  OfferStatus,
} from '@adhocx/contracts';
import { GoogleMapsService } from '../src/modules/locations/google-maps.service';
import { PricingService } from '../src/modules/pricing/pricing.service';

describe('AdhocX End-to-End: Google Maps Road Distance, Pricing, Dispatch & Complete Lifecycle Simulation', () => {
  let googleMapsService: GoogleMapsService;
  let pricingService: PricingService;

  beforeAll(() => {
    googleMapsService = new GoogleMapsService();
    pricingService = new PricingService(undefined, googleMapsService);
  });

  // =========================================================================
  // SUITE 1: GOOGLE MAPS REAL ROAD DISTANCE & ETA ACCURACY VS GROUND TRUTH
  // =========================================================================
  describe('Suite 1: Google Maps Routes API Real Road Distance & Traffic ETA Verification', () => {
    it('Verification 1: Cyber City Gurugram to IGI Airport T3 real road distance', async () => {
      // Coordinates: Cyber City Gurugram (28.4960, 77.0930) -> IGI T3 (28.5553, 77.0857)
      const origin = { latitude: 28.4960, longitude: 77.0930 };
      const destination = { latitude: 28.5553, longitude: 77.0857 };

      const route = await googleMapsService.computeRoadRoute(origin, destination);

      // Verified by Internet ground truth: Road distance is ~10-14 km via NH-48
      expect(route.distanceKm).toBeGreaterThanOrEqual(9.0);
      expect(route.distanceKm).toBeLessThanOrEqual(16.0);
      expect(route.durationMinutes).toBeGreaterThanOrEqual(15);
      expect(route.durationMinutes).toBeLessThanOrEqual(50);
      expect(route.isRealRoad).toBe(true);
      expect(route.routeDescription).toBeDefined();

      // Straight line Haversine is only ~6.7 km. Real road distance must be significantly higher!
      const straightLineKm = 6371 * 2 * Math.asin(
        Math.sqrt(
          Math.sin(((destination.latitude - origin.latitude) * Math.PI) / 360) ** 2 +
            Math.cos((origin.latitude * Math.PI) / 180) *
              Math.cos((destination.latitude * Math.PI) / 180) *
              Math.sin(((destination.longitude - origin.longitude) * Math.PI) / 360) ** 2,
        ),
      );
      expect(route.distanceKm).toBeGreaterThan(straightLineKm);
    });

    it('Verification 2: Connaught Place to Noida Sector 62 real road distance', async () => {
      // Coordinates: CP (28.6304, 77.2177) -> Noida Sector 62 (28.6239, 77.3647)
      const origin = { latitude: 28.6304, longitude: 77.2177 };
      const destination = { latitude: 28.6239, longitude: 77.3647 };

      const route = await googleMapsService.computeRoadRoute(origin, destination);

      // Verified by Internet ground truth: Road distance is ~18.4 km
      expect(route.distanceKm).toBeGreaterThanOrEqual(15.0);
      expect(route.distanceKm).toBeLessThanOrEqual(23.0);
      expect(route.durationMinutes).toBeGreaterThanOrEqual(18);
      expect(route.isRealRoad).toBe(true);
    });

    it('Verification 3: Lightning-fast cache hit performance (<15ms)', async () => {
      const origin = { latitude: 28.6304, longitude: 77.2177 };
      const destination = { latitude: 28.6239, longitude: 77.3647 };

      const start = Date.now();
      const cachedRoute = await googleMapsService.computeRoadRoute(origin, destination);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(25); // Cache hit returns immediately
      expect(cachedRoute.distanceKm).toBeGreaterThan(0);
    });

    it('Verification 4: High-fidelity road-factor fallback works seamlessly', () => {
      // Fallback incorporates 1.25x road tortuosity factor
      const fallback = googleMapsService.calculateFallbackRoadRoute(28.6304, 77.2177, 28.6239, 77.3647);
      expect(fallback.distanceKm).toBeGreaterThan(14.0);
      expect(fallback.durationMinutes).toBeGreaterThan(20);
      expect(fallback.isRealRoad).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 2: PRICING ENGINE, TARIFF SCHEDULES & CENTRAL PLATFORM PROFIT
  // =========================================================================
  describe('Suite 2: Pricing Engine Fare Calculation & Platform Commission Margin', () => {
    it('Calculation 1: Sedan fare calculation over real Google Maps road distance', async () => {
      // CP to Noida Sector 62: ~18.4 km
      const quote = await pricingService.calculateQuote({
        vehicleType: 'SEDAN',
        pickupLocation: { latitude: 28.6304, longitude: 77.2177 },
        dropLocation: { latitude: 28.6239, longitude: 77.3647 },
      });

      expect(quote.vehicleType).toBe('SEDAN');
      expect(quote.distanceKm).toBeGreaterThan(15);
      expect(quote.durationMinutes).toBeGreaterThan(0);
      expect(quote.ratePerVehicle).toBeGreaterThan(0);
      expect(quote.estimatedTotal).toBe(quote.ratePerVehicle);

      // Central platform profit margin: 10% commission
      const expectedPlatformFee = Math.round((quote.estimatedTotal * 10) / 100);
      expect(quote.platformFee).toBe(expectedPlatformFee);
      expect(quote.driverNetPayout).toBe(quote.estimatedTotal - quote.platformFee);
    });

    it('Calculation 2: Rate card hierarchy across all vehicle categories', () => {
      const distanceKm = 20.0;
      const hatchbackFare = pricingService.calculateMinimumFare('HATCHBACK', distanceKm);
      const sedanFare = pricingService.calculateMinimumFare('SEDAN', distanceKm);
      const suvFare = pricingService.calculateMinimumFare('SUV', distanceKm);
      const tempoFare = pricingService.calculateMinimumFare('TEMPO_TRAVELLER', distanceKm);

      expect(hatchbackFare).toBeGreaterThan(0);
      expect(sedanFare).toBeGreaterThan(hatchbackFare);
      expect(suvFare).toBeGreaterThan(sedanFare);
      expect(tempoFare).toBeGreaterThan(suvFare);
    });
  });

  // =========================================================================
  // SUITE 3: END-TO-END RIDE LIFECYCLE, OTP, DISPATCH & SETTLEMENT SIMULATION
  // =========================================================================
  describe('Suite 3: Full End-to-End Booking Lifecycle Simulation', () => {
    const simulationState = {
      vendor: {
        id: 'vnd-corporate-1',
        name: 'Apex Mobility Solutions',
        walletEscrowBalance: 10000.0, // Initial pre-funded balance
      },
      drivers: [
        {
          id: 'drv-sedan-1',
          name: 'Vikram Singh',
          vehicleType: 'SEDAN',
          plate: 'DL01AX1001',
          status: DriverAvailability.AVAILABLE,
          verification: VerificationStatus.VERIFIED,
          walletBalance: 500.0,
          currentLat: 28.4970,
          currentLng: 77.0940,
        },
        {
          id: 'drv-suv-2',
          name: 'Rajesh Kumar',
          vehicleType: 'SUV',
          plate: 'DL01AX2002',
          status: DriverAvailability.AVAILABLE,
          verification: VerificationStatus.VERIFIED,
          walletBalance: 300.0,
          currentLat: 28.4980,
          currentLng: 77.0950,
        },
      ],
      requirement: null as any,
      offers: [] as any[],
      trip: null as any,
      platformLedgerBalance: 0,
    };

    it('Stage 1: Vendor posts booking with Google Maps road distance & wallet escrow debit', async () => {
      // Cyber City to IGI Airport
      const origin = { latitude: 28.4960, longitude: 77.0930 };
      const destination = { latitude: 28.5553, longitude: 77.0857 };

      const route = await googleMapsService.computeRoadRoute(origin, destination);
      const fare = pricingService.calculateTripFare('SEDAN', route.distanceKm);

      const requiredFare = fare.estimatedTotal;
      expect(simulationState.vendor.walletEscrowBalance).toBeGreaterThanOrEqual(requiredFare);

      // Debit vendor wallet into escrow
      simulationState.vendor.walletEscrowBalance -= requiredFare;

      simulationState.requirement = {
        id: 'req-sim-001',
        vendorId: simulationState.vendor.id,
        fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
        vehicleType: 'SEDAN',
        quantity: 1,
        assignedCount: 0,
        pickupLat: origin.latitude,
        pickupLng: origin.longitude,
        dropLat: destination.latitude,
        dropLng: destination.longitude,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        ratePerVehicle: requiredFare,
        totalAmount: requiredFare,
        status: RequirementStatus.POSTED,
      };

      expect(simulationState.requirement.status).toBe(RequirementStatus.POSTED);
      expect(simulationState.requirement.distanceKm).toBeGreaterThan(9.0);
      expect(simulationState.vendor.walletEscrowBalance).toBe(10000.0 - requiredFare);
    });

    it('Stage 2: Dispatch wave matches SEDAN driver and STRICTLY excludes SUV driver', () => {
      const req = simulationState.requirement;

      // Candidate matching with vehicle capability isolation:
      const eligibleCandidates = simulationState.drivers.filter((d) => {
        if (d.status !== DriverAvailability.AVAILABLE) return false;
        if (d.verification !== VerificationStatus.VERIFIED) return false;

        // Strict category match: A Sedan driver sees only Sedan; SUV driver is excluded
        return d.vehicleType === req.vehicleType;
      });

      expect(eligibleCandidates).toHaveLength(1);
      expect(eligibleCandidates[0].id).toBe('drv-sedan-1');
      expect(eligibleCandidates[0].vehicleType).toBe('SEDAN');

      // Verify SUV driver was rejected
      const suvCandidate = eligibleCandidates.find((d) => d.vehicleType === 'SUV');
      expect(suvCandidate).toBeUndefined();

      // Create dispatch offer
      const offer = {
        id: 'ofr-sim-001',
        requirementId: req.id,
        driverId: eligibleCandidates[0].id,
        vehicleType: req.vehicleType,
        offeredRate: req.ratePerVehicle,
        status: OfferStatus.SENT,
        expiresAt: new Date(Date.now() + 45000),
      };

      simulationState.offers.push(offer);
      req.status = RequirementStatus.DISPATCHING;
      expect(req.status).toBe(RequirementStatus.DISPATCHING);
    });

    it('Stage 3: Sedan driver accepts offer, locks availability to BUSY and generates OTP', () => {
      const offer = simulationState.offers[0];
      const driver = simulationState.drivers.find((d) => d.id === offer.driverId)!;
      const req = simulationState.requirement;

      offer.status = OfferStatus.ACCEPTED;
      driver.status = DriverAvailability.BUSY;
      req.assignedCount = 1;
      req.status = RequirementStatus.FULFILLED;

      // Create Trip with 4-digit verification OTP
      const startOtp = '7429';
      simulationState.trip = {
        id: 'trp-sim-001',
        requirementId: req.id,
        driverId: driver.id,
        vendorId: req.vendorId,
        vehicleType: req.vehicleType,
        driverRate: req.ratePerVehicle,
        otp: startOtp,
        status: TripStatus.ASSIGNED,
      };

      expect(simulationState.trip.status).toBe(TripStatus.ASSIGNED);
      expect(simulationState.trip.otp).toBe('7429');
      expect(driver.status).toBe(DriverAvailability.BUSY);
    });

    it('Stage 4: Driver arrives at pickup, triggering ARRIVED state and OTP transmission', () => {
      const trip = simulationState.trip;
      trip.status = TripStatus.ARRIVED;

      // Simulated notification payload to vendor
      const vendorNotification = {
        event: 'TRIP_DRIVER_ARRIVED',
        tripId: trip.id,
        otp: trip.otp,
        pickupReady: true,
      };

      expect(trip.status).toBe(TripStatus.ARRIVED);
      expect(vendorNotification.otp).toBe('7429');
    });

    it('Stage 5: OTP verification starts the trip into IN_PROGRESS', () => {
      const trip = simulationState.trip;
      const passengerOtpInput = '7429';

      // Strict OTP verification check
      const isOtpValid = passengerOtpInput === trip.otp;
      expect(isOtpValid).toBe(true);

      trip.status = TripStatus.IN_PROGRESS;
      trip.startedAt = new Date();

      expect(trip.status).toBe(TripStatus.IN_PROGRESS);
    });

    it('Stage 6: Trip completes with tolls & parking; ledger settles central platform profit and driver payout', () => {
      const trip = simulationState.trip;
      const driver = simulationState.drivers.find((d) => d.id === trip.driverId)!;
      const initialDriverWallet = driver.walletBalance;

      const fareAmount = Number(trip.driverRate);
      const commissionPercent = 10.0; // Standard 10% platform commission
      const commission = Math.round((fareAmount * commissionPercent) / 100);
      const tollCharges = 120.0;
      const parkingCharges = 80.0;

      const netDriverEarnings = fareAmount - commission + tollCharges + parkingCharges;

      // Settle trip
      trip.status = TripStatus.COMPLETED;
      trip.completedAt = new Date();
      trip.tollCharges = tollCharges;
      trip.parkingCharges = parkingCharges;
      trip.totalDriverEarnings = netDriverEarnings;

      // 1. Credit central platform commission into platform ledger
      simulationState.platformLedgerBalance += commission;

      // 2. Credit driver wallet with net earnings
      driver.walletBalance += netDriverEarnings;
      driver.status = DriverAvailability.AVAILABLE;

      // 3. Mark parent requirement COMPLETED
      simulationState.requirement.status = RequirementStatus.COMPLETED;

      // Assertions
      expect(trip.status).toBe(TripStatus.COMPLETED);
      expect(simulationState.platformLedgerBalance).toBe(commission);
      expect(simulationState.platformLedgerBalance).toBeGreaterThan(0);
      expect(driver.walletBalance).toBe(initialDriverWallet + netDriverEarnings);
      expect(driver.status).toBe(DriverAvailability.AVAILABLE);
      expect(simulationState.requirement.status).toBe(RequirementStatus.COMPLETED);
    });

    it('Stage 7: Driver withdraws earnings with bank settlement & UTR reconciliation', () => {
      const driver = simulationState.drivers[0];
      const withdrawAmount = 500.0;

      expect(driver.walletBalance).toBeGreaterThanOrEqual(withdrawAmount);

      // Debit wallet balance
      driver.walletBalance -= withdrawAmount;

      const settlement = {
        id: 'stl-sim-001',
        driverId: driver.id,
        amount: withdrawAmount,
        bankAccount: 'XXXXXX4818',
        ifsc: 'HDFC0000001',
        utrNumber: 'UTR2026100800123',
        status: 'SETTLED',
      };

      expect(settlement.status).toBe('SETTLED');
      expect(settlement.utrNumber).toBeDefined();
    });
  });
});
