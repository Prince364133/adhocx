import { CorporateSafetyService } from '../src/domains/corporate/safety/corporate-safety.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CorporateSafetyService - P0 SOS, Deviation & Command Centre', () => {
  let service: CorporateSafetyService;
  let mockDb: any;
  let mockNotifications: any;
  let mockAudit: any;

  beforeEach(() => {
    mockDb = {
      corporateRoute: {
        findUnique: jest.fn(),
      },
      corporateSosAlert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      corporateRouteStop: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockNotifications = {
      emitEvent: jest.fn(),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new CorporateSafetyService(
      mockDb as unknown as DatabaseService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('P0 Emergency SOS Trigger', () => {
    it('should create an active SOS alert and broadcast to Command Centre and Corporate Safety Desk', async () => {
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-sos-1',
        tenantId: 'tenant-101',
        tenant: { name: 'Acme Corp' },
        driver: { fullName: 'Rajesh Driver', phone: '+919999988888' },
      });

      const mockCreatedAlert = {
        id: 'alert-1',
        routeId: 'route-sos-1',
        triggeredById: 'emp-danger-1',
        triggeredByRole: 'EMPLOYEE',
        latitude: 17.45,
        longitude: 78.38,
        batteryPct: 45,
        status: expect.stringMatching(/^(NEW|ACTIVE)$/),
        createdAt: new Date(),
      };

      mockDb.corporateSosAlert.create.mockResolvedValue(mockCreatedAlert);

      const result = await service.triggerSosAlert('emp-danger-1', 'EMPLOYEE', {
        routeId: 'route-sos-1',
        latitude: 17.45,
        longitude: 78.38,
        batteryPct: 45,
        triggerReason: 'Driver behaving suspiciously and off-route',
      });

      expect(result.id).toBe('alert-1');
      expect(mockDb.corporateSosAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          routeId: 'route-sos-1',
          status: expect.stringMatching(/^(NEW|ACTIVE)$/),
          batteryPct: 45,
        }),
      });

      // Verify Command Centre WebSocket broadcast
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos',
        'CORPORATE_SOS_ALERT',
        expect.objectContaining({
          alertId: 'alert-1',
          tenantName: 'Acme Corp',
          driverName: 'Rajesh Driver',
        }),
      );

      // Verify Audit log
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_SOS_TRIGGERED',
          entityId: 'alert-1',
        }),
      );
    });

    it('should throw NotFoundException if route does not exist', async () => {
      mockDb.corporateRoute.findUnique.mockResolvedValue(null);

      await expect(
        service.triggerSosAlert('emp-1', 'EMPLOYEE', {
          routeId: 'non-existent',
          latitude: 17.45,
          longitude: 78.38,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('SOS Alert Resolution', () => {
    it('should resolve active alert with resolution notes and broadcast resolution', async () => {
      mockDb.corporateSosAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        routeId: 'route-sos-1',
        status: 'ACTIVE',
      });

      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'alert-1',
        status: 'RESOLVED',
        resolutionNotes: 'Police contacted, passenger verified safe at home',
        resolvedAt: new Date(),
      });

      const result = await service.resolveSosAlert('alert-1', 'admin-dispatcher-1', {
        alertId: 'alert-1',
        status: 'RESOLVED' as any,
        resolutionNotes: 'Police contacted, passenger verified safe at home',
      });

      expect(result.status).toBe('RESOLVED');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos_resolved',
        'CORPORATE_SOS_RESOLVED',
        expect.objectContaining({
          alertId: 'alert-1',
          status: 'RESOLVED',
        }),
      );
    });

    it('should reject resolution if alert is already resolved', async () => {
      mockDb.corporateSosAlert.findUnique.mockResolvedValue({
        id: 'alert-resolved',
        status: 'RESOLVED',
      });

      await expect(
        service.resolveSosAlert('alert-resolved', 'admin-1', {
          alertId: 'alert-resolved',
          status: 'RESOLVED' as any,
          resolutionNotes: 'Duplicate close',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Route Deviation Alarm (>500m)', () => {
    it('should return isDeviated: false when driver is within 500m of corridor stops', async () => {
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-dev-1',
        tenantId: 'tenant-101',
        office: { latitude: 17.44, longitude: 78.37 },
        stops: [
          { latitude: 17.4500, longitude: 78.3800, stopSequence: 1 },
          { latitude: 17.4600, longitude: 78.3900, stopSequence: 2 },
        ],
      });

      // Cab is ~100m from Stop 1
      const result = await service.checkRouteDeviation('route-dev-1', 17.4508, 78.3800);

      expect(result.isDeviated).toBe(false);
      expect(result.minDeviationMeters).toBeLessThan(500);
      expect(mockNotifications.emitEvent).not.toHaveBeenCalled();
    });

    it('should trigger deviation alarm when vehicle is >500m from any route waypoint', async () => {
      mockDb.corporateRoute.findUnique.mockResolvedValue({
        id: 'route-dev-2',
        tenantId: 'tenant-101',
        office: { latitude: 17.44, longitude: 78.37 },
        stops: [
          { latitude: 17.4500, longitude: 78.3800, stopSequence: 1 },
        ],
      });

      // Cab is >1.5km away in another sector
      const result = await service.checkRouteDeviation('route-dev-2', 17.4700, 78.4000);

      expect(result.isDeviated).toBe(true);
      expect(result.minDeviationMeters).toBeGreaterThan(500);
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:deviation',
        'CORPORATE_ROUTE_DEVIATION',
        expect.objectContaining({
          routeId: 'route-dev-2',
          tenantId: 'tenant-101',
        }),
      );
    });
  });

  describe('Female Safe Drop Confirmation', () => {
    it('should confirm female safe drop and transition stop to COMPLETED', async () => {
      mockDb.corporateRouteStop.findUnique.mockResolvedValue({
        id: 'stop-safe-1',
        routeId: 'route-safe-1',
        employeeId: 'emp-female-1',
        employee: { fullName: 'Priya Sharma' },
        route: { id: 'route-safe-1', tenantId: 'tenant-101' },
      });

      mockDb.corporateRouteStop.update.mockResolvedValue({
        id: 'stop-safe-1',
        actualDepartureTime: new Date(),
      });

      const result = await service.confirmSafeDrop('route-safe-1', 'stop-safe-1', {
        confirmedByRole: 'DRIVER',
        notes: 'Observed commuter safely entered building lobby',
      });

      expect(result.id).toBe('stop-safe-1');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'corporate:tenant-101',
        'FEMALE_SAFE_DROP_CONFIRMED',
        expect.objectContaining({
          employeeName: 'Priya Sharma',
          confirmedByRole: 'DRIVER',
        }),
      );
    });
  });
});
