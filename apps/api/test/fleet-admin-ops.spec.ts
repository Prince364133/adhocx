import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  FleetAdminRole,
  FleetNotificationEventType,
  FleetPayoutStatus,
  FleetSupportTicketStatus,
  UserRole,
} from '@adhocx/contracts';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { StorageService } from '../src/common/storage/storage.service';
import { verifyPassword } from '../src/common/utils/password.util';
import { DatabaseService } from '../src/database/database.service';
import { FleetAdminOperationsController } from '../src/domains/fleet/fleet-admin-ops.controller';
import { FleetAdminOperationsService } from '../src/domains/fleet/fleet-admin-ops.service';
import { FleetController } from '../src/domains/fleet/fleet.controller';
import { FleetService } from '../src/domains/fleet/fleet.service';
import { FleetNotificationsService } from '../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetSupportService } from '../src/domains/fleet/portal/support/fleet-support.service';

const JWT_SECRET = 'admin-fleet-ops-test-secret';

const IDS = {
  fleet1: '11111111-1111-4111-8111-111111111111',
  user1: '22222222-2222-4222-8222-222222222222',
  payoutRequested: '33333333-3333-4333-8333-333333333333',
  payoutSettled: '33333333-3333-4333-8333-444444444444',
  payoutRejected: '33333333-3333-4333-8333-555555555555',
  ticketOpen: '66666666-6666-4666-8666-666666666666',
  ticketClosed: '66666666-6666-4666-8666-777777777777',
  missing: '99999999-9999-4999-8999-999999999999',
};

