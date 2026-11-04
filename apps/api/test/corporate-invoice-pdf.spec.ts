import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { CorporateBillingController } from '../src/domains/corporate/billing/corporate-billing.controller';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CorporatePayoutService } from '../src/domains/corporate/billing/corporate-payout.service';
import { CorporateInvoiceDisputeService } from '../src/domains/corporate/billing/corporate-invoice-dispute.service';

describe('Corporate Tax Invoice PDF Stream (Sec 31 CGST Act)', () => {
  let service: CorporateBillingService;
  let controller: CorporateBillingController;

  const mockTenant = {
    id: 'tenant-acme-1',
    code: 'ACME',
    name: 'Acme Technologies',
    legalEntityName: 'Acme Technologies India Pvt Ltd',
    gstin: '36AAACA1234F1Z8',
    offices: [
      {
        id: 'office-1',
        name: 'Madhapur HQ',
        addressText: 'Building 12, Mindspace IT Park, Hitec City, Hyderabad',
      },
    ],
  };

  const mockInvoice = {
    id: 'inv-acme-1',
    tenantId: 'tenant-acme-1',
    invoiceNumber: 'INV-ACME-202611-1234',
    billingPeriodStart: new Date('2026-11-01T00:00:00.000Z'),
    billingPeriodEnd: new Date('2026-11-07T23:59:59.000Z'),
    subtotalPaise: 1550000n, // ₹15,500.00
    gstPaise: 77500n, // 5% GST = ₹775.00
    totalAmountPaise: 1627500n, // ₹16,275.00
    status: 'ISSUED',
    createdAt: new Date('2026-11-08T10:00:00.000Z'),
    tenant: mockTenant,
    lines: [
      {
        id: 'line-1',
        invoiceId: 'inv-acme-1',
        routeId: 'route-shift-morning-1',
        billableDistanceMeters: 28500,
        amountPaise: 111250n,
        route: {
          id: 'route-shift-morning-1',
          shiftDate: new Date('2026-11-02T08:00:00.000Z'),
          shiftTime: '08:00',
          direction: 'LOGIN',
          estDistanceMeters: 28500,
          assignedPassengerCount: 4,
        },
      },
      {
        id: 'line-2',
        invoiceId: 'inv-acme-1',
        routeId: 'route-shift-evening-1',
        billableDistanceMeters: 31200,
        amountPaise: 118000n,
        route: {
          id: 'route-shift-evening-1',
          shiftDate: new Date('2026-11-02T17:00:00.000Z'),
          shiftTime: '17:00',
          direction: 'LOGOUT',
          estDistanceMeters: 31200,
          assignedPassengerCount: 6,
        },
      },
    ],
  };

  const mockDb = {
    corporateTenant: {
      findUnique: jest.fn(),
    },
    corporateInvoice: {
      findUnique: jest.fn(),
    },
  };

  const mockNotifications = {
    emitEvent: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporateBillingController],
      providers: [
        CorporateBillingService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuditService, useValue: mockAudit },
        // Controller collaborators not exercised by the PDF tests.
        { provide: CorporatePayoutService, useValue: {} },
        { provide: CorporateInvoiceDisputeService, useValue: {} },
      ],
    })
      // Handlers are invoked directly here; access control is covered in corporate-access-control.spec.ts.
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(CorporateAccessGuard).useValue({ canActivate: () => true })
      .compile();

    service = module.get<CorporateBillingService>(CorporateBillingService);
    controller = module.get<CorporateBillingController>(CorporateBillingController);
  });

  describe('generateInvoicePdf', () => {
    it('should generate a valid PDF binary buffer containing %PDF- magic bytes and professional layout', async () => {
      mockDb.corporateInvoice.findUnique.mockResolvedValue(mockInvoice);

      const buffer = await service.generateInvoicePdf('inv-acme-1');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify %PDF- standard binary magic bytes header
      const headerString = buffer.subarray(0, 5).toString('ascii');
      expect(headerString).toBe('%PDF-');
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      mockDb.corporateInvoice.findUnique.mockResolvedValue(null);

      await expect(service.generateInvoicePdf('non-existent-inv')).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadInvoicePdf controller endpoint', () => {
    it('should set appropriate PDF response headers and pipe buffer to response', async () => {
      mockDb.corporateInvoice.findUnique.mockResolvedValue(mockInvoice);

      const resHeaders: Record<string, string> = {};
      let endedBuffer: Buffer | null = null;

      const mockRes: any = {
        set: jest.fn().mockImplementation((headers) => {
          Object.assign(resHeaders, headers);
        }),
        end: jest.fn().mockImplementation((buf) => {
          endedBuffer = buf;
        }),
      };

      await controller.downloadInvoicePdf('inv-acme-1', mockRes);

      expect(mockRes.set).toHaveBeenCalled();
      expect(resHeaders['Content-Type']).toBe('application/pdf');
      expect(resHeaders['Content-Disposition']).toBe('attachment; filename="Invoice-inv-acme-1.pdf"');
      expect(Number(resHeaders['Content-Length'])).toBeGreaterThan(1000);
      expect(endedBuffer).not.toBeNull();
      expect(Buffer.isBuffer(endedBuffer)).toBe(true);
    });
  });
});

