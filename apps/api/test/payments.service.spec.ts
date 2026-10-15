import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PaymentStatus } from '@adhocx/contracts';

describe('PaymentsService Unit Tests', () => {
  let service: PaymentsService;
  let db: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      vendor: {
        findUnique: jest.fn(),
      },
      requirement: {
        findUnique: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    notifications = {
      emitEvent: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: DatabaseService, useValue: db },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should initiate payment for a requirement in PENDING status', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({ id: 'req-1', vendorId: 'vnd-1' });
    db.payment.create.mockResolvedValue({
      id: 'pay-1',
      requirementId: 'req-1',
      vendorId: 'vnd-1',
      amount: 3000,
      status: PaymentStatus.PENDING,
      paymentMethod: 'ONLINE_UPI',
      transactionRef: 'pay_ref_123',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.initiatePayment('usr-vnd-1', {
      requirementId: 'req-1',
      amount: 3000,
      paymentMethod: 'ONLINE_UPI',
    });

    expect(result.id).toBe('pay-1');
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'PAYMENT_INITIATED',
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PAYMENT_INITIATED' }),
    );
  });

  it('should reject payment initiation if requirement does not belong to vendor', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({ id: 'req-1', vendorId: 'vnd-other' });

    await expect(
      service.initiatePayment('usr-vnd-1', {
        requirementId: 'req-1',
        amount: 3000,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should process payment.captured webhook and transition to CAPTURED', async () => {
    db.payment.findUnique.mockResolvedValue({

      id: 'pay-1',
      requirementId: 'req-1',
      vendorId: 'vnd-1',
      amount: 3000,
      status: PaymentStatus.PENDING,
      requirement: { id: 'req-1' },
    });

    db.payment.update.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.CAPTURED,
      transactionRef: 'pg_tx_999',
    });

    const result = await service.handleWebhook(
      'razorpay',
      {
        event: 'payment.captured',
        paymentId: 'pay-1',
        transactionRef: 'pg_tx_999',
      },
      'test_secret',
    );

    expect(result.success).toBe(true);
    expect(db.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
        data: expect.objectContaining({ status: PaymentStatus.CAPTURED }),
      }),
    );
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'vendor:vnd-1',
      'PAYMENT_SUCCESS',
      expect.anything(),
    );
  });

  it('should reject webhook if secret signature is invalid', async () => {
    await expect(
      service.handleWebhook(
        'razorpay',
        { event: 'payment.captured', paymentId: 'pay-1' },
        'invalid_secret',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if payment not found during webhook', async () => {
    db.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.handleWebhook(
        'razorpay',
        { event: 'payment.captured', paymentId: 'pay-unknown' },
        'test_secret',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should fulfill 100% discounted wallet top-up without calling Razorpay', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1', escrowBalance: 0 });
    db.coupon = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'cpn-1',
        code: 'FREE100',
        isActive: true,
        validFrom: new Date(now.getTime() - 10000),
        validUntil: new Date(now.getTime() + 10000),
        applicableTo: 'ALL',
        minOrderAmount: 100,
        discountType: 'PERCENTAGE',
        discountValue: 100,
        maxDiscountAmount: null,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    db.vendor.update = jest.fn().mockResolvedValue({ id: 'vnd-1', escrowBalance: 5000 });
    db.ledgerEntry = { create: jest.fn().mockResolvedValue({}) };
    db.couponRedemption = { create: jest.fn().mockResolvedValue({}) };
    db.$transaction = jest.fn(async (cb) => cb(db));

    const result = await service.createWalletTopUpOrder('usr-vnd-1', {
      amount: 5000,
      couponCode: 'FREE100',
    });

    expect(result.finalPayableAmount).toBe(0);
    expect(result.isFullyDiscounted).toBe(true);
    expect(result.orderId).toMatch(/^order_free_/);
    expect(db.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vnd-1' },
        data: { escrowBalance: { increment: 5000 } },
      }),
    );
  });

  it('should verify order_free_ wallet top-up idempotently', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1', escrowBalance: 5000 });

    const result = await service.verifyWalletTopUp('usr-vnd-1', {
      razorpayOrderId: 'order_free_12345',
      razorpayPaymentId: 'pay_free_12345',
      razorpaySignature: 'sig_free_12345',
      amount: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(5000);
  });

  it('should query wallet summary filtering only VENDOR accountType', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1', escrowBalance: 12000 });
    db.ledgerEntry = {
      findMany: jest.fn().mockResolvedValue([
        { entryType: 'DEBIT', amount: 900, referenceType: 'ESCROW_HOLD' },
      ]),
    };

    const summary = await service.getVendorWalletSummary('usr-vnd-1');

    expect(db.ledgerEntry.findMany).toHaveBeenCalledWith({
      where: { accountId: 'vnd-1', accountType: 'VENDOR' },
    });
    expect(summary.walletBalance).toBe(12000);
    expect(summary.totalSpent).toBe(900);
  });

  it('should query wallet transactions filtering only VENDOR accountType', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.ledgerEntry = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'le-1',
          accountType: 'VENDOR',
          amount: 5000,
          entryType: 'CREDIT',
          balanceAfter: 5000,
          referenceType: 'WALLET_TOPUP',
          referenceId: 'order_123',
          description: 'Wallet top-up',
          createdAt: now,
        },
      ]),
    };

    const txs = await service.getVendorWalletTransactions('usr-vnd-1');

    expect(db.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'vnd-1', accountType: 'VENDOR' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
    expect(txs).toHaveLength(1);
    expect(txs[0].accountType).toBe('VENDOR');
    expect(txs[0].amount).toBe(5000);
  });
});

