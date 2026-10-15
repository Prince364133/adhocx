import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  LedgerEntryType,
  DriverWalletSummaryDto,
  LedgerEntryResponseDto,
  SettlementStatus,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';

/**
 * LedgerService manages the immutable financial ledger.
 *
 * Per docs/15_PAYMENTS_AND_LEDGER.md and JoinCab DOC-033:
 * - Driver wallet balances and in-app escrow holds are updated ONLY via atomic transactions
 *   that append immutable ledger entries.
 * - Double-entry style: money is never changed in isolation.
 * - Invariant: Balance = SUM(CREDIT) - SUM(DEBIT).
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Credit a driver's wallet via an immutable ledger entry.
   */
  async creditDriver(data: {
    driverId: string;
    amount: number;
    description: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<void> {
    if (data.amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    await this.db.$transaction(async (tx) => {
      // 1. Update driver wallet balance
      const updated = await tx.driver.update({
        where: { id: data.driverId },
        data: {
          walletBalance: { increment: data.amount },
        },
      });

      // 2. Create immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: data.driverId,
          entryType: LedgerEntryType.CREDIT,
          amount: data.amount,
          balanceAfter: updated.walletBalance,
          referenceType: data.referenceType || 'WALLET_CREDIT',
          referenceId: data.referenceId || data.driverId,
          description: data.description,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(`Credited ₹${data.amount} to driver ${data.driverId}: ${data.description}`);
  }

  /**
   * Debit a driver's wallet via an immutable ledger entry.
   * Enforces non-negative balance constraint.
   */
  async debitDriver(data: {
    driverId: string;
    amount: number;
    description: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<void> {
    if (data.amount <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    await this.db.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({ where: { id: data.driverId } });
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (Number(driver.walletBalance) < data.amount) {
        throw new BadRequestException(
          `Insufficient wallet balance: available ₹${driver.walletBalance}, requested ₹${data.amount}`,
        );
      }

      // 1. Update driver wallet balance
      const updated = await tx.driver.update({
        where: { id: data.driverId },
        data: {
          walletBalance: { decrement: data.amount },
        },
      });

      // 2. Create immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: data.driverId,
          entryType: LedgerEntryType.DEBIT,
          amount: data.amount,
          balanceAfter: updated.walletBalance,
          referenceType: data.referenceType || 'WALLET_DEBIT',
          referenceId: data.referenceId || data.driverId,
          description: data.description,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(`Debited ₹${data.amount} from driver ${data.driverId}: ${data.description}`);
  }

  /**
   * Hold customer/vendor funds in escrow upon bid acceptance or requirement posting.
   */
  async holdEscrow(data: {
    vendorId: string;
    amount: number;
    tripId: string;
    description?: string;
  }): Promise<void> {
    if (data.amount <= 0) {
      throw new BadRequestException('Escrow amount must be positive');
    }

    await this.db.$transaction(async (tx) => {
      const vendor = await tx.vendor.update({
        where: { id: data.vendorId },
        data: {
          escrowBalance: { increment: data.amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountType: 'VENDOR',
          accountId: data.vendorId,
          entryType: LedgerEntryType.DEBIT,
          amount: data.amount,
          balanceAfter: vendor.escrowBalance,
          referenceType: 'ESCROW_HOLD',
          referenceId: data.tripId,
          description: data.description || `Escrow hold for trip ${data.tripId.slice(-6)}`,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(`Escrow locked ₹${data.amount} for vendor ${data.vendorId} on trip ${data.tripId}`);
  }

  /**
   * Release escrow to driver upon trip completion with platform commission deduction.
   */
  async releaseEscrow(data: {
    vendorId: string;
    driverId: string;
    tripId: string;
    fareAmount: number;
    tollCharges?: number;
    parkingCharges?: number;
    commissionRate?: number; // e.g. 0.05 for 5%
  }): Promise<{ driverEarnings: number; commission: number }> {
    const rate = data.commissionRate !== undefined ? data.commissionRate : 0.05; // 5% default
    const commission = Math.round(data.fareAmount * rate);
    const toll = data.tollCharges || 0;
    const parking = data.parkingCharges || 0;
    const driverEarnings = data.fareAmount - commission + toll + parking;

    await this.db.$transaction(async (tx) => {
      // 1. Release escrow balance from vendor
      const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
      if (vendor) {
        await tx.vendor.update({
          where: { id: data.vendorId },
          data: {
            escrowBalance: { decrement: Math.min(Number(vendor.escrowBalance), data.fareAmount) },
          },
        });
      }

      // 2. Credit driver wallet with net earnings
      const updatedDriver = await tx.driver.update({
        where: { id: data.driverId },
        data: {
          walletBalance: { increment: driverEarnings },
        },
      });

      // 3. Ledger entry: Driver net earnings
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: data.driverId,
          entryType: LedgerEntryType.CREDIT,
          amount: driverEarnings,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: 'ESCROW_RELEASE',
          referenceId: data.tripId,
          description: `Payout for trip ${data.tripId.slice(-6)} (Gross: ₹${data.fareAmount}, Commission: ₹${commission}, Toll: ₹${toll}, Parking: ₹${parking})`,
        },
      });

      // 4. Ledger entry: Platform commission
      if (commission > 0) {
        await tx.ledgerEntry.create({
          data: {
            accountType: 'PLATFORM',
            accountId: data.driverId,
            entryType: LedgerEntryType.CREDIT,
            amount: commission,
            balanceAfter: commission,
            referenceType: 'PLATFORM_COMMISSION',
            referenceId: data.tripId,
            description: `Platform fee (${rate * 100}%) for trip ${data.tripId.slice(-6)}`,
          },
        });
      }
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(
      `Released escrow for trip ${data.tripId}: ₹${driverEarnings} to driver ${data.driverId}, ₹${commission} platform commission`,
    );

    return { driverEarnings, commission };
  }

  /**
   * Refund held escrow funds to vendor upon booking cancellation.
   */
  async refundEscrow(data: {
    vendorId: string;
    tripId: string;
    amount: number;
    reason: string;
  }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
      if (vendor) {
        await tx.vendor.update({
          where: { id: data.vendorId },
          data: {
            escrowBalance: { decrement: Math.min(Number(vendor.escrowBalance), data.amount) },
          },
        });
      }

      await tx.ledgerEntry.create({
        data: {
          accountType: 'VENDOR',
          accountId: data.vendorId,
          entryType: LedgerEntryType.CREDIT,
          amount: data.amount,
          balanceAfter: vendor ? Number(vendor.escrowBalance) - data.amount : 0,
          referenceType: 'ESCROW_REFUND',
          referenceId: data.tripId,
          description: `Escrow refund for trip ${data.tripId.slice(-6)}: ${data.reason}`,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(`Refunded escrow ₹${data.amount} to vendor ${data.vendorId} for trip ${data.tripId}`);
  }

  /**
   * Get complete wallet summary for a driver including derived metrics.
   */
  async getDriverWalletSummary(driverUserId: string): Promise<DriverWalletSummaryDto> {
    try {
      const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
      if (!driver) {
        return {
          walletBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingSettlements: 0,
          recentLedgerEntries: [],
        };
      }

      const [entries, settlements] = await Promise.all([
        this.db.ledgerEntry.findMany({
          where: { accountId: driver.id, accountType: 'DRIVER' },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.db.settlement.findMany({
          where: { driverId: driver.id },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      let totalEarned = 0;
      let totalWithdrawn = 0;

      for (const e of entries) {
        if (e.entryType === LedgerEntryType.CREDIT) {
          totalEarned += Number(e.amount);
        } else if (e.entryType === LedgerEntryType.DEBIT) {
          totalWithdrawn += Number(e.amount);
        }
      }

      const pendingSettlements = settlements
        .filter((s) => s.status === SettlementStatus.PENDING || s.status === SettlementStatus.PROCESSING)
        .reduce((acc, s) => acc + Number(s.amount), 0);

      const recentLedgerEntries: LedgerEntryResponseDto[] = entries.map((e) => ({
        id: e.id,
        accountType: e.accountType,
        accountId: e.accountId,
        entryType: e.entryType as LedgerEntryType,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      }));

      const kyc = (driver.kycDocuments as Record<string, any>) || {};
      const withdrawals = settlements.map((s) => ({
        id: s.id,
        driverId: s.driverId,
        amount: Number(s.amount),
        status: s.status as unknown as SettlementStatus,
        bankAccountName: s.bankAccountName || kyc.bankAccountName || driver.fullName,
        bankAccountNumber: s.bankAccountNumber ? `•••• ${s.bankAccountNumber.slice(-4)}` : (kyc.bankAccountNumber ? `•••• ${kyc.bankAccountNumber.slice(-4)}` : undefined),
        bankIfsc: s.bankIfsc || kyc.bankIfsc,
        bankName: kyc.bankName,
        transactionRef: s.transactionRef || undefined,
        processedAt: s.processedAt ? (s.processedAt instanceof Date ? s.processedAt.toISOString() : String(s.processedAt)) : undefined,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      }));

      const hasPendingWithdrawal = settlements.some(
        (s) => s.status === SettlementStatus.PENDING || s.status === SettlementStatus.PROCESSING,
      );

      return {
        walletBalance: Number(driver.walletBalance),
        availableBalance: Number(driver.walletBalance),
        totalEarned,
        totalWithdrawn,
        pendingSettlements,
        hasPendingWithdrawal,
        recentLedgerEntries,
        withdrawals,
      };
    } catch (_) {
      return {
        walletBalance: 0,
        availableBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingSettlements: 0,
        hasPendingWithdrawal: false,
        recentLedgerEntries: [],
        withdrawals: [],
      };
    }
  }

  /**
   * Get ledger entries for a driver.
   */
  async getDriverLedger(driverId: string): Promise<LedgerEntryResponseDto[]> {
    const entries = await this.db.ledgerEntry.findMany({
      where: { accountId: driverId, accountType: 'DRIVER' },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((e) => ({
      id: e.id,
      accountType: e.accountType,
      accountId: e.accountId,
      entryType: e.entryType as LedgerEntryType,
      amount: Number(e.amount),
      balanceAfter: Number(e.balanceAfter),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
