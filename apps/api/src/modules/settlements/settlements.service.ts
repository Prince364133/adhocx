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
   * Enforces minimum withdrawal threshold (default ₹1,000).
   */
  async requestWithdrawal(driverUserId: string, dto: WithdrawalRequestDto): Promise<SettlementResponseDto> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const policy = await this.db.systemPolicyConfig.findUnique({ where: { key: 'GLOBAL_POLICY' } });
    const minWithdrawal = policy ? Number(policy.minWithdrawalAmount) : 1000.00;

    if (dto.amount < minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal amount is ₹${minWithdrawal.toLocaleString('en-IN')}`);
    }

    if (Number(driver.walletBalance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₹${Number(driver.walletBalance).toFixed(2)}, Requested: ₹${dto.amount.toFixed(2)}`,
      );
    }

    const kyc = (driver.kycDocuments as Record<string, any>) || {};
    const bankAccountName = dto.bankAccountName || kyc.bankAccountName || driver.fullName;
    const bankAccountNumber = dto.bankAccountNumber || kyc.bankAccountNumber;
    const bankIfsc = (dto.bankIfsc || kyc.bankIfsc || '').toUpperCase();

    if (!bankAccountNumber || !bankIfsc) {
      throw new BadRequestException('A valid bank account number and IFSC code are required for bank payout');
    }

    const maskedAcc = bankAccountNumber.slice(-4);
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
          bankAccountName,
          bankAccountNumber,
          bankIfsc,
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
          referenceType: 'WITHDRAWAL_HOLD',
          referenceId: s.id,
          description,
        },
      });

      return s;
    }, { timeout: 30000, maxWait: 10000 });

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
   * Admin processes payout settlement (mark SETTLED or FAILED/CANCELLED).
   * If FAILED or CANCELLED, funds are atomically refunded back to the driver's wallet.
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

    if (
      dto.status === SettlementStatus.FAILED ||
      dto.status === SettlementStatus.CANCELLED ||
      (dto.status as string) === 'REJECTED'
    ) {
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
            description: `Refund for rejected/failed payout: ${dto.failureReason || 'Admin rejected request'}`,
          },
        });

        // 3. Mark settlement CANCELLED / FAILED
        return tx.settlement.update({
          where: { id },
          data: {
            status: SettlementStatus.CANCELLED,
            processedAt: now,
            transactionRef: dto.failureReason || 'Rejected by Admin',
          },
        });
      }, { timeout: 30000, maxWait: 10000 });

      this.notifications.emitEvent(`driver:${settlement.driverId}`, 'SETTLEMENT_FAILED', {
        settlementId: id,
        amount: Number(settlement.amount),
        reason: dto.failureReason || 'Payout rejected. Funds refunded to wallet.',
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'SETTLEMENT_REJECTED',
        entityType: 'SETTLEMENT',
        entityId: id,
        metadata: { failureReason: dto.failureReason, refundedAmount: Number(settlement.amount) },
      });

      this.logger.warn(`Settlement ${id} cancelled and refunded to driver ${settlement.driverId}: ${dto.failureReason}`);
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
   * List all settlements for admin operations with enriched driver details.
   */
  async listAllSettlements(status?: SettlementStatus): Promise<any[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const settlements = await this.db.settlement.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            walletBalance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) => ({
      ...this.mapToDto(s),
      driverName: s.driver?.fullName || 'Driver',
      driverPhone: s.driver?.phone || '—',
      driverVehicle: s.driver?.vehicleType ? `${s.driver.vehicleType} (${s.driver.vehiclePlate || '—'})` : '—',
      driverWalletBalance: s.driver ? Number(s.driver.walletBalance) : 0,
    }));
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
      processedAt: s.processedAt ? (s.processedAt instanceof Date ? s.processedAt.toISOString() : String(s.processedAt)) : undefined,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    };
  }
}