describe('Admin Fleet Operations & End-to-End Integration Edge Cases', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let db: any;
  let adminToken: string;
  let opsToken: string;
  let driverToken: string;

  let portalUsersStore: any[];
  let payoutsStore: any[];
  let ticketsStore: any[];
  let shortfallsStore: any[];
  let notificationsStore: any[];
  let auditsStore: any[];

  beforeEach(async () => {
    const now = new Date('2026-11-27T12:00:00.000Z');

    portalUsersStore = [
      {
        id: IDS.user1,
        fleetId: IDS.fleet1,
        fullName: 'Initial Owner',
        phone: '+919999900001',
        email: 'owner@metro.test',
        passwordHash: 'salt:hash:210000',
        role: FleetAdminRole.FLEET_OWNER,
        status: 'ACTIVE',
        permissions: [],
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    payoutsStore = [
      {
        id: IDS.payoutRequested,
        fleetId: IDS.fleet1,
        requestedById: IDS.user1,
        referenceCode: 'FPR-REQ-1',
        amount: 4500,
        currency: 'INR',
        status: FleetPayoutStatus.REQUESTED,
        rejectionReason: null,
        notes: 'Nov cycle',
        periodStart: new Date('2026-11-01T00:00:00.000Z'),
        periodEnd: new Date('2026-11-20T00:00:00.000Z'),
        settledAt: null,
        createdAt: now,
        updatedAt: now,
        fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', ownerName: 'Initial Owner', phone: '+919999900001' },
        requestedBy: { id: IDS.user1, fullName: 'Initial Owner', phone: '+919999900001', email: 'owner@metro.test' },
      },
      {
        id: IDS.payoutSettled,
        fleetId: IDS.fleet1,
        requestedById: IDS.user1,
        referenceCode: 'FPR-SET-2',
        amount: 2000,
        currency: 'INR',
        status: FleetPayoutStatus.SETTLED,
        rejectionReason: null,
        notes: 'UTR9988',
        periodStart: null,
        periodEnd: null,
        settledAt: now,
        createdAt: now,
        updatedAt: now,
        fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', ownerName: 'Initial Owner', phone: '+919999900001' },
        requestedBy: { id: IDS.user1, fullName: 'Initial Owner', phone: '+919999900001', email: 'owner@metro.test' },
      },
      {
        id: IDS.payoutRejected,
        fleetId: IDS.fleet1,
        requestedById: IDS.user1,
        referenceCode: 'FPR-REJ-3',
        amount: 1000,
        currency: 'INR',
        status: FleetPayoutStatus.REJECTED,
        rejectionReason: 'Duplicate bank trace',
        notes: null,
        periodStart: null,
        periodEnd: null,
        settledAt: null,
        createdAt: now,
        updatedAt: now,
        fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', ownerName: 'Initial Owner', phone: '+919999900001' },
        requestedBy: { id: IDS.user1, fullName: 'Initial Owner', phone: '+919999900001', email: 'owner@metro.test' },
      },
    ];

    ticketsStore = [
      {
        id: IDS.ticketOpen,
        ticketNumber: 'TCK-FLT-101',
        fleetId: IDS.fleet1,
        createdById: IDS.user1,
        category: 'EARNINGS_PAYOUT',
        subject: 'Settlement UTR delay',
        description: 'UTR not reflected after 24h',
        status: FleetSupportTicketStatus.OPEN,
        attachments: [
          {
            key: `documents/fleet-support/${IDS.fleet1}/receipt.pdf`,
            fileName: 'receipt.pdf',
            mimeType: 'application/pdf',
          },
        ],
        fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', ownerName: 'Initial Owner', phone: '+919999900001' },
        createdBy: { id: IDS.user1, fullName: 'Initial Owner', phone: '+919999900001', email: 'owner@metro.test' },
        messages: [
          {
            id: 'msg-init',
            ticketId: IDS.ticketOpen,
            senderRole: 'FLEET_OWNER',
            senderName: 'Initial Owner',
            body: 'UTR not reflected after 24h',
            attachments: [],
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: IDS.ticketClosed,
        ticketNumber: 'TCK-FLT-102',
        fleetId: IDS.fleet1,
        createdById: IDS.user1,
        category: 'GENERAL',
        subject: 'Closed inquiry',
        description: 'Resolved last week',
        status: FleetSupportTicketStatus.CLOSED,
        attachments: [],
        fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', ownerName: 'Initial Owner', phone: '+919999900001' },
        createdBy: { id: IDS.user1, fullName: 'Initial Owner', phone: '+919999900001', email: 'owner@metro.test' },
        messages: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    shortfallsStore = [];
    notificationsStore = [];
    auditsStore = [];

    db = {
      fleet: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === IDS.fleet1) {
            return {
              id: IDS.fleet1,
              name: 'Metro Fleet',
              code: 'FLT-METRO1',
              ownerName: 'Initial Owner',
              phone: '+919999900001',
              status: 'ACTIVE',
            };
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'fleet-created-1',
          ...data,
          createdAt: now,
          updatedAt: now,
        })),
      },
      fleetAdminUser: {
        findMany: jest.fn().mockImplementation(async ({ where }: any) =>
          portalUsersStore.filter((u) => u.fleetId === where.fleetId),
        ),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id && where.fleetId) {
            return portalUsersStore.find((u) => u.id === where.id && u.fleetId === where.fleetId) || null;
          }
          if (where.OR) {
            for (const clause of where.OR) {
              if (clause.email) {
                const match = portalUsersStore.find((u) => u.email === clause.email);
                if (match) return match;
              }
              if (clause.phone?.in) {
                const match = portalUsersStore.find((u) => clause.phone.in.includes(u.phone));
                if (match) return match;
              }
            }
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const item = {
            id: `fau-${portalUsersStore.length + 1}`,
            ...data,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now,
          };
          portalUsersStore.push(item);
          return item;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = portalUsersStore.findIndex((u) => u.id === where.id);
          portalUsersStore[idx] = { ...portalUsersStore[idx], ...data, updatedAt: new Date() };
          return portalUsersStore[idx];
        }),
      },
      fleetPayoutRequest: {
        findMany: jest.fn().mockImplementation(async ({ where }: any) =>
          payoutsStore.filter((p) => {
            if (where?.status && p.status !== where.status) return false;
            if (where?.fleetId && p.fleetId !== where.fleetId) return false;
            return true;
          }),
        ),
        count: jest.fn().mockImplementation(async ({ where }: any) =>
          payoutsStore.filter((p) => (!where?.status || p.status === where.status)).length,
        ),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) =>
          payoutsStore.find((p) => p.id === where.id) || null,
        ),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = payoutsStore.findIndex((p) => p.id === where.id);
          payoutsStore[idx] = { ...payoutsStore[idx], ...data, updatedAt: new Date() };
          return payoutsStore[idx];
        }),
      },
      fleetSupportTicket: {
        findMany: jest.fn().mockImplementation(async ({ where }: any) =>
          ticketsStore.filter((t) => (!where?.status || t.status === where.status)),
        ),
        count: jest.fn().mockImplementation(async ({ where }: any) =>
          ticketsStore.filter((t) => (!where?.status || t.status === where.status)).length,
        ),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) =>
          ticketsStore.find((t) => t.id === where.id) || null,
        ),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = ticketsStore.findIndex((t) => t.id === where.id);
          ticketsStore[idx] = { ...ticketsStore[idx], ...data };
          return ticketsStore[idx];
        }),
      },
      fleetSupportMessage: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const msg = { id: `msg-${Date.now()}`, createdAt: new Date(), ...data };
          const ticket = ticketsStore.find((t) => t.id === data.ticketId);
          if (ticket) ticket.messages.push(msg);
          return msg;
        }),
      },
      fleetShortfallRecord: {
        findMany: jest.fn().mockImplementation(async ({ where }: any) =>
          shortfallsStore.filter((s) => s.fleetId === where.fleetId),
        ),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const rec = { id: `sf-${shortfallsStore.length + 1}`, createdAt: now, updatedAt: now, ...data };
          shortfallsStore.push(rec);
          return rec;
        }),
      },
      fleetNotification: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const n = { id: `fn-${notificationsStore.length + 1}`, isRead: false, createdAt: now, ...data };
          notificationsStore.push(n);
          return n;
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          auditsStore.push(data);
          return data;
        }),
      },
      $transaction: jest.fn().mockImplementation(async (arg: any) => {
        if (typeof arg === 'function') return arg(db);
        return arg;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [FleetAdminOperationsController, FleetController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        FleetAdminOperationsService,
        FleetService,
        FleetNotificationsService,
        FleetSupportService,
        { provide: DatabaseService, useValue: db },
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        {
          provide: StorageService,
          useValue: {
            getDocumentAccessUrl: jest.fn().mockImplementation(async (k: string) => `https://cdn.adhocx.test/${k}?sig=ok`),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    jwtService = moduleRef.get(JwtService);
    adminToken = await jwtService.signAsync({ sub: 'admin-1', role: UserRole.ADMIN, fullName: 'Super Admin' });
    opsToken = await jwtService.signAsync({ sub: 'ops-1', role: UserRole.OPS, fullName: 'Ops Lead' });
    driverToken = await jwtService.signAsync({ sub: 'drv-1', role: UserRole.DRIVER, fullName: 'Driver User' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('enforces RBAC (401/403) and resolves static /payouts and /support/tickets ahead of :id', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/fleets/payouts').expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/admin/fleets/payouts')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/users`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ fullName: 'Bad', phone: '9888811111', password: 'Password123' })
      .expect(403);

    const payoutsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/fleets/payouts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(payoutsRes.body.data.items).toHaveLength(3);
    expect(payoutsRes.body.data.metrics.pendingCount).toBe(1);
    expect(payoutsRes.body.data.metrics.pendingAmount).toBe(4500);
    expect(payoutsRes.body.data.metrics.settledAmount).toBe(2000);

    const ticketsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/fleets/support/tickets')
      .set('Authorization', `Bearer ${opsToken}`)
      .expect(200);

    expect(ticketsRes.body.data.items).toHaveLength(2);
    expect(ticketsRes.body.data.items[0].attachments[0].downloadUrl).toContain('https://cdn.adhocx.test/');
  });

  it('atomically creates Fleet + Portal Owner when portalPassword is provided and rejects conflicts', async () => {
    // Password too short fails DTO validation (400)
    await request(app.getHttpServer())
      .post('/api/v1/admin/fleets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Short Pass Fleet',
        ownerName: 'Test',
        phone: '+919777766661',
        portalPassword: 'short',
      })
      .expect(400);

    // Duplicate phone fails with 409 before creating a Fleet
    await request(app.getHttpServer())
      .post('/api/v1/admin/fleets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Owner Fleet',
        ownerName: 'Dup',
        phone: '9999900001',
        portalPassword: 'StrongPassword123',
      })
      .expect(409);
    expect(db.fleet.create).not.toHaveBeenCalled();

    // Unique contact succeeds and hashes password
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/fleets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fresh Mobility',
        ownerName: 'Fresh Owner',
        phone: '+919777766669',
        email: 'fresh@mobility.test',
        portalPassword: 'StrongPassword123',
      })
      .expect(201);

    expect(res.body.data.portalUser).toBeDefined();
    expect(res.body.data.portalUser.role).toBe('FLEET_OWNER');
    expect(res.body.data.portalUser.passwordHash).toBeUndefined();
    const storedUser = portalUsersStore.find((u) => u.email === 'fresh@mobility.test');
    expect(await verifyPassword('StrongPassword123', storedUser.passwordHash)).toBe(true);
  });

  it('provisions, lists without hashes, toggles, resets password, and handles edge cases for FleetAdminUser', async () => {
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/fleets/${IDS.fleet1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.data[0].passwordHash).toBeUndefined();

    // Duplicate phone variant rejected with 409
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Duplicate Mgr',
        phone: '9999900001',
        role: FleetAdminRole.FLEET_MANAGER,
        password: 'Password@123',
      })
      .expect(409);

    // Invalid short phone rejected with 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Bad Phone',
        phone: '1234',
        password: 'Password@123',
      })
      .expect(400);

    // Valid manager creation
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Ops Manager',
        phone: '+91 98888 12345',
        email: 'ops.mgr@metro.test',
        role: FleetAdminRole.FLEET_MANAGER,
        password: 'ManagerPassword1',
      })
      .expect(201);

    const createdId = createRes.body.data.id;
    expect(createRes.body.data.passwordHash).toBeUndefined();

    // Empty PATCH rejected with 400
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/${IDS.fleet1}/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    // Deactivate + reset password succeeds
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/${IDS.fleet1}/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE', password: 'NewResetPassword1' })
      .expect(200);
    expect(updateRes.body.data.status).toBe('INACTIVE');
    const updatedStored = portalUsersStore.find((u) => u.id === createdId);
    expect(await verifyPassword('NewResetPassword1', updatedStored.passwordHash)).toBe(true);

    // Non-existent user in fleet returns 404
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/${IDS.fleet1}/users/${IDS.missing}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(404);
  });

  it('enforces FleetPayoutRequest state machine transitions, rejectionReason & notifications', async () => {
    // Rejecting without reason -> 400
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/payouts/${IDS.payoutRequested}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetPayoutStatus.REJECTED, rejectionReason: '   ' })
      .expect(400);

    // Cannot modify already SETTLED payout -> 400
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/payouts/${IDS.payoutSettled}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetPayoutStatus.REJECTED, rejectionReason: 'Late dispute' })
      .expect(400);

    // Cannot revert REJECTED -> SETTLED -> 400
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/payouts/${IDS.payoutRejected}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetPayoutStatus.SETTLED })
      .expect(400);

    // Valid transition: REQUESTED -> APPROVED -> SETTLED
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/payouts/${IDS.payoutRequested}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetPayoutStatus.APPROVED })
      .expect(200);

    const settledRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/payouts/${IDS.payoutRequested}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetPayoutStatus.SETTLED, notes: 'NEFT-UTR-777' })
      .expect(200);

    expect(settledRes.body.data.status).toBe(FleetPayoutStatus.SETTLED);
    expect(settledRes.body.data.settledAt).toBeDefined();
    expect(settledRes.body.data.notes).toContain('NEFT-UTR-777');
    expect(notificationsStore.some((n) => n.entityType === 'PAYOUT')).toBe(true);
    expect(auditsStore.some((a) => a.action === 'FLEET_PAYOUT_PROCESSED')).toBe(true);
  });

  it('handles Admin replies, status transitions, and CLOSED guards on FleetSupportTicket', async () => {
    // Blank reply fails -> 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/support/tickets/${IDS.ticketOpen}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: '   ' })
      .expect(400);

    // Reply on CLOSED ticket fails -> 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/support/tickets/${IDS.ticketClosed}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Cannot reply after close' })
      .expect(400);

    // Reply on OPEN ticket moves it to IN_PROGRESS and emits SUPPORT_TICKET_REPLY notification
    const replyRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/support/tickets/${IDS.ticketOpen}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'NEFT UTR shared with banking partner.' })
      .expect(200);

    expect(replyRes.body.data.status).toBe(FleetSupportTicketStatus.IN_PROGRESS);
    expect(replyRes.body.data.messages).toHaveLength(2);
    expect(
      notificationsStore.some(
        (n) => n.eventType === FleetNotificationEventType.SUPPORT_TICKET_REPLY,
      ),
    ).toBe(true);

    // Same-status update fails -> 400
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/support/tickets/${IDS.ticketOpen}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: FleetSupportTicketStatus.IN_PROGRESS })
      .expect(400);

    // Resolve with note appends note message
    const resolvedRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/fleets/support/tickets/${IDS.ticketOpen}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: FleetSupportTicketStatus.RESOLVED,
        resolutionNote: 'Confirmed settled in bank statement.',
      })
      .expect(200);

    expect(resolvedRes.body.data.status).toBe(FleetSupportTicketStatus.RESOLVED);
    expect(resolvedRes.body.data.messages).toHaveLength(3);
  });

  it('validates dates/counts and auto-calculates shortfallTrips for FleetShortfallRecord', async () => {
    // Inverted date range -> 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/shortfalls`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodStart: '2026-11-20',
        periodEnd: '2026-11-10',
        minimumTripsRequired: 100,
        actualTripsOffered: 60,
      })
      .expect(400);

    // Negative trips -> 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/shortfalls`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodStart: '2026-11-01',
        periodEnd: '2026-11-10',
        minimumTripsRequired: -5,
        actualTripsOffered: 10,
      })
      .expect(400);

    // Overachievement clamps shortfallTrips cleanly to 0
    const exceededRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/shortfalls`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodStart: '2026-11-01',
        periodEnd: '2026-11-15',
        minimumTripsRequired: 80,
        actualTripsOffered: 95,
        compensationAmount: 0,
      })
      .expect(201);
    expect(exceededRes.body.data.shortfallTrips).toBe(0);

    // Genuine shortfall computes diff and emits notification
    const shortfallRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/fleets/${IDS.fleet1}/shortfalls`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodStart: '2026-11-16',
        periodEnd: '2026-11-30',
        minimumTripsRequired: 120,
        actualTripsOffered: 85,
        compensationAmount: 7000,
        status: 'APPROVED',
        notes: 'Guaranteed minimum shortfall Nov second half',
      })
      .expect(201);
    expect(shortfallRes.body.data.shortfallTrips).toBe(35);
    expect(shortfallRes.body.data.compensationAmount).toBe(7000);
    expect(notificationsStore.some((n) => n.entityType === 'SHORTFALL')).toBe(true);
  });
});
