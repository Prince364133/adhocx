import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CorporateTicketPriority, CorporateTicketStatus, UserRole } from '@adhocx/contracts';
import { CorporateSupportTicketService } from '../src/domains/corporate/safety/corporate-support-ticket.service';
import { CorporateSupportTicketController } from '../src/domains/corporate/safety/corporate-support-ticket.controller';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CORPORATE_RESOURCE_KEY } from '../src/common/decorators/corporate-resource.decorator';

describe('CorporateSupportTicketService & Controller (SCRUM-24 Phase 1)', () => {
  let service: CorporateSupportTicketService;
  let db: any;
  let notifications: any;
  let audit: any;

  const mockTicket = {
    id: 'ticket-1',
    ticketNumber: 'TCK-1001-2000',
    tenantId: 'tenant-acme',
    employeeId: 'emp-101',
    category: 'CAB_DELAY',
    priority: CorporateTicketPriority.HIGH,
    status: CorporateTicketStatus.OPEN,
    subject: 'Cab arrived 30 mins late',
    description: 'The driver did not reach on time.',
    adminNotes: null,
    resolutionNotes: null,
    assignedToUserId: null,
    slaMinutes: 60,
    resolvedAt: null,
    resolvedByUserId: null,
    createdAt: new Date('2026-11-12T00:00:00Z'),
    updatedAt: new Date('2026-11-12T00:00:00Z'),
  };

  const adminActor = { userId: 'admin-1', role: UserRole.ADMIN };
  const opsActor = { userId: 'ops-1', role: UserRole.OPS };
  const corpAdminActor = { userId: 'corp-user-1', role: UserRole.CORPORATE_ADMIN, corporateTenantId: 'tenant-acme' };
  const rogueCorpActor = { userId: 'corp-user-2', role: UserRole.CORPORATE_ADMIN, corporateTenantId: 'tenant-other' };
  const employeeActor = { userId: 'emp-user-1', role: UserRole.EMPLOYEE, corporateTenantId: 'tenant-acme', corporateEmployeeId: 'emp-101' };
  const rogueEmployeeActor = { userId: 'emp-user-2', role: UserRole.EMPLOYEE, corporateTenantId: 'tenant-acme', corporateEmployeeId: 'emp-999' };

  beforeEach(() => {
    db = {
      corporateSupportTicket: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      corporateTicketMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      corporateEmployee: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    notifications = {
      emitEvent: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new CorporateSupportTicketService(db as any, notifications as any, audit as any);
  });

  describe('listMessages', () => {
    const rawMessages = [
      {
        id: 'msg-1',
        ticketId: 'ticket-1',
        senderId: 'emp-user-1',
        senderRole: 'EMPLOYEE',
        senderName: 'John Doe',
        message: 'Where is the cab?',
        isInternal: false,
        createdAt: new Date('2026-11-12T00:05:00Z'),
        sender: { id: 'emp-user-1', fullName: 'John Doe', email: 'john@acme.com', role: 'EMPLOYEE' },
      },
      {
        id: 'msg-2',
        ticketId: 'ticket-1',
        senderId: 'admin-1',
        senderRole: 'ADMIN',
        senderName: 'Admin Super',
        message: 'Internal: Escalating to vendor dispatch.',
        isInternal: true,
        createdAt: new Date('2026-11-12T00:10:00Z'),
        sender: { id: 'admin-1', fullName: 'Admin Super', email: 'admin@adhocx.com', role: 'ADMIN' },
      },
    ];

    it('should return all messages including internal notes for platform ADMIN', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.corporateTicketMessage.findMany.mockResolvedValue(rawMessages);

      const res = await service.listMessages('ticket-1', adminActor);

      expect(res).toHaveLength(2);
      expect(res[0].message).toBe('Where is the cab?');
      expect(res[1].message).toBe('Internal: Escalating to vendor dispatch.');
      expect(db.corporateTicketMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ticketId: 'ticket-1' } }),
      );
    });

    it('should filter out internal notes for corporate users', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.corporateTicketMessage.findMany.mockImplementation(({ where }: any) => {
        return Promise.resolve(
          rawMessages.filter((m) => (where.isInternal !== undefined ? m.isInternal === where.isInternal : true)),
        );
      });

      const res = await service.listMessages('ticket-1', corpAdminActor);

      expect(db.corporateTicketMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticketId: 'ticket-1', isInternal: false },
        }),
      );
      expect(res.every((m: any) => m.isInternal === false)).toBe(true);

      // Verify employee actor can also list their messages
      const empRes = await service.listMessages('ticket-1', employeeActor);
      expect(empRes).toBeDefined();
    });

    it('should reject access if a corporate user attempts to read another tenant ticket', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);

      await expect(service.listMessages('ticket-1', rogueCorpActor)).rejects.toThrow(ForbiddenException);
    });

    it('should reject access if an employee attempts to read another employee ticket', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);

      await expect(service.listMessages('ticket-1', rogueEmployeeActor)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createMessage', () => {
    it('should allow ADMIN to post an internal note and record audit log', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.user.findUnique.mockResolvedValue({ fullName: 'Super Admin', email: 'admin@adhocx.com' });
      db.corporateTicketMessage.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'msg-new', ...data, createdAt: new Date() }),
      );

      const res = await service.createMessage(
        'ticket-1',
        { message: 'Internal operator note', isInternal: true },
        adminActor,
      );

      expect(res.isInternal).toBe(true);
      expect(db.corporateTicketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: 'Internal operator note',
            isInternal: true,
            senderRole: 'ADMIN',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_SUPPORT_TICKET_MESSAGE_ADDED',
          entityType: 'CORPORATE_SUPPORT_TICKET',
          entityId: 'ticket-1',
        }),
      );
      // Internal notes do NOT emit customer notifications
      expect(notifications.emitEvent).not.toHaveBeenCalledWith(
        expect.stringContaining('support'),
        'CORPORATE_TICKET_REPLY_ADDED',
        expect.anything(),
      );
    });

    it('should strictly force isInternal=false when a corporate user posts a message', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.user.findUnique.mockResolvedValue({ fullName: 'Acme Manager', email: 'mgr@acme.com' });
      db.corporateTicketMessage.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'msg-corp', ...data, createdAt: new Date() }),
      );

      const res = await service.createMessage(
        'ticket-1',
        { message: 'Please update on cab ETA', isInternal: true }, // sneaky internal request
        corpAdminActor,
      );

      expect(res.isInternal).toBe(false);
      expect(db.corporateTicketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isInternal: false,
            senderRole: UserRole.CORPORATE_ADMIN,
          }),
        }),
      );
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'corporate:tenant-acme:support',
        'CORPORATE_TICKET_REPLY_ADDED',
        expect.anything(),
      );
    });

    it('should reject empty message with BadRequestException', async () => {
      await expect(service.createMessage('ticket-1', { message: '   ' }, adminActor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignTicket', () => {
    it('should allow ADMIN to assign ticket and transition OPEN to IN_PROGRESS', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue({ ...mockTicket, status: 'OPEN' });
      db.user.findUnique.mockResolvedValue({ id: 'agent-1', fullName: 'Agent Sarah', role: 'OPS' });
      db.corporateSupportTicket.update.mockResolvedValue({
        ...mockTicket,
        assignedToUserId: 'agent-1',
        status: 'IN_PROGRESS',
      });

      const res = await service.assignTicket(
        'ticket-1',
        { assignedToUserId: 'agent-1', notes: 'Assigned to Shift Lead' },
        adminActor,
      );

      expect(res.assignedToUserId).toBe('agent-1');

      // Verify OPS actor can also assign
      const opsRes = await service.assignTicket(
        'ticket-1',
        { assignedToUserId: 'agent-1', notes: 'Assigned by ops' },
        opsActor,
      );
      expect(opsRes.assignedToUserId).toBe('agent-1');
      expect(db.corporateSupportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: expect.objectContaining({
            assignedToUserId: 'agent-1',
            status: 'IN_PROGRESS',
            adminNotes: 'Assigned to Shift Lead',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_SUPPORT_TICKET_ASSIGNED',
          entityId: 'ticket-1',
        }),
      );
    });

    it('should reject non-platform users from assigning tickets', async () => {
      await expect(service.assignTicket('ticket-1', { assignedToUserId: 'agent-1' }, corpAdminActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if assignee user does not exist', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.user.findUnique.mockResolvedValue(null);

      await expect(service.assignTicket('ticket-1', { assignedToUserId: 'non-existent' }, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reopenTicket', () => {
    it('should reopen a RESOLVED ticket to IN_PROGRESS and clear resolution fields', async () => {
      const resolvedTicket = {
        ...mockTicket,
        status: CorporateTicketStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: 'admin-1',
        adminNotes: 'Initial fix notes',
      };
      db.corporateSupportTicket.findUnique.mockResolvedValue(resolvedTicket);
      db.corporateSupportTicket.update.mockResolvedValue({
        ...resolvedTicket,
        status: CorporateTicketStatus.IN_PROGRESS,
        resolvedAt: null,
        resolvedByUserId: null,
      });

      const res = await service.reopenTicket(
        'ticket-1',
        { reason: 'Customer reported recurrent delay on same route' },
        corpAdminActor,
      );

      expect(res.status).toBe(CorporateTicketStatus.IN_PROGRESS);
      expect(db.corporateSupportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: expect.objectContaining({
            status: CorporateTicketStatus.IN_PROGRESS,
            resolvedAt: null,
            resolvedByUserId: null,
            adminNotes: expect.stringContaining('recurrent delay on same route'),
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CORPORATE_SUPPORT_TICKET_REOPENED',
          entityId: 'ticket-1',
        }),
      );
    });

    it('should reject reopening a ticket that is already OPEN', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue({ ...mockTicket, status: CorporateTicketStatus.OPEN });

      await expect(service.reopenTicket('ticket-1', { reason: 'Already open' }, adminActor)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject empty reopen reason', async () => {
      await expect(service.reopenTicket('ticket-1', { reason: '  ' }, adminActor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getActivity', () => {
    it('should return sanitized audit activity for corporate roles', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'CORPORATE_SUPPORT_TICKET_STATUS_CHANGED',
          actorId: 'admin-1',
          actorRole: 'ADMIN',
          createdAt: new Date('2026-11-12T01:00:00Z'),
          payload: { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', adminNotes: 'Internal confidential note' },
          actor: { id: 'admin-1', fullName: 'Admin User', email: 'admin@adhocx.com', role: 'ADMIN' },
        },
      ]);

      const res = await service.getActivity('ticket-1', corpAdminActor);

      expect(res).toHaveLength(1);
      expect(res[0].action).toBe('CORPORATE_SUPPORT_TICKET_STATUS_CHANGED');
      // Verify confidential adminNotes was sanitized for corporate role
      expect(res[0].metadata?.adminNotes).toBeUndefined();
    });

    it('should preserve full metadata for platform ADMIN', async () => {
      db.corporateSupportTicket.findUnique.mockResolvedValue(mockTicket);
      db.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'CORPORATE_SUPPORT_TICKET_STATUS_CHANGED',
          actorId: 'admin-1',
          actorRole: 'ADMIN',
          createdAt: new Date('2026-11-12T01:00:00Z'),
          payload: { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', adminNotes: 'Internal confidential note' },
          actor: { id: 'admin-1', fullName: 'Admin User', email: 'admin@adhocx.com', role: 'ADMIN' },
        },
      ]);

      const res = await service.getActivity('ticket-1', adminActor);

      expect(res).toHaveLength(1);
      expect(res[0].metadata?.adminNotes).toBe('Internal confidential note');
    });
  });

  describe('CorporateSupportTicketController Decorators & Guard Inspection', () => {
    it('should have proper Roles and CorporateResource annotations on all support endpoints', () => {
      const controller = CorporateSupportTicketController.prototype;

      const listMessagesRoles = Reflect.getMetadata(ROLES_KEY, controller.listMessages);
      const listMessagesRes = Reflect.getMetadata(CORPORATE_RESOURCE_KEY, controller.listMessages);
      expect(listMessagesRoles).toContain(UserRole.ADMIN);
      expect(listMessagesRoles).toContain(UserRole.CORPORATE_ADMIN);
      expect(listMessagesRoles).toContain(UserRole.EMPLOYEE);
      expect(listMessagesRes).toEqual({ kind: 'ticket', param: 'id', from: 'params', driverMode: 'assigned' });

      const assignRoles = Reflect.getMetadata(ROLES_KEY, controller.assignTicket);
      expect(assignRoles).toContain(UserRole.ADMIN);
      expect(assignRoles).toContain(UserRole.OPS);
      expect(assignRoles).not.toContain(UserRole.CORPORATE_ADMIN);

      const reopenRoles = Reflect.getMetadata(ROLES_KEY, controller.reopenTicket);
      expect(reopenRoles).toContain(UserRole.ADMIN);
      expect(reopenRoles).toContain(UserRole.CORPORATE_ADMIN);
    });
  });
});
