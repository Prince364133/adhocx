import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  FleetAdminRole,
  FleetIncentiveEligibility,
  FleetIncentiveType,
  FleetNotificationEventType,
} from '@adhocx/contracts';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { StorageService } from '../src/common/storage/storage.service';
import { hashPassword } from '../src/common/utils/password.util';
import { DatabaseService } from '../src/database/database.service';
import { FleetAuthController } from '../src/domains/fleet/portal/auth/fleet-auth.controller';
import { FleetAuthService } from '../src/domains/fleet/portal/auth/fleet-auth.service';
import { FleetCodeController } from '../src/domains/fleet/portal/code/fleet-code.controller';
import { FleetCodeService } from '../src/domains/fleet/portal/code/fleet-code.service';
import { FleetDashboardController } from '../src/domains/fleet/portal/dashboard/fleet-dashboard.controller';
import { FleetDashboardService } from '../src/domains/fleet/portal/dashboard/fleet-dashboard.service';
import { FleetDriversController } from '../src/domains/fleet/portal/drivers/fleet-drivers.controller';
import { FleetDriversService } from '../src/domains/fleet/portal/drivers/fleet-drivers.service';
import { FleetFinanceController } from '../src/domains/fleet/portal/earnings-payouts/fleet-finance.controller';
import { FleetFinanceService } from '../src/domains/fleet/portal/earnings-payouts/fleet-finance.service';
import { FleetAuthGuard } from '../src/domains/fleet/portal/guards/fleet-auth.guard';
import { FleetRolesGuard } from '../src/domains/fleet/portal/guards/fleet-roles.guard';
import { FleetIncentivesController } from '../src/domains/fleet/portal/incentives/fleet-incentives.controller';
import { FleetIncentivesService } from '../src/domains/fleet/portal/incentives/fleet-incentives.service';
import { FleetLiveOpsController } from '../src/domains/fleet/portal/live-operations/fleet-live-ops.controller';
import { FleetLiveOpsService } from '../src/domains/fleet/portal/live-operations/fleet-live-ops.service';
import { FleetNotificationsController } from '../src/domains/fleet/portal/notifications/fleet-notifications.controller';
import { FleetNotificationsService } from '../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetShiftsController } from '../src/domains/fleet/portal/shifts/fleet-shifts.controller';
import { FleetShiftsService } from '../src/domains/fleet/portal/shifts/fleet-shifts.service';
import { FleetSupportController } from '../src/domains/fleet/portal/support/fleet-support.controller';
import { FleetSupportService } from '../src/domains/fleet/portal/support/fleet-support.service';

const JWT_SECRET = 'fleet-test-secret-key';

jest.setTimeout(30000);

