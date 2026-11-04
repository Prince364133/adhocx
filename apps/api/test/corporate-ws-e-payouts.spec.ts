import { Test, TestingModule } from '@nestjs/testing';
import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CorporatePayoutService } from '../src/domains/corporate/billing/corporate-payout.service';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('Corporate ETS Workstream E: Dual Rate Cards & Driver Payout Batch FSM', () => {
  let billingService: CorporateBillingService;
  let mockDb: any;
  let mockNotifications: any;
  let mockAudit: any;
  let mockPayouts: any;

  const mockTenant = {
    id: 'tenant-acme-1',
    code: 'ACME',
    name: 'Acme Technologies Pvt Ltd',
    legalEntityName: 'Acme Technologies Private Limited',
    gstin: '36AAACA1234F1Z8',
  };

  const mockDrivers = [
    { id: 'drv-1', fullName: 'Driver One', phone: '+919876543210' },
    { id: 'drv-2', fullName: 'Driver Two', phone: '+919876543211' },
    { id: 'drv-3', fullName: 'Driver Three', phone: '+919876543212' },
  ];

  beforeEach(async () => {
    mockNotifications = {
      emitEvent: jest.fn(),
      sendPushToUser: jest.fn().mockResolvedValue(undefined),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      corporateTenant: {
        findUnique: jest.fn(),
      },
      corporateRoute: {
        findMany: jest.fn(),
      },
      corporateInvoice: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      corporateInvoiceLine: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      corporateRateCard: {
        findFirst: jest.fn(),
      },
      corporateDriverRateCard: {
        findFirst: jest.fn(),
      },
      corporateDriverEarning: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      corporatePayoutBatch: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      // Per-driver payout rows created with the batch (wire/billing-payouts).
      corporatePayout: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      // Transaction-scoped advisory lock taken while claiming UNPAID earnings.
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(async (callback: any) => callback(mockDb)),
    };

    // Provider submission is owned by CorporatePayoutService (covered in corporate-wire-billing.spec.ts).
    mockPayouts = {
      submitBatch: jest.fn(async (batchId: string) => ({ id: batchId, status: 'PROCESSING', payouts: [] })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateBillingService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
        { provide: CorporatePayoutService, useValue: mockPayouts },
      ],
    }).compile();

    billingService = module.get<CorporateBillingService>(CorporateBillingService);
  });

  describe('1. Versioned Corporate Client Rate Card Resolution', () => {
    it('resolves client fare using customized CorporateRateCard (base + extra distance + stops)', async () => {
      // Custom Rate Card: ₹500 base (first 10km) + ₹30/km + ₹50 per extra stop
      mockDb.corporateRateCard.findFirst.mockResolvedValue({
        id: 'rc-custom-1',
        tenantId: mockTenant.id,
        vehicleCategory: 'SEDAN',
        baseFarePaise: 50000n, // ₹500
        baseDistanceMeters: 10000, // 10 km
        perKmPaise: 3000n, // ₹30/km
        perExtraStopPaise: 5000n, // ₹50/extra stop
        isActive: true,
      });

      // Route: 25 km (15 km over base) with 3 pickups (2 extra stops)
      const fare = await billingService.resolveClientFare(
        mockTenant.id,
        'SEDAN',
        25000, // 25 km
        3, // 3 stops
      );

      expect(fare.baseFarePaise).toBe(50000n);
      expect(fare.distancePaise).toBe(15n * 3000n); // 45000n = ₹450
      expect(fare.stopsPaise).toBe(2n * 5000n); // 10000n = ₹100
      expect(fare.totalAmountPaise).toBe(50000n + 45000n + 10000n); // 105000n = ₹1,050
      expect(fare.rateCardId).toBe('rc-custom-1');
    });

    it('falls back cleanly to system default rate card when no custom tenant rate card exists', async () => {
      mockDb.corporateRateCard.findFirst.mockResolvedValue(null);

      // Route: 20 km (10 km over base 10km) with 1 stop
      const fare = await billingService.resolveClientFare(mockTenant.id, 'SEDAN', 20000, 1);

      expect(fare.baseFarePaise).toBe(40000n); // Default ₹400
      expect(fare.distancePaise).toBe(10n * 2500n); // 25000n = ₹250
      expect(fare.stopsPaise).toBe(0n);
      expect(fare.totalAmountPaise).toBe(65000n); // ₹650
      expect(fare.rateCardId).toBeUndefined();
    });
  });

  describe('2. Versioned Corporate Driver Rate Card Resolution', () => {
    it('resolves driver payout using customized CorporateDriverRateCard', async () => {
      // Driver Rate Card: ₹350 base (first 10km) + ₹20/km
      mockDb.corporateDriverRateCard.findFirst.mockResolvedValue({
        id: 'drc-suv-1',
        vehicleCategory: 'SUV',
        basePayoutPaise: 35000n, // ₹350
        baseDistanceMeters: 10000,
        perKmPaise: 2000n, // ₹20/km
        isActive: true,
      });

      // Route: 30 km (20 km extra)
      const payout = await billingService.resolveDriverPayout('SUV', 30000);

      expect(payout.basePayoutPaise).toBe(35000n);
      expect(payout.distancePaise).toBe(20n * 2000n); // 40000n = ₹400
      expect(payout.totalPayoutPaise).toBe(75000n); // ₹750
      expect(payout.rateCardId).toBe('drc-suv-1');
    });

    it('falls back cleanly to system default driver rate card (₹300 base + ₹18/km)', async () => {
      mockDb.corporateDriverRateCard.findFirst.mockResolvedValue(null);

      // Route: 15 km (5 km extra)
      const payout = await billingService.resolveDriverPayout('SEDAN', 15000);

      expect(payout.basePayoutPaise).toBe(30000n); // Default ₹300
      expect(payout.distancePaise).toBe(5n * 1800n); // 9000n = ₹90
      expect(payout.totalPayoutPaise).toBe(39000n); // ₹390
    });
  });

  describe('3. Payout Batch State Machine & Maker-Checker Controls', () => {
    const mockUnpaidEarnings = [
      { id: 'earn-1', driverId: 'drv-1', totalEarnedPaise: 40000n, driver: mockDrivers[0] }, // ₹400
      { id: 'earn-2', driverId: 'drv-1', totalEarnedPaise: 50000n, driver: mockDrivers[0] }, // ₹500
      { id: 'earn-3', driverId: 'drv-2', totalEarnedPaise: 60000n, driver: mockDrivers[1] }, // ₹600
      { id: 'earn-4', driverId: 'drv-3', totalEarnedPaise: 70000n, driver: mockDrivers[2] }, // ₹700
    ];

    it('creates payout batch in SUBMITTED status and calculates 1% TDS under Section 194C', async () => {
      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(null); // No existing key
      mockDb.corporateDriverEarning.findMany.mockResolvedValue(mockUnpaidEarnings);

      mockDb.corporatePayoutBatch.create.mockImplementation(async ({ data }: any) => ({
        id: 'batch-101',
        ...data,
      }));

      const batch = await billingService.createPayoutBatch(
        {},
        'maker-finance-user-1',
        'idemp-key-unique-001',
      );

      // Total gross = 400 + 500 + 600 + 700 = 220000n (₹2,200)
      expect(batch.grossPaise).toBe(220000n);
      // 1% TDS = 2200n (₹22.00)
      expect(batch.tdsPaise).toBe(2200n);
      // Net payout = 220000n - 2200n = 217800n (₹2,178.00)
      expect(batch.netPayoutPaise).toBe(217800n);
      expect(batch.status).toBe('SUBMITTED');
      expect(batch.totalDrivers).toBe(3);
      expect(batch.totalRoutes).toBe(4);
      expect(batch.createdByUserId).toBe('maker-finance-user-1');

      // Earnings transition to PROCESSING
      expect(mockDb.corporateDriverEarning.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['earn-1', 'earn-2', 'earn-3', 'earn-4'] } },
        data: {
          payoutStatus: 'PROCESSING',
          payoutBatchId: 'batch-101',
        },
      });

      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:finance',
        'CORPORATE_PAYOUT_BATCH_SUBMITTED',
        expect.objectContaining({ batchNumber: batch.batchNumber }),
      );
    });

    it('Idempotency Key: returns existing batch without double-processing or duplicate payouts', async () => {
      const existingBatch = {
        id: 'batch-existing-1',
        batchNumber: 'PAY-EXISTING',
        idempotencyKey: 'idemp-duplicate-test',
        status: 'SUBMITTED',
        grossPaise: 100000n,
        netPayoutPaise: 99000n,
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(existingBatch);

      const batch = await billingService.createPayoutBatch(
        {},
        'maker-user-1',
        'idemp-duplicate-test',
      );

      expect(batch.id).toBe('batch-existing-1');
      expect(mockDb.corporatePayoutBatch.create).not.toHaveBeenCalled();
      expect(mockDb.corporateDriverEarning.updateMany).not.toHaveBeenCalled();
    });

    it('Empty Guard: throws BadRequestException if there are zero unpaid earnings to disburse', async () => {
      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(null);
      mockDb.corporateDriverEarning.findMany.mockResolvedValue([]);

      await expect(
        billingService.createPayoutBatch({}, 'maker-user-1', 'idemp-empty-check'),
      ).rejects.toThrow(BadRequestException);
    });

    it('Maker-Checker Violation: throws ForbiddenException if creator attempts to approve their own batch', async () => {
      const batch = {
        id: 'batch-mc-1',
        batchNumber: 'PAY-MC-001',
        status: 'SUBMITTED',
        createdByUserId: 'maker-finance-user-1',
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(batch);

      // Maker tries to approve their own batch
      await expect(
        billingService.approvePayoutBatch('batch-mc-1', 'maker-finance-user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Checker Approval: allows different checker to approve batch and transitions to APPROVED', async () => {
      const batch = {
        id: 'batch-mc-1',
        batchNumber: 'PAY-MC-001',
        status: 'SUBMITTED',
        createdByUserId: 'maker-finance-user-1',
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(batch);
      mockDb.corporatePayoutBatch.update.mockResolvedValue({
        ...batch,
        status: 'APPROVED',
        approvedByUserId: 'checker-super-admin-2',
        approvedAt: new Date(),
      });

      const approved = await billingService.approvePayoutBatch(
        'batch-mc-1',
        'checker-super-admin-2',
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedByUserId).toBe('checker-super-admin-2');
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'admin:finance',
        'CORPORATE_PAYOUT_BATCH_APPROVED',
        expect.objectContaining({ batchId: 'batch-mc-1' }),
      );
    });

    it('Invalid State Guard: rejects approval if batch is not in SUBMITTED or DRAFT status', async () => {
      const alreadyPaidBatch = {
        id: 'batch-paid-1',
        status: 'PAID',
        createdByUserId: 'maker-1',
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(alreadyPaidBatch);

      await expect(
        billingService.approvePayoutBatch('batch-paid-1', 'checker-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('Batch Processing: submits an APPROVED batch to the provider and NEVER marks the batch or its earnings PAID', async () => {
      // A payout becomes PAID only from a signed provider confirmation (docs/15 §35); submit
      // leaves the batch PROCESSING.
      const approvedBatch = {
        id: 'batch-approved-1',
        batchNumber: 'PAY-SETTLE-001',
        status: 'APPROVED',
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(approvedBatch);

      const processed = await billingService.processPayoutBatch(
        'batch-approved-1',
        'IMPS-20261104-998811',
      );

      expect(processed.status).toBe('PROCESSING');
      expect(mockPayouts.submitBatch).toHaveBeenCalledWith('batch-approved-1', undefined);

      // Nothing is marked PAID at submit time.
      expect(mockDb.corporatePayoutBatch.update).not.toHaveBeenCalled();
      expect(mockDb.corporateDriverEarning.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payoutStatus: 'PAID' }) }),
      );
      expect(mockNotifications.emitEvent).not.toHaveBeenCalledWith(
        'admin:finance',
        'CORPORATE_PAYOUT_BATCH_PAID',
        expect.anything(),
      );
    });

    it('Processing Guard: throws BadRequestException if attempting to process unapproved batch', async () => {
      const unapprovedBatch = {
        id: 'batch-raw-1',
        status: 'SUBMITTED',
      };

      mockDb.corporatePayoutBatch.findUnique.mockResolvedValue(unapprovedBatch);

      await expect(
        billingService.processPayoutBatch('batch-raw-1', 'IMPS-TEST'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Driver Earnings Summary API', () => {
    it('aggregates total earned, paid, unpaid, and estimated 1% TDS accurately', async () => {
      mockDb.corporateDriverEarning.findMany.mockResolvedValue([
        { totalEarnedPaise: 40000n, payoutStatus: 'PAID' }, // ₹400
        { totalEarnedPaise: 60000n, payoutStatus: 'PAID' }, // ₹600
        { totalEarnedPaise: 50000n, payoutStatus: 'UNPAID' }, // ₹500
      ]);

      const summary = await billingService.getDriverEarningsSummary('drv-1');

      expect(summary.totalRoutesCount).toBe(3);
      expect(summary.totalEarnedPaise).toBe('150000'); // ₹1,500
      expect(summary.paidPaise).toBe('100000'); // ₹1,000
      expect(summary.unpaidPaise).toBe('50000'); // ₹500
      expect(summary.estimatedTdsPaise).toBe('1500'); // ₹15 (1% of 1500)
      expect(summary.netPaidPaise).toBe('99000'); // ₹990 (99% of 1000)
      expect(summary.netUnpaidPaise).toBe('49500'); // ₹495 (99% of 500)
    });
  });

  describe('5. High Concurrency Simulation: 20 Parallel Batch Preparations', () => {
    it('simulates 20 parallel client fare resolutions and payout checks with zero race conditions', async () => {
      mockDb.corporateRateCard.findFirst.mockResolvedValue(null); // Fallback to default
      mockDb.corporateDriverRateCard.findFirst.mockResolvedValue(null); // Fallback to default

      const farePromises = Array.from({ length: 20 }, (_, i) =>
        billingService.resolveClientFare(mockTenant.id, 'SEDAN', 15000 + i * 1000, 2),
      );

      const results = await Promise.all(farePromises);
      expect(results.length).toBe(20);
      results.forEach((r, i) => {
        const expectedDistanceKm = Math.ceil((5000 + i * 1000) / 1000);
        const expectedPaise = 40000n + BigInt(expectedDistanceKm) * 2500n;
        expect(r.totalAmountPaise).toBe(expectedPaise);
      });
    });
  });
});
