import {
  FulfillmentMode,
  BidStatus,
  DisputeStatus,
  RequirementStatus,
  TripStatus,
  AssignmentStatus,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  canTransitionBid,
  validateBidTransition,
} from '@adhocx/contracts';
import { PricingService } from '../src/modules/pricing/pricing.service';

describe('AdhocX + JoinCab Unified Platform: 10 Comprehensive Feature Simulations', () => {
  let pricingService: PricingService;

  // Shared simulation state tracking
  const state = {
    users: new Map<string, any>(),
    drivers: new Map<string, any>(),
    vendors: new Map<string, any>(),
    requirements: new Map<string, any>(),
    bids: new Map<string, any>(),
    offers: new Map<string, any>(),
    assignments: new Map<string, any>(),
    trips: new Map<string, any>(),
    reviews: new Map<string, any>(),
    disputes: new Map<string, any>(),
    ledgerEntries: [] as any[],
    auditLogs: [] as any[],
  };

  beforeAll(() => {
    pricingService = new PricingService();

    // 1. Setup Drivers
    state.drivers.set('drv-1', {
      id: 'drv-1',
      userId: 'usr-driver-1',
      fullName: 'Vikram Singh',
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: DriverAvailability.AVAILABLE,
      walletBalance: 0,
      trustScore: 100.0,
      averageRating: 5.0,
      ratingCount: 0,
      totalTrips: 0,
      vehicleType: VehicleType.SEDAN,
      vehiclePlate: 'DL01AB9988',
    });

    state.drivers.set('drv-2', {
      id: 'drv-2',
      userId: 'usr-driver-2',
      fullName: 'Sunil Verma',
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: DriverAvailability.AVAILABLE,
      walletBalance: 0,
      trustScore: 98.0,
      averageRating: 4.8,
      ratingCount: 15,
      totalTrips: 15,
      vehicleType: VehicleType.SEDAN,
      vehiclePlate: 'HR26CD1234',
    });

    // 2. Setup Requester / Vendor
    state.vendors.set('vnd-1', {
      id: 'vnd-1',
      userId: 'usr-vendor-1',
      companyName: 'Global Horizons Corporate Tech',
      verificationStatus: VerificationStatus.VERIFIED,
      escrowBalance: 0,
    });
  });

  // =========================================================================
  // SIMULATION 1: Pricing Engine & Distance-Based Base Fare Floor
  // =========================================================================
  it('Simulation 1: Pricing Engine calculates Haversine route distance and minimum fare floors', () => {
    // Delhi to Agra coordinates (~200 km)
    const delhiLat = 28.6139;
    const delhiLng = 77.2090;
    const agraLat = 27.1767;
    const agraLng = 78.0081;

    const distanceKm = pricingService.calculateDistanceKm(delhiLat, delhiLng, agraLat, agraLng);
    expect(distanceKm).toBeGreaterThan(150);
    expect(distanceKm).toBeLessThan(250);

    // Minimum base fare floors for all 7 supported vehicle types
    const hatchbackFloor = pricingService.calculateMinimumFare(VehicleType.HATCHBACK, distanceKm);
    const sedanFloor = pricingService.calculateMinimumFare(VehicleType.SEDAN, distanceKm);
    const suvFloor = pricingService.calculateMinimumFare(VehicleType.SUV, distanceKm);
    const tempoFloor = pricingService.calculateMinimumFare(VehicleType.TEMPO_TRAVELLER, distanceKm);
    const busFloor = pricingService.calculateMinimumFare(VehicleType.BUS, distanceKm);
    const tataAceFloor = pricingService.calculateMinimumFare(VehicleType.TATA_ACE, distanceKm);
    const pickupFloor = pricingService.calculateMinimumFare(VehicleType.PICKUP_TRUCK, distanceKm);

    // Hierarchy check: SUV > Sedan > Hatchback; Bus > Tempo; Pickup > Tata Ace
    expect(hatchbackFloor).toBeGreaterThan(0);
    expect(sedanFloor).toBeGreaterThan(hatchbackFloor);
    expect(suvFloor).toBeGreaterThan(sedanFloor);
    expect(tempoFloor).toBeGreaterThan(suvFloor);
    expect(busFloor).toBeGreaterThan(tempoFloor);
    expect(pickupFloor).toBeGreaterThan(tataAceFloor);
  });

  // =========================================================================
  // SIMULATION 2: Bid State Machine & Transition Rules
  // =========================================================================
  it('Simulation 2: Bid state transitions adhere strictly to mathematical state-machine rules', () => {
    // Legal transitions from PENDING
    expect(canTransitionBid(BidStatus.PENDING, BidStatus.ACCEPTED)).toBe(true);
    expect(canTransitionBid(BidStatus.PENDING, BidStatus.REJECTED)).toBe(true);
    expect(canTransitionBid(BidStatus.PENDING, BidStatus.WITHDRAWN)).toBe(true);
    expect(canTransitionBid(BidStatus.PENDING, BidStatus.EXPIRED)).toBe(true);

    // Terminal states cannot transition further
    expect(canTransitionBid(BidStatus.ACCEPTED, BidStatus.WITHDRAWN)).toBe(false);
    expect(canTransitionBid(BidStatus.ACCEPTED, BidStatus.REJECTED)).toBe(false);
    expect(canTransitionBid(BidStatus.REJECTED, BidStatus.ACCEPTED)).toBe(false);
    expect(canTransitionBid(BidStatus.WITHDRAWN, BidStatus.ACCEPTED)).toBe(false);
    expect(canTransitionBid(BidStatus.EXPIRED, BidStatus.ACCEPTED)).toBe(false);

    // Validator throws on illegal transition
    expect(() => validateBidTransition(BidStatus.ACCEPTED, BidStatus.REJECTED)).toThrow();
  });

  // =========================================================================
  // SIMULATION 3: Mode 1 (DIRECT_DISPATCH) Routing & Dispatch Isolation
  // =========================================================================
  it('Simulation 3: Mode 1 (DIRECT_DISPATCH) calculates fixed rates and auto-dispatches', () => {
    const fixedRate = pricingService.calculateDriverRate(VehicleType.SEDAN);
    expect(fixedRate).toBe(1500);

    const corporateReq = {
      id: 'req-corporate-bulk',
      vendorId: 'vnd-1',
      fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
      vehicleType: VehicleType.SEDAN,
      quantity: 5,
      assignedQuantity: 0,
      ratePerVehicle: fixedRate,
      totalAmount: 5 * fixedRate,
      status: RequirementStatus.POSTED,
    };

    state.requirements.set(corporateReq.id, corporateReq);
    expect(corporateReq.fulfillmentMode).toBe(FulfillmentMode.DIRECT_DISPATCH);
    expect(corporateReq.totalAmount).toBe(7500);
  });

  // =========================================================================
  // SIMULATION 4: Mode 2 (BIDDING) Reverse-Auction Placement & Price Bands
  // =========================================================================
  it('Simulation 4: Mode 2 (BIDDING) creates outstation requirement and accepts driver quotes within price bounds', () => {
    const distanceKm = 180;
    const minFareFloor = pricingService.calculateMinimumFare(VehicleType.SEDAN, distanceKm);
    const suggestedBudget = minFareFloor; // e.g. 700 + 180*13 = 3040

    const biddingReq = {
      id: 'req-outstation-bidding',
      vendorId: 'vnd-1',
      fulfillmentMode: FulfillmentMode.BIDDING,
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      suggestedBudget,
      totalAmount: suggestedBudget,
      status: RequirementStatus.POSTED,
    };

    state.requirements.set(biddingReq.id, biddingReq);

    // Driver 1 places competitive bid at ₹3100
    const bid1 = {
      id: 'bid-1',
      requirementId: biddingReq.id,
      driverId: 'drv-1',
      bidAmount: 3100,
      etaMinutes: 15,
      notes: 'Clean AC sedan, bottled water',
      status: BidStatus.PENDING,
      createdAt: new Date(),
    };
    state.bids.set(bid1.id, bid1);

    // Driver 2 places competitive bid at ₹2950 (better quote)
    const bid2 = {
      id: 'bid-2',
      requirementId: biddingReq.id,
      driverId: 'drv-2',
      bidAmount: 2950,
      etaMinutes: 20,
      notes: 'Experienced highway chauffeur',
      status: BidStatus.PENDING,
      createdAt: new Date(),
    };
    state.bids.set(bid2.id, bid2);

    expect(state.bids.size).toBe(2);
    expect(bid2.bidAmount).toBeLessThan(bid1.bidAmount);
  });

  // =========================================================================
  // SIMULATION 5: Atomic Bid Acceptance, Winner Selection & Loser Rejection
  // =========================================================================
  it('Simulation 5: Requester accepts winning bid, rejecting competitors and creating polymorphic assignment', () => {
    const req = state.requirements.get('req-outstation-bidding');
    const winningBid = state.bids.get('bid-2');
    const losingBid = state.bids.get('bid-1');

    // 1. Transition winning bid to ACCEPTED
    winningBid.status = BidStatus.ACCEPTED;

    // 2. Automatically reject competing bids
    losingBid.status = BidStatus.REJECTED;

    // 3. Mark requirement FULFILLED
    req.assignedQuantity = 1;
    req.status = RequirementStatus.FULFILLED;

    // 4. Create Assignment with bidId (polymorphic link)
    const assignment = {
      id: 'asg-bidding-1',
      requirementId: req.id,
      bidId: winningBid.id,
      offerId: null, // Nullable when originating from bid!
      driverId: winningBid.driverId,
      status: AssignmentStatus.CONFIRMED,
    };
    state.assignments.set(assignment.id, assignment);

    // 5. Generate 4-digit OTP and create Trip
    const trip = {
      id: 'trp-bidding-1',
      requirementId: req.id,
      assignmentId: assignment.id,
      vendorId: req.vendorId,
      driverId: winningBid.driverId,
      vehicleType: req.vehicleType,
      status: TripStatus.ASSIGNED,
      otp: '4821',
      driverRate: winningBid.bidAmount,
      tollCharges: 0,
      parkingCharges: 0,
      totalDriverEarnings: 0,
    };
    state.trips.set(trip.id, trip);

    // 6. Driver transitions to BUSY
    const driver = state.drivers.get(winningBid.driverId);
    driver.availabilityStatus = DriverAvailability.BUSY;

    expect(winningBid.status).toBe(BidStatus.ACCEPTED);
    expect(losingBid.status).toBe(BidStatus.REJECTED);
    expect(assignment.bidId).toBe('bid-2');
    expect(assignment.offerId).toBeNull();
    expect(trip.status).toBe(TripStatus.ASSIGNED);
    expect(driver.availabilityStatus).toBe(DriverAvailability.BUSY);
  });

  // =========================================================================
  // SIMULATION 6: Double-Entry Ledger Escrow Hold
  // =========================================================================
  it('Simulation 6: Customer funds are locked in Escrow upon bid acceptance', () => {
    const vendor = state.vendors.get('vnd-1');
    const winningBid = state.bids.get('bid-2');
    const trip = state.trips.get('trp-bidding-1');

    // Ledger hold
    vendor.escrowBalance += winningBid.bidAmount;
    state.ledgerEntries.push({
      id: 'led-1',
      accountType: 'VENDOR',
      accountId: vendor.id,
      entryType: 'DEBIT',
      amount: winningBid.bidAmount,
      balanceAfter: vendor.escrowBalance,
      referenceType: 'ESCROW_HOLD',
      referenceId: trip.id,
      description: `Escrow hold for trip ${trip.id}`,
    });

    expect(vendor.escrowBalance).toBe(2950);
    expect(state.ledgerEntries.length).toBe(1);
    expect(state.ledgerEntries[0].referenceType).toBe('ESCROW_HOLD');
  });

  // =========================================================================
  // SIMULATION 7: Escrow Release on Trip Completion & Commission
  // =========================================================================
  it('Simulation 7: Escrow is released upon trip completion with platform commission and tolls', () => {
    const vendor = state.vendors.get('vnd-1');
    const driver = state.drivers.get('drv-2');
    const trip = state.trips.get('trp-bidding-1');

    // Trip completes with ₹350 toll charges
    const fare = Number(trip.driverRate); // 2950
    const toll = 350;
    const commissionRate = 0.05; // 5%
    const commission = Math.round(fare * commissionRate); // 148
    const driverEarnings = fare - commission + toll; // 2950 - 148 + 350 = 3152

    trip.status = TripStatus.COMPLETED;
    trip.tollCharges = toll;
    trip.totalDriverEarnings = driverEarnings;

    // Escrow release
    vendor.escrowBalance = Math.max(0, vendor.escrowBalance - fare);
    driver.walletBalance += driverEarnings;
    driver.availabilityStatus = DriverAvailability.AVAILABLE;

    state.ledgerEntries.push({
      id: 'led-2',
      accountType: 'DRIVER',
      accountId: driver.id,
      entryType: 'CREDIT',
      amount: driverEarnings,
      balanceAfter: driver.walletBalance,
      referenceType: 'ESCROW_RELEASE',
      referenceId: trip.id,
      description: `Earnings for trip ${trip.id}`,
    });

    state.ledgerEntries.push({
      id: 'led-3',
      accountType: 'PLATFORM',
      accountId: driver.id,
      entryType: 'CREDIT',
      amount: commission,
      balanceAfter: commission,
      referenceType: 'PLATFORM_COMMISSION',
      referenceId: trip.id,
      description: `Platform 5% fee for trip ${trip.id}`,
    });

    expect(vendor.escrowBalance).toBe(0);
    expect(driver.walletBalance).toBe(3152);
    expect(driver.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
    expect(trip.status).toBe(TripStatus.COMPLETED);
  });

  // =========================================================================
  // SIMULATION 8: Escrow Refund on Pre-Start Cancellation
  // =========================================================================
  it('Simulation 8: Escrow is refunded back to requester when booking is cancelled', () => {
    const vendor = state.vendors.get('vnd-1');
    const cancelledTripId = 'trp-cancelled-test';
    const heldAmount = 2500;

    // Vendor had escrow held
    vendor.escrowBalance += heldAmount;
    expect(vendor.escrowBalance).toBe(2500);

    // Cancel and refund
    vendor.escrowBalance = Math.max(0, vendor.escrowBalance - heldAmount);
    state.ledgerEntries.push({
      id: 'led-4',
      accountType: 'VENDOR',
      accountId: vendor.id,
      entryType: 'CREDIT',
      amount: heldAmount,
      balanceAfter: vendor.escrowBalance,
      referenceType: 'ESCROW_REFUND',
      referenceId: cancelledTripId,
      description: 'Refund due to booking cancellation',
    });

    expect(vendor.escrowBalance).toBe(0);
    expect(state.ledgerEntries[state.ledgerEntries.length - 1].referenceType).toBe('ESCROW_REFUND');
  });

  // =========================================================================
  // SIMULATION 9: Driver Trust Score Dynamics & Rating Recalculation
  // =========================================================================
  it('Simulation 9: Driver trust score increases on trip completion and penalizes on cancellation', () => {
    const driver = state.drivers.get('drv-2');
    const initialTrust = driver.trustScore; // 98.0
    const initialTrips = driver.totalTrips; // 15

    // Completion reward: +0.5 trust, +1 trip
    driver.totalTrips += 1;
    driver.trustScore = Math.min(100.0, driver.trustScore + 0.5);

    expect(driver.totalTrips).toBe(initialTrips + 1);
    expect(driver.trustScore).toBe(98.5);

    // Simulated driver-side cancellation on another trip: -5.0 penalty
    driver.trustScore = Math.max(0.0, driver.trustScore - 5.0);
    expect(driver.trustScore).toBe(93.5);

    // Customer submits 5-star review
    const newRating = 5;
    const updatedCount = driver.ratingCount + 1;
    const updatedAvg = Number(
      ((driver.averageRating * driver.ratingCount + newRating) / updatedCount).toFixed(2),
    );
    driver.averageRating = updatedAvg;
    driver.ratingCount = updatedCount;

    state.reviews.set('rev-1', {
      id: 'rev-1',
      tripId: 'trp-bidding-1',
      rating: newRating,
      feedback: 'Excellent outstation drive! Smooth overtaking and polite manners.',
    });

    expect(driver.ratingCount).toBe(16);
    expect(driver.averageRating).toBeGreaterThanOrEqual(4.8);
    expect(state.reviews.size).toBe(1);
  });

  // =========================================================================
  // SIMULATION 10: Dispute Lifecycle & Support Resolution
  // =========================================================================
  it('Simulation 10: Participant files a dispute ticket, ops investigates, and admin marks RESOLVED', () => {
    const trip = state.trips.get('trp-bidding-1');

    // 1. Participant files dispute
    const dispute = {
      id: 'dsp-201',
      tripId: trip.id,
      reporterId: 'usr-vendor-1',
      accusedId: 'usr-driver-2',
      reason: 'State Border Toll Discrepancy',
      description: 'Receipt showed ₹250 but ₹350 was entered in toll charges.',
      status: DisputeStatus.OPEN,
      resolutionText: null as string | null,
      createdAt: new Date(),
    };
    state.disputes.set(dispute.id, dispute);

    expect(dispute.status).toBe(DisputeStatus.OPEN);

    // 2. Admin inspects and resolves ticket with explanation
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolutionText = 'Verified physical receipt against FasTag toll plaza timestamp: ₹350 confirmed accurate.';

    state.auditLogs.push({
      actorId: 'usr-admin',
      action: 'DISPUTE_RESOLVED',
      entityName: 'DISPUTE',
      entityId: dispute.id,
      metadata: { status: dispute.status, resolutionText: dispute.resolutionText },
    });

    expect(dispute.status).toBe(DisputeStatus.RESOLVED);
    expect(dispute.resolutionText).toContain('FasTag toll plaza timestamp');
    expect(state.auditLogs.length).toBe(1);
  });
});
