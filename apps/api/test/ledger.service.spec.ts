import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { DatabaseService } from '../src/database/database.service';
import { LedgerEntryType, SettlementStatus } from '@adhocx/contracts';

describe('LedgerService Unit Tests', () => {
  let service: LedgerService;
  let db: any;

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ledgerEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      settlement: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  it('should credit driver wallet and record immutable ledger entry', async () => {
    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          update: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 1500 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-1' }),
        },
      };
      return callback(tx);
    });

    await service.creditDriver({
      driverId: 'drv-1',
      amount: 1500,
      description: 'Trip earnings',
      referenceId: 'trip-1',
      referenceType: 'TRIP',
    });

    expect(db.$transaction).toHaveBeenCalled();
  });

  it('should reject credit with negative or zero amount', async () => {
    await expect(
      service.creditDriver({
        driverId: 'drv-1',
        amount: -100,
        description: 'Invalid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should debit driver wallet and record immutable ledger entry', async () => {
    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          findUnique: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 2000 }),
          update: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 1500 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'led-2' }),
        },
      };
      return callback(tx);
    });

    await service.debitDriver({
      driverId: 'drv-1',
      amount: 500,
      description: 'Withdrawal payout',
      referenceId: 'set-1',
      referenceType: 'WITHDRAWAL',
    });

    expect(db.$transaction).toHaveBeenCalled();
  });

  it('should reject debit when driver has insufficient balance', async () => {
    db.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        driver: {
          findUnique: jest.fn().mockResolvedValue({ id: 'drv-1', walletBalance: 300 }),
        },
      };
      return callback(tx);
    });

    await expect(
      service.debitDriver({
        driverId: 'drv-1',
        amount: 500,
        description: 'Excessive withdrawal',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should derive driver wallet summary accurately from ledger entries', async () => {
    const now = new Date();
    db.driver.findUnique.mockResolvedValue({ id: 'drv-1', userId: 'usr-drv-1', walletBalance: 1200 });

    db.ledgerEntry.findMany.mockResolvedValue([
      {
        id: 'led-1',
        accountType: 'DRIVER',
        accountId: 'drv-1',
        entryType: LedgerEntryType.CREDIT,
        amount: 1500,
        balanceAfter: 1500,
        referenceType: 'TRIP',
        referenceId: 'trip-1',
        description: 'Trip 1',
        createdAt: now,
      },
      {
        id: 'led-2',
        accountType: 'DRIVER',
        accountId: 'drv-1',
        entryType: LedgerEntryType.DEBIT,
        amount: 300,
        balanceAfter: 1200,
        referenceType: 'WITHDRAWAL',
        referenceId: 'set-1',
        description: 'Withdrawal 1',
        createdAt: now,
      },
    ]);

    db.settlement.findMany.mockResolvedValue([
      { id: 'set-1', amount: 300, status: SettlementStatus.PENDING },
    ]);

    const summary = await service.getDriverWalletSummary('usr-drv-1');

    expect(summary.walletBalance).toBe(1200);
    expect(summary.totalEarned).toBe(1500);
    expect(summary.totalWithdrawn).toBe(300);
    expect(summary.pendingSettlements).toBe(300);
    expect(summary.recentLedgerEntries).toHaveLength(2);
  });
});
