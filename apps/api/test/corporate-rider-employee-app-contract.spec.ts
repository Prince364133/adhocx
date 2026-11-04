import { CorporateRiderService } from '../src/domains/corporate/rider/corporate-rider.service';

/**
 * Contract fixes the employee app (apps/employee) depends on:
 *  1. /corporate/me/schedule exposes the SAME cutoff the reschedule/cancel endpoint enforces
 *     (pickup anchor, tenant policy, IST) as pickupAt / cancelCutoffAt / canModify.
 *  2. /corporate/me/trips/:id/tracking reads the GPS key the ingest pipeline actually writes and
 *     reports LIVE / STALE / OFFLINE by device time (never fresh when the timestamp is missing).
 *  3. No fabricated vehicle details; NO_SHOW reason is returned in trip history.
 *
 * All wall-clock times are written in IST (+05:30) so the suite is TZ independent.
 */
describe('Corporate rider API: employee app contract', () => {
  const tenant = { id: 'tenant-1', code: 'ACME', name: 'Acme' };
  const office = { id: 'office-1', name: 'HQ', addressText: 'HITEC City', latitude: 17.44, longitude: 78.37 };
  const employee = {
    id: 'emp-1',
    userId: 'user-1',
    tenantId: tenant.id,
    employeeCode: 'E-1',
    fullName: 'Asha Rao',
    gender: 'FEMALE',
    tenant,
    office,
    locations: [{ addressText: 'Madhapur', latitude: 17.45, longitude: 78.39 }],
  };

  let db: any;
  let redisClient: any;
  let service: CorporateRiderService;

  const build = () =>
    new CorporateRiderService(
      db,
      { getClient: () => redisClient } as any,
      { emitEvent: jest.fn() } as any,
      { log: jest.fn() } as any,
      {} as any,
    );

  beforeEach(() => {
    redisClient = { get: jest.fn().mockResolvedValue(null), ttl: jest.fn().mockResolvedValue(-2) };
    db = {
      corporateEmployee: { findFirst: jest.fn().mockResolvedValue(employee) },
      corporateTransportRequest: { findMany: jest.fn() },
      corporateRouteStop: { findFirst: jest.fn(), findMany: jest.fn() },
      corporateTenantPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = build();
  });

  afterEach(() => jest.useRealTimers());

  describe('schedule cutoff', () => {
    const request = (over: Record<string, any> = {}) => ({
      id: 'req-1',
      tenantId: tenant.id,
      scheduledDate: new Date('2026-11-05T00:00:00.000Z'),
      shiftTime: '08:00',
      direction: 'LOGIN',
      status: 'PLANNED',
      routeStop: {
        status: 'PENDING',
        // 07:00 IST home pickup on 2026-11-05
        plannedEta: new Date('2026-11-05T07:00:00+05:30'),
        route: { id: 'route-1', status: 'PLANNED', office, vehicleCategory: 'SEDAN' },
      },
      ...over,
    });

    it('anchors the cutoff on the planned pickup (07:00 IST -> 22:00 IST previous day)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-04T21:59:00+05:30'));
      db.corporateTransportRequest.findMany.mockResolvedValue([request()]);

      const res = await service.getRiderSchedule('user-1');
      const item = res.schedule[0];

      expect(item.pickupAt).toBe(new Date('2026-11-05T07:00:00+05:30').toISOString());
      expect(item.cancelCutoffAt).toBe(new Date('2026-11-04T22:00:00+05:30').toISOString());
      expect(item.cutoffHours).toBe(9);
      expect(item.canModify).toBe(true);
      expect(item.canCancel).toBe(true);
      expect(item.canReschedule).toBe(true);
    });

    it('locks one minute after the cutoff even though the shift (08:00) is still > 9 h away', async () => {
      // Old behaviour compared against the 08:00 shift time and wrongly allowed this.
      jest.useFakeTimers().setSystemTime(new Date('2026-11-04T22:01:00+05:30'));
      db.corporateTransportRequest.findMany.mockResolvedValue([request()]);

      const item = (await service.getRiderSchedule('user-1')).schedule[0];

      expect(item.canModify).toBe(false);
      expect(item.canCancel).toBe(false);
    });

    it('applies the tenant policy cutoff hours', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-04T23:30:00+05:30'));
      db.corporateTenantPolicy.findFirst.mockResolvedValue({ cancelCutoffHours: 6 });
      db.corporateTransportRequest.findMany.mockResolvedValue([request()]);

      const item = (await service.getRiderSchedule('user-1')).schedule[0];

      expect(item.cutoffHours).toBe(6);
      expect(item.cancelCutoffAt).toBe(new Date('2026-11-05T01:00:00+05:30').toISOString());
      expect(item.canModify).toBe(true);
    });

    it('never allows modifying a request that is already in progress', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00+05:30'));
      db.corporateTransportRequest.findMany.mockResolvedValue([request({ status: 'IN_PROGRESS' })]);

      const item = (await service.getRiderSchedule('user-1')).schedule[0];

      expect(item.canModify).toBe(false);
    });
  });

  describe('tracking GPS freshness', () => {
    const now = new Date('2026-11-05T06:50:00+05:30');
    const stop = (over: Record<string, any> = {}) => ({
      id: 'stop-1',
      routeId: 'route-1',
      latitude: 17.45,
      longitude: 78.39,
      status: 'PENDING',
      boardingOtp: '4821',
      plannedEta: new Date('2026-11-05T07:00:00+05:30'),
      actualArrivalTime: null,
      dwellBufferSeconds: 300,
      route: {
        id: 'route-1',
        driverId: 'drv-1',
        direction: 'LOGIN',
        status: 'IN_TRANSIT',
        vehicleCategory: 'SEDAN',
        office,
        driver: { id: 'drv-1', fullName: 'Ravi', phone: '+919999999999', averageRating: 4.8, vehiclePlate: null, vehicleModel: null },
        vehicle: { id: 'veh-1', registrationNumber: 'TS09UB4410', model: 'Dzire' },
        stops: [{ id: 'stop-1' }],
        sosAlerts: [],
      },
      ...over,
    });
    const fix = (recordedAt: string) =>
      JSON.stringify({ latitude: 17.446, longitude: 78.389, speedMps: 8, headingDeg: 90, recordedAt });

    beforeEach(() => jest.useFakeTimers().setSystemTime(now));

    it('reads the ingest key corporate:route:telemetry:{routeId} and reports LIVE for a 20 s old fix', async () => {
      db.corporateRouteStop.findFirst.mockResolvedValue(stop());
      redisClient.get.mockImplementation(async (key: string) =>
        key === 'corporate:route:telemetry:route-1' ? fix(new Date(now.getTime() - 20_000).toISOString()) : null,
      );

      const t = await service.getRiderTripTracking('user-1', 'stop-1');

      expect(t.gpsState).toBe('LIVE');
      expect(t.lastFixAgeSec).toBe(20);
      expect(t.driverLocation?.latitude).toBe(17.446);
      expect(t.estimatedArrivalMinutes).toBeGreaterThanOrEqual(1);
    });

    it('reports STALE (not LIVE) for a 2 minute old fix and OFFLINE without a fix', async () => {
      db.corporateRouteStop.findFirst.mockResolvedValue(stop());
      redisClient.get.mockResolvedValueOnce(fix(new Date(now.getTime() - 120_000).toISOString()));
      expect((await service.getRiderTripTracking('user-1', 'stop-1')).gpsState).toBe('STALE');

      redisClient.get.mockResolvedValue(null);
      const offline = await service.getRiderTripTracking('user-1', 'stop-1');
      expect(offline.gpsState).toBe('OFFLINE');
      expect(offline.driverLocation).toBeNull();
      expect(offline.estimatedArrivalMinutes).toBeNull();
    });

    it('ignores a legacy fix without a timestamp instead of stamping it with the server time', async () => {
      db.corporateRouteStop.findFirst.mockResolvedValue(stop());
      redisClient.get.mockImplementation(async (key: string) =>
        key === 'driver:location:drv-1' ? JSON.stringify({ latitude: 17.4, longitude: 78.3 }) : null,
      );

      const t = await service.getRiderTripTracking('user-1', 'stop-1');

      expect(t.driverLocation).toBeNull();
      expect(t.gpsState).toBe('OFFLINE');
    });

    it('derives the 5-minute dwell countdown from the arrival time when no Redis timer exists', async () => {
      db.corporateRouteStop.findFirst.mockResolvedValue(
        stop({ status: 'ARRIVED', actualArrivalTime: new Date(now.getTime() - 100_000) }),
      );

      const t = await service.getRiderTripTracking('user-1', 'stop-1');

      expect(t.isDriverArrived).toBe(true);
      expect(t.dwellRemainingSeconds).toBe(200);
    });

    it('uses the assigned route vehicle and returns null instead of a placeholder plate', async () => {
      db.corporateRouteStop.findFirst.mockResolvedValueOnce(stop());
      const withVehicle = await service.getRiderTripTracking('user-1', 'stop-1');
      expect(withVehicle.vehicle?.plateNumber).toBe('TS09UB4410');
      expect(withVehicle.vehicle?.model).toBe('Dzire');

      const bare = stop();
      bare.route = { ...bare.route, vehicle: null } as any;
      db.corporateRouteStop.findFirst.mockResolvedValueOnce(bare);
      const noVehicle = await service.getRiderTripTracking('user-1', 'stop-1');
      expect(noVehicle.vehicle).toBeNull();
    });
  });

  describe('trip history', () => {
    it('returns the persisted no-show reason and no fabricated vehicle', async () => {
      db.corporateRouteStop.findMany.mockResolvedValue([
        {
          id: 'stop-9',
          stopSequence: 2,
          stopType: 'PICKUP',
          status: 'NO_SHOW',
          noShowReason: 'Not at the pickup point within the 5-minute wait window',
          plannedEta: new Date('2026-11-04T07:00:00+05:30'),
          actualArrivalTime: new Date('2026-11-04T07:01:00+05:30'),
          actualDepartureTime: new Date('2026-11-04T07:06:00+05:30'),
          boardingOtp: '1111',
          transportRequestId: 'req-9',
          route: {
            id: 'route-9',
            shiftDate: new Date('2026-11-04T00:00:00.000Z'),
            shiftTime: '08:00',
            direction: 'LOGIN',
            status: 'COMPLETED',
            vehicleCategory: 'SEDAN',
            office,
            driver: { id: 'drv-1', fullName: 'Ravi', phone: null, averageRating: 4.8, vehiclePlate: '', vehicleModel: null },
            vehicle: null,
          },
          feedback: null,
        },
      ]);

      const [trip] = await service.getRiderTrips('user-1');

      expect(trip.status).toBe('NO_SHOW');
      expect(trip.noShowReason).toContain('5-minute');
      expect(trip.vehicle).toBeNull();
    });
  });
});
