import { BadRequestException, ExecutionContext, INestApplication, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@adhocx/contracts';
import { UserStatus as PrismaUserStatus } from '@prisma/client';
import request from 'supertest';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { DatabaseService } from '../src/database/database.service';
import { CorporateOpsDriversController } from '../src/domains/corporate/operations/corporate-operations.controller';
import { CorporateOpsDriversService } from '../src/domains/corporate/operations/corporate-ops-drivers.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Corporate Ops driver dashboard API', () => {
  const driver = {
    id: 'driver-1',
    userId: 'user-1',
    fullName: 'Alex Driver',
    phone: '+911234567890',
    verificationStatus: 'VERIFIED',
    availabilityStatus: 'AVAILABLE',
    vehicleType: 'SEDAN',
    vehicleModel: 'Model X',
    vehiclePlate: 'TS01AB1234',
    trustScore: 92,
    averageRating: 4.8,
    ratingCount: 6,
    totalTrips: 20,
    acceptanceRate: 80,
    acceptedOffers: 8,
    declinedOffers: 2,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    user: { phone: '+911234567890', email: 'alex@example.com', status: 'ACTIVE' },
    kycDocuments: {
      aadhaarNumber: '123456789012',
      panNumber: 'ABCDE1234F',
      documents: [{ documentType: 'DRIVING_LICENSE', status: 'VERIFIED', fileUrl: 'private-url' }],
    },
    dlFrontUrl: 'private-dl-url',
    rcDocUrl: null,
    insuranceDocUrl: null,
    vehiclePhotoUrl: null,
    aadharFrontUrl: 'private-aadhaar-url',
    panDocUrl: null,
    trips: [{
      id: 'trip-1',
      status: 'COMPLETED',
      pickupAddress: 'Origin',
      dropAddress: 'Destination',
      reportingTime: new Date('2026-01-02T09:00:00Z'),
      startedAt: null,
      completedAt: null,
      createdAt: new Date('2026-01-02T09:00:00Z'),
    }],
    corporateRoutes: [{
      id: 'route-1',
      shiftDate: new Date('2026-01-03T00:00:00Z'),
      shiftTime: '09:00',
      direction: 'LOGIN',
      status: 'COMPLETED',
      tenant: { id: 'tenant-1', name: 'Acme' },
      office: { id: 'office-1', name: 'HQ' },
    }],
  };

  let db: any;
  let admin: any;
  let redis: any;
  let service: CorporateOpsDriversService;

  beforeEach(() => {
    db = {
      driver: {
        findMany: jest.fn().mockResolvedValue([driver]),
        findUnique: jest.fn().mockResolvedValue(driver),
        count: jest.fn().mockResolvedValue(1),
      },
      $queryRaw: jest.fn().mockResolvedValue([{
        id: 'driver-1',
        documents: driver.kycDocuments.documents,
        profilePhotoUrl: null,
      }]),
      user: { delete: jest.fn() },
    };
    admin = {
      suspendDriver: jest.fn().mockResolvedValue({
        id: 'driver-1', userId: 'user-1', verificationStatus: 'SUSPENDED',
      }),
      reactivateDriver: jest.fn().mockResolvedValue({
        id: 'driver-1', userId: 'user-1', verificationStatus: 'VERIFIED',
      }),
      updateUserStatus: jest.fn().mockImplementation(async (id, _actor, status) => ({ id, status })),
    };
    redis = {
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
      unrevokeUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new CorporateOpsDriversService(db, admin, redis);
  });

  it('limits all dashboard and lifecycle actions to ADMIN/OPS; deactivation is OPS-only', () => {
    const roleFor = (method: string) =>
      Reflect.getMetadata(ROLES_KEY, (CorporateOpsDriversController.prototype as any)[method]);
    expect(roleFor('list')).toEqual([UserRole.ADMIN, UserRole.OPS]);
    expect(roleFor('detail')).toEqual([UserRole.ADMIN, UserRole.OPS]);
    expect(roleFor('suspend')).toEqual([UserRole.ADMIN, UserRole.OPS]);
    expect(roleFor('reactivate')).toEqual([UserRole.ADMIN, UserRole.OPS]);
    expect(roleFor('deactivateAccount')).toEqual([UserRole.OPS]);
    expect(roleFor('activateAccount')).toEqual([UserRole.OPS]);
    expect((CorporateOpsDriversController.prototype as any).delete).toBeUndefined();
  });

  describe('HTTP authorization and identifier validation', () => {
    let app: INestApplication;
    const driversApi = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
      detail: jest.fn().mockResolvedValue({ driverId: '00000000-0000-4000-8000-000000000001' }),
      suspend: jest.fn().mockResolvedValue({ driverId: '00000000-0000-4000-8000-000000000001' }),
      reactivate: jest.fn().mockResolvedValue({ driverId: '00000000-0000-4000-8000-000000000001' }),
    };
    const testAuthGuard = {
      canActivate: (context: ExecutionContext) => {
        const requestContext = context.switchToHttp().getRequest();
        if (requestContext.headers.authorization !== 'Bearer test-token') {
          throw new UnauthorizedException();
        }
        requestContext.user = {
          id: '00000000-0000-4000-8000-000000000002',
          role: requestContext.headers['x-test-role'],
        };
        return true;
      },
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [CorporateOpsDriversController],
        providers: [
          RolesGuard,
          CorporateAccessGuard,
          { provide: DatabaseService, useValue: {} },
          { provide: CorporateOpsDriversService, useValue: driversApi },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(testAuthGuard)
        .compile();
      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1');
      await app.init();
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    it('requires authentication and allows OPS to read the driver directory', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/corporate/ops/drivers')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/corporate/ops/drivers')
        .set('Authorization', 'Bearer test-token')
        .set('x-test-role', UserRole.OPS)
        .expect(200);
      expect(driversApi.list).toHaveBeenCalledTimes(1);
    });

    it('denies corporate tenant roles and rejects malformed driver ids before service access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/corporate/ops/drivers')
        .set('Authorization', 'Bearer test-token')
        .set('x-test-role', UserRole.CORPORATE_MANAGER)
        .expect(403);
      await request(app.getHttpServer())
        .get('/api/v1/corporate/ops/drivers/not-a-uuid')
        .set('Authorization', 'Bearer test-token')
        .set('x-test-role', UserRole.OPS)
        .expect(400);
      expect(driversApi.detail).not.toHaveBeenCalled();
    });

    it('passes the authenticated ADMIN or OPS role into lifecycle service calls', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/corporate/ops/drivers/00000000-0000-4000-8000-000000000001/suspend')
        .set('Authorization', 'Bearer test-token')
        .set('x-test-role', UserRole.ADMIN)
        .send({ reason: 'Safety review' })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/corporate/ops/drivers/00000000-0000-4000-8000-000000000001/reactivate')
        .set('Authorization', 'Bearer test-token')
        .set('x-test-role', UserRole.OPS)
        .send({ notes: 'Review complete' })
        .expect(200);

      expect(driversApi.suspend).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        UserRole.ADMIN,
        { reason: 'Safety review' },
      );
      expect(driversApi.reactivate).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        UserRole.OPS,
        { notes: 'Review complete' },
      );
    });
  });

  it('paginates and searches using driver profile fields', async () => {
    const result = await service.list({
      page: 2,
      pageSize: 5,
      search: ' Alex ',
      verificationStatus: 'VERIFIED',
    });

    expect(db.driver.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 5,
      take: 5,
      select: expect.not.objectContaining({ kycDocuments: true }),
      where: expect.objectContaining({
        verificationStatus: 'VERIFIED',
        OR: expect.arrayContaining([
          { fullName: { contains: 'Alex', mode: 'insensitive' } },
        ]),
      }),
    }));
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 5, totalPages: 1 });
    expect(result.items[0]).toMatchObject({ driverId: 'driver-1', userId: 'user-1' });
    expect(result.items[0]).not.toHaveProperty('kycDocuments');
  });

  it('returns a database-backed empty page without issuing a document projection query', async () => {
    db.driver.findMany.mockResolvedValue([]);
    db.driver.count.mockResolvedValue(0);

    await expect(service.list({ search: 'no matching driver' })).resolves.toMatchObject({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns safe document status, trust summary, and bounded route/trip history', async () => {
    const result = await service.detail('driver-1');
    expect(db.driver.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'driver-1' },
      select: expect.objectContaining({
        trips: expect.objectContaining({ take: 50 }),
        corporateRoutes: expect.objectContaining({ take: 50 }),
      }),
    }));
    expect(db.driver.findUnique.mock.calls[0][0].select).not.toHaveProperty('kycDocuments');
    expect(result).toMatchObject({
      driverId: 'driver-1',
      userId: 'user-1',
      trustScore: { score: 92, averageRating: 4.8, ratingCount: 6, totalTrips: 20 },
      history: { trips: [{ id: 'trip-1' }], corporateRoutes: [{ id: 'route-1' }] },
    });
    expect(result.verificationDocuments).toContainEqual({
      type: 'DRIVING_LICENSE', uploaded: true, status: 'VERIFIED',
    });
    expect(JSON.stringify(result)).not.toContain('123456789012');
    expect(JSON.stringify(result)).not.toContain('ABCDE1234F');
    expect(JSON.stringify(result)).not.toContain('private-dl-url');
    expect(JSON.stringify(result)).not.toContain('fileUrl');
    expect(JSON.stringify(result)).not.toContain('otp');
  });

  it('does not present a missing trust score or rating as a real value', async () => {
    db.driver.findMany.mockResolvedValue([{
      ...driver,
      trustScore: null,
      averageRating: null,
      acceptanceRate: null,
      ratingCount: 0,
    }]);
    db.driver.findUnique.mockResolvedValue({
      ...driver,
      trustScore: null,
      averageRating: null,
      acceptanceRate: null,
      ratingCount: 0,
    });

    const list = await service.list({});
    const detail = await service.detail('driver-1');

    expect(list.items[0].trustScore).toMatchObject({ score: null, averageRating: null, ratingCount: 0 });
    expect(detail.trustScore).toMatchObject({
      score: null,
      averageRating: null,
      acceptanceRate: null,
      ratingCount: 0,
    });
  });

  it('marks unknown uploaded document statuses as pending without exposing KYC data', async () => {
    db.$queryRaw.mockResolvedValue([{
      id: 'driver-1',
      documents: [{ documentType: 'DRIVING_LICENSE', status: 'UNRECOGNIZED', fileUrl: 'private-url' }],
      profilePhotoUrl: null,
    }]);

    const result = await service.list({});

    expect(result.items[0].verificationDocuments).toContainEqual({
      type: 'DRIVING_LICENSE',
      uploaded: true,
      status: 'PENDING',
    });
    expect(JSON.stringify(result)).not.toContain('private-url');
  });

  it('reports Redis session-sync failure instead of returning success', async () => {
    redis.revokeUserSessions.mockRejectedValue(new Error('redis unavailable'));

    await expect(service.deactivateAccount('driver-1', 'ops-1', { reason: 'Account review' }))
      .rejects.toThrow('distributed session revocation failed');
    expect(admin.updateUserStatus).toHaveBeenCalled();
  });

  it('uses established suspend/reactivate logic and attributes the authenticated actor role', async () => {
    await expect(service.suspend('driver-1', 'admin-1', 'ADMIN', { reason: 'Safety review' }))
      .resolves.toEqual({ driverId: 'driver-1', userId: 'user-1', verificationStatus: 'SUSPENDED' });
    await expect(service.reactivate('driver-1', 'ops-1', 'OPS', { notes: 'Review complete' }))
      .resolves.toEqual({ driverId: 'driver-1', userId: 'user-1', verificationStatus: 'VERIFIED' });
    expect(admin.suspendDriver).toHaveBeenCalledWith('driver-1', 'admin-1', { reason: 'Safety review' }, 'ADMIN', true);
    expect(admin.reactivateDriver).toHaveBeenCalledWith('driver-1', 'ops-1', { notes: 'Review complete' }, 'OPS', true);
  });

  it('soft-deactivates and restores User.id without deleting driver history', async () => {
    await expect(service.deactivateAccount('driver-1', 'ops-1', { reason: 'Account review' }))
      .resolves.toEqual({ driverId: 'driver-1', userId: 'user-1', userStatus: 'DEACTIVATED' });
    expect(admin.updateUserStatus).toHaveBeenCalledWith(
      'user-1', 'ops-1', PrismaUserStatus.DEACTIVATED, 'Account review', 'OPS', PrismaUserStatus.ACTIVE,
    );
    expect(redis.revokeUserSessions).toHaveBeenCalledWith('user-1', true);
    expect(db.user.delete).not.toHaveBeenCalled();

    db.driver.findUnique.mockResolvedValue({ id: 'driver-1', userId: 'user-1', user: { status: 'DEACTIVATED' } });
    await expect(service.activateAccount('driver-1', 'ops-1', { notes: 'Cleared' }))
      .resolves.toEqual({ driverId: 'driver-1', userId: 'user-1', userStatus: 'ACTIVE' });
    expect(admin.updateUserStatus).toHaveBeenCalledWith(
      'user-1', 'ops-1', PrismaUserStatus.ACTIVE, 'Cleared', 'OPS', PrismaUserStatus.DEACTIVATED,
    );
    expect(redis.unrevokeUser).toHaveBeenCalledWith('user-1', true);
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('audits account status changes under the OPS actor role', async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const accountDb = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'user-1', status: 'DEACTIVATED' }),
      },
    };
    const adminService = new AdminService(accountDb as any, audit as any);

    await adminService.updateUserStatus(
      'user-1', 'ops-1', PrismaUserStatus.DEACTIVATED, 'Account review', 'OPS',
    );

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'ops-1',
      action: 'OPS_USER_STATUS_DEACTIVATED',
      entityType: 'USER',
      entityId: 'user-1',
      metadata: {
        previousStatus: 'ACTIVE',
        newStatus: 'DEACTIVATED',
        reason: 'Account review',
      },
    }));
  });

  it('uses a conditional update and rejects stale account-status transitions', async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const accountDb = {
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status: PrismaUserStatus.ACTIVE }),
      },
    };
    const adminService = new AdminService(accountDb as any, audit as any);

    await expect(adminService.updateUserStatus(
      'user-1',
      'ops-1',
      PrismaUserStatus.DEACTIVATED,
      'Account review',
      'OPS',
      PrismaUserStatus.ACTIVE,
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(accountDb.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', status: PrismaUserStatus.ACTIVE },
      data: { status: PrismaUserStatus.DEACTIVATED },
    });
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('audits a successful conditional user-status transition with its expected previous status', async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const accountDb = {
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status: PrismaUserStatus.DEACTIVATED }),
      },
    };
    const adminService = new AdminService(accountDb as any, audit as any);

    await adminService.updateUserStatus(
      'user-1',
      'ops-1',
      PrismaUserStatus.DEACTIVATED,
      'Account review',
      'OPS',
      PrismaUserStatus.ACTIVE,
    );

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'OPS_USER_STATUS_DEACTIVATED',
      metadata: {
        previousStatus: PrismaUserStatus.ACTIVE,
        newStatus: PrismaUserStatus.DEACTIVATED,
        reason: 'Account review',
      },
    }));
  });

  it('audits driver suspension and reactivation under the OPS actor role', async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const driverDb = {
      driver: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'driver-1', userId: 'user-1', verificationStatus: 'VERIFIED' })
          .mockResolvedValueOnce({ id: 'driver-1', userId: 'user-1', verificationStatus: 'SUSPENDED' }),
        update: jest.fn().mockResolvedValue({ id: 'driver-1' }),
      },
    };
    const adminService = new AdminService(driverDb as any, audit as any);

    await adminService.suspendDriver('driver-1', 'ops-1', { reason: 'Safety review' }, 'OPS');
    await adminService.reactivateDriver('driver-1', 'ops-1', { notes: 'Review complete' }, 'OPS');

    expect(audit.log).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: 'ops-1',
      action: 'OPS_DRIVER_SUSPENDED',
      entityType: 'DRIVER',
      entityId: 'driver-1',
    }));
    expect(audit.log).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: 'ops-1',
      action: 'OPS_DRIVER_REACTIVATED',
      entityType: 'DRIVER',
      entityId: 'driver-1',
    }));
  });

  it('rejects missing drivers and invalid soft-deactivation states', async () => {
    db.driver.findUnique.mockResolvedValue(null);
    await expect(service.deactivateAccount('missing', 'ops-1', { reason: 'Review' }))
      .rejects.toBeInstanceOf(NotFoundException);

    db.driver.findUnique.mockResolvedValue({ id: 'driver-1', userId: 'user-1', user: { status: 'SUSPENDED' } });
    await expect(service.deactivateAccount('driver-1', 'ops-1', { reason: 'Review' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(admin.updateUserStatus).not.toHaveBeenCalled();
  });
});
