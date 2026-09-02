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
 * Per docs/15_PAYMENTS_AND_LEDGER.md:
 * - Driver wallet balances are updated ONLY via atomic transactions that append immutable ledger entries.
 * - Double-entry style: money is never changed in isolation.
 * - Money is stored as Decimal(12,2), never floating point.
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
    });

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
    });

    this.logger.log(`Debited ₹${data.amount} from driver ${data.driverId}: ${data.description}`);
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
          where: { accountId: driver.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.db.settlement.findMany({
          where: { driverId: driver.id },
        }),
      ]);

      // Calculate total earned from all CREDIT entries
      let totalEarned = 0;
      let totalWithdrawn = 0;

      for (const e of entries) {
        if (e.entryType === LedgerEntryType.CREDIT) {
          totalEarned += Number(e.amount);
        } else if (e.entryType === LedgerEntryType.DEBIT) {
          totalWithdrawn += Number(e.amount);
        }
      }

      // Pending settlements
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

      return {
        walletBalance: Number(driver.walletBalance),
        totalEarned,
        totalWithdrawn,
        pendingSettlements,
        recentLedgerEntries,
      };
    } catch (_) {
      return {
        walletBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingSettlements: 0,
        recentLedgerEntries: [],
      };
    }
  }

  /**
   * Get ledger entries for a driver.
   */
  async getDriverLedger(driverId: string): Promise<LedgerEntryResponseDto[]> {
    const entries = await this.db.ledgerEntry.findMany({
      where: { accountId: driverId },
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
