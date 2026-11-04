import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CorporateBillingService - Invoicing, GST & 1% Driver TDS', () => {
  let service: CorporateBillingService;
  let mockDb: any;
  let mockNotifications: any;
  let mockAudit: any;

  beforeEach(() => {
    mockDb = {
      corporateTenant: {
        findUnique: jest.fn(),
      },
      corporateInvoice: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      corporateInvoiceLine: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      corporateRoute: {
        findMany: jest.fn(),
      },
      // Tenant rate card equivalent to the legacy flat matrix (₹400 + ₹25 per km from km 0).
      corporateRateCard: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rc-legacy-flat',
            tenantId: 'tenant-acme',
            vehicleCategory: 'SEDAN',
            version: 1,
            baseFarePaise: 40000n,
            baseDistanceMeters: 0,
            perKmPaise: 2500n,
            perExtraStopPaise: 0n,
            effectiveFrom: new Date('2026-01-01T00:00:00Z'),
            effectiveTo: null,
          },
        ]),
        findFirst: jest.fn(),
      },
      corporateDriverEarning: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockDb)),
    };

    mockNotifications = {
      emitEvent: jest.fn(),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new CorporateBillingService(
      mockDb as unknown as DatabaseService,
      mockNotifications as unknown as NotificationsService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('Corporate GST Tax Invoicing (Integer Paise, Zero Float Math)', () => {
    it('should generate consolidated tax invoice with exact 5% GST and integer paise precision', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({
        id: 'tenant-acme',
        code: 'ACME',
        name: 'Acme Technologies',
      });

      // No previous invoice lines
      mockDb.corporateInvoiceLine.findMany.mockResolvedValue([]);

      // 2 Completed Routes:
      // Route 1: 20 km (20,000m) -> ₹400 base (40000) + 20 * ₹25 (50000) = ₹900 (90000 paise)
      // Route 2: 10 km (10,000m) -> ₹400 base (40000) + 10 * ₹25 (25000) = ₹650 (65000 paise)
      // Subtotal: 90000 + 65000 = 155000 paise (₹1,550.00)
      // 5% GST: (155000 * 5) / 100 = 7750 paise (₹77.50)
      // Total: 155000 + 7750 = 162750 paise (₹1,627.50)
      mockDb.corporateRoute.findMany.mockResolvedValue([
        { id: 'route-b-1', estDistanceMeters: 20000, office: { name: 'HQ' } },
        { id: 'route-b-2', estDistanceMeters: 10000, office: { name: 'HQ' } },
      ]);

      const mockInvoice = {
        id: 'inv-101',
        invoiceNumber: 'INV-ACME-202611-1234',
        subtotalPaise: 155000n,
        gstPaise: 7750n,
        totalAmountPaise: 162750n,
        status: 'ISSUED',
        lines: [
          { routeId: 'route-b-1', billableDistanceMeters: 20000, amountPaise: 90000n },
          { routeId: 'route-b-2', billableDistanceMeters: 10000, amountPaise: 65000n },
        ],
      };

      mockDb.corporateInvoice.create.mockResolvedValue(mockInvoice);
      mockDb.corporateInvoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.generateInvoiceBatch({
        tenantId: 'tenant-acme',
        billingPeriodStart: '2026-11-01',
        billingPeriodEnd: '2026-11-15',
        gstRatePct: 5,
      });

      expect(mockDb.corporateInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-acme',
          subtotalPaise: 155000n,
          gstPaise: 7750n,
          totalAmountPaise: 162750n,
          status: 'ISSUED',
        }),
      });

      // Verify line items created
      expect(mockDb.corporateInvoiceLine.create).toHaveBeenCalledTimes(2);

      // Verify string conversion for API output
      expect(result.subtotalPaise).toBe('155000');
      expect(result.gstPaise).toBe('7750');
      expect(result.totalAmountPaise).toBe('162750');

      // Verify event emission
      expect(mockNotifications.emitEvent).toHaveBeenCalledWith(
        'corporate:tenant-acme',
        'CORPORATE_INVOICE_ISSUED',
        expect.objectContaining({
          totalAmountPaise: '162750',
          routesCount: 2,
        }),
      );
    });

    it('should throw BadRequestException if no unbilled completed routes exist', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-empty', name: 'Empty Co' });
      mockDb.corporateInvoiceLine.findMany.mockResolvedValue([]);
      mockDb.corporateRoute.findMany.mockResolvedValue([]);

      await expect(
        service.generateInvoiceBatch({
          tenantId: 'tenant-empty',
          billingPeriodStart: '2026-11-01',
          billingPeriodEnd: '2026-11-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.generateInvoiceBatch({
          tenantId: 'tenant-none',
          billingPeriodStart: '2026-11-01',
          billingPeriodEnd: '2026-11-15',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Driver Payout Settlement & 1% TDS Deduction (Section 194C)', () => {
    it('should aggregate unpaid earnings per driver and deduct exact 1% TDS', async () => {
      // Driver 1: 2 routes (₹500 = 50000 paise, ₹700 = 70000 paise) -> Gross ₹1200 (120000 paise)
      // 1% TDS: (120000 * 1) / 100 = 1200 paise (₹12.00)
      // Net Payout: 120000 - 1200 = 118800 paise (₹1,188.00)
      //
      // Driver 2: 1 route (₹800 = 80000 paise) -> Gross ₹800 (80000 paise)
      // 1% TDS: 800 paise (₹8.00)
      // Net Payout: 79200 paise (₹792.00)
      const mockUnpaid = [
        {
          id: 'earn-1',
          driverId: 'drv-1',
          totalEarnedPaise: 50000n,
          driver: { id: 'drv-1', fullName: 'Driver One', phone: '+919999000001' },
          route: { id: 'r-1' },
        },
        {
          id: 'earn-2',
          driverId: 'drv-1',
          totalEarnedPaise: 70000n,
          driver: { id: 'drv-1', fullName: 'Driver One', phone: '+919999000001' },
          route: { id: 'r-2' },
        },
        {
          id: 'earn-3',
          driverId: 'drv-2',
          totalEarnedPaise: 80000n,
          driver: { id: 'drv-2', fullName: 'Driver Two', phone: '+919999000002' },
          route: { id: 'r-3' },
        },
      ];

      mockDb.corporateDriverEarning.findMany.mockResolvedValue(mockUnpaid);
      mockDb.corporateDriverEarning.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.prepareDriverPayoutBatch();

      expect(result.totalDrivers).toBe(2);
      expect(result.totalGrossPaise).toBe('200000'); // ₹2,000.00
      expect(result.totalTdsPaise).toBe('2000'); // 1% = ₹20.00
      expect(result.totalNetPayoutPaise).toBe('198000'); // ₹1,980.00

      const d1 = result.disbursements.find((d: any) => d.driverId === 'drv-1');
      expect(d1.grossPaise).toBe('120000');
      expect(d1.tdsDeductionPaise).toBe('1200');
      expect(d1.netPayoutPaise).toBe('118800');
      expect(d1.netPayoutRupees).toBe('1188.00');

      // Verify records updated to PAID
      expect(mockDb.corporateDriverEarning.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['earn-1', 'earn-2', 'earn-3'] } },
        data: expect.objectContaining({
          payoutStatus: 'PAID',
          payoutBatchId: result.batchId,
        }),
      });
    });

    it('should return empty batch when there are no unpaid earnings', async () => {
      mockDb.corporateDriverEarning.findMany.mockResolvedValue([]);

      const result = await service.prepareDriverPayoutBatch();

      expect(result.totalDrivers).toBe(0);
      expect(result.totalNetPayoutPaise).toBe('0');
      expect(mockDb.corporateDriverEarning.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Driver Commute Earnings Summary', () => {
    it('should calculate gross, paid, unpaid, and estimated TDS for driver', async () => {
      mockDb.corporateDriverEarning.findMany.mockResolvedValue([
        { totalEarnedPaise: 50000n, payoutStatus: 'PAID' },
        { totalEarnedPaise: 70000n, payoutStatus: 'UNPAID' },
      ]);

      const result = await service.getDriverEarningsSummary('drv-101');

      expect(result.totalRoutesCount).toBe(2);
      expect(result.totalEarnedPaise).toBe('120000');
      expect(result.paidPaise).toBe('50000');
      expect(result.unpaidPaise).toBe('70000');
      expect(result.estimatedTdsPaise).toBe('1200'); // 1%
      expect(result.netPaidPaise).toBe('49500'); // 50000 - 500
      expect(result.netUnpaidPaise).toBe('69300'); // 70000 - 700
    });
  });
});

