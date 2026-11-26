import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettlementsService } from '../src/modules/settlements/settlements.service';
import { DatabaseService } from '../src/database/database.service';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { SettlementStatus } from '@adhocx/contracts';

describe('SettlementsService Unit Tests', () => {
  let service: SettlementsService;
  let db: any;
  let ledger: any;
  let notifications: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      settlement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      systemPolicyConfig: {
        findUnique: jest.fn().mockResolvedValue({ minWithdrawalAmount: 100 }),
      },
      $transaction: jest.fn(),
    };

    ledger = {
      creditDriver: jest.fn().mockResolvedValue(undefined),
      debitDriver: jest.fn().mockResolvedValue(undefined),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPushToUser: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementsService,
        { provide: DatabaseService, useValue: db },
        { provide: LedgerService, useValue: ledger },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
  });

  it('should request withdrawal and atomically debit wallet via ledger', async () => {
    const now = new Date();
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-drv-1',
      walletBalance: 2000,
    });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 1500 }),
        },
        settlement: {
          create: jest.fn().mockResolvedValue({
            id: 'set-1',
            driverId: 'drv-1',
            amount: 500,
            status: SettlementStatus.PENDING,
            bankAccountName: 'Driver Ram',
            bankAccountNumber: '987654321012',
            bankIfsc: 'HDFC0001234',
            bankName: 'HDFC Bank',
            createdAt: now,
            updatedAt: now,
          }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-1' }),
        },
      };
      return callback(tx);
    });

    const result = await service.requestWithdrawal('usr-drv-1', {
      amount: 500,
      bankAccountName: 'Driver Ram',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
    });

    expect(result.id).toBe('set-1');
    expect(result.status).toBe(SettlementStatus.PENDING);
    expect(result.amount).toBe(500);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'WITHDRAWAL_REQUESTED',
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WITHDRAWAL_REQUESTED' }),
    );
  });

  it('should reject withdrawal request when amount is less than ₹100', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-drv-1',
      walletBalance: 2000,
    });

    await expect(
      service.requestWithdrawal('usr-drv-1', {
        amount: 50,
        bankAccountName: 'Driver Ram',
        bankAccountNumber: '987654321012',
        bankIfsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject withdrawal when driver balance is insufficient', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-drv-1',
      walletBalance: 300,
    });

    await expect(
      service.requestWithdrawal('usr-drv-1', {
        amount: 500,
        bankAccountName: 'Driver Ram',
        bankAccountNumber: '987654321012',
        bankIfsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should process settlement as SETTLED when admin approves', async () => {
    const now = new Date();
    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 500,
      status: SettlementStatus.PENDING,
      bankAccountName: 'Driver Ram',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      driver: {
        id: 'drv-1',
        userId: 'usr-drv-1',
        fullName: 'Driver Ram',
        kycDocuments: {
          bankVerificationStatus: 'VERIFIED',
          bankAccountName: 'Driver Ram',
          bankAccountNumber: '987654321012',
          bankIfsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
      },
    });

    db.settlement.update.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 500,
      status: SettlementStatus.SETTLED,
      transactionRef: 'bank_utr_123456',
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.processSettlement('set-1', 'usr-adm-1', {
      status: SettlementStatus.SETTLED,
      transactionRef: 'bank_utr_123456',
    });

    expect(result.status).toBe(SettlementStatus.SETTLED);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'SETTLEMENT_SETTLED',
      expect.anything(),
    );
    expect(notifications.sendPushToUser).toHaveBeenCalledWith(
      'usr-drv-1',
      expect.objectContaining({
        title: 'Payout completed',
        data: expect.objectContaining({
          settlementId: 'set-1',
          transactionRef: 'bank_utr_123456',
        }),
        saveInApp: true,
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_SETTLED' }),
    );
  });

  it('should require verified bank details and a UTR before marking a payout paid', async () => {
    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 500,
      status: SettlementStatus.PENDING,
      bankAccountName: 'Driver Ram',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      driver: {
        id: 'drv-1',
        userId: 'usr-drv-1',
        kycDocuments: {
          bankVerificationStatus: 'PENDING',
          bankAccountName: 'Driver Ram',
          bankAccountNumber: '987654321012',
          bankIfsc: 'HDFC0001234',
        },
      },
    });

    await expect(service.processSettlement('set-1', 'usr-adm-1', {
      status: SettlementStatus.SETTLED,
      transactionRef: 'bank_utr_123456',
    })).rejects.toThrow('manually verified');

    expect(db.settlement.update).not.toHaveBeenCalled();
    expect(notifications.sendPushToUser).not.toHaveBeenCalled();
  });

  it('should persist manual bank review and notify the driver in-app', async () => {
    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      status: SettlementStatus.PENDING,
      bankAccountName: 'Driver Ram',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      driver: {
        id: 'drv-1',
        userId: 'usr-drv-1',
        kycDocuments: {
          bankAccountName: 'Driver Ram',
          bankAccountNumber: '987654321012',
          bankIfsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
          bankVerificationStatus: 'PENDING',
        },
      },
    });

    const result = await service.reviewBankDetails('set-1', 'usr-adm-1', 'VERIFIED');

    expect(result).toEqual({ settlementId: 'set-1', bankVerificationStatus: 'VERIFIED' });
    expect(db.driver.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'drv-1' },
      data: {
        kycDocuments: expect.objectContaining({
          bankVerificationStatus: 'VERIFIED',
          bankVerificationReason: null,
        }),
      },
    }));
    expect(notifications.sendPushToUser).toHaveBeenCalledWith(
      'usr-drv-1',
      expect.objectContaining({
        title: 'Bank account verified',
        saveInApp: true,
      }),
    );
  });

  it('should refund debited funds back to driver wallet if settlement payout FAILS', async () => {
    const now = new Date();
    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 500,
      status: SettlementStatus.PENDING,
      bankAccountName: 'Driver Ram',
      bankAccountNumber: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      driver: {
        id: 'drv-1',
        userId: 'usr-drv-1',
        fullName: 'Driver Ram',
        kycDocuments: {
          bankVerificationStatus: 'PENDING',
          bankAccountName: 'Driver Ram',
          bankAccountNumber: '987654321012',
          bankIfsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
      },
    });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 2000 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-ref' }),
        },
        settlement: {
          update: jest.fn().mockResolvedValue({
            id: 'set-1',
            driverId: 'drv-1',
            amount: 500,
            status: SettlementStatus.FAILED,
            processedAt: now,
            createdAt: now,
            updatedAt: now,
          }),
        },
      };
      return callback(tx);
    });

    const result = await service.processSettlement('set-1', 'usr-adm-1', {
      status: SettlementStatus.FAILED,
      failureReason: 'Invalid IFSC code',
    });

    expect(result.status).toBe(SettlementStatus.FAILED);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'SETTLEMENT_FAILED',
      expect.objectContaining({ reason: 'Invalid IFSC code' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_REJECTED' }),
    );
  });

  it('should allow driver to cancel their pending withdrawal request and refund wallet', async () => {
    const now = new Date();
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-drv-1',
      walletBalance: 0,
    });

    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 1000,
      status: SettlementStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      driver: { id: 'drv-1', userId: 'usr-drv-1' },
    });

    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 1000 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-ref' }),
        },
        settlement: {
          update: jest.fn().mockResolvedValue({
            id: 'set-1',
            driverId: 'drv-1',
            amount: 1000,
            status: SettlementStatus.CANCELLED,
            transactionRef: 'Cancelled by driver',
            processedAt: now,
            createdAt: now,
            updatedAt: now,
          }),
        },
      };
      return callback(tx);
    });

    const result = await service.cancelDriverWithdrawal('set-1', 'usr-drv-1');

    expect(result.status).toBe(SettlementStatus.CANCELLED);
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'SETTLEMENT_CANCELLED',
      expect.objectContaining({ amount: 1000 }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_CANCELLED_BY_DRIVER' }),
    );
  });
});
