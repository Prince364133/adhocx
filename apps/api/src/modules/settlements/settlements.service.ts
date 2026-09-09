import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  WithdrawalRequestDto,
  SettlementResponseDto,
  AdminProcessSettlementDto,
  SettlementStatus,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly db: DatabaseService,
    protected readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get driver wallet overview and transaction summary.
   */
  async getDriverWalletSummary(driverUserId: string) {
    return this.ledger.getDriverWalletSummary(driverUserId);
  }


  /**
   * Driver requests wallet withdrawal to their bank account.
   * Atomically debits driver wallet and appends immutable ledger DEBIT entry.
   */
  async requestWithdrawal(driverUserId: string, dto: WithdrawalRequestDto): Promise<SettlementResponseDto> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    if (dto.amount < 100) {
      throw new BadRequestException('Minimum withdrawal amount is ₹100');
    }

    if (Number(driver.walletBalance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₹${driver.walletBalance}, Requested: ₹${dto.amount}`,
      );
    }

    const maskedAcc = dto.bankAccountNumber.slice(-4);
    const description = `Withdrawal payout to bank account ending in ${maskedAcc}`;

    // Create settlement inside transaction with atomic debit
    const settlement = await this.db.$transaction(async (tx) => {
      // 1. Debit driver wallet
      const updatedDriver = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { decrement: dto.amount },
        },
      });

      // 2. Create pending settlement record
      const s = await tx.settlement.create({
        data: {
          driverId: driver.id,
          amount: dto.amount,
          status: SettlementStatus.PENDING,
          bankAccountName: dto.bankAccountName,
          bankAccountNumber: dto.bankAccountNumber,
          bankIfsc: dto.bankIfsc,
        },
      });

      // 3. Append immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'DEBIT',
          amount: dto.amount,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: 'WITHDRAWAL',
          referenceId: s.id,
          description,
        },
      });

      return s;
    });

    this.notifications.emitEvent(`driver:${driver.id}`, 'WITHDRAWAL_REQUESTED', {
      settlementId: settlement.id,
      amount: dto.amount,
      status: SettlementStatus.PENDING,
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'WITHDRAWAL_REQUESTED',
      entityType: 'SETTLEMENT',
      entityId: settlement.id,
      metadata: { amount: dto.amount, bankIfsc: dto.bankIfsc },
    });

    this.logger.log(`Withdrawal of ₹${dto.amount} requested by driver ${driver.id}`);
    return this.mapToDto(settlement);
  }

  /**
   * Admin processes payout settlement (mark SETTLED or FAILED).
   * Per docs/12_STATE_MACHINES.md Section 60:
   * "A failed withdrawal must not silently remove the driver's funds".
   * If FAILED, funds are atomically credited back to the driver's wallet.
   */
  async processSettlement(
    id: string,
    adminUserId: string,
    dto: AdminProcessSettlementDto,
  ): Promise<SettlementResponseDto> {
    const settlement = await this.db.settlement.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement record not found');
    }

    if (settlement.status !== SettlementStatus.PENDING && settlement.status !== SettlementStatus.PROCESSING) {
      throw new BadRequestException(`Cannot process settlement in ${settlement.status} state`);
    }

    const now = new Date();

    if (dto.status === SettlementStatus.SETTLED) {
      const updated = await this.db.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.SETTLED,
          processedAt: now,
          transactionRef: dto.transactionRef || `payout_${Date.now()}`,
        },
      });

      this.notifications.emitEvent(`driver:${settlement.driverId}`, 'SETTLEMENT_SETTLED', {
        settlementId: id,
        amount: Number(settlement.amount),
        transactionRef: updated.transactionRef,
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'SETTLEMENT_SETTLED',
        entityType: 'SETTLEMENT',
        entityId: id,
        metadata: { transactionRef: updated.transactionRef, amount: Number(settlement.amount) },
      });

      this.logger.log(`Settlement ${id} marked SETTLED by admin ${adminUserId}`);
      return this.mapToDto(updated);
    }

    if (dto.status === SettlementStatus.FAILED) {
      // Transactional refund rollback
      const updated = await this.db.$transaction(async (tx) => {
        // 1. Credit driver wallet back
        const updatedDriver = await tx.driver.update({
          where: { id: settlement.driverId },
          data: {
            walletBalance: { increment: settlement.amount },
          },
        });

        // 2. Append refund ledger entry
        await tx.ledgerEntry.create({
          data: {
            accountType: 'DRIVER',
            accountId: settlement.driverId,
            entryType: 'CREDIT',
            amount: settlement.amount,
            balanceAfter: updatedDriver.walletBalance,
            referenceType: 'WITHDRAWAL_REFUND',
            referenceId: id,
            description: `Refund for failed payout: ${dto.failureReason || 'Bank processing rejected'}`,
          },
        });

        // 3. Mark settlement FAILED
        return tx.settlement.update({
          where: { id },
          data: {
            status: SettlementStatus.FAILED,
            processedAt: now,
          },
        });
      });

      this.notifications.emitEvent(`driver:${settlement.driverId}`, 'SETTLEMENT_FAILED', {
        settlementId: id,
        amount: Number(settlement.amount),
        reason: dto.failureReason || 'Payout failed. Funds refunded to wallet.',
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'SETTLEMENT_FAILED',
        entityType: 'SETTLEMENT',
        entityId: id,
        metadata: { failureReason: dto.failureReason, refundedAmount: Number(settlement.amount) },
      });

      this.logger.warn(`Settlement ${id} failed and refunded to driver ${settlement.driverId}: ${dto.failureReason}`);
      return this.mapToDto(updated);
    }

    throw new BadRequestException('Invalid settlement processing status');
  }

  /**
   * Get settlements for a driver.
   */
  async getDriverSettlements(driverUserId: string): Promise<SettlementResponseDto[]> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      return [];
    }

    const settlements = await this.db.settlement.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) => this.mapToDto(s));
  }

  /**
   * List all settlements for admin operations.
   */
  async listAllSettlements(status?: SettlementStatus): Promise<SettlementResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const settlements = await this.db.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) => this.mapToDto(s));
  }

  private mapToDto(s: any): SettlementResponseDto {
    return {
      id: s.id,
      driverId: s.driverId,
      amount: Number(s.amount),
      status: s.status as SettlementStatus,
      bankAccountName: s.bankAccountName || undefined,
      bankAccountNumber: s.bankAccountNumber ? `••••${s.bankAccountNumber.slice(-4)}` : undefined,
      bankIfsc: s.bankIfsc || undefined,
      transactionRef: s.transactionRef || undefined,
      processedAt: s.processedAt?.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
