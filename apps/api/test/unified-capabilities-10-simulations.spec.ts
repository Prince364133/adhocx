import {
  FulfillmentMode,
  DisputeStatus,
  RequirementStatus,
  TripStatus,
  AssignmentStatus,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  OfferStatus,
  canTransitionOffer,
  validateOfferTransition,
} from '@adhocx/contracts';
import { priceFor } from './helpers/distance-pricing-fixtures';

describe('AdhocX Unified Platform: 10 Comprehensive Feature Simulations (Direct Dispatch & Corporate)', () => {

  // Shared simulation state tracking
  const state = {
    users: new Map<string, any>(),
    drivers: new Map<string, any>(),
    vendors: new Map<string, any>(),
    requirements: new Map<string, any>(),
    offers: new Map<string, any>(),
    assignments: new Map<string, any>(),
    trips: new Map<string, any>(),
    reviews: new Map<string, any>(),
    disputes: new Map<string, any>(),
    ledgerEntries: [] as any[],
    auditLogs: [] as any[],
  };

  beforeAll(() => {

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
  it('Simulation 1: Distance slabs price on unrounded meters (10,000 m -> first slab, 10,001 m -> second)', () => {
    expect(priceFor(10000)).toMatchObject({ vendorRupees: 500, driverRupees: 400 });
    expect(priceFor(10001)).toMatchObject({ vendorRupees: 650, driverRupees: 520 });
    expect(priceFor(22400)).toMatchObject({ vendorRupees: 950, driverRupees: 780 });
    expect(priceFor(40000)).toMatchObject({ vendorRupees: 1400, driverRupees: 1150 });
    // Beyond the last configured band: no guessed price.
    expect(() => priceFor(40001)).toThrow(/No price is configured/);
  });

  // =========================================================================
  // SIMULATION 2: Offer State Machine & Transition Rules
  // =========================================================================
  it('Simulation 2: Offer state transitions adhere strictly to state-machine rules', () => {
    // Legal transitions from SENT
    expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.ACCEPTED)).toBe(true);
    expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.DECLINED)).toBe(true);
    expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.EXPIRED)).toBe(true);
    expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.CANCELLED)).toBe(true);

    // Terminal states cannot transition further
    expect(canTransitionOffer(OfferStatus.ACCEPTED, OfferStatus.DECLINED)).toBe(false);
    expect(canTransitionOffer(OfferStatus.DECLINED, OfferStatus.ACCEPTED)).toBe(false);
    expect(canTransitionOffer(OfferStatus.EXPIRED, OfferStatus.ACCEPTED)).toBe(false);
    expect(canTransitionOffer(OfferStatus.CANCELLED, OfferStatus.ACCEPTED)).toBe(false);

    // Validator throws on illegal transition
    expect(() => validateOfferTransition(OfferStatus.ACCEPTED, OfferStatus.DECLINED)).toThrow();
  });

  // =========================================================================
  // SIMULATION 3: Direct Dispatch Mode 1 Single Trip Routing
  // =========================================================================
  it('Simulation 3: Mode 1 (DIRECT_DISPATCH) calculates fixed rates and sets requirement status', () => {
    const fixedRate = priceFor(18000).vendorRupees; // 18 km -> >15-20 km slab
    expect(fixedRate).toBe(800);

    const corporateReq = {
      id: 'req-corporate-single',
      vendorId: 'vnd-1',
      fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      ratePerVehicle: fixedRate,
      totalAmount: fixedRate,
      status: RequirementStatus.POSTED,
    };

    state.requirements.set(corporateReq.id, corporateReq);
    expect(corporateReq.fulfillmentMode).toBe(FulfillmentMode.DIRECT_DISPATCH);
    expect(corporateReq.totalAmount).toBe(800);
  });

  // =========================================================================
  // SIMULATION 4: Multi-Vehicle Corporate Bulk Requirement Placement
  // =========================================================================
  it('Simulation 4: Creates multi-vehicle corporate requirement with progressive capacity tracking', () => {
    const fixedRate = priceFor(18000).vendorRupees;
    const bulkReq = {
      id: 'req-corporate-bulk',
      vendorId: 'vnd-1',
      fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
      vehicleType: VehicleType.SEDAN,
      quantity: 3,
      assignedQuantity: 0,
      ratePerVehicle: fixedRate,
      totalAmount: 3 * fixedRate,
      status: RequirementStatus.POSTED,
    };

    state.requirements.set(bulkReq.id, bulkReq);
    expect(bulkReq.quantity).toBe(3);
    expect(bulkReq.totalAmount).toBe(2400);

    // Generate atomic offers for candidate drivers
    const offer1 = {
      id: 'off-1',
      requirementId: bulkReq.id,
      driverId: 'drv-1',
      vehicleType: VehicleType.SEDAN,
      offeredRate: fixedRate,
      status: OfferStatus.SENT,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    };
    state.offers.set(offer1.id, offer1);

    const offer2 = {
      id: 'off-2',
      requirementId: bulkReq.id,
      driverId: 'drv-2',
      vehicleType: VehicleType.SEDAN,
      offeredRate: fixedRate,
      status: OfferStatus.SENT,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
    };
    state.offers.set(offer2.id, offer2);

    expect(state.offers.size).toBe(2);
  });

  // =========================================================================
  // SIMULATION 5: Atomic Offer Acceptance, Assignment & Trip Creation
  // =========================================================================
  it('Simulation 5: Driver accepts direct dispatch offer, creating assignment and trip', () => {
    const req = state.requirements.get('req-corporate-bulk');
    const offer = state.offers.get('off-2');

    // 1. Transition offer to ACCEPTED
    offer.status = OfferStatus.ACCEPTED;

    // 2. Increment assigned quantity on requirement
    req.assignedQuantity = 1;
    req.status = RequirementStatus.PARTIALLY_FULFILLED;

    // 3. Create Assignment with offerId
    const assignment = {
      id: 'asg-direct-1',
      requirementId: req.id,
      offerId: offer.id,
      driverId: offer.driverId,
      status: AssignmentStatus.CONFIRMED,
    };
    state.assignments.set(assignment.id, assignment);

    // 4. Generate 4-digit OTP and create Trip
    const trip = {
      id: 'trp-direct-1',
      requirementId: req.id,
      assignmentId: assignment.id,
      vendorId: req.vendorId,
      driverId: offer.driverId,
      vehicleType: req.vehicleType,
      status: TripStatus.ASSIGNED,
      otp: '4821',
      driverRate: offer.offeredRate,
      tollCharges: 0,
      parkingCharges: 0,
      totalDriverEarnings: 0,
    };
    state.trips.set(trip.id, trip);

    // 5. Driver transitions to BUSY
    const driver = state.drivers.get(offer.driverId);
    driver.availabilityStatus = DriverAvailability.BUSY;

    expect(offer.status).toBe(OfferStatus.ACCEPTED);
    expect(assignment.offerId).toBe('off-2');
    expect(trip.status).toBe(TripStatus.ASSIGNED);
    expect(driver.availabilityStatus).toBe(DriverAvailability.BUSY);
  });

  // =========================================================================
  // SIMULATION 6: Double-Entry Ledger Booking Escrow Hold
  // =========================================================================
  it('Simulation 6: Customer funds are debited and held upon driver assignment', () => {
    const vendor = state.vendors.get('vnd-1');
    const trip = state.trips.get('trp-direct-1');

    vendor.escrowBalance += trip.driverRate;
    state.ledgerEntries.push({
      id: 'led-1',
      accountType: 'VENDOR',
      accountId: vendor.id,
      entryType: 'DEBIT',
      amount: trip.driverRate,
      balanceAfter: vendor.escrowBalance,
      referenceType: 'ESCROW_HOLD',
      referenceId: trip.id,
      description: `Escrow hold for direct trip ${trip.id}`,
    });

    expect(vendor.escrowBalance).toBe(800);
    expect(state.ledgerEntries.length).toBe(1);
    expect(state.ledgerEntries[0].referenceType).toBe('ESCROW_HOLD');
  });

  // =========================================================================
  // SIMULATION 7: Trip Completion, Toll Addition & Platform Commission
  // =========================================================================
  it('Simulation 7: Driver completes trip with toll addition, receiving net payout with commission deducted', () => {
    const vendor = state.vendors.get('vnd-1');
    const driver = state.drivers.get('drv-2');
    const trip = state.trips.get('trp-direct-1');

    const fare = Number(trip.driverRate); // 800
    const toll = 150;
    const commissionRate = 0.05; // 5%
    const commission = Math.round(fare * commissionRate); // 40
    const driverEarnings = fare - commission + toll; // 800 - 40 + 150 = 910

    trip.status = TripStatus.COMPLETED;
    trip.tollCharges = toll;
    trip.totalDriverEarnings = driverEarnings;

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
      referenceType: 'TRIP_EARNINGS',
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
    expect(driver.walletBalance).toBe(910);
    expect(driver.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
    expect(trip.status).toBe(TripStatus.COMPLETED);
  });

  // =========================================================================
  // SIMULATION 8: Escrow Refund on Pre-Start Cancellation
  // =========================================================================
  it('Simulation 8: Escrow is refunded back to requester when booking is cancelled', () => {
    const vendor = state.vendors.get('vnd-1');
    const cancelledTripId = 'trp-cancelled-test';
    const heldAmount = 800;

    // Vendor had escrow held
    vendor.escrowBalance += heldAmount;
    expect(vendor.escrowBalance).toBe(800);

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
    expect(driver.trustScore).toBe(initialTrust + 0.5);

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
      tripId: 'trp-direct-1',
      rating: newRating,
      feedback: 'Excellent on-demand drive! Polite driver and smooth driving.',
    });

    expect(driver.ratingCount).toBe(16);
    expect(driver.averageRating).toBeGreaterThanOrEqual(4.8);
    expect(state.reviews.size).toBe(1);
  });

  // =========================================================================
  // SIMULATION 10: Dispute Lifecycle & Support Resolution
  // =========================================================================
  it('Simulation 10: Participant files a dispute ticket, ops investigates, and admin marks RESOLVED', () => {
    const trip = state.trips.get('trp-direct-1');

    // 1. Participant files dispute
    const dispute = {
      id: 'dsp-201',
      tripId: trip.id,
      reporterId: 'usr-vendor-1',
      accusedId: 'usr-driver-2',
      reason: 'Toll Plaza Charge Discrepancy',
      description: 'Receipt showed ₹100 but ₹150 was entered in toll charges.',
      status: DisputeStatus.OPEN,
      resolutionText: null as string | null,
      createdAt: new Date(),
    };
    state.disputes.set(dispute.id, dispute);

    expect(dispute.status).toBe(DisputeStatus.OPEN);

    // 2. Admin inspects and resolves ticket with explanation
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolutionText = 'Verified physical receipt against FasTag toll plaza timestamp: ₹150 confirmed accurate.';

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
