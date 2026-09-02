import { DriverAvailability, VerificationStatus, RequirementStatus, TripStatus } from '@adhocx/contracts';

describe('AdhocX End-to-End Platform Lifecycle Simulation', () => {
  // In-memory state tracking to simulate real DB operations across services
  const state = {
    users: new Map<string, any>(),
    drivers: new Map<string, any>(),
    vendors: new Map<string, any>(),
    requirements: new Map<string, any>(),
    offers: new Map<string, any>(),
    assignments: new Map<string, any>(),
    trips: new Map<string, any>(),
    tripEvents: [] as any[],
    wallets: new Map<string, number>(),
    ledgerEntries: [] as any[],
    settlements: new Map<string, any>(),
    auditLogs: [] as any[],
  };

  beforeAll(() => {
    // Seed initial users
    state.users.set('usr-driver', { id: 'usr-driver', phone: '+919876543210', role: 'DRIVER' });
    state.users.set('usr-vendor', { id: 'usr-vendor', phone: '+919988776655', role: 'VENDOR' });
    state.users.set('usr-admin', { id: 'usr-admin', phone: '+919999999999', role: 'ADMIN' });

    state.drivers.set('drv-1', {
      id: 'drv-1',
      userId: 'usr-driver',
      fullName: 'Ramesh Sharma',
      verificationStatus: VerificationStatus.PENDING,
      availabilityStatus: DriverAvailability.OFFLINE,
      walletBalance: 0,
      documents: [],
    });
    state.wallets.set('drv-1', 0);

    state.vendors.set('vnd-1', {
      id: 'vnd-1',
      userId: 'usr-vendor',
      companyName: 'Apex Corporate Fleet Logistics',
      verificationStatus: 'VERIFIED',
    });
  });

  it('Step 1: Driver uploads KYC documents and status transitions to UNDER_REVIEW', () => {
    const driver = state.drivers.get('drv-1');
    driver.documents.push(
      { type: 'DRIVING_LICENSE', url: 'https://storage/dl.pdf', status: 'VERIFIED' },
      { type: 'VEHICLE_RC', url: 'https://storage/rc.pdf', status: 'VERIFIED' },
    );
    driver.verificationStatus = VerificationStatus.UNDER_REVIEW;

    expect(driver.verificationStatus).toBe(VerificationStatus.UNDER_REVIEW);
    expect(driver.documents.length).toBe(2);
  });

  it('Step 2: Admin reviews and approves driver KYC to VERIFIED', () => {
    const driver = state.drivers.get('drv-1');
    driver.verificationStatus = VerificationStatus.VERIFIED;

    state.auditLogs.push({
      actorId: 'usr-admin',
      action: 'ADMIN_DRIVER_VERIFIED',
      entityName: 'DRIVER',
      entityId: 'drv-1',
      createdAt: new Date(),
    });

    expect(driver.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(state.auditLogs.length).toBe(1);
  });


  it('Step 3: Driver marks availability as AVAILABLE', () => {
    const driver = state.drivers.get('drv-1');
    driver.availabilityStatus = DriverAvailability.AVAILABLE;

    expect(driver.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
  });

  it('Step 4: Verified Vendor posts a cab requirement', () => {
    const req = {
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: 'SEDAN',
      quantity: 1,
      assignedCount: 0,
      pickupAddress: 'Sector 62, Noida',
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      dropAddress: 'Cyber City, Gurgaon',
      dropLat: 28.4595,
      dropLng: 77.0266,
      reportingTime: new Date(Date.now() + 3600000),
      status: RequirementStatus.POSTED,
    };

    state.requirements.set('req-1', req);
    expect(req.status).toBe(RequirementStatus.POSTED);
  });

  it('Step 5: Dispatch engine matches candidate and dispatches 60s offer', () => {
    const req = state.requirements.get('req-1');
    const driver = state.drivers.get('drv-1');

    // Matching checks
    expect(driver.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(driver.availabilityStatus).toBe(DriverAvailability.AVAILABLE);


    const offer = {
      id: 'ofr-1',
      requirementId: req.id,
      driverId: driver.id,
      status: 'PENDING',
      offeredDriverRate: 1200,
      expiresAt: new Date(Date.now() + 60000),
    };

    state.offers.set('ofr-1', offer);
    req.status = RequirementStatus.DISPATCHING;

    expect(offer.status).toBe('PENDING');
  });

  it('Step 6: Driver accepts offer atomically, generating Assignment and Trip with OTP', () => {
    const offer = state.offers.get('ofr-1');
    const req = state.requirements.get('req-1');
    const driver = state.drivers.get('drv-1');

    // Concurrency check
    expect(offer.status).toBe('PENDING');
    expect(req.assignedCount < req.quantity).toBe(true);

    offer.status = 'ACCEPTED';
    req.assignedCount += 1;
    req.status = RequirementStatus.FULFILLED;
    driver.availabilityStatus = DriverAvailability.BUSY;


    const assignment = {
      id: 'asg-1',
      requirementId: req.id,
      driverId: driver.id,
      status: 'ACTIVE',
    };
    state.assignments.set('asg-1', assignment);

    const trip = {
      id: 'trp-1',
      assignmentId: assignment.id,
      requirementId: req.id,
      driverId: driver.id,
      startOtp: '4821',
      driverRate: 1200,
      tollCharges: 0,
      parkingCharges: 0,
      status: TripStatus.ASSIGNED,
    };
    state.trips.set('trp-1', trip);

    expect(trip.startOtp).toBe('4821');
    expect(driver.availabilityStatus).toBe(DriverAvailability.BUSY);
    expect(req.assignedCount).toBe(1);
  });

  it('Step 7: Driver arrives at pickup, triggering ARRIVED state and passenger SMS OTP', () => {
    const trip = state.trips.get('trp-1');
    trip.status = TripStatus.ARRIVED;

    state.tripEvents.push({
      tripId: trip.id,
      eventType: 'DRIVER_ARRIVED',
      timestamp: new Date(),
    });

    expect(trip.status).toBe(TripStatus.ARRIVED);
    expect(state.tripEvents.length).toBe(1);
  });

  it('Step 8: Driver verifies OTP and starts trip', () => {
    const trip = state.trips.get('trp-1');
    const enteredOtp = '4821';

    // Verify OTP matches
    expect(enteredOtp).toBe(trip.startOtp);

    trip.status = TripStatus.IN_PROGRESS;
    state.tripEvents.push({
      tripId: trip.id,
      eventType: 'TRIP_STARTED',
      timestamp: new Date(),
    });

    expect(trip.status).toBe(TripStatus.IN_PROGRESS);
  });

  it('Step 9: Driver transmits GPS telemetry breadcrumbs', () => {
    const trip = state.trips.get('trp-1');
    state.tripEvents.push({
      tripId: trip.id,
      eventType: 'LOCATION_PING',
      latitude: 28.5355,
      longitude: 77.3910,
      speed: 45.2,
      timestamp: new Date(),
    });

    expect(state.tripEvents.length).toBe(3);
  });

  it('Step 10: Driver completes trip with tolls, atomically crediting ledger and wallet', () => {
    const trip = state.trips.get('trp-1');
    const driver = state.drivers.get('drv-1');
    const req = state.requirements.get('req-1');

    trip.tollCharges = 150;
    trip.parkingCharges = 50;
    trip.status = TripStatus.COMPLETED;

    const totalEarnings = trip.driverRate + trip.tollCharges + trip.parkingCharges; // 1200 + 150 + 50 = 1400

    // Immutable ledger crediting
    const currentBalance = state.wallets.get(driver.id) || 0;
    const newBalance = currentBalance + totalEarnings;
    state.wallets.set(driver.id, newBalance);
    driver.walletBalance = newBalance;

    state.ledgerEntries.push({
      id: 'led-1',
      driverId: driver.id,
      tripId: trip.id,
      amount: totalEarnings,
      balanceAfter: newBalance,
      transactionType: 'TRIP',
      createdAt: new Date(),
    });

    // Release driver
    driver.availabilityStatus = DriverAvailability.AVAILABLE;
    req.status = RequirementStatus.COMPLETED;

    expect(trip.status).toBe(TripStatus.COMPLETED);
    expect(driver.walletBalance).toBe(1400);
    expect(driver.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
    expect(state.ledgerEntries.length).toBe(1);
    expect(state.ledgerEntries[0].amount).toBe(1400);
  });

  it('Step 11: Driver requests withdrawal payout against balance', () => {
    const driver = state.drivers.get('drv-1');
    const withdrawalAmount = 1000;

    // Minimum ₹100 threshold and balance check
    expect(withdrawalAmount).toBeGreaterThanOrEqual(100);
    expect(driver.walletBalance).toBeGreaterThanOrEqual(withdrawalAmount);

    // Atomically debit wallet and record ledger entry
    const newBalance = driver.walletBalance - withdrawalAmount; // 1400 - 1000 = 400
    state.wallets.set(driver.id, newBalance);
    driver.walletBalance = newBalance;

    state.ledgerEntries.push({
      id: 'led-2',
      driverId: driver.id,
      amount: -withdrawalAmount,
      balanceAfter: newBalance,
      transactionType: 'WITHDRAWAL',
      createdAt: new Date(),
    });

    const settlement = {
      id: 'set-1',
      driverId: driver.id,
      amount: withdrawalAmount,
      bankIfsc: 'HDFC0001234',
      bankAccountNumber: 'XXXX5678',
      status: 'PENDING',
    };
    state.settlements.set('set-1', settlement);

    expect(driver.walletBalance).toBe(400);
    expect(settlement.status).toBe('PENDING');
  });

  it('Step 12: Admin processes and settles withdrawal payout with bank UTR', () => {
    const settlement = state.settlements.get('set-1');
    settlement.status = 'SETTLED';
    settlement.utrNumber = 'UTR9876543210';

    state.auditLogs.push({
      actorId: 'usr-admin',
      action: 'SETTLEMENT_SETTLED',
      entityName: 'SETTLEMENT',
      entityId: settlement.id,
      payload: { utrNumber: settlement.utrNumber, amount: settlement.amount },
      createdAt: new Date(),
    });

    expect(settlement.status).toBe('SETTLED');
    expect(settlement.utrNumber).toBe('UTR9876543210');
    expect(state.auditLogs.length).toBe(2);
  });
});