const IDS = {
  fleet1: '11111111-1111-4111-8111-111111111111',
  fleet2: '22222222-2222-4222-8222-222222222222',
  owner1: '33333333-3333-4333-8333-333333333333',
  manager1: '44444444-4444-4444-8444-444444444444',
  driver1: '55555555-5555-4555-8555-555555555555',
  driverForeign: '66666666-6666-4666-8666-666666666666',
  incentive1: '77777777-7777-4777-8777-777777777777',
  ticket1: '88888888-8888-4888-8888-888888888888',
  ticketResolved: '89999999-8999-4899-8899-899999999999',
  notif1: '99999999-9999-4999-8999-999999999999',
  shift1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nonExistent: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

describe('Fleet Portal 12-Case HTTP Endpoint & Security Matrix (Phases 2-5)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let db: any;
  let ownerToken: string;
  let managerToken: string;
  let expiredToken: string;
  let ownerPassHash: string;

  beforeAll(async () => {
    ownerPassHash = await hashPassword('Fleet@1234');
    const now = new Date('2026-11-27T10:00:00.000Z');

    db = {
      fleet: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === IDS.fleet1) {
            return {
              id: IDS.fleet1,
              name: 'Metro Fleet',
              code: 'FLT-METRO1',
              codeStatus: 'ACTIVE',
              codeRotatedAt: now,
              status: 'ACTIVE',
            };
          }
          if (where.code === 'FLT-METRO1') return { id: IDS.fleet1 };
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          code: data.code || 'FLT-NEW123',
          codeStatus: data.codeStatus || 'ACTIVE',
          codeRotatedAt: now,
        })),
      },
      fleetAdminUser: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          const matchesEmail = where?.OR?.some((c: any) => c.email === 'owner@metro.test');
          if (matchesEmail) {
            return {
              id: IDS.owner1,
              fleetId: IDS.fleet1,
              fullName: 'Metro Owner',
              email: 'owner@metro.test',
              phone: '9999900001',
              passwordHash: ownerPassHash,
              role: FleetAdminRole.FLEET_OWNER,
              permissions: ['VIEW_EARNINGS'],
              status: 'ACTIVE',
              fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', status: 'ACTIVE' },
            };
          }
          return null;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === IDS.owner1) {
            return {
              id: IDS.owner1,
              fleetId: IDS.fleet1,
              fullName: 'Metro Owner',
              email: 'owner@metro.test',
              phone: '9999900001',
              role: FleetAdminRole.FLEET_OWNER,
              permissions: ['VIEW_EARNINGS'],
              status: 'ACTIVE',
              fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', status: 'ACTIVE' },
            };
          }
          if (where.id === IDS.manager1) {
            return {
              id: IDS.manager1,
              fleetId: IDS.fleet1,
              fullName: 'Metro Manager',
              email: 'mgr@metro.test',
              phone: '9999900002',
              role: FleetAdminRole.FLEET_MANAGER,
              permissions: [],
              status: 'ACTIVE',
              fleet: { id: IDS.fleet1, name: 'Metro Fleet', code: 'FLT-METRO1', status: 'ACTIVE' },
            };
          }
          return null;
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      driver: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: IDS.driver1,
            fullName: 'Arjun Driver',
            phone: '9888800001',
            verificationStatus: 'VERIFIED',
            availabilityStatus: 'AVAILABLE',
            vehiclePlate: 'KA01AA1111',
            vehicleType: 'SEDAN',
            vehicleModel: 'Dzire',
            currentLat: 12.97,
            currentLng: 77.59,
            lastLocationAt: new Date(),
            trips: [{ status: 'COMPLETED', totalDriverEarnings: 1200, driverRate: 1200 }],
          },
        ]),
        count: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id?.in) {
            return where.id.in.filter((id: string) => id === IDS.driver1).length;
          }
          return 1;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id === IDS.driver1 && where?.fleetId === IDS.fleet1 && !where?.vehiclePlate) {
            return {
              id: IDS.driver1,
              fleetId: IDS.fleet1,
              fullName: 'Arjun Driver',
              phone: '9888800001',
              user: { email: 'arjun@metro.test' },
              verificationStatus: 'VERIFIED',
              availabilityStatus: 'AVAILABLE',
              vehiclePlate: 'KA01AA1111',
              vehicleType: 'SEDAN',
              vehicleModel: 'Dzire',
              fleetAssignedAt: now,
              trips: [
                {
                  id: 'trip-1',
                  status: 'COMPLETED',
                  pickupAddress: 'MG Road',
                  dropAddress: 'Airport',
                  totalDriverEarnings: 1200,
                  driverRate: 1200,
                  startedAt: now,
                  completedAt: now,
                  createdAt: now,
                },
              ],
              settlements: [],
            };
          }
          if (where?.vehiclePlate === 'KA01DUP999' || where?.vehiclePlate?.equals === 'KA01DUP999') {
            return { id: IDS.driverForeign, fullName: 'Other Fleet Driver' };
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          fullName: 'Arjun Driver',
          vehiclePlate: data.vehiclePlate ?? null,
          vehicleType: data.vehicleType ?? 'SEDAN',
          vehicleModel: data.vehicleModel ?? 'Dzire',
        })),
      },
      trip: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'trip-1',
            driverId: IDS.driver1,
            status: 'COMPLETED',
            pickupAddress: 'MG Road',
            dropAddress: 'Airport',
            totalDriverEarnings: 1200,
            driverRate: 1200,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        ]),
      },
      fleetDriverHistory: { create: jest.fn().mockResolvedValue({ id: 'h1' }) },
      fleetPayoutRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'p1',
          referenceCode: 'FPR-001',
          amount: 500,
          currency: 'INR',
          status: 'REQUESTED',
          createdAt: now,
        }),
      },
      fleetShortfallRecord: { findMany: jest.fn().mockResolvedValue([]) },
      fleetIncentive: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === IDS.incentive1 && where.fleetId === IDS.fleet1) {
            return {
              id: IDS.incentive1,
              fleetId: IDS.fleet1,
              name: 'Weekend Bonus',
              type: FleetIncentiveType.TARGET_BASED,
              eligibilityScope: FleetIncentiveEligibility.ALL,
              eligibleDriverIds: [],
              targetTrips: 5,
              rewardAmount: 500,
              startsAt: now,
              endsAt: now,
              status: 'ACTIVE',
              createdAt: now,
            };
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: IDS.incentive1,
          ...data,
          createdAt: now,
        })),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          fleetId: IDS.fleet1,
          name: data.name || 'Weekend Bonus',
          type: FleetIncentiveType.TARGET_BASED,
          eligibilityScope: FleetIncentiveEligibility.ALL,
          eligibleDriverIds: [],
          targetTrips: 5,
          rewardAmount: 500,
          startsAt: now,
          endsAt: now,
          status: data.status || 'PAUSED',
          createdAt: now,
        })),
      },
      fleetIncentiveProgress: { findMany: jest.fn().mockResolvedValue([]) },
      fleetSupportTicket: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: IDS.ticket1,
            ticketNumber: 'TCK-FLT-1',
            fleetId: IDS.fleet1,
            category: 'GENERAL',
            subject: 'Driver onboarding check',
            description: 'Need status',
            status: 'OPEN',
            attachments: [],
            createdAt: now,
            updatedAt: now,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.fleetId === IDS.fleet1 && where.id === IDS.ticket1) {
            return {
              id: IDS.ticket1,
              ticketNumber: 'TCK-FLT-1',
              fleetId: IDS.fleet1,
              category: 'GENERAL',
              subject: 'Driver onboarding check',
              description: 'Need status',
              status: 'OPEN',
              attachments: [],
              createdAt: now,
              updatedAt: now,
              messages: [
                {
                  id: 'm1',
                  ticketId: IDS.ticket1,
                  senderRole: 'FLEET_OWNER',
                  senderName: 'Metro Owner',
                  body: 'Need status',
                  attachments: [],
                  createdAt: now,
                },
              ],
            };
          }
          if (where.fleetId === IDS.fleet1 && where.id === IDS.ticketResolved) {
            return {
              id: IDS.ticketResolved,
              ticketNumber: 'TCK-FLT-2',
              fleetId: IDS.fleet1,
              category: 'GENERAL',
              subject: 'Resolved issue',
              description: 'Done',
              status: 'RESOLVED',
              attachments: [],
              createdAt: now,
              updatedAt: now,
              messages: [],
            };
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: IDS.ticket1,
          ...data,
          createdAt: now,
          updatedAt: now,
        })),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ticketNumber: 'TCK-FLT-1',
          fleetId: IDS.fleet1,
          category: 'GENERAL',
          subject: 'Ticket updated',
          description: 'Desc',
          status: data.status || 'OPEN',
          attachments: [],
          createdAt: now,
          updatedAt: now,
        })),
      },
      fleetSupportMessage: {
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'm-new',
          ...data,
          createdAt: now,
        })),
      },
      fleetNotification: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: IDS.notif1,
            fleetId: IDS.fleet1,
            eventType: FleetNotificationEventType.DRIVER_JOINED,
            title: 'Driver Joined',
            message: 'Arjun joined Fleet',
            isRead: false,
            createdAt: now,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === IDS.notif1 && where.fleetId === IDS.fleet1) {
            return {
              id: IDS.notif1,
              fleetId: IDS.fleet1,
              eventType: FleetNotificationEventType.DRIVER_JOINED,
              title: 'Driver Joined',
              message: 'Arjun joined Fleet',
              isRead: false,
              createdAt: now,
            };
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          fleetId: IDS.fleet1,
          eventType: FleetNotificationEventType.DRIVER_JOINED,
          title: 'Driver Joined',
          message: 'Arjun joined Fleet',
          isRead: data.isRead,
          readAt: data.readAt,
          createdAt: now,
        })),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: IDS.notif1,
          isRead: false,
          createdAt: now,
          ...data,
        })),
      },
      fleetShift: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.title === undefined && where.shiftStart) {
            return { id: IDS.shift1, title: 'Existing Overlap' };
          }
          return null;
        }),
        create: jest.fn().mockResolvedValue({
          id: IDS.shift1,
          fleetId: IDS.fleet1,
          driverId: IDS.driver1,
          title: 'Morning Shift',
          shiftStart: now,
          shiftEnd: now,
          status: 'SCHEDULED',
          createdAt: now,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (arg: any) => {
        if (typeof arg === 'function') return arg(db);
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [
        FleetAuthController,
        FleetCodeController,
        FleetDashboardController,
        FleetDriversController,
        FleetLiveOpsController,
        FleetFinanceController,
        FleetIncentivesController,
        FleetShiftsController,
        FleetSupportController,
        FleetNotificationsController,
      ],
      providers: [
        FleetAuthGuard,
        FleetRolesGuard,
        FleetAuthService,
        FleetCodeService,
        FleetDashboardService,
        FleetDriversService,
        FleetLiveOpsService,
        FleetFinanceService,
        FleetIncentivesService,
        FleetShiftsService,
        FleetSupportService,
        FleetNotificationsService,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: { get: () => JWT_SECRET },
        },
        {
          provide: StorageService,
          useValue: {
            getPresignedUploadUrl: jest.fn().mockResolvedValue(null),
            getDocumentAccessUrl: jest.fn().mockImplementation(async (k: string) => k),
            saveFile: jest.fn().mockResolvedValue({
              filename: 'sample.pdf',
              originalName: 'sample.pdf',
              mimeType: 'application/pdf',
              storageProvider: 'local',
            }),
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
    ownerToken = await jwtService.signAsync({
      sub: IDS.owner1,
      fleetId: IDS.fleet1,
      role: FleetAdminRole.FLEET_OWNER,
    });
    managerToken = await jwtService.signAsync({
      sub: IDS.manager1,
      fleetId: IDS.fleet1,
      role: FleetAdminRole.FLEET_MANAGER,
    });
    expiredToken = await jwtService.signAsync(
      { sub: IDS.owner1, fleetId: IDS.fleet1, role: FleetAdminRole.FLEET_OWNER },
      { expiresIn: -10 },
    );
  });

  afterEach(() => {
    delete process.env.ENABLE_FLEET_SHIFTS;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Case 1: Happy-path responses across all Fleet Portal endpoints (Phases 2-5)', () => {
    it('returns 200/201 envelopes for auth, code, dashboard, drivers, live-ops, finance, incentives, support & notifications', async () => {
      const server = app.getHttpServer();

      const loginRes = await request(server)
        .post('/api/v1/fleet/auth/login')
        .send({ identifier: 'owner@metro.test', password: 'Fleet@1234' })
        .expect(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toBeTruthy();

      await request(server)
        .get('/api/v1/fleet/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/auth/logout')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/code')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/code/regenerate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .patch('/api/v1/fleet/code/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'DISABLED', reason: 'Audit pause' })
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/drivers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .get(`/api/v1/fleet/drivers/${IDS.driver1}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .patch(`/api/v1/fleet/drivers/${IDS.driver1}/vehicle`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ vehiclePlate: 'KA01ZZ9999', vehicleType: 'SEDAN' })
        .expect(200);

      await request(server)
        .post(`/api/v1/fleet/drivers/${IDS.driver1}/remove`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ notes: 'Transfer complete' })
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/live-operations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/earnings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const csvRes = await request(server)
        .get('/api/v1/fleet/earnings/export')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(csvRes.text).toContain('Driver ID,Driver Name');

      await request(server)
        .get('/api/v1/fleet/payouts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/payouts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ amount: 500 })
        .expect(201);

      await request(server)
        .get('/api/v1/fleet/shortfall-claims')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .get('/api/v1/fleet/incentives')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/incentives')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Sprint Target',
          type: FleetIncentiveType.TARGET_BASED,
          eligibilityScope: FleetIncentiveEligibility.ALL,
          targetTrips: 5,
          rewardAmount: 500,
          startsAt: '2026-11-27T00:00:00.000Z',
          endsAt: '2026-11-30T23:59:59.000Z',
        })
        .expect(201);

      await request(server)
        .patch(`/api/v1/fleet/incentives/${IDS.incentive1}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'PAUSED' })
        .expect(200);

      await request(server)
        .get(`/api/v1/fleet/incentives/${IDS.incentive1}/progress`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const presignRes = await request(server)
        .post('/api/v1/fleet/support/attachments/presign')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ fileName: 'proof.pdf', mimeType: 'application/pdf' })
        .expect(201);
      expect(presignRes.body.data.uploadMode).toBe('MULTIPART_FALLBACK');

      await request(server)
        .post('/api/v1/fleet/support/tickets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          category: 'GENERAL',
          subject: 'Need help',
          description: 'Sample support issue',
          attachments: [
            {
              key: presignRes.body.data.key,
              fileName: 'proof.pdf',
              mimeType: 'application/pdf',
            },
          ],
        })
        .expect(201);

      await request(server)
        .get('/api/v1/fleet/support/tickets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const detailRes = await request(server)
        .get(`/api/v1/fleet/support/tickets/${IDS.ticket1}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(detailRes.body.data.messages).toHaveLength(1);

      await request(server)
        .post(`/api/v1/fleet/support/tickets/${IDS.ticket1}/messages`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Follow up note' })
        .expect(201);

      const notifRes = await request(server)
        .get('/api/v1/fleet/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(notifRes.body.data.unreadCount).toBe(1);

      await request(server)
        .patch(`/api/v1/fleet/notifications/${IDS.notif1}/read`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/notifications/read-all')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(server)
        .post('/api/v1/fleet/notifications/announcements')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Safety Briefing', message: 'Mandatory check-in tomorrow.' })
        .expect(201);
    });
  });

  describe('Cases 2, 3, 4 & 12: Payload Validation, Missing Fields, Bad Types/Enums & Pagination Boundaries', () => {
    it('rejects unknown whitelisted fields, missing fields, invalid types/enums, and invalid pagination limits with 400', async () => {
      const server = app.getHttpServer();

      // Case 2: Non-whitelisted unknown property & invalid payout amount
      await request(server)
        .post('/api/v1/fleet/payouts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ amount: 100, hackedField: true })
        .expect(400);

      await request(server)
        .post('/api/v1/fleet/payouts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ amount: -50 })
        .expect(400);

      // Case 3: Missing required fields
      await request(server)
        .post('/api/v1/fleet/support/tickets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ category: 'GENERAL' })
        .expect(400);

      await request(server)
        .post('/api/v1/fleet/auth/login')
        .send({ identifier: 'owner@metro.test' })
        .expect(400);

      // Case 4: Invalid enum / MIME / data types
      await request(server)
        .patch('/api/v1/fleet/code/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      await request(server)
        .post('/api/v1/fleet/support/attachments/presign')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ fileName: 'virus.exe', mimeType: 'application/x-msdownload' })
        .expect(400);

      // Resolved ticket reply requires explicit reopen confirmation
      await request(server)
        .post(`/api/v1/fleet/support/tickets/${IDS.ticketResolved}/messages`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Trying to reply without reopen' })
        .expect(400);

      // Case 12: Pagination boundaries
      await request(server)
        .get('/api/v1/fleet/notifications?page=0')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(server)
        .get('/api/v1/fleet/support/tickets?limit=1000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(server)
        .get('/api/v1/fleet/notifications?unreadOnly=true&page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });

  describe('Case 5: Authentication Failures (Missing, Malformed, Expired JWT -> 401)', () => {
    it('rejects unauthenticated requests with 401 across protected endpoints', async () => {
      const server = app.getHttpServer();
      const endpoints = [
        { method: 'get', path: '/api/v1/fleet/auth/me' },
        { method: 'get', path: '/api/v1/fleet/dashboard' },
        { method: 'get', path: '/api/v1/fleet/drivers' },
        { method: 'get', path: '/api/v1/fleet/live-operations' },
        { method: 'get', path: '/api/v1/fleet/earnings' },
        { method: 'get', path: '/api/v1/fleet/payouts' },
        { method: 'get', path: '/api/v1/fleet/incentives' },
        { method: 'get', path: '/api/v1/fleet/support/tickets' },
        { method: 'get', path: '/api/v1/fleet/notifications' },
      ];

      for (const ep of endpoints) {
        await (request(server) as any)[ep.method](ep.path).expect(401);
        await (request(server) as any)[ep.method](ep.path)
          .set('Authorization', 'Bearer not-a-jwt')
          .expect(401);
        await (request(server) as any)[ep.method](ep.path)
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      }
    });
  });

  describe('Cases 6, 7, 8 & 9: RBAC, Cross-Fleet Isolation, UUID Format, Non-Existent IDs & Conflicts', () => {
    it('enforces FLEET_OWNER vs FLEET_MANAGER permissions, 400 UUID validation, 404 isolation & 409 conflicts', async () => {
      const server = app.getHttpServer();

      // Case 6: FLEET_MANAGER blocked from owner-only / VIEW_EARNINGS routes (403)
      await request(server)
        .get('/api/v1/fleet/earnings')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      await request(server)
        .post('/api/v1/fleet/payouts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ amount: 100 })
        .expect(403);

      await request(server)
        .post('/api/v1/fleet/code/regenerate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      await request(server)
        .post('/api/v1/fleet/notifications/announcements')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Denied', message: 'Not owner' })
        .expect(403);

      // Case 7: Invalid UUID parameter -> 400
      await request(server)
        .get('/api/v1/fleet/drivers/not-a-uuid')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(server)
        .get('/api/v1/fleet/support/tickets/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(server)
        .patch('/api/v1/fleet/notifications/bad-id/read')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      // Case 8: Non-existent / cross-fleet resource -> 404
      await request(server)
        .get(`/api/v1/fleet/support/tickets/${IDS.nonExistent}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      await request(server)
        .patch(`/api/v1/fleet/notifications/${IDS.nonExistent}/read`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      await request(server)
        .get(`/api/v1/fleet/incentives/${IDS.nonExistent}/progress`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      // Case 9: Conflict (409) on duplicate vehicle plate & overlapping shift
      await request(server)
        .patch(`/api/v1/fleet/drivers/${IDS.driver1}/vehicle`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ vehiclePlate: 'KA01DUP999' })
        .expect(409);

      process.env.ENABLE_FLEET_SHIFTS = 'true';
      await request(server)
        .post('/api/v1/fleet/shifts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          driverId: IDS.driver1,
          title: 'Conflicting Shift',
          shiftStart: '2026-11-27T08:00:00.000Z',
          shiftEnd: '2026-11-27T14:00:00.000Z',
        })
        .expect(409);
    });
  });

  describe('Cases 10 & 11: Simulated DB Failure Sanitization & Error Logging', () => {
    it('returns sanitized 500 without leaking SQL/stack traces and logs the error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      db.fleet.findUnique.mockRejectedValueOnce(new Error('ECONNREFUSED SELECT * FROM fleets'));

      const res = await request(app.getHttpServer())
        .get('/api/v1/fleet/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.error.message).not.toContain('SELECT *');
      expect(res.body.error.message).not.toContain('ECONNREFUSED');
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
