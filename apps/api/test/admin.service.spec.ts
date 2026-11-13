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
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      requirement: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      trip: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      assignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      settlement: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      corporateTenant: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      corporateInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      corporateDriverEarning: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      corporatePayout: {
        findMany: jest.fn().mockResolvedValue([]),
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

  it('should reject driver KYC with mandatory reason and emit audit log without revoking sessions', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'user-drv-1',
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
    expect(redis.revokeUserSessions).not.toHaveBeenCalled();
  });

  it('should reject vendor KYC without revoking user sessions', async () => {
    db.vendor.findUnique.mockResolvedValue({
      id: 'vnd-1',
      userId: 'user-vnd-1',
      verificationStatus: VerificationStatus.UNDER_REVIEW,
    });
    db.vendor.update.mockResolvedValue({
      id: 'vnd-1',
      verificationStatus: VerificationStatus.REJECTED,
    });

    const result = await service.rejectVendor('vnd-1', 'admin-1', {
      reason: 'Incomplete GST certificate',
    });

    expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_VENDOR_REJECTED',
      }),
    );
    expect(redis.revokeUserSessions).not.toHaveBeenCalled();
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

  it('should still approve UNDER_REVIEW driver even if Digio compliance alert lookup throws', async () => {
    const failingDigio = {
      getDriverComplianceAlerts: jest.fn().mockRejectedValue(new Error('Digio lookup unavailable')),
    };
    const svcWithDigio = new AdminService(db, audit, undefined, undefined, redis, failingDigio as any);
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-2',
      verificationStatus: VerificationStatus.UNDER_REVIEW,
    });
    db.driver.update.mockResolvedValue({
      id: 'drv-2',
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const result = await svcWithDigio.verifyDriver('drv-2', 'admin-1', {});
    expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_DRIVER_VERIFIED',
        entityId: 'drv-2',
      }),
    );
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

  it('should return daily trip counts for the last 30 UTC days', async () => {
    db.driver.findMany.mockResolvedValue([]);
    db.settlement.findMany.mockResolvedValue([]);
    db.trip.findMany.mockImplementation(({ where }: { where?: { createdAt?: { gte: Date } } }) => {
      if (!where?.createdAt?.gte) return Promise.resolve([]);
      const firstDay = where.createdAt.gte;
      const secondDay = new Date(firstDay);
      secondDay.setUTCDate(secondDay.getUTCDate() + 1);
      return Promise.resolve([
        { createdAt: firstDay },
        { createdAt: firstDay },
        { createdAt: secondDay },
      ]);
    });

    const report = await service.getOperationalReports();

    expect(report.tripFrequency).toHaveLength(30);
    expect(report.tripFrequency[0].count).toBe(2);
    expect(report.tripFrequency[1].count).toBe(1);
    expect(report.tripFrequency.slice(2).every((day) => day.count === 0)).toBe(true);
  });

  it('should return the selected month report and validate leap-year dates', async () => {
    const februaryTripDate = new Date('2024-02-29T12:00:00.000Z');
    db.trip.findMany.mockResolvedValue([{ createdAt: februaryTripDate }]);
    db.trip.groupBy.mockResolvedValue([{ status: 'COMPLETED', _count: { _all: 1 } }]);

    const report = await service.getTripFrequencyReport('2024', '2');

    expect(report.dailyTrips).toHaveLength(29);
    expect(report.totalTrips).toBe(1);
    expect(report.dailyTrips[28]).toEqual({ date: '2024-02-29', count: 1 });
    expect(report.statusBreakdown).toEqual([{ status: 'COMPLETED', count: 1 }]);

    await expect(service.getTripFrequencyReport('2024', '2', '30')).rejects.toThrow(
      'The selected day is not valid for this month.',
    );
  });

  it('should include trip details when a day in the selected month is opened', async () => {
    const trip = {
      id: 'trip-1',
      status: 'COMPLETED',
      createdAt: new Date('2024-02-29T12:00:00.000Z'),
      vehicleType: 'SEDAN',
      pickupAddress: 'Pickup',
      dropAddress: 'Dropoff',
      driver: { fullName: 'Test Driver' },
    };
    db.trip.findMany.mockResolvedValueOnce([{ createdAt: trip.createdAt }]).mockResolvedValueOnce([trip]);
    db.trip.groupBy.mockResolvedValue([{ status: 'COMPLETED', _count: { _all: 1 } }]);
    db.trip.count.mockResolvedValue(1);

    const report = await service.getTripFrequencyReport('2024', '2', '29');

    expect(report.selectedDay).toBe('2024-02-29');
    expect(report.selectedDayTotal).toBe(1);
    expect(report.selectedDayTrips).toEqual([{ ...trip, createdAt: trip.createdAt.toISOString() }]);
  });

  it('should return a Monday-to-Sunday weekly report and reject invalid dates', async () => {
    const monday = new Date('2024-02-26T10:00:00.000Z');
    db.trip.findMany.mockResolvedValue([{ createdAt: monday }, { createdAt: new Date('2024-03-03T10:00:00.000Z') }]);
    db.trip.groupBy.mockResolvedValue([{ status: 'COMPLETED', _count: { _all: 2 } }]);

    const report = await service.getWeeklyTripFrequencyReport('2024-02-26');

    expect(report.dailyTrips).toHaveLength(7);
    expect(report.dailyTrips[0]).toEqual({ date: '2024-02-26', count: 1 });
    expect(report.dailyTrips[6]).toEqual({ date: '2024-03-03', count: 1 });
    expect(report.totalTrips).toBe(2);
    expect(report.weekStart).toBe('2024-02-26');
    expect(report.weekEnd).toBe('2024-03-03');

    await expect(service.getWeeklyTripFrequencyReport('2024-02-27')).rejects.toThrow(
      'The week-start date must be a valid Monday.',
    );
    await expect(service.getWeeklyTripFrequencyReport('2024-02-26', '2024-03-04')).rejects.toThrow(
      'The selected date must be a valid date in the selected week.',
    );
  });

  it('should include trip details for a selected day within the requested week', async () => {
    const trip = {
      id: 'trip-weekly-1',
      status: 'ASSIGNED',
      createdAt: new Date('2024-02-28T10:00:00.000Z'),
      vehicleType: 'SEDAN',
      pickupAddress: 'Pickup',
      dropAddress: 'Dropoff',
      driver: { fullName: 'Test Driver' },
    };
    db.trip.findMany.mockResolvedValueOnce([{ createdAt: trip.createdAt }]).mockResolvedValueOnce([trip]);
    db.trip.groupBy.mockResolvedValue([{ status: 'ASSIGNED', _count: { _all: 1 } }]);
    db.trip.count.mockResolvedValue(1);

    const report = await service.getWeeklyTripFrequencyReport('2024-02-26', '2024-02-28');

    expect(report.selectedDay).toBe('2024-02-28');
    expect(report.selectedDayTotal).toBe(1);
    expect(report.selectedDayTrips).toEqual([{ ...trip, createdAt: trip.createdAt.toISOString() }]);
  });

  it('should calculate date-filtered booking, payout, and escrow metrics for the India business date', async () => {
    db.payment.findMany
      .mockResolvedValueOnce([{ amount: 1000 }, { amount: 500 }])
      .mockResolvedValueOnce([{ amount: 300 }]);
    db.settlement.findMany.mockResolvedValue([{ amount: 100 }, { amount: 25 }]);

    const report = await service.getDailyFinancialReport('2026-11-10');

    expect(report).toEqual({
      date: '2026-11-10',
      currency: 'INR',
      grossBookingValue: 1500,
      expenditure: 125,
      activeEscrowHoldValue: 300,
      capturedPaymentCount: 2,
      settledPayoutCount: 2,
      activeEscrowHoldCount: 1,
    });
    expect(db.payment.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        status: 'CAPTURED',
        updatedAt: {
          gte: new Date('2026-11-09T18:30:00.000Z'),
          lt: new Date('2026-11-10T18:30:00.000Z'),
        },
      },
      select: { amount: true },
    });
    expect(db.settlement.findMany).toHaveBeenCalledWith({
      where: {
        status: 'SETTLED',
        processedAt: {
          gte: new Date('2026-11-09T18:30:00.000Z'),
          lt: new Date('2026-11-10T18:30:00.000Z'),
        },
      },
      select: { amount: true },
    });
    expect(db.payment.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: { in: ['AUTHORIZED', 'PENDING'] },
        createdAt: {
          gte: new Date('2026-11-09T18:30:00.000Z'),
          lt: new Date('2026-11-10T18:30:00.000Z'),
        },
      },
      select: { amount: true },
    });

    await expect(service.getDailyFinancialReport('2026-02-30')).rejects.toThrow(
      'A valid report date is required.',
    );
  });

  it('should list vendors and corporate tenants sorted alphabetically A-Z for financial filters', async () => {
    db.vendor.findMany.mockResolvedValue([
      { id: 'v-2', organizationName: 'zeta Logistics', fullName: 'Zeta' },
      { id: 'v-1', organizationName: 'Alpha Fleet Co', fullName: 'Alpha' },
      { id: 'v-3', organizationName: '   ', fullName: '   ' },
    ]);
    db.corporateTenant.findMany.mockResolvedValue([
      { id: 't-1', name: 'Beta Mobility', legalEntityName: 'Beta Pvt Ltd', code: 'BETA' },
    ]);

    const companies = await service.getFinancialCompanies();
    expect(companies).toEqual([
      { id: 'VENDOR:v-1', entityId: 'v-1', companyType: 'VENDOR', name: 'Alpha Fleet Co', code: null },
      { id: 'CORPORATE_TENANT:t-1', entityId: 't-1', companyType: 'CORPORATE_TENANT', name: 'Beta Mobility', code: 'BETA' },
      { id: 'VENDOR:v-2', entityId: 'v-2', companyType: 'VENDOR', name: 'zeta Logistics', code: null },
    ]);
  });

  it('should filter daily financial metrics for a selected vendor company', async () => {
    db.payment.findMany
      .mockResolvedValueOnce([{ amount: 2400 }])
      .mockResolvedValueOnce([{ amount: 500 }]);
    db.trip.findMany.mockResolvedValueOnce([{ driverId: 'drv-1' }]);
    db.settlement.findMany.mockResolvedValue([{ amount: 1200 }]);

    const report = await service.getDailyFinancialReport('2026-11-10', 'vendor-1', 'VENDOR');

    expect(report).toEqual({
      date: '2026-11-10',
      currency: 'INR',
      grossBookingValue: 2400,
      expenditure: 1200,
      activeEscrowHoldValue: 500,
      capturedPaymentCount: 1,
      settledPayoutCount: 1,
      activeEscrowHoldCount: 1,
    });
    expect(db.payment.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ vendorId: 'vendor-1', status: 'CAPTURED' }),
      }),
    );
    expect(db.settlement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SETTLED', driverId: { in: ['drv-1'] } }),
      }),
    );
  });

  it('should filter daily financial metrics for a selected corporate tenant company', async () => {
    db.corporateInvoice.findMany.mockResolvedValue([{ totalAmountPaise: BigInt(150000) }]);
    db.corporateDriverEarning.findMany.mockResolvedValue([{ id: 'earn-1', totalEarnedPaise: BigInt(80000) }]);
    db.corporatePayout.findMany.mockResolvedValue([
      { netPaise: BigInt(72000), grossPaise: BigInt(80000), earningIds: ['earn-1'] },
    ]);

    const report = await service.getDailyFinancialReport('2026-11-10', 'CORPORATE_TENANT:tenant-1');

    expect(report).toEqual({
      date: '2026-11-10',
      currency: 'INR',
      grossBookingValue: 1500,
      expenditure: 720,
      activeEscrowHoldValue: 0,
      capturedPaymentCount: 1,
      settledPayoutCount: 1,
      activeEscrowHoldCount: 0,
    });
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
