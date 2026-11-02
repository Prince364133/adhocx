import {
  TripAggregate,
  TripLifecycleStatus,
  TripStop,
  StopStatus,
  StopType,
  GeoPoint,
  OtpCode,
  DwellBuffer,
  Money,
} from '../src';

describe('TripAggregate & Stop Execution Invariants', () => {
  const officeLocation = GeoPoint.create(17.448293, 78.374128).getValue();
  const stop1Location = GeoPoint.create(17.445000, 78.370000).getValue();
  const stop2Location = GeoPoint.create(17.447000, 78.372000).getValue();

  const stop1Otp = OtpCode.create('4291').getValue();
  const stop2Otp = OtpCode.create('8832').getValue();

  function buildTestTrip(): TripAggregate {
    const stop1 = TripStop.create('stop-1', {
      sequence: 1,
      stopType: StopType.PICKUP,
      passengerEmployeeId: 'EMP-001',
      location: stop1Location,
      plannedEta: new Date('2026-11-15T06:10:00Z'),
      boardingOtp: stop1Otp,
      dwellBuffer: DwellBuffer.standardFiveMinutes(),
      status: StopStatus.PENDING,
    }).getValue();

    const stop2 = TripStop.create('stop-2', {
      sequence: 2,
      stopType: StopType.PICKUP,
      passengerEmployeeId: 'EMP-002',
      location: stop2Location,
      plannedEta: new Date('2026-11-15T06:20:00Z'),
      boardingOtp: stop2Otp,
      dwellBuffer: DwellBuffer.standardFiveMinutes(),
      status: StopStatus.PENDING,
    }).getValue();

    return TripAggregate.create('trip-123', {
      tenantId: 'tenant-corp-x',
      routeId: 'route-456',
      status: TripLifecycleStatus.SCHEDULED,
      stops: [stop1, stop2],
      totalDistanceMeters: 0,
    }).getValue();
  }

  it('should create trip in SCHEDULED state with sorted stops', () => {
    const trip = buildTestTrip();
    expect(trip.status).toBe(TripLifecycleStatus.SCHEDULED);
    expect(trip.stops.length).toBe(2);
    expect(trip.stops[0].sequence).toBe(1);
    expect(trip.stops[1].sequence).toBe(2);
  });

  it('should assign driver and emit TripAssignedEvent', () => {
    const trip = buildTestTrip();
    const result = trip.assignDriver('drv-99', 'veh-88');
    expect(result.isSuccess).toBe(true);
    expect(trip.status).toBe(TripLifecycleStatus.DRIVER_ASSIGNED);
    expect(trip.driverId).toBe('drv-99');

    const events = trip.clearDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe('trip.assigned');
  });

  it('should enforce geofence when driver marks arrival at Stop 1', () => {
    const trip = buildTestTrip();
    trip.assignDriver('drv-99', 'veh-88');

    // 1. Far away point (e.g. 500m away) -> Should FAIL geofence
    const farAway = GeoPoint.create(17.452000, 78.370000).getValue();
    const failArrival = trip.driverArrivedAtStop('stop-1', farAway);
    expect(failArrival.isFailure).toBe(true);
    expect(failArrival.error).toContain('Geofence check failed');

    // 2. Close point (~50m away) -> Should SUCCEED
    const nearby = GeoPoint.create(17.445050, 78.370050).getValue();
    const successArrival = trip.driverArrivedAtStop('stop-1', nearby);
    expect(successArrival.isSuccess).toBe(true);
    expect(trip.status).toBe(TripLifecycleStatus.DRIVER_ARRIVED);
    expect(trip.stops[0].status).toBe(StopStatus.ARRIVED);
  });

  it('should prevent driver from arriving at Stop 2 before Stop 1 is completed', () => {
    const trip = buildTestTrip();
    trip.assignDriver('drv-99', 'veh-88');

    const nearbyStop2 = GeoPoint.create(17.447050, 78.372050).getValue();
    const result = trip.driverArrivedAtStop('stop-2', nearbyStop2);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Stop 1 is not yet completed');
  });

  it('should enforce 5-minute dwell buffer before allowing No-Show', () => {
    const trip = buildTestTrip();
    trip.assignDriver('drv-99', 'veh-88');
    const arrivalTime = new Date('2026-11-15T06:10:00Z');
    trip.driverArrivedAtStop('stop-1', stop1Location, arrivalTime);

    // 1. Attempt No-Show after only 2 minutes (120s) -> Should FAIL!
    const twoMinutesLater = new Date('2026-11-15T06:12:00Z');
    const prematureNoShow = trip.markPassengerNoShow('stop-1', twoMinutesLater);
    expect(prematureNoShow.isFailure).toBe(true);
    expect(prematureNoShow.error).toContain('5-minute wait buffer has not elapsed');
    expect(trip.stops[0].status).toBe(StopStatus.ARRIVED);

    // 2. Attempt No-Show after 5 minutes and 10 seconds (310s) -> Should SUCCEED!
    const fiveMinutesLater = new Date('2026-11-15T06:15:10Z');
    const validNoShow = trip.markPassengerNoShow('stop-1', fiveMinutesLater);
    expect(validNoShow.isSuccess).toBe(true);
    expect(trip.stops[0].status).toBe(StopStatus.NO_SHOW);

    const events = trip.clearDomainEvents();
    const noShowEvent = events.find((e) => e.eventName === 'passenger.no_show');
    expect(noShowEvent).toBeDefined();
  });

  it('should verify boarding with OTP challenge and transition to IN_PROGRESS', () => {
    const trip = buildTestTrip();
    trip.assignDriver('drv-99', 'veh-88');
    trip.driverArrivedAtStop('stop-1', stop1Location);

    // 1. Wrong OTP -> Fails
    const wrongOtpResult = trip.verifyPassengerBoarding('stop-1', '0000');
    expect(wrongOtpResult.isFailure).toBe(true);
    expect(trip.stops[0].status).toBe(StopStatus.ARRIVED);

    // 2. Correct OTP -> Succeeds!
    const validOtpResult = trip.verifyPassengerBoarding('stop-1', '4291');
    expect(validOtpResult.isSuccess).toBe(true);
    expect(trip.stops[0].status).toBe(StopStatus.BOARDED);
    expect(trip.status).toBe(TripLifecycleStatus.IN_PROGRESS);
  });

  it('should complete trip only when all stops are processed', () => {
    const trip = buildTestTrip();
    trip.assignDriver('drv-99', 'veh-88');

    // Stop 1: Boarded
    trip.driverArrivedAtStop('stop-1', stop1Location);
    trip.verifyPassengerBoarding('stop-1', '4291');

    // Attempt completion while Stop 2 is still PENDING -> Fails!
    const prematureCompletion = trip.completeTrip(15000);
    expect(prematureCompletion.isFailure).toBe(true);
    expect(prematureCompletion.error).toContain('Stop 2 (EMP-002) is still PENDING');

    // Stop 2: Arrives & Boards
    trip.driverArrivedAtStop('stop-2', stop2Location);
    trip.verifyPassengerBoarding('stop-2', '8832');

    // Now complete trip -> Succeeds!
    const completeResult = trip.completeTrip(25000, Money.fromRupees(50).getValue());
    expect(completeResult.isSuccess).toBe(true);
    expect(trip.status).toBe(TripLifecycleStatus.COMPLETED);
    expect(trip.totalDistanceMeters).toBe(25000);
  });
});
