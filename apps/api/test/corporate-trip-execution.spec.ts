import { Test, TestingModule } from '@nestjs/testing';
import { CorporateTripExecutionService } from '../src/domains/corporate/execution/corporate-trip-execution.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('Corporate Trip Execution, 5-Min Timer, OTP Boarding & 9h Reschedule', () => {
  let executionService: CorporateTripExecutionService;

  const mockRedisClient = {
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockRedis = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockDb: any = {
    corporateRoute: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    corporateRouteStop: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    corporateEmployee: {
      findUnique: jest.fn(),
    },
    corporateTransportRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotifications = {
    emitEvent: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateTripExecutionService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    executionService = module.get<CorporateTripExecutionService>(CorporateTripExecutionService);
  });

  describe('Geofence Arrival & 5-Minute Timer Initiation', () => {
    it('should successfully mark arrival when driver is within 150m geofence and start 300s timer', async () => {
      const stopCoord = { lat: 17.4504, lng: 78.3808 };
      // Driver is ~40 meters away
      const driverCoord = { driverLatitude: 17.4507, driverLongitude: 78.3808 };

      const mockRoute = {
        id: 'route-exec-1',
        driverId: 'drv-1',
        tenantId: 'tenant-1',
        status: 'ASSIGNED',
        stops: [
          {
            id: 'stop-1',
            stopSequence: 1,
            stopType: 'PICKUP',
            status: 'PENDING',
            latitude: stopCoord.lat,
            longitude: stopCoord.lng,
            boardingOtp: '4829',
            employeeId: 'emp-1',
          },
        ],
      };

      mockDb.corporateRoute.findUnique.mockResolvedValue(mockRoute);
      mockDb.corporateRouteStop.update.mockResolvedValue({ id: 'stop-1', status: 'ARRIVED' });
      mockDb.corporateRoute.update.mockResolvedValue({ ...mockRoute, status: 'IN_TRANSIT' });

      const result = await executionService.arriveAtStop('route-exec-1', 'stop-1', driverCoord);

      expect(result.status).toBe('ARRIVED');
      expect(result.countdownRemainingSeconds).toBe(300);

      // Verify 300s timer initiated in Redis
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'corporate:stop:timer:stop-1',
        expect.any(String),
        'EX',
        300,
      );

      // Verify route marked IN_TRANSIT
      expect(mockDb.corporateRoute.update).toHaveBeenCalledWith({
        where: { id: 'route-exec-1' },
        data: { status: 'IN_TRANSIT' },
      });
    });

    it('should reject arrival when driver is outside 150m geofence', async () => {
      const stopCoord = { lat: 17.4504, lng: 78.3808 };
      // Driver is ~1 km away
      const driverCoord = { driverLatitude: 17.4600, driverLongitude: 78.3808 };

      const mockRoute = {
        id: 'route-exec-2',
        driverId: 'drv-1',
        tenantId: 'tenant-1',
        status: 'ASSIGNED',
        stops: [
          {
            id: 'stop-2',
            stopSequence: 1,
            stopType: 'PICKUP',
            status: 'PENDING',
            latitude: stopCoord.lat,
            longitude: stopCoord.lng,
          },
        ],
      };

      mockDb.corporateRoute.findUnique.mockResolvedValue(mockRoute);

      await expect(
        executionService.arriveAtStop('route-exec-2', 'stop-2', driverCoord),
      ).rejects.toThrow(/Arrival outside geofence/);
    });
  });

  describe('4-Digit Boarding OTP Verification', () => {
    it('should mark stop BOARDED, record departure time, and halt wait timer when valid OTP is provided', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-otp-1',
        routeId: 'route-1',
        status: 'ARRIVED',
        boardingOtp: '7412',
        actualArrivalTime: new Date(),
        transportRequestId: 'req-1',
        employeeId: 'emp-1',
        route: { driverId: 'drv-1' },
      });

      mockDb.corporateRouteStop.update.mockResolvedValue({ id: 'stop-otp-1', status: 'BOARDED' });
      mockDb.corporateTransportRequest.update.mockResolvedValue({ id: 'req-1', status: 'COMPLETED' });

      const result = await executionService.verifyBoardingOtp('route-1', 'stop-otp-1', {
        otpCode: '7412',
      });

      expect(result.status).toBe('BOARDED');
      expect(result.countdownRemainingSeconds).toBe(0);

      // Verify wait timer cancelled in Redis
      expect(mockRedisClient.del).toHaveBeenCalledWith('corporate:stop:timer:stop-otp-1');

      // Verify transport request marked COMPLETED
      expect(mockDb.corporateTransportRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should reject boarding when invalid OTP is provided', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-otp-2',
        routeId: 'route-1',
        status: 'ARRIVED',
        boardingOtp: '7412',
        route: { driverId: 'drv-1' },
      });

      await expect(
        executionService.verifyBoardingOtp('route-1', 'stop-otp-2', { otpCode: '9999' }),
      ).rejects.toThrow(/Invalid boarding OTP/);
    });
  });

  describe('5-Minute Wait Buffer & No-Show Lifecycle', () => {
    it('should prevent marking No-Show before 5-minute wait window has elapsed', async () => {
      // Arrived only 2 minutes (120s) ago
      const recentArrivalTime = new Date(Date.now() - 120 * 1000);

      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-ns-1',
        routeId: 'route-1',
        status: 'ARRIVED',
        actualArrivalTime: recentArrivalTime,
        route: { driverId: 'drv-1' },
      });

      await expect(
        executionService.markNoShow('route-1', 'stop-ns-1', {}),
      ).rejects.toThrow(/Cannot mark No-Show before 5-minute wait window has elapsed/);
    });

    it('should mark stop as NO_SHOW and instruct driver to depart immediately after 5 minutes have elapsed', async () => {
      // Arrived 6 minutes (360s) ago
      const expiredArrivalTime = new Date(Date.now() - 360 * 1000);

      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-ns-2',
        routeId: 'route-1',
        status: 'ARRIVED',
        actualArrivalTime: expiredArrivalTime,
        transportRequestId: 'req-ns-2',
        employeeId: 'emp-ns-2',
        employee: { fullName: 'No Show Employee', employeeCode: 'EMP999' },
        route: { tenantId: 'tenant-1', driverId: 'drv-1' },
      });

      mockDb.corporateRouteStop.update.mockResolvedValue({ id: 'stop-ns-2', status: 'NO_SHOW' });
      mockDb.corporateTransportRequest.update.mockResolvedValue({ id: 'req-ns-2', status: 'UNSERVED' });

      const result = await executionService.markNoShow('route-1', 'stop-ns-2', {
        reason: 'Passenger did not arrive within 5 minutes',
      });

      expect(result.status).toBe('NO_SHOW');

      // Request updated to UNSERVED
      expect(mockDb.corporateTransportRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-ns-2' },
        data: { status: 'UNSERVED' },
      });

      // Attendance No-Show event dispatched
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'corporate:tenant-1',
        'ATTENDANCE_NO_SHOW',
        expect.objectContaining({
          employeeId: 'emp-ns-2',
          reason: 'Passenger did not arrive within 5 minutes',
        }),
      );
    });
  });

  describe('Dynamic QR Code Boarding System', () => {
    it('should generate a signed dynamic QR code payload with 300s TTL', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-qr-1',
        routeId: 'route-qr-1',
        employeeId: 'emp-qr-1',
        boardingOtp: '7192',
        route: { id: 'route-qr-1' },
      });

      const result = await executionService.generateBoardingQrToken('route-qr-1', 'stop-qr-1');

      expect(result.stopId).toBe('stop-qr-1');
      expect(result.qrPayload).toBeDefined();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'corporate:stop:qr:stop-qr-1',
        result.qrPayload,
        'EX',
        300,
      );

      const decoded = JSON.parse(Buffer.from(result.qrPayload, 'base64').toString('utf-8'));
      expect(decoded.otp).toBe('7192');
      expect(decoded.routeId).toBe('route-qr-1');
    });

    it('should verify QR code scan and transition stop to BOARDED', async () => {
      const stopCoord = { lat: 17.4504, lng: 78.3808 };
      const driverCoord = { driverLatitude: 17.4506, driverLongitude: 78.3808 }; // ~22m away

      const qrPayload = Buffer.from(
        JSON.stringify({
          stopId: 'stop-qr-2',
          routeId: 'route-qr-2',
          employeeId: 'emp-qr-2',
          otp: '9911',
          expiresAtMs: Date.now() + 180000,
        }),
      ).toString('base64');

      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-qr-2',
        routeId: 'route-qr-2',
        status: 'ARRIVED',
        latitude: stopCoord.lat,
        longitude: stopCoord.lng,
        boardingOtp: '9911',
        route: { driverId: 'drv-qr-1' },
      });
      mockDb.corporateRouteStop.update.mockResolvedValue({ id: 'stop-qr-2', status: 'BOARDED' });

      const result = await executionService.verifyBoardingQr('route-qr-2', 'stop-qr-2', {
        qrPayload,
        ...driverCoord,
      });

      expect(result.status).toBe('BOARDED');
      expect(mockDb.corporateRouteStop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stop-qr-2' },
          data: expect.objectContaining({ status: 'BOARDED' }),
        }),
      );
    });

    it('should reject QR code if driver is outside the 150m geofence', async () => {
      const stopCoord = { lat: 17.4504, lng: 78.3808 };
      const farDriverCoord = { driverLatitude: 17.4600, driverLongitude: 78.3900 }; // >1km away

      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-qr-3',
        routeId: 'route-qr-3',
        status: 'ARRIVED',
        latitude: stopCoord.lat,
        longitude: stopCoord.lng,
        boardingOtp: '1234',
        route: { driverId: 'drv-qr-1' },
      });

      const qrPayload = Buffer.from(
        JSON.stringify({
          stopId: 'stop-qr-3',
          routeId: 'route-qr-3',
          otp: '1234',
          expiresAtMs: Date.now() + 100000,
        }),
      ).toString('base64');

      await expect(
        executionService.verifyBoardingQr('route-qr-3', 'stop-qr-3', {
          qrPayload,
          ...farDriverCoord,
        }),
      ).rejects.toThrow(/QR verification outside geofence/);
    });
  });

  describe('Live Route Telemetry Ingestion & Turn-by-Turn Waypoints', () => {
    it('should ingest telemetry, compute ETA to next stop, and emit WebSocket event', async () => {
      const mockRoute = {
        id: 'route-telem-1',
        office: { id: 'off-1', name: 'HQ', latitude: 17.44, longitude: 78.37, addressText: 'HQ' },
        stops: [
          {
            id: 'stop-t-1',
            stopSequence: 1,
            status: 'BOARDED',
            latitude: 17.45,
            longitude: 78.38,
          },
          {
            id: 'stop-t-2',
            stopSequence: 2,
            status: 'PENDING',
            latitude: 17.46,
            longitude: 78.39,
          },
        ],
      };

      mockDb.corporateRoute.findUnique.mockResolvedValue(mockRoute);

      const result = await executionService.ingestRouteTelemetry('route-telem-1', {
        latitude: 17.455,
        longitude: 78.385,
        speedMps: 10,
        headingDeg: 45,
      });

      expect(result.nextStopSequence).toBe(2);
      expect(result.distToNextStopMeters).toBeGreaterThan(0);
      expect(result.etaMinutes).toBeGreaterThan(0);
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'route:route-telem-1',
        'CORPORATE_ROUTE_TELEMETRY',
        expect.objectContaining({
          routeId: 'route-telem-1',
          nextStopSequence: 2,
        }),
      );
    });

    it('should retrieve ordered waypoints for driver GPS navigation', async () => {
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-wp-1',
        direction: 'LOGIN',
        status: 'IN_TRANSIT',
        office: { id: 'off-1', name: 'Campus A', latitude: 17.44, longitude: 78.38, addressText: 'Main St' },
        stops: [
          {
            id: 'stop-1',
            stopSequence: 1,
            stopType: 'PICKUP',
            status: 'BOARDED',
            latitude: 17.47,
            longitude: 78.40,
            plannedEta: new Date(),
            employee: { fullName: 'First Commuter', locations: [{ addressText: 'Stop 1 Address' }] },
          },
          {
            id: 'stop-2',
            stopSequence: 2,
            stopType: 'PICKUP',
            status: 'PENDING',
            latitude: 17.46,
            longitude: 78.39,
            plannedEta: new Date(),
            employee: { fullName: 'Second Commuter', locations: [{ addressText: 'Stop 2 Address' }] },
          },
        ],
      });

      const result = await executionService.getRouteWaypoints('route-wp-1');

      expect(result.routeId).toBe('route-wp-1');
      expect(result.stops.length).toBe(2);
      expect(result.stops[0].employeeName).toBe('First Commuter');
      expect(result.officeHub.name).toBe('Campus A');
    });
  });

  describe('9-Hour Shift Reschedule & Cancellation Cutoff Rule', () => {
    it('should allow cancellation when submitted > 9 hours before scheduled shift', async () => {
      // Scheduled 24 hours from now
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockDb.corporateTransportRequest.findUnique.mockResolvedValue({
        id: 'req-cutoff-1',
        employeeId: 'emp-cust-1',
        scheduledDate: futureDate,
        shiftTime: '08:00',
        status: 'APPROVED',
      });

      mockDb.corporateTransportRequest.update.mockResolvedValue({
        id: 'req-cutoff-1',
        status: 'CANCELLED',
      });

      const result = await executionService.handleRescheduleOrCancel('req-cutoff-1', {
        employeeId: 'emp-cust-1',
        action: 'CANCEL',
      });

      expect(result.status).toBe('CANCELLED');
    });

    it('should reject reschedule or cancellation when submitted < 9 hours before scheduled shift', async () => {
      // Scheduled only 4 hours from now
      const nearFutureDate = new Date(Date.now() + 4 * 60 * 60 * 1000);

      mockDb.corporateTransportRequest.findUnique.mockResolvedValue({
        id: 'req-cutoff-2',
        employeeId: 'emp-cust-1',
        scheduledDate: nearFutureDate,
        shiftTime: '08:00',
        status: 'APPROVED',
      });

      await expect(
        executionService.handleRescheduleOrCancel('req-cutoff-2', {
          employeeId: 'emp-cust-1',
          action: 'CANCEL',
        }),
      ).rejects.toThrow(/Modification locked: Rescheduling and cancellations must be submitted at least 9 hours/);
    });
  });
});

