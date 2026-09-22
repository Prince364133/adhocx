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
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_SETTLED' }),
    );
  });

  it('should refund debited funds back to driver wallet if settlement payout FAILS', async () => {
    const now = new Date();
    db.settlement.findUnique.mockResolvedValue({
      id: 'set-1',
      driverId: 'drv-1',
      amount: 500,
      status: SettlementStatus.PENDING,
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
});
