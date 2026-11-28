import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FleetAdminRole,
  FleetNotificationEventType,
  FleetSupportTicketStatus,
  UserRole,
  VerificationStatus,
} from '@adhocx/contracts';
import { FleetNotificationsService } from '../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetSupportService } from '../src/domains/fleet/portal/support/fleet-support.service';
import { FleetShiftsService } from '../src/domains/fleet/portal/shifts/fleet-shifts.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Fleet Portal Support, Notifications & Event Hooks (Phase 5)', () => {
  const ownerCtx = {
    userId: 'owner-1',
    fleetId: 'fleet-1',
    role: FleetAdminRole.FLEET_OWNER,
    permissions: ['VIEW_EARNINGS'],
    fullName: 'Metro Owner',
  };

  describe('FleetSupportService', () => {
    it('rejects foreign attachment keys belonging to another fleet', async () => {
      const db: any = {};
      const service = new FleetSupportService(db);
      await expect(
        service.createTicket(ownerCtx, {
          category: 'GENERAL',
          subject: 'Check attachment isolation',
          description: 'Attempt foreign key',
          attachments: [
            {
              key: 'documents/fleet-support/fleet-2/secret.pdf',
              fileName: 'secret.pdf',
              mimeType: 'application/pdf',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('supports fallback multipart attachment sanitization and signed URL resolution', async () => {
      const saveFile = jest.fn().mockResolvedValue({
        filename: 'abc.png',
        originalName: 'screenshot.png',
        mimeType: 'image/png',
        storageProvider: 'local',
      });
      const getDocumentAccessUrl = jest
        .fn()
        .mockResolvedValue('https://api.adhocx.com/uploads/abc.png?exp=123&sig=xyz');

      const service = new FleetSupportService({} as any, {
        saveFile,
        getDocumentAccessUrl,
      } as any);

      const res = await service.uploadAttachmentFallback(ownerCtx, {
        buffer: Buffer.from('png-bytes'),
        originalname: 'screenshot.png',
        mimetype: 'image/png',
        size: 9,
      });

      expect(res.key).toBe('/uploads/abc.png');
      expect(res.downloadUrl).toContain('sig=xyz');
      expect(saveFile).toHaveBeenCalledTimes(1);
    });

    it('reopens RESOLVED ticket when reopen=true and records SUPPORT_TICKET_REPLY notification', async () => {
      const now = new Date('2026-11-27T11:00:00.000Z');
      const txMock: any = {
        fleetSupportMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'msg-2',
            ticketId: 't1',
            senderRole: 'FLEET_OWNER',
            senderName: 'Metro Owner',
            body: 'Issue recurred',
            attachments: [],
            createdAt: now,
          }),
        },
        fleetSupportTicket: {
          update: jest.fn().mockResolvedValue({
            id: 't1',
            ticketNumber: 'TCK-FLT-99',
            fleetId: 'fleet-1',
            category: 'EARNINGS_PAYOUT',
            subject: 'Payout discrepancy',
            description: 'Original',
            status: FleetSupportTicketStatus.OPEN,
            attachments: [],
            createdAt: now,
            updatedAt: now,
          }),
        },
      };
      const db: any = {
        fleetSupportTicket: {
          findFirst: jest.fn().mockResolvedValue({
            id: 't1',
            ticketNumber: 'TCK-FLT-99',
            fleetId: 'fleet-1',
            subject: 'Payout discrepancy',
            status: FleetSupportTicketStatus.RESOLVED,
          }),
        },
        fleetNotification: {
          create: jest.fn().mockResolvedValue({ id: 'n1' }),
        },
        $transaction: jest.fn().mockImplementation(async (cb) => cb(txMock)),
      };

      const service = new FleetSupportService(db);
      const res = await service.replyToTicket(ownerCtx, 't1', {
        body: 'Issue recurred',
        reopen: true,
      });

      expect(res.ticket.status).toBe(FleetSupportTicketStatus.OPEN);
      expect(txMock.fleetSupportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fleetId: 'fleet-1',
            eventType: 'SUPPORT_TICKET_REPLY',
          }),
        }),
      );
    });
  });

  describe('FleetNotificationsService', () => {
    it('supports all 10 documented FleetNotificationEventType values and unread counters', async () => {
      const events = Object.values(FleetNotificationEventType);
      expect(events).toEqual(
        expect.arrayContaining([
          'DRIVER_JOINED',
          'DRIVER_FLEET_CODE_LOGIN',
          'FLEET_CODE_CHANGED',
          'DRIVER_VERIFICATION_CHANGED',
          'SHIFT_ASSIGNMENT_EVENT',
          'FLEET_ANNOUNCEMENT',
          'SUPPORT_TICKET_REPLY',
          'INCENTIVE_LIFECYCLE',
          'INCENTIVE_APPROACHING',
          'INCENTIVE_QUALIFIED',
        ]),
      );

      const now = new Date();
      const db: any = {
        fleetNotification: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'n1',
              fleetId: 'fleet-1',
              eventType: 'FLEET_ANNOUNCEMENT',
              title: 'Ops Notice',
              message: 'Schedule active',
              isRead: false,
              createdAt: now,
            },
          ]),
          count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
          findFirst: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      const service = new FleetNotificationsService(db);
      const list = await service.listNotifications('fleet-1', { unreadOnly: 'true', page: 1, limit: 10 });
      expect(list.unreadCount).toBe(1);
      expect(list.items[0].eventType).toBe('FLEET_ANNOUNCEMENT');

      await expect(service.markRead('fleet-1', 'foreign-notif')).rejects.toThrow(NotFoundException);

      const marked = await service.markAllRead('fleet-1');
      expect(marked.updatedCount).toBe(1);
    });
  });

  describe('Shift Assignment Notification Hook', () => {
    afterEach(() => {
      delete process.env.ENABLE_FLEET_SHIFTS;
    });

    it('emits SHIFT_ASSIGNMENT_EVENT when shift is created', async () => {
      process.env.ENABLE_FLEET_SHIFTS = 'true';
      const now = new Date('2026-11-27T08:00:00.000Z');
      const db: any = {
        driver: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'd1',
            fullName: 'Aarav',
            vehiclePlate: 'KA01AB1234',
          }),
        },
        fleetShift: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 's1',
            fleetId: 'fleet-1',
            driverId: 'd1',
            driver: { fullName: 'Aarav', vehiclePlate: 'KA01AB1234' },
            title: 'Airport Morning Shift',
            shiftStart: now,
            shiftEnd: new Date('2026-11-27T14:00:00.000Z'),
            status: 'SCHEDULED',
            notes: null,
            createdAt: now,
          }),
        },
        fleetNotification: { create: jest.fn().mockResolvedValue({}) },
      };

      const service = new FleetShiftsService(db);
      await service.createShift('fleet-1', {
        driverId: 'd1',
        title: 'Airport Morning Shift',
        shiftStart: '2026-11-27T08:00:00.000Z',
        shiftEnd: '2026-11-27T14:00:00.000Z',
      });

      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fleetId: 'fleet-1',
            eventType: 'SHIFT_ASSIGNMENT_EVENT',
          }),
        }),
      );
    });
  });

  describe('Admin & Auth Notification/Redaction Hooks', () => {
    it('emits DRIVER_VERIFICATION_CHANGED notification when admin rejects a fleet driver KYC', async () => {
      const db: any = {
        driver: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'drv-1',
            userId: 'user-1',
            fullName: 'Aarav',
            phone: '9990001111',
            fleetId: 'fleet-1',
            verificationStatus: VerificationStatus.UNDER_REVIEW,
          }),
          update: jest.fn().mockResolvedValue({
            id: 'drv-1',
            verificationStatus: VerificationStatus.REJECTED,
          }),
        },
        fleetNotification: { create: jest.fn().mockResolvedValue({ id: 'n-ver' }) },
      };
      const audit: any = { log: jest.fn().mockResolvedValue(undefined) };

      const adminService = new AdminService(db, audit);
      await adminService.rejectDriver('drv-1', 'admin-1', { reason: 'Blurry DL photo' });

      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fleetId: 'fleet-1',
            eventType: 'DRIVER_VERIFICATION_CHANGED',
            entityId: 'drv-1',
          }),
        }),
      );
    });

    it('redacts walletBalance and records DRIVER_FLEET_CODE_LOGIN for fleet-associated drivers in AuthService', async () => {
      const now = new Date('2026-11-27T10:00:00.000Z');
      const driverUser: any = {
        id: 'user-1',
        phone: '9990001111',
        role: UserRole.DRIVER,
        status: 'ACTIVE',
        passwordHash: null,
        createdAt: now,
        driver: {
          id: 'drv-1',
          fullName: 'Aarav',
          phone: '9990001111',
          fleetId: 'fleet-1',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          walletBalance: 4500,
          createdAt: now,
          kycDocuments: {},
        },
      };
      const db: any = {
        user: {
          findUnique: jest.fn().mockResolvedValue(driverUser),
        },
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
        fleetNotification: { create: jest.fn().mockResolvedValue({}) },
      };
      const jwt: any = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
      const config: any = { get: jest.fn().mockReturnValue('secret') };
      const redis: any = { resetLogoutMarker: jest.fn().mockResolvedValue(undefined) };
      const notifications: any = {};

      const authService = new AuthService(db, jwt, config, redis, notifications);
      const authRes = await (authService as any).generateAuthResponse(driverUser);
      expect(authRes.user.driverProfile.walletBalance).toBeUndefined();
      expect(authRes.user.driverProfile.isFleetDriver).toBe(true);
      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fleetId: 'fleet-1',
            eventType: 'DRIVER_FLEET_CODE_LOGIN',
          }),
        }),
      );

      const me = await authService.getCurrentUser('user-1');
      expect(me.driverProfile?.walletBalance).toBeUndefined();
      expect(me.driverProfile?.isFleetDriver).toBe(true);
    });
  });
});
