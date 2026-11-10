import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../src/modules/admin/admin.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { RedisService } from '../src/redis/redis.service';
import {
  VerificationStatus,
  InvalidStateTransitionError,
} from '@adhocx/contracts';

describe('AdminService Unit Tests', () => {
  let service: AdminService;
  let db: any;
  let audit: any;
  let redis: any;

  beforeEach(async () => {
    redis = {
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
      unrevokeUser: jest.fn().mockResolvedValue(undefined),
    };

    db = {
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
      },
      vendor: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
      },
      user: {
        count: jest.fn().mockResolvedValue(20),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      requirement: {
        count: jest.fn().mockResolvedValue(3),
      },
      trip: {
        count: jest.fn().mockResolvedValue(2),
      },
      settlement: {
        count: jest.fn().mockResolvedValue(1),
      },
      auditLog: {
        findMany: jest.fn(),
      },
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DatabaseService, useValue: db },
        { provide: AuditService, useValue: audit },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should verify driver KYC when status is UNDER_REVIEW and emit audit log', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.UNDER_REVIEW,
    });
    db.driver.update.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const result = await service.verifyDriver('drv-1', 'admin-1', { notes: 'All documents valid' });
    expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        action: 'ADMIN_DRIVER_VERIFIED',
        entityType: 'DRIVER',
        entityId: 'drv-1',
      }),
    );
  });

  it('should reject driver KYC with mandatory reason and emit audit log', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.UNDER_REVIEW,
    });
    db.driver.update.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.REJECTED,
    });

    const result = await service.rejectDriver('drv-1', 'admin-1', {
      reason: 'Blurred driving license',
    });

    expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_DRIVER_REJECTED',
      }),
    );
  });

  it('should reject invalid transition (e.g. PENDING -> VERIFIED)', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.PENDING,
    });

    await expect(
      service.verifyDriver('drv-1', 'admin-1', { notes: 'Premature verify' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('should suspend verified driver and revoke user sessions', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'user-drv-1',
      verificationStatus: VerificationStatus.VERIFIED,
    });
    db.driver.update.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.SUSPENDED,
    });

    const result = await service.suspendDriver('drv-1', 'admin-1', {
      reason: 'Multiple customer complaints',
    });

    expect(result.verificationStatus).toBe(VerificationStatus.SUSPENDED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_DRIVER_SUSPENDED',
      }),
    );
    expect(redis.revokeUserSessions).toHaveBeenCalledWith('user-drv-1');
  });

  it('should reactivate suspended driver and unrevoke user', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'user-drv-1',
      verificationStatus: VerificationStatus.SUSPENDED,
    });
    db.driver.update.mockResolvedValue({
      id: 'drv-1',
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const result = await service.reactivateDriver('drv-1', 'admin-1', {
      notes: 'Investigation concluded',
    });

    expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_DRIVER_REACTIVATED',
      }),
    );
    expect(redis.unrevokeUser).toHaveBeenCalledWith('user-drv-1');
  });

  it('should revoke user sessions when permanently deleting a user account', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u-del-1',
      role: 'DRIVER',
      phone: '+919999999999',
      fullName: 'Departing Driver',
    });
    db.user.delete.mockResolvedValue({});

    await service.deleteUser('u-del-1', 'admin-1');

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u-del-1' } });
    expect(redis.revokeUserSessions).toHaveBeenCalledWith('u-del-1');
  });

  it('should aggregate platform operational metrics', async () => {
    const metrics = await service.getOperationalMetrics();
    expect(metrics.totalDrivers).toBe(10);
    expect(metrics.totalVendors).toBe(5);
    expect(metrics.activeRequirements).toBe(3);
    expect(metrics.activeTrips).toBe(2);
    expect(metrics.pendingSettlements).toBe(1);
  });

  it('should query platform audit logs', async () => {
    const now = new Date();
    db.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        action: 'ADMIN_DRIVER_VERIFIED',
        entityName: 'DRIVER',
        entityId: 'drv-1',
        payload: { notes: 'Approved' },
        ipAddress: '127.0.0.1',
        createdAt: now,
        actor: { id: 'admin-1', phone: '+919999999999', role: 'ADMIN' },
      },
    ]);

    const logs = await service.getAuditLogs(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('ADMIN_DRIVER_VERIFIED');
    expect(logs[0].actorPhone).toBe('+919999999999');
  });
});
