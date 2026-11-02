import { LedgerAccount } from '../src/finance/entities/ledger-account.entity';
import { SettlementBatchAggregate } from '../src/finance/aggregates/settlement-batch.aggregate';
import { Money } from '../src/value-objects/money.vo';

describe('Finance & Settlement Context - Aggregates & Invariants', () => {
  describe('LedgerAccount', () => {
    it('should create a valid ledger account and process credit operations', () => {
      const initial = Money.create(100000).getValue(); // ₹1,000.00
      const accountResult = LedgerAccount.create('acc-driver-1', {
        accountType: 'DRIVER_WALLET',
        ownerId: 'drv-1',
        balance: initial,
        currency: 'INR',
        isLocked: false,
        createdAt: new Date(),
      });

      expect(accountResult.isSuccess).toBe(true);
      const account = accountResult.getValue();
      expect(account.balance.formatINR()).toBe('₹1000.00');

      const creditAmt = Money.create(50000).getValue(); // +₹500.00
      expect(account.credit(creditAmt).isSuccess).toBe(true);
      expect(account.balance.formatINR()).toBe('₹1500.00');
    });

    it('should prevent overdraft on driver wallet account', () => {
      const balance = Money.create(20000).getValue(); // ₹200.00
      const account = LedgerAccount.create('acc-driver-2', {
        accountType: 'DRIVER_WALLET',
        ownerId: 'drv-2',
        balance,
        currency: 'INR',
        isLocked: false,
        createdAt: new Date(),
      }).getValue();

      const excessiveDebit = Money.create(50000).getValue(); // ₹500.00
      const debitResult = account.debit(excessiveDebit);
      expect(debitResult.isFailure).toBe(true);
      expect(debitResult.error).toContain('Insufficient funds');
      expect(account.balance.formatINR()).toBe('₹200.00');
    });

    it('should prevent operations on locked accounts', () => {
      const balance = Money.create(50000).getValue();
      const account = LedgerAccount.create('acc-locked', {
        accountType: 'VENDOR_ESCROW',
        ownerId: 'ven-1',
        balance,
        currency: 'INR',
        isLocked: true,
        createdAt: new Date(),
      }).getValue();

      const delta = Money.create(10000).getValue();
      expect(account.credit(delta).isFailure).toBe(true);
      expect(account.debit(delta).isFailure).toBe(true);
    });
  });

  describe('SettlementBatchAggregate', () => {
    it('should enforce the financial invariant: Net == Gross - TDS - PlatformFee', () => {
      const gross = Money.create(100000).getValue(); // ₹1,000.00
      const tds = Money.create(1000).getValue(); // 1% = ₹10.00
      const fee = Money.create(5000).getValue(); // 5% = ₹50.00
      const net = Money.create(94000).getValue(); // ₹940.00

      const batchResult = SettlementBatchAggregate.create('batch-1', {
        batchNumber: 'PAYOUT-20261102-001',
        status: 'DRAFT',
        items: [
          {
            driverId: 'drv-1',
            grossAmount: gross,
            tdsDeduction: tds,
            platformFee: fee,
            netPayout: net,
          },
        ],
        totalGrossAmount: gross,
        totalTdsDeduction: tds,
        totalPlatformFee: fee,
        totalNetDisbursed: net,
        createdAt: new Date(),
      });

      expect(batchResult.isSuccess).toBe(true);
      const batch = batchResult.getValue();
      expect(batch.totalNetDisbursed.formatINR()).toBe('₹940.00');
    });

    it('should reject batch creation if arithmetic equation does not balance exactly', () => {
      const gross = Money.create(100000).getValue();
      const tds = Money.create(1000).getValue();
      const fee = Money.create(5000).getValue();
      const corruptNet = Money.create(95000).getValue(); // Incorrect! Should be 94000

      const batchResult = SettlementBatchAggregate.create('batch-corrupt', {
        batchNumber: 'PAYOUT-CORRUPT',
        status: 'DRAFT',
        items: [
          {
            driverId: 'drv-1',
            grossAmount: gross,
            tdsDeduction: tds,
            platformFee: fee,
            netPayout: corruptNet,
          },
        ],
        totalGrossAmount: gross,
        totalTdsDeduction: tds,
        totalPlatformFee: fee,
        totalNetDisbursed: corruptNet,
        createdAt: new Date(),
      });

      expect(batchResult.isFailure).toBe(true);
      expect(batchResult.error).toContain('Financial invariant failed');
    });

    it('should transition through settlement state machine (DRAFT -> PROCESSING -> SETTLED)', () => {
      const gross = Money.create(50000).getValue();
      const tds = Money.create(500).getValue();
      const fee = Money.create(2500).getValue();
      const net = Money.create(47000).getValue();

      const batch = SettlementBatchAggregate.create('batch-sm', {
        batchNumber: 'PAYOUT-SM-1',
        status: 'DRAFT',
        items: [
          {
            driverId: 'drv-2',
            grossAmount: gross,
            tdsDeduction: tds,
            platformFee: fee,
            netPayout: net,
          },
        ],
        totalGrossAmount: gross,
        totalTdsDeduction: tds,
        totalPlatformFee: fee,
        totalNetDisbursed: net,
        createdAt: new Date(),
      }).getValue();

      expect(batch.status).toBe('DRAFT');
      expect(batch.markProcessing().isSuccess).toBe(true);
      expect(batch.status).toBe('PROCESSING');
      expect(batch.markSettled().isSuccess).toBe(true);
      expect(batch.status).toBe('SETTLED');
      expect(batch.domainEvents.length).toBeGreaterThan(0);
    });
  });
});

