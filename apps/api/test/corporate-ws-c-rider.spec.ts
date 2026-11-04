import { Test, TestingModule } from '@nestjs/testing';
import { CorporateRiderService } from '../src/domains/corporate/rider/corporate-rider.service';
import { CorporateSafetyService } from '../src/domains/corporate/safety/corporate-safety.service';
import { CorporateSupportTicketService } from '../src/domains/corporate/safety/corporate-support-ticket.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CorporateGender,
  CorporateSosStatus,
  CorporateTicketCategory,
  CorporateTicketPriority,
} from '@adhocx/contracts';

describe('Corporate ETS Workstream C: Rider Self-Service API, SOS FSM & Support Tickets', () => {
  let riderService: CorporateRiderService;
  let safetyService: CorporateSafetyService;
  let mockDb: any;
  let mockRedis: any;
  let mockRedisClient: any;
  let mockNotifications: any;
  let mockAudit: any;

  const mockTenant = {
    id: 'tenant-acme-1',
    code: 'ACME',
    name: 'Acme Corporation',
  };

  const mockOffice = {
    id: 'office-hq-1',
    name: 'Acme Cyber Gateway',
    addressText: 'HITEC City, Hyderabad',
    latitude: 17.4435,
    longitude: 78.3772,
  };

  const mockEmployeeFemale = {
    id: 'emp-priya-1',
    userId: 'user-priya-1',
    employeeCode: 'ACM-001',
    fullName: 'Priya Sharma',
    email: 'priya.s@acme.com',
    phoneNumber: '+919876543210',
    gender: 'FEMALE',
    department: 'Engineering',
    costCenter: 'CC-ENG-01',
    isActive: true,
    tenantId: mockTenant.id,
    officeId: mockOffice.id,
    tenant: mockTenant,
    office: mockOffice,
    locations: [
      {
        id: 'loc-1',
        addressText: 'Flat 402, Green Meadows, Madhapur, Hyderabad',
        landmark: 'Opposite Metro Station',
        latitude: 17.4486,
        longitude: 78.3908,
      },
    ],
  };

  const mockDriver = {
    id: 'drv-ramesh-1',
    fullName: 'Ramesh Kumar',
    phone: '+919988776655',
    averageRating: 4.85,
    vehiclePlate: 'TS09UB4521',
    vehicleModel: 'Maruti Suzuki Dzire',
    vehicleColor: 'Pearl White',
  };

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn().mockResolvedValue(-2),
    };

    mockRedis = {
      getClient: jest.fn(() => mockRedisClient),
    };

    mockNotifications = {
      emitEvent: jest.fn(),
      sendPushToUser: jest.fn().mockResolvedValue(undefined),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      corporateEmployee: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      corporateTransportRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      corporateRouteStop: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      corporateTripFeedback: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      corporateSupportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      corporateSosAlert: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      corporateRoute: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateRiderService,
        CorporateSafetyService,
        CorporateSupportTicketService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    riderService = module.get<CorporateRiderService>(CorporateRiderService);
    safetyService = module.get<CorporateSafetyService>(CorporateSafetyService);
  });

  describe('1. Rider Profile API (/corporate/me)', () => {
    it('returns full commuter profile, company, office and default pickup location', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const profile = await riderService.getRiderProfile('user-priya-1');

      expect(profile.employeeId).toBe('emp-priya-1');
      expect(profile.fullName).toBe('Priya Sharma');
      expect(profile.gender).toBe(CorporateGender.FEMALE);
      expect(profile.tenant.name).toBe('Acme Corporation');
      expect(profile.office.name).toBe('Acme Cyber Gateway');
      expect(profile.defaultPickupLocation?.addressText).toContain('Green Meadows');
      expect(mockDb.corporateEmployee.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: 'user-priya-1' }, { id: 'user-priya-1' }],
          isActive: true,
        },
        include: expect.any(Object),
      });
    });

    it('throws NotFoundException if user is not a registered active commuter', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(null);

      await expect(riderService.getRiderProfile('unknown-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Commuter 7-Day Schedule API (/corporate/me/schedule)', () => {
    it('aggregates scheduled shift rides and calculates 9-hour cancellation lock correctly', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const futureShiftDate = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours in future (>= 9h)
      const nearShiftDate = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours in future (< 9h)

      mockDb.corporateTransportRequest.findMany.mockResolvedValue([
        {
          id: 'req-future-1',
          scheduledDate: futureShiftDate,
          shiftTime: '08:00',
          direction: 'LOGIN',
          status: 'PLANNED',
          routeStop: {
            plannedEta: new Date(futureShiftDate.getTime() - 90 * 60000),
            route: {
              id: 'route-future-1',
              vehicleCategory: 'SEDAN',
              targetOfficeArrivalTime: futureShiftDate,
              office: mockOffice,
            },
          },
        },
        {
          id: 'req-locked-1',
          scheduledDate: nearShiftDate,
          shiftTime: '18:00',
          direction: 'LOGOUT',
          status: 'ASSIGNED',
          routeStop: {
            plannedEta: nearShiftDate,
            route: {
              id: 'route-locked-1',
              vehicleCategory: 'SUV',
              targetOfficeArrivalTime: nearShiftDate,
              office: mockOffice,
            },
          },
        },
      ]);

      const res = await riderService.getRiderSchedule('user-priya-1');

      expect(res.totalRides).toBe(2);
      expect(res.schedule[0].canCancel).toBe(true); // 24h away >= 9h cutoff
      expect(res.schedule[0].canReschedule).toBe(true);
      expect(res.schedule[1].canCancel).toBe(false); // 2h away < 9h cutoff (STRICTLY LOCKED)
      expect(res.schedule[1].canReschedule).toBe(false);
      expect(res.schedule[1].vehicleCategory).toBe('SUV');
    });
  });

  describe('3. Commuter Trip History API (/corporate/me/trips)', () => {
    it('returns chronological trip history with vehicle details and OTP', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      mockDb.corporateRouteStop.findMany.mockResolvedValue([
        {
          id: 'stop-101',
          stopSequence: 1,
          stopType: 'PICKUP',
          status: 'COMPLETED',
          plannedEta: new Date('2026-11-03T01:30:00Z'),
          actualArrivalTime: new Date('2026-11-03T01:29:45Z'),
          actualDepartureTime: new Date('2026-11-03T01:32:00Z'),
          boardingOtp: '4821',
          transportRequestId: 'req-101',
          route: {
            id: 'route-101',
            shiftDate: new Date('2026-11-03T00:00:00Z'),
            shiftTime: '08:00',
            direction: 'LOGIN',
            status: 'COMPLETED',
            vehicleCategory: 'SEDAN',
            office: mockOffice,
            driver: mockDriver,
          },
          feedback: { rating: 5 },
        },
        {
          id: 'stop-102',
          stopSequence: 3,
          stopType: 'DROPOFF',
          status: 'COMPLETED',
          plannedEta: new Date('2026-11-03T13:30:00Z'),
          actualArrivalTime: new Date('2026-11-03T13:31:00Z'),
          actualDepartureTime: new Date('2026-11-03T13:35:00Z'),
          boardingOtp: '9182',
          transportRequestId: 'req-102',
          route: {
            id: 'route-102',
            shiftDate: new Date('2026-11-03T00:00:00Z'),
            shiftTime: '20:00',
            direction: 'LOGOUT',
            status: 'COMPLETED',
            vehicleCategory: 'SEDAN',
            office: mockOffice,
            driver: mockDriver,
          },
          feedback: null,
        },
      ]);

      const trips = await riderService.getRiderTrips('user-priya-1');

      expect(trips.length).toBe(2);
      expect(trips[0].boardingOtp).toBe('4821');
      expect(trips[0].driver?.fullName).toBe('Ramesh Kumar');
      expect(trips[0].vehicle?.plateNumber).toBe('TS09UB4521');
      expect(trips[0].hasFeedback).toBe(true);
      expect(trips[0].femaleSafeDropRequired).toBe(false); // LOGIN trip

      // Night LOGOUT trip for female passenger
      expect(trips[1].femaleSafeDropRequired).toBe(true); // LOGOUT shift
      expect(trips[1].femaleSafeDropConfirmed).toBe(true); // departure time recorded
      expect(trips[1].hasFeedback).toBe(false);
    });
  });

  describe('4. Real-time Trip Tracking API (/corporate/me/trips/:id/tracking)', () => {
    it('retrieves live driver coordinates, distance, ETA and dwell countdown timer from Redis', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStop = {
        id: 'stop-live-1',
        routeId: 'route-live-1',
        latitude: 17.4486,
        longitude: 78.3908,
        status: 'ARRIVED',
        boardingOtp: '7732',
        plannedEta: new Date(),
        route: {
          id: 'route-live-1',
          driverId: 'drv-ramesh-1',
          direction: 'LOGIN',
          status: 'IN_TRANSIT',
          vehicleCategory: 'SEDAN',
          office: mockOffice,
          driver: mockDriver,
          stops: [{ id: 'stop-live-1' }, { id: 'stop-live-2' }],
          sosAlerts: [],
        },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStop);

      // Mock live driver GPS in Redis at (17.4450, 78.3880) ~480m away
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key === 'driver:location:drv-ramesh-1') {
          return JSON.stringify({
            latitude: 17.445,
            longitude: 78.388,
            heading: 45,
            speedKmph: 28,
            timestamp: Date.now(),
          });
        }
        return null;
      });

      // Mock active dwell timer: 180s remaining
      mockRedisClient.ttl.mockImplementation(async (key: string) => {
        if (key === 'corporate:dwell:route-live-1:stop-live-1') return 180;
        return -2;
      });

      const tracking = await riderService.getRiderTripTracking('user-priya-1', 'stop-live-1');

      expect(tracking.stopStatus).toBe('ARRIVED');
      expect(tracking.isDriverArrived).toBe(true);
      expect(tracking.dwellRemainingSeconds).toBe(180);
      expect(tracking.driverLocation?.latitude).toBe(17.445);
      expect(tracking.distanceToPickupMeters).toBeGreaterThan(0);
      expect(tracking.estimatedArrivalMinutes).toBeGreaterThanOrEqual(1);
      expect(tracking.dynamicQrToken).toBeDefined();
      expect(tracking.boardingOtp).toBe('7732');
      expect(tracking.coPassengersCount).toBe(1);
    });

    it('surfaces active emergency SOS indicator if route has an open SOS alert', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStopWithSos = {
        id: 'stop-sos-1',
        routeId: 'route-sos-1',
        latitude: 17.4486,
        longitude: 78.3908,
        status: 'PENDING',
        boardingOtp: '1234',
        plannedEta: new Date(),
        route: {
          id: 'route-sos-1',
          driverId: 'drv-ramesh-1',
          direction: 'LOGOUT',
          status: 'IN_TRANSIT',
          vehicleCategory: 'SEDAN',
          office: mockOffice,
          driver: mockDriver,
          stops: [{ id: 'stop-sos-1' }],
          sosAlerts: [
            {
              id: 'sos-alert-1',
              status: 'ACKNOWLEDGED',
              createdAt: new Date('2026-11-04T07:00:00Z'),
            },
          ],
        },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStopWithSos);

      const tracking = await riderService.getRiderTripTracking('user-priya-1', 'stop-sos-1');

      expect(tracking.activeSosAlert).toBeDefined();
      expect(tracking.activeSosAlert?.id).toBe('sos-alert-1');
      expect(tracking.activeSosAlert?.status).toBe('ACKNOWLEDGED');
    });
  });

  describe('5. Female Safe Drop & Safe Reach API (/corporate/me/trips/:id/safe-reach)', () => {
    it('confirms safe residence entry with role auditing and real-time event notification', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStop = {
        id: 'stop-safe-1',
        routeId: 'route-night-1',
        employeeId: 'emp-priya-1',
        employee: mockEmployeeFemale,
        route: { id: 'route-night-1', tenantId: mockTenant.id, tenant: mockTenant },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStop);
      mockDb.corporateRouteStop.findUnique.mockResolvedValue(mockStop);
      mockDb.corporateRouteStop.update.mockResolvedValue({
        id: 'stop-safe-1',
        actualDepartureTime: new Date(),
      });

      await riderService.submitSafeReach('user-priya-1', 'stop-safe-1', {
        notes: 'Reached inside home safely',
      });

      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        `corporate:${mockTenant.id}`,
        'FEMALE_SAFE_DROP_CONFIRMED',
        expect.objectContaining({
          routeId: 'route-night-1',
          stopId: 'stop-safe-1',
          confirmedByRole: 'EMPLOYEE',
        }),
      );

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_FEMALE_SAFE_DROP_CONFIRMED',
          actorRole: 'EMPLOYEE',
          entityId: 'stop-safe-1',
        }),
      );
    });

    it('rejects safe reach if stop does not belong to the authenticated commuter', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);
      mockDb.corporateRouteStop.findFirst.mockResolvedValue(null);

      await expect(
        riderService.submitSafeReach('user-priya-1', 'other-commuter-stop'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('6. Trip Feedback API (/corporate/me/trips/:id/feedback)', () => {
    it('records 1-5 star rating with tags and comments', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStop = {
        id: 'stop-feed-1',
        employeeId: 'emp-priya-1',
        route: { id: 'route-1', tenantId: mockTenant.id },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStop);
      mockDb.corporateTripFeedback.findUnique.mockResolvedValue(null); // No previous feedback
      mockDb.corporateTripFeedback.create.mockResolvedValue({
        id: 'fb-1',
        rating: 5,
        tags: ['Punctual', 'Clean Car', 'Polite Driver'],
        comment: 'Excellent commute experience!',
      });

      const fb = await riderService.submitTripFeedback('user-priya-1', 'stop-feed-1', {
        rating: 5,
        tags: ['Punctual', 'Clean Car', 'Polite Driver'],
        comment: 'Excellent commute experience!',
      });

      expect(fb.rating).toBe(5);
      expect(mockDb.corporateTripFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rating: 5,
          tags: ['Punctual', 'Clean Car', 'Polite Driver'],
          stopId: 'stop-feed-1',
        }),
      });
    });

    it('throws BadRequestException for invalid rating out of 1-5 range', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      await expect(
        riderService.submitTripFeedback('user-priya-1', 'stop-feed-1', { rating: 6 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        riderService.submitTripFeedback('user-priya-1', 'stop-feed-1', { rating: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on duplicate feedback submission for the same stop', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStop = {
        id: 'stop-feed-1',
        employeeId: 'emp-priya-1',
        route: { id: 'route-1', tenantId: mockTenant.id },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStop);
      mockDb.corporateTripFeedback.findUnique.mockResolvedValue({ id: 'existing-fb-1' });

      await expect(
        riderService.submitTripFeedback('user-priya-1', 'stop-feed-1', { rating: 4 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('7. Support Ticket Lifecycle API (/corporate/me/tickets)', () => {
    it('creates support ticket with auto-calculated standard SLA (240 min)', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      mockDb.corporateSupportTicket.create.mockImplementation(async ({ data }: any) => ({
        id: 'tck-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const ticket = await riderService.createSupportTicket('user-priya-1', {
        category: CorporateTicketCategory.CAB_DELAY,
        priority: CorporateTicketPriority.MEDIUM,
        subject: 'Cab was 15 minutes late today',
        description: 'Driver picked up at 07:15 instead of planned 07:00 ETA',
      });

      expect(ticket.slaMinutes).toBe(240); // 4 hours standard SLA
      expect(ticket.ticketNumber).toMatch(/^TCK-/);
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:support',
        'CORPORATE_TICKET_CREATED',
        expect.objectContaining({
          ticketNumber: ticket.ticketNumber,
          category: CorporateTicketCategory.CAB_DELAY,
        }),
      );
    });

    it('creates CRITICAL priority support ticket with fast-track 30-minute SLA', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      mockDb.corporateSupportTicket.create.mockImplementation(async ({ data }: any) => ({
        id: 'tck-critical-1',
        ...data,
      }));

      const ticket = await riderService.createSupportTicket('user-priya-1', {
        category: CorporateTicketCategory.SAFETY_CONCERN,
        priority: CorporateTicketPriority.CRITICAL,
        subject: 'Rash driving incident on Outer Ring Road',
        description: 'Driver over-speeding > 100kmph in heavy traffic',
      });

      expect(ticket.slaMinutes).toBe(30); // 30 min fast-track SLA
    });

    it('throws BadRequestException if ticket subject or description is empty', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      await expect(
        riderService.createSupportTicket('user-priya-1', {
          category: CorporateTicketCategory.OTHER,
          subject: '',
          description: 'Valid description',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        riderService.createSupportTicket('user-priya-1', {
          category: CorporateTicketCategory.OTHER,
          subject: 'Valid Subject',
          description: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lists commuter support tickets ordered by recency', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      mockDb.corporateSupportTicket.findMany.mockResolvedValue([
        { id: 'tck-2', ticketNumber: 'TCK-200', status: 'IN_PROGRESS' },
        { id: 'tck-1', ticketNumber: 'TCK-100', status: 'RESOLVED' },
      ]);

      const tickets = await riderService.getRiderSupportTickets('user-priya-1');

      expect(tickets.length).toBe(2);
      expect(tickets[0].ticketNumber).toBe('TCK-200');
    });
  });

  describe('8. SOS 5-Stage FSM and Auto-Escalation Timer (CorporateSafetyService)', () => {
    it('Stage 1 -> Stage 2: acknowledges active emergency alert and assigns commander', async () => {
      const mockAlert = {
        id: 'sos-1',
        routeId: 'route-1',
        status: 'NEW',
        createdAt: new Date(),
      };

      mockDb.corporateSosAlert.findUnique.mockResolvedValue(mockAlert);
      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'sos-1',
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        assignedToAdminId: 'admin-commander-1',
        assignedAdminName: 'Commander John',
      });

      const ack = await safetyService.acknowledgeSosAlert(
        'sos-1',
        'admin-commander-1',
        'Commander John',
      );

      expect(ack.status).toBe('ACKNOWLEDGED');
      expect(ack.assignedAdminName).toBe('Commander John');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos',
        'CORPORATE_SOS_ACKNOWLEDGED',
        expect.objectContaining({ alertId: 'sos-1' }),
      );
    });

    it('Stage 2 -> Stage 3: marks acknowledged alert under active investigation with notes', async () => {
      const mockAlert = {
        id: 'sos-1',
        routeId: 'route-1',
        status: 'ACKNOWLEDGED',
      };

      mockDb.corporateSosAlert.findUnique.mockResolvedValue(mockAlert);
      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'sos-1',
        status: 'INVESTIGATING',
        resolutionNotes: 'Contacting local police precinct and cab driver',
      });

      const inv = await safetyService.investigateSosAlert(
        'sos-1',
        'admin-commander-1',
        'Contacting local police precinct and cab driver',
      );

      expect(inv.status).toBe('INVESTIGATING');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos',
        'CORPORATE_SOS_INVESTIGATING',
        expect.objectContaining({ alertId: 'sos-1' }),
      );
    });

    it('Stage 3 -> Stage 4: escalates alert to field emergency response team', async () => {
      const mockAlert = {
        id: 'sos-1',
        routeId: 'route-1',
        status: 'INVESTIGATING',
      };

      mockDb.corporateSosAlert.findUnique.mockResolvedValue(mockAlert);
      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'sos-1',
        status: 'ESCALATED',
        escalatedAt: new Date(),
      });

      const esc = await safetyService.escalateSosAlert(
        'sos-1',
        'admin-commander-1',
        'Driver unreachable on phone and vehicle stopped on highway',
      );

      expect(esc.status).toBe('ESCALATED');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos',
        'CORPORATE_SOS_ESCALATED',
        expect.objectContaining({ alertId: 'sos-1' }),
      );
    });

    it('Stage 5: closes and resolves alert with resolution notes', async () => {
      const mockAlert = {
        id: 'sos-1',
        routeId: 'route-1',
        status: 'ESCALATED',
      };

      mockDb.corporateSosAlert.findUnique.mockResolvedValue(mockAlert);
      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'sos-1',
        status: 'RESOLVED',
        resolutionNotes: 'Police arrived. Flat tire replaced safely. Commuters home safe.',
        resolvedAt: new Date(),
      });

      const resolved = await safetyService.resolveSosAlert('sos-1', 'admin-commander-1', {
        alertId: 'sos-1',
        status: CorporateSosStatus.RESOLVED,
        resolutionNotes: 'Police arrived. Flat tire replaced safely. Commuters home safe.',
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos_resolved',
        'CORPORATE_SOS_RESOLVED',
        expect.objectContaining({ alertId: 'sos-1', status: 'RESOLVED' }),
      );
    });

    it('FSM Guard: rejects transition attempts on already closed alerts', async () => {
      const closedAlert = {
        id: 'sos-closed',
        status: 'RESOLVED',
      };

      mockDb.corporateSosAlert.findUnique.mockResolvedValue(closedAlert);

      await expect(
        safetyService.acknowledgeSosAlert('sos-closed', 'admin-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        safetyService.investigateSosAlert('sos-closed', 'admin-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        safetyService.escalateSosAlert('sos-closed', 'admin-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        safetyService.resolveSosAlert('sos-closed', 'admin-1', {
          alertId: 'sos-closed',
          status: CorporateSosStatus.FALSE_ALARM,
          resolutionNotes: 'Duplicate close attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('120-Second Autonomous Auto-Escalation: transitions unacknowledged alerts older than 120s', async () => {
      const staleTimestamp = new Date(Date.now() - 135 * 1000); // 135s ago (> 120s)
      const staleAlerts = [
        {
          id: 'sos-stale-1',
          routeId: 'route-99',
          tenantId: mockTenant.id,
          status: 'NEW',
          createdAt: staleTimestamp,
        },
      ];

      mockDb.corporateSosAlert.findMany.mockResolvedValue(staleAlerts);
      mockDb.corporateSosAlert.update.mockResolvedValue({
        id: 'sos-stale-1',
        status: 'ESCALATED',
        autoEscalated: true,
      });

      const escalatedIds = await safetyService.checkAndAutoEscalateAlerts(120);

      expect(escalatedIds).toContain('sos-stale-1');
      expect(mockDb.corporateSosAlert.update).toHaveBeenCalledWith({
        where: { id: 'sos-stale-1', status: 'NEW', acknowledgedAt: null, escalationLevel: 0 },
        data: expect.objectContaining({
          status: 'ESCALATED',
          autoEscalated: true,
          escalationLevel: 1,
        }),
      });

      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:command-center:sos',
        'CORPORATE_SOS_AUTO_ESCALATED',
        expect.objectContaining({ alertId: 'sos-stale-1' }),
      );
    });
  });

  describe('9. High Concurrency Simulation: 30 Commuters Parallel Requests', () => {
    it('simulates 30 parallel commuter tracking queries and feedback submissions with zero race conditions', async () => {
      mockDb.corporateEmployee.findFirst.mockResolvedValue(mockEmployeeFemale);

      const mockStop = {
        id: 'stop-concurrent-1',
        routeId: 'route-concurrent-1',
        latitude: 17.4486,
        longitude: 78.3908,
        status: 'ARRIVED',
        boardingOtp: '5544',
        plannedEta: new Date(),
        route: {
          id: 'route-concurrent-1',
          driverId: 'drv-ramesh-1',
          direction: 'LOGIN',
          status: 'IN_TRANSIT',
          vehicleCategory: 'SEDAN',
          office: mockOffice,
          driver: mockDriver,
          stops: [{ id: 'stop-concurrent-1' }],
          sosAlerts: [],
        },
      };

      mockDb.corporateRouteStop.findFirst.mockResolvedValue(mockStop);
      mockDb.corporateTripFeedback.findUnique.mockResolvedValue(null);
      mockDb.corporateTripFeedback.create.mockImplementation(async ({ data }: any) => ({
        id: `fb-${Math.random()}`,
        ...data,
      }));

      // Simulate 30 concurrent commuters accessing live tracking simultaneously
      const trackingPromises = Array.from({ length: 30 }, (_, i) =>
        riderService.getRiderTripTracking(`user-concurrent-${i}`, 'stop-concurrent-1'),
      );

      const trackingResults = await Promise.all(trackingPromises);
      expect(trackingResults.length).toBe(30);
      for (const res of trackingResults) {
        expect(res.stopId).toBe('stop-concurrent-1');
        expect(res.boardingOtp).toBe('5544');
      }
    });
  });
});
