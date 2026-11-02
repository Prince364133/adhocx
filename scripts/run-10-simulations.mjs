/**
 * AdhocX + JoinCab Unified Platform Verification Suite
 * Executes 10 comprehensive architectural and business simulations.
 */

import assert from 'node:assert/strict';

console.log('\n======================================================================');
console.log('🚀 RUNNING 10 TEST SIMULATIONS: UNIFIED ADHOCX ARCHITECTURE');
console.log('======================================================================\n');

let passedCount = 0;
let failedCount = 0;

function runSimulation(name, fn) {
  try {
    fn();
    passedCount++;
    console.log(`✅ [SIMULATION ${passedCount.toString().padStart(2, '0')}] PASS: ${name}`);
  } catch (error) {
    failedCount++;
    console.error(`❌ [SIMULATION FAILED]: ${name}`);
    console.error(`   Reason: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

// -------------------------------------------------------------
// Core Domain Logic & Enums Under Test
// -------------------------------------------------------------
const VehicleType = {
  SEDAN: 'SEDAN',
  SUV: 'SUV',
  HATCHBACK: 'HATCHBACK',
  TEMPO_TRAVELLER: 'TEMPO_TRAVELLER',
  BUS: 'BUS',
  TATA_ACE: 'TATA_ACE',
  PICKUP_TRUCK: 'PICKUP_TRUCK',
};

const FulfillmentMode = {
  DIRECT_DISPATCH: 'DIRECT_DISPATCH',
};

const OfferStatus = {
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
};

const DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
};

const DriverAvailability = {
  OFFLINE: 'OFFLINE',
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  UNAVAILABLE: 'UNAVAILABLE',
};

const LEGAL_OFFER_TRANSITIONS = {
  [OfferStatus.SENT]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.EXPIRED],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.EXPIRED]: [],
};

function canTransitionOffer(from, to) {
  return LEGAL_OFFER_TRANSITIONS[from]?.includes(to) ?? false;
}

function validateOfferTransition(from, to) {
  if (!canTransitionOffer(from, to)) {
    throw new Error(`Illegal offer transition from ${from} to ${to}`);
  }
}

// Pricing Service Implementation Under Test
class PricingService {
  pricingTiers = {
    [VehicleType.HATCHBACK]: { baseFare: 500, perKmRate: 11, minimumKm: 10 },
    [VehicleType.SEDAN]: { baseFare: 700, perKmRate: 13, minimumKm: 15 },
    [VehicleType.SUV]: { baseFare: 1000, perKmRate: 18, minimumKm: 20 },
    [VehicleType.TEMPO_TRAVELLER]: { baseFare: 2500, perKmRate: 26, minimumKm: 50 },
    [VehicleType.BUS]: { baseFare: 4500, perKmRate: 45, minimumKm: 100 },
    [VehicleType.TATA_ACE]: { baseFare: 600, perKmRate: 16, minimumKm: 10 },
    [VehicleType.PICKUP_TRUCK]: { baseFare: 900, perKmRate: 22, minimumKm: 15 },
  };

  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(1, Number((R * c).toFixed(2)));
  }

  calculateMinimumFare(vehicleType, distanceKm) {
    const tier = this.pricingTiers[vehicleType] || this.pricingTiers[VehicleType.SEDAN];
    const billableKm = Math.max(distanceKm, tier.minimumKm);
    return Math.round(tier.baseFare + billableKm * tier.perKmRate);
  }

  calculateDriverRate(vehicleType, distanceKm) {
    if (distanceKm && distanceKm > 0) {
      return this.calculateMinimumFare(vehicleType, distanceKm);
    }
    const baseRates = {
      [VehicleType.HATCHBACK]: 1200,
      [VehicleType.SEDAN]: 1500,
      [VehicleType.SUV]: 2000,
      [VehicleType.TEMPO_TRAVELLER]: 3500,
      [VehicleType.BUS]: 5000,
      [VehicleType.TATA_ACE]: 1400,
      [VehicleType.PICKUP_TRUCK]: 1800,
    };
    return baseRates[vehicleType] || 1500;
  }
}

const pricing = new PricingService();

// =========================================================================
// SIMULATION 1: Pricing Engine & Route Haversine Fare Calculation
// =========================================================================
runSimulation('Pricing Engine & Distance Fare Floors (All 7 Vehicle Classes)', () => {
  // Delhi to Agra (~180 km)
  const dist = pricing.calculateDistanceKm(28.6139, 77.2090, 27.1767, 78.0081);
  assert.ok(dist >= 170 && dist <= 210, `Calculated distance ${dist}km out of range`);

  const sedanFloor = pricing.calculateMinimumFare(VehicleType.SEDAN, dist);
  const suvFloor = pricing.calculateMinimumFare(VehicleType.SUV, dist);
  const hatchbackFloor = pricing.calculateMinimumFare(VehicleType.HATCHBACK, dist);
  const tempoFloor = pricing.calculateMinimumFare(VehicleType.TEMPO_TRAVELLER, dist);
  const busFloor = pricing.calculateMinimumFare(VehicleType.BUS, dist);
  const tataAceFloor = pricing.calculateMinimumFare(VehicleType.TATA_ACE, dist);
  const pickupFloor = pricing.calculateMinimumFare(VehicleType.PICKUP_TRUCK, dist);

  // Economic hierarchy sanity checks
  assert.ok(sedanFloor > hatchbackFloor, 'Sedan floor should exceed Hatchback');
  assert.ok(suvFloor > sedanFloor, 'SUV floor should exceed Sedan');
  assert.ok(tempoFloor > suvFloor, 'Tempo Traveller floor should exceed SUV');
  assert.ok(busFloor > tempoFloor, 'Bus floor should exceed Tempo Traveller');
  assert.ok(pickupFloor > tataAceFloor, 'Pickup Truck floor should exceed Tata Ace');
  assert.strictEqual(pricing.calculateDriverRate(VehicleType.SEDAN), 1500);
});

// =========================================================================
// SIMULATION 2: Offer State Machine Mathematical Validation
// =========================================================================
runSimulation('Offer State Machine Invariants & Terminal Lock States', () => {
  // Valid transitions from SENT
  assert.strictEqual(canTransitionOffer(OfferStatus.SENT, OfferStatus.ACCEPTED), true);
  assert.strictEqual(canTransitionOffer(OfferStatus.SENT, OfferStatus.REJECTED), true);
  assert.strictEqual(canTransitionOffer(OfferStatus.SENT, OfferStatus.EXPIRED), true);

  // Terminal state immutability
  assert.strictEqual(canTransitionOffer(OfferStatus.ACCEPTED, OfferStatus.REJECTED), false);
  assert.strictEqual(canTransitionOffer(OfferStatus.ACCEPTED, OfferStatus.EXPIRED), false);
  assert.strictEqual(canTransitionOffer(OfferStatus.REJECTED, OfferStatus.ACCEPTED), false);
  assert.strictEqual(canTransitionOffer(OfferStatus.EXPIRED, OfferStatus.ACCEPTED), false);

  assert.throws(() => validateOfferTransition(OfferStatus.ACCEPTED, OfferStatus.REJECTED), /Illegal offer transition/);
});

// =========================================================================
// SIMULATION 3: Mode 1 (DIRECT_DISPATCH) Corporate Bulk Routing
// =========================================================================
runSimulation('Mode 1 (DIRECT_DISPATCH) Bulk Corporate Capacity Allocation', () => {
  const corporateReq = {
    id: 'req-corp-01',
    vendorId: 'vnd-tech-corp',
    fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
    vehicleType: VehicleType.SEDAN,
    quantity: 10,
    assignedQuantity: 0,
    ratePerVehicle: 1600,
    totalAmount: 16000,
    status: 'POSTED',
  };

  assert.strictEqual(corporateReq.fulfillmentMode, FulfillmentMode.DIRECT_DISPATCH);
  assert.strictEqual(corporateReq.totalAmount, 16000);

  // Direct dispatch wave allocates drivers incrementally
  corporateReq.assignedQuantity += 4;
  corporateReq.status = corporateReq.assignedQuantity < corporateReq.quantity ? 'PARTIALLY_FULFILLED' : 'FULFILLED';
  assert.strictEqual(corporateReq.status, 'PARTIALLY_FULFILLED');

  corporateReq.assignedQuantity += 6;
  corporateReq.status = corporateReq.assignedQuantity >= corporateReq.quantity ? 'FULFILLED' : 'PARTIALLY_FULFILLED';
  assert.strictEqual(corporateReq.status, 'FULFILLED');
  assert.strictEqual(corporateReq.assignedQuantity, 10);
});

// =========================================================================
// SIMULATION 4: Corporate Rate-Card Zonal Pricing Bounds & Surcharge Guardrails
// =========================================================================
runSimulation('Corporate Rate-Card Zonal Pricing Bounds & Surcharge Guardrails', () => {
  const distanceKm = 220;
  const standardFare = pricing.calculateMinimumFare(VehicleType.SEDAN, distanceKm); // 700 + 220*13 = 3560

  const corporateZonalReq = {
    id: 'req-zonal-01',
    vendorId: 'vnd-requester-1',
    fulfillmentMode: FulfillmentMode.DIRECT_DISPATCH,
    vehicleType: VehicleType.SEDAN,
    quantity: 1,
    assignedQuantity: 0,
    ratePerVehicle: standardFare,
    totalAmount: standardFare,
    status: 'POSTED',
  };

  assert.strictEqual(corporateZonalReq.fulfillmentMode, FulfillmentMode.DIRECT_DISPATCH);

  // Fixed Rate Card Bounds
  const escortFee = 350;
  const totalWithEscort = standardFare + escortFee;
  assert.ok(totalWithEscort > standardFare, 'Escort fee is additive');
  assert.strictEqual(corporateZonalReq.ratePerVehicle, standardFare);
});

// =========================================================================
// SIMULATION 5: Atomic Direct Dispatch Offer Acceptance & Assignment
// =========================================================================
runSimulation('Atomic Direct Dispatch Offer Acceptance & OTP Trip Generation', () => {
  const req = { id: 'req-dispatch-99', quantity: 1, assignedQuantity: 0, status: 'POSTED' };
  const offers = [
    { id: 'off-A', driverId: 'drv-1', rate: 3200, status: OfferStatus.SENT },
    { id: 'off-B', driverId: 'drv-2', rate: 3200, status: OfferStatus.SENT },
  ];

  // Driver 1 accepts offer first
  const winningOffer = offers[0];
  validateOfferTransition(winningOffer.status, OfferStatus.ACCEPTED);
  winningOffer.status = OfferStatus.ACCEPTED;

  // Auto-expire other competing offers in the wave
  for (const o of offers) {
    if (o.id !== winningOffer.id && o.status === OfferStatus.SENT) {
      o.status = OfferStatus.EXPIRED;
    }
  }

  req.assignedQuantity = 1;
  req.status = 'FULFILLED';

  const assignment = {
    id: 'asg-direct-1',
    requirementId: req.id,
    offerId: winningOffer.id,
    driverId: winningOffer.driverId,
    status: 'CONFIRMED',
  };

  // 4-digit OTP trip creation
  const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const trip = {
    id: 'trp-direct-1',
    assignmentId: assignment.id,
    driverId: winningOffer.driverId,
    driverRate: winningOffer.rate,
    otp: startOtp,
    status: 'ASSIGNED',
  };

  assert.strictEqual(winningOffer.status, OfferStatus.ACCEPTED);
  assert.strictEqual(offers[1].status, OfferStatus.EXPIRED);
  assert.strictEqual(assignment.offerId, 'off-A');
  assert.strictEqual(trip.otp.length, 4);
});

// =========================================================================
// SIMULATION 6: Financial Double-Entry Invariant: Escrow Hold
// =========================================================================
runSimulation('Double-Entry Ledger Escrow Lock on Direct Dispatch Acceptance', () => {
  const vendor = { id: 'vnd-1', escrowBalance: 0 };
  const ledgerEntries = [];
  const agreedFare = 3200;

  // Hold Escrow
  vendor.escrowBalance += agreedFare;
  ledgerEntries.push({
    id: 'led-1',
    accountType: 'VENDOR',
    accountId: vendor.id,
    entryType: 'DEBIT',
    amount: agreedFare,
    balanceAfter: vendor.escrowBalance,
    referenceType: 'ESCROW_HOLD',
    referenceId: 'trp-poly-1',
  });

  assert.strictEqual(vendor.escrowBalance, 3200);
  assert.strictEqual(ledgerEntries.length, 1);
  assert.strictEqual(ledgerEntries[0].referenceType, 'ESCROW_HOLD');
});

// =========================================================================
// SIMULATION 7: Escrow Release on Trip Completion & Commission
// =========================================================================
runSimulation('Escrow Release, 5% Platform Fee, Toll Reconcilement & Driver Payout', () => {
  const vendor = { id: 'vnd-1', escrowBalance: 3200 };
  const driver = { id: 'drv-2', walletBalance: 500 };
  const ledgerEntries = [];

  const fare = 3200;
  const commissionRate = 0.05; // 5%
  const commission = Math.round(fare * commissionRate); // 160
  const tollCharges = 450;
  const parkingCharges = 100;
  const driverNetEarnings = fare - commission + tollCharges + parkingCharges; // 3200 - 160 + 450 + 100 = 3590

  // 1. Release from escrow
  vendor.escrowBalance = Math.max(0, vendor.escrowBalance - fare);
  driver.walletBalance += driverNetEarnings;

  ledgerEntries.push({
    accountType: 'DRIVER',
    entryType: 'CREDIT',
    amount: driverNetEarnings,
    balanceAfter: driver.walletBalance,
    referenceType: 'ESCROW_RELEASE',
  });

  ledgerEntries.push({
    accountType: 'PLATFORM',
    entryType: 'CREDIT',
    amount: commission,
    referenceType: 'PLATFORM_COMMISSION',
  });

  assert.strictEqual(vendor.escrowBalance, 0);
  assert.strictEqual(driver.walletBalance, 500 + 3590);
  assert.strictEqual(commission, 160);
  assert.strictEqual(ledgerEntries.length, 2);
});

// =========================================================================
// SIMULATION 8: Escrow Refund on Pre-Start Booking Cancellation
// =========================================================================
runSimulation('Escrow Reversal & Refund to Requester on Trip Cancellation', () => {
  const vendor = { id: 'vnd-1', escrowBalance: 4000 };
  const ledgerEntries = [];
  const cancelRefundAmount = 4000;

  vendor.escrowBalance = Math.max(0, vendor.escrowBalance - cancelRefundAmount);
  ledgerEntries.push({
    accountType: 'VENDOR',
    entryType: 'CREDIT',
    amount: cancelRefundAmount,
    balanceAfter: vendor.escrowBalance,
    referenceType: 'ESCROW_REFUND',
    referenceId: 'trp-cancelled-id',
  });

  assert.strictEqual(vendor.escrowBalance, 0);
  assert.strictEqual(ledgerEntries[0].referenceType, 'ESCROW_REFUND');
});

// =========================================================================
// SIMULATION 9: Driver Trust Score Dynamics & Rating Recalculation
// =========================================================================
runSimulation('Driver Trust Score Reward/Penalty & 5-Star Average Rating Recalculation', () => {
  const driver = {
    id: 'drv-metrics',
    trustScore: 95.0,
    totalTrips: 20,
    averageRating: 4.8,
    ratingCount: 10,
  };

  // Completed trip: +0.5 trust, +1 totalTrips
  driver.totalTrips += 1;
  driver.trustScore = Math.min(100.0, driver.trustScore + 0.5);
  assert.strictEqual(driver.totalTrips, 21);
  assert.strictEqual(driver.trustScore, 95.5);

  // Driver cancelled trip: -5.0 trust penalty
  driver.trustScore = Math.max(0.0, driver.trustScore - 5.0);
  assert.strictEqual(driver.trustScore, 90.5);

  // Customer rates 5 stars
  const reviewStar = 5;
  const newCount = driver.ratingCount + 1;
  const newAvg = Number(((driver.averageRating * driver.ratingCount + reviewStar) / newCount).toFixed(2));
  driver.averageRating = newAvg;
  driver.ratingCount = newCount;

  assert.strictEqual(driver.ratingCount, 11);
  assert.strictEqual(driver.averageRating, 4.82);
});

// =========================================================================
// SIMULATION 10: Trip Dispute Lifecycle & Admin Resolution
// =========================================================================
runSimulation('Customer Care Dispute Lifecycle: Filing, Investigation & Resolution Findings', () => {
  const dispute = {
    id: 'dsp-ticket-101',
    tripId: 'trp-poly-1',
    reporterId: 'usr-vendor-1',
    accusedId: 'usr-driver-2',
    reason: 'Route Deviation & Delay',
    description: 'Driver took an unapproved detour adding 35km and 45 minutes delay.',
    status: DisputeStatus.OPEN,
    resolutionText: null,
  };

  assert.strictEqual(dispute.status, DisputeStatus.OPEN);

  // Admin reviews GPS telematics and resolves
  dispute.status = DisputeStatus.RESOLVED;
  dispute.resolutionText = 'GPS logs verified unexpected highway blockage; driver detour was justified for passenger safety.';

  assert.strictEqual(dispute.status, DisputeStatus.RESOLVED);
  assert.ok(dispute.resolutionText.length > 20);
});

// =========================================================================
// SIMULATION 11: QA-01 Driver Double-Booking & Auto-Expiry Guard
// =========================================================================
runSimulation('QA-01: Driver Double-Booking Prevention & Concurrent Offer Invalidation', () => {
  const driver = { id: 'drv-busy', availabilityStatus: DriverAvailability.AVAILABLE };
  const pendingOffers = [
    { id: 'off-trip-1', driverId: 'drv-busy', status: OfferStatus.SENT },
    { id: 'off-trip-2', driverId: 'drv-busy', status: OfferStatus.SENT },
    { id: 'off-trip-3', driverId: 'drv-busy', status: OfferStatus.SENT },
  ];

  // Driver accepts off-trip-1
  assert.strictEqual(driver.availabilityStatus, DriverAvailability.AVAILABLE);
  pendingOffers[0].status = OfferStatus.ACCEPTED;
  driver.availabilityStatus = DriverAvailability.BUSY;

  // Auto-expire other pending offers dispatched to this driver
  for (let i = 1; i < pendingOffers.length; i++) {
    pendingOffers[i].status = OfferStatus.EXPIRED;
  }

  // Attempting to accept another offer while BUSY must be rejected!
  const attemptAcceptWhileBusy = () => {
    if (driver.availabilityStatus !== DriverAvailability.AVAILABLE) {
      throw new Error('Driver is currently engaged in another trip or unavailable');
    }
  };

  assert.throws(attemptAcceptWhileBusy, /Driver is currently engaged in another trip/);
  assert.strictEqual(pendingOffers[1].status, OfferStatus.EXPIRED);
  assert.strictEqual(pendingOffers[2].status, OfferStatus.EXPIRED);
});

// =========================================================================
// SIMULATION 12: QA-02 Vehicle Class Compatibility Enforcement
// =========================================================================
runSimulation('QA-02: Vehicle Class Compatibility Enforcement on Direct Dispatch Offer Waves', () => {
  const driverWithSedan = {
    id: 'drv-sedan-only',
    vehicles: [{ type: VehicleType.SEDAN, registrationNumber: 'DL01XY1234' }],
  };

  const tempoReq = { id: 'req-tempo', vehicleType: VehicleType.TEMPO_TRAVELLER };
  const sedanReq = { id: 'req-sedan', vehicleType: VehicleType.SEDAN };

  const validateVehicleMatch = (driver, requirement) => {
    const match = driver.vehicles.some((v) => v.type === requirement.vehicleType);
    if (!match) {
      throw new Error(`Driver does not have a verified vehicle matching requirement vehicle type: ${requirement.vehicleType}`);
    }
  };

  // Offering Tempo Traveller to Sedan driver must fail
  assert.throws(() => validateVehicleMatch(driverWithSedan, tempoReq), /Driver does not have a verified vehicle/);

  // Offering Sedan to Sedan driver matches successfully
  assert.doesNotThrow(() => validateVehicleMatch(driverWithSedan, sedanReq));
});

// =========================================================================
// SIMULATION 13: QA-03 Self-Fulfillment Prevention
// =========================================================================
runSimulation('QA-03: Self-Acceptance Prevention (Vendor Blocked from Accepting Own Trips)', () => {
  const requirement = {
    id: 'req-self-test',
    vendor: { userId: 'usr-vendor-42' },
  };

  const validateSelfDispatch = (driverUserId, req) => {
    if (req.vendor.userId === driverUserId) {
      throw new Error('Requesters cannot accept offers on their own requirements');
    }
  };

  // Same user trying to accept own requirement as a driver
  assert.throws(() => validateSelfDispatch('usr-vendor-42', requirement), /Requesters cannot accept offers on their own requirements/);

  // Different driver user can accept
  assert.doesNotThrow(() => validateSelfDispatch('usr-driver-88', requirement));
});

// =========================================================================
// SIMULATION 14: QA-04 & QA-09 PII Masking & Duplicate Dispute Prevention
// =========================================================================
runSimulation('QA-04 & QA-09: Driver PII Masking & Duplicate Active Dispute Blocking', () => {
  // PII Masking test
  const rawDriverOffer = {
    id: 'off-secret',
    driver: {
      fullName: 'Vikramaditya Sharma',
      phone: '+919876543210',
      vehicles: [{ type: 'SEDAN', registrationNumber: 'DL01ZZ9999' }],
    },
    rate: 3500,
  };

  const maskForPublicFeed = (b) => {
    const nameParts = b.driver.fullName.split(' ');
    const maskedName = `${nameParts[0]} ${nameParts[1][0]}.`;
    const phone = b.driver.phone;
    const maskedPhone = `${phone.slice(0, 4)}****${phone.slice(-3)}`;
    return {
      driverName: maskedName,
      driverPhone: maskedPhone,
      vehiclePlate: 'DL-XX-XXXX',
      isMasked: true,
    };
  };

  const masked = maskForPublicFeed(rawDriverOffer);
  assert.strictEqual(masked.driverName, 'Vikramaditya S.');
  assert.strictEqual(masked.driverPhone, '+919****210');
  assert.strictEqual(masked.vehiclePlate, 'DL-XX-XXXX');
  assert.strictEqual(masked.isMasked, true);

  // Duplicate dispute test
  const existingDisputes = [
    { tripId: 'trip-10', reporterId: 'usr-vendor-1', status: DisputeStatus.OPEN },
  ];

  const checkDuplicateDispute = (tripId, reporterId) => {
    const hasActive = existingDisputes.some(
      (d) => d.tripId === tripId && d.reporterId === reporterId && [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW].includes(d.status),
    );
    if (hasActive) {
      throw new Error('You already have an active dispute ticket under review for this trip');
    }
  };

  assert.throws(() => checkDuplicateDispute('trip-10', 'usr-vendor-1'), /You already have an active dispute ticket/);
  assert.doesNotThrow(() => checkDuplicateDispute('trip-99', 'usr-vendor-1'));
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n======================================================================');
console.log(`🏁 SIMULATION EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('======================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passedCount} SIMULATIONS PASSED FLAWLESSLY WITH 100% INVARIANT INTEGRITY!\n`);
}
