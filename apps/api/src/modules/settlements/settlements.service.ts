import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  WithdrawalRequestDto,
  SettlementResponseDto,
  AdminProcessSettlementDto,
  NotificationType,
  SettlementStatus,
  UserRole,
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
    const bankAccountName = (dto.bankAccountName || kyc.bankAccountName || driver.fullName).trim();
    const bankAccountNumber = String(dto.bankAccountNumber || kyc.bankAccountNumber || '').trim();
    const bankIfsc = String(dto.bankIfsc || kyc.bankIfsc || '').trim().toUpperCase();
    const bankName = String(dto.bankName || kyc.bankName || '').trim();

    if (!bankAccountNumber || !bankIfsc) {
      throw new BadRequestException('A valid bank account number and IFSC code are required for bank payout');
    }
    if (!bankName) {
      throw new BadRequestException('Bank name is required for bank payout');
    }

    const bankDetailsChanged =
      kyc.bankAccountName !== bankAccountName ||
      kyc.bankAccountNumber !== bankAccountNumber ||
      String(kyc.bankIfsc || '').toUpperCase() !== bankIfsc ||
      String(kyc.bankName || '') !== bankName;
    if (bankDetailsChanged || kyc.bankVerificationStatus !== 'VERIFIED') {
      const updatedKyc = {
        ...kyc,
        bankAccountName,
        bankAccountNumber,
        bankIfsc,
        bankName,
        bankVerificationStatus: 'PENDING',
        bankVerificationReason: null,
        bankVerificationSubmittedAt: new Date().toISOString(),
      };
      await this.db.driver.update({
        where: { id: driver.id },
        data: { kycDocuments: updatedKyc },
      });
      driver.kycDocuments = updatedKyc;
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
          bankName,
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
    return this.mapToDto(settlement, driver);
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
      const kyc = (settlement.driver.kycDocuments as Record<string, any>) || {};
      if (
        kyc.bankVerificationStatus !== 'VERIFIED' ||
        kyc.bankAccountNumber !== settlement.bankAccountNumber ||
        String(kyc.bankIfsc || '').toUpperCase() !== String(settlement.bankIfsc || '').toUpperCase()
      ) {
        throw new BadRequestException('The payout bank account must be manually verified before payment.');
      }
      const transactionRef = dto.transactionRef?.trim();
      if (!transactionRef) {
        throw new BadRequestException('Bank UTR / transaction reference is required to confirm payment.');
      }

      const updated = await this.db.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.SETTLED,
          processedAt: now,
          transactionRef,
        },
      });

      this.notifications.emitEvent(`driver:${settlement.driverId}`, 'SETTLEMENT_SETTLED', {
        settlementId: id,
        amount: Number(settlement.amount),
        transactionRef: updated.transactionRef,
      });
      this.notifications.sendPushToUser(settlement.driver.userId, {
        title: 'Payout completed',
        body: `Your withdrawal of ₹${Number(settlement.amount).toLocaleString('en-IN')} was paid. UTR: ${transactionRef}`,
        type: NotificationType.SYSTEM,
        data: {
          settlementId: id,
          status: SettlementStatus.SETTLED,
          amount: Number(settlement.amount),
          transactionRef,
        },
        saveInApp: true,
      }).catch((error) => {
        this.logger.warn(`Driver payout notification failed for settlement ${id}: ${error.message}`);
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'SETTLEMENT_SETTLED',
        entityType: 'SETTLEMENT',
        entityId: id,
        metadata: { transactionRef: updated.transactionRef, amount: Number(settlement.amount) },
      });

      this.logger.log(`Settlement ${id} marked SETTLED by admin ${adminUserId}`);
      return this.mapToDto(updated, settlement.driver, true);
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
            status: dto.status === SettlementStatus.FAILED
              ? SettlementStatus.FAILED
              : SettlementStatus.CANCELLED,
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
      this.notifications.sendPushToUser(settlement.driver.userId, {
        title: 'Payout could not be completed',
        body: `Your withdrawal of ₹${Number(settlement.amount).toLocaleString('en-IN')} was returned to your wallet. ${dto.failureReason || ''}`.trim(),
        type: NotificationType.SYSTEM,
        data: {
          settlementId: id,
          status: dto.status,
          amount: Number(settlement.amount),
          reason: dto.failureReason,
        },
        saveInApp: true,
      }).catch((error) => {
        this.logger.warn(`Driver payout failure notification failed for settlement ${id}: ${error.message}`);
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'SETTLEMENT_REJECTED',
        entityType: 'SETTLEMENT',
        entityId: id,
        metadata: { failureReason: dto.failureReason, refundedAmount: Number(settlement.amount) },
      });

      this.logger.warn(`Settlement ${id} cancelled and refunded to driver ${settlement.driverId}: ${dto.failureReason}`);
      return this.mapToDto(updated, settlement.driver);
    }

    throw new BadRequestException('Invalid settlement processing status');
  }

  /**
   * Driver cancels their pending withdrawal request before admin processes it.
   * Atomically refunds the settlement amount back to the driver's wallet balance
   * and appends an immutable WITHDRAWAL_REFUND ledger entry.
   */
  async cancelDriverWithdrawal(settlementId: string, driverUserId: string): Promise<SettlementResponseDto> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const settlement = await this.db.settlement.findUnique({
      where: { id: settlementId },
      include: { driver: true },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement request not found');
    }

    if (settlement.driverId !== driver.id) {
      throw new ForbiddenException('Not authorized to cancel this settlement request');
    }

    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel settlement in ${settlement.status} status`);
    }

    const now = new Date();
    const updated = await this.db.$transaction(async (tx) => {
      // 1. Credit driver wallet back
      const updatedDriver = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { increment: settlement.amount },
        },
      });

      // 2. Append refund ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'CREDIT',
          amount: settlement.amount,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: 'WITHDRAWAL_REFUND',
          referenceId: settlement.id,
          description: `Withdrawal request cancelled by driver`,
        },
      });

      // 3. Mark settlement CANCELLED
      return tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.CANCELLED,
          transactionRef: 'Cancelled by driver',
          processedAt: now,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.notifications.emitEvent(`driver:${driver.id}`, 'SETTLEMENT_CANCELLED', {
      settlementId: settlement.id,
      amount: Number(settlement.amount),
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'SETTLEMENT_CANCELLED_BY_DRIVER',
      entityType: 'SETTLEMENT',
      entityId: settlement.id,
      metadata: { refundedAmount: Number(settlement.amount) },
    });

    this.logger.log(`Driver ${driver.id} cancelled pending withdrawal ${settlement.id}: ₹${settlement.amount} refunded to wallet`);
    return this.mapToDto(updated, driver);
  }

  async reviewBankDetails(
    settlementId: string,
    adminUserId: string,
    status: 'VERIFIED' | 'REJECTED',
    reason?: string,
  ): Promise<{ settlementId: string; bankVerificationStatus: string }> {
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      throw new BadRequestException('Bank review status must be VERIFIED or REJECTED.');
    }

    const settlement = await this.db.settlement.findUnique({
      where: { id: settlementId },
      include: { driver: true },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement record not found');
    }
    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException('Bank details can only be reviewed before the payout is processed.');
    }

    const currentKyc = (settlement.driver.kycDocuments as Record<string, any>) || {};
    if (status === 'VERIFIED') {
      const bankDetailsMatch =
        currentKyc.bankAccountName === settlement.bankAccountName &&
        currentKyc.bankAccountNumber === settlement.bankAccountNumber &&
        String(currentKyc.bankIfsc || '').toUpperCase() === String(settlement.bankIfsc || '').toUpperCase() &&
        (!settlement.bankName || currentKyc.bankName === settlement.bankName);
      if (!bankDetailsMatch) {
        throw new BadRequestException(
          'The driver bank details changed after this payout request. Ask the driver to submit a new request.',
        );
      }
    } else if (!reason?.trim()) {
      throw new BadRequestException('A reason is required when rejecting bank details.');
    }

    const verificationReason = status === 'REJECTED' ? reason!.trim() : null;
    await this.db.driver.update({
      where: { id: settlement.driverId },
      data: {
        kycDocuments: {
          ...currentKyc,
          bankVerificationStatus: status,
          bankVerificationReason: verificationReason,
          bankVerificationUpdatedAt: new Date().toISOString(),
        },
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: status === 'VERIFIED' ? 'BANK_DETAILS_VERIFIED' : 'BANK_DETAILS_REJECTED',
      entityType: 'DRIVER',
      entityId: settlement.driverId,
      metadata: { settlementId, reason: verificationReason },
    });

    this.notifications.sendPushToUser(settlement.driver.userId, {
      title: status === 'VERIFIED' ? 'Bank account verified' : 'Bank details need an update',
      body: status === 'VERIFIED'
        ? 'Your bank account has been verified. You can receive payouts.'
        : `Your bank details were not approved. ${verificationReason}`,
      type: NotificationType.SYSTEM,
      data: { settlementId, bankVerificationStatus: status, reason: verificationReason },
      saveInApp: true,
    }).catch((error) => {
      this.logger.warn(`Driver bank review notification failed for settlement ${settlementId}: ${error.message}`);
    });

    return { settlementId, bankVerificationStatus: status };
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

    return settlements.map((s) => this.mapToDto(s, driver));
  }

  /**
   * Get single settlement by ID for driver or admin.
   */
  async getSettlementById(id: string, userId: string, role: string): Promise<SettlementResponseDto> {
    const settlement = await this.db.settlement.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement record not found');
    }

    if (role === UserRole.DRIVER && settlement.driver.userId !== userId) {
      throw new ForbiddenException('You are not authorized to view this settlement');
    }

    return this.mapToDto(settlement, settlement.driver, role === UserRole.ADMIN);
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
            fleetId: true,
            fullName: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            walletBalance: true,
            kycDocuments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) => ({
      ...this.mapToDto(s, s.driver, true),
      driverName: s.driver?.fullName || 'Driver',
      driverPhone: s.driver?.phone || '—',
      driverVehicle: s.driver?.vehicleType ? `${s.driver.vehicleType} (${s.driver.vehiclePlate || '—'})` : '—',
      driverWalletBalance: s.driver ? Number(s.driver.walletBalance) : 0,
    }));
  }

  private mapToDto(s: any, driver?: any, includeSensitive = false): SettlementResponseDto {
    const kyc = (driver?.kycDocuments as Record<string, any>) || {};
    const ifsc = s.bankIfsc || kyc.bankIfsc || '';
    const bankName = s.bankName || kyc.bankName || undefined;
    const bankAccountName = s.bankAccountName || kyc.bankAccountName || driver?.fullName || undefined;
    const rawAcc = s.bankAccountNumber || kyc.bankAccountNumber;
    const bankAccountNumber = rawAcc
      ? includeSensitive
        ? rawAcc
        : `•••• ${rawAcc.slice(-4)}`
      : undefined;

    return {
      id: s.id,
      driverId: s.driverId,
      fleetId: driver?.fleetId || undefined,
      entityType: driver?.fleetId ? 'FLEET' : 'DRIVER',
      amount: Number(s.amount),
      status: s.status as SettlementStatus,
      bankAccountName,
      bankAccountNumber,
      bankIfsc: ifsc || undefined,
      bankName,
      bankVerificationStatus: kyc.bankVerificationStatus || 'NOT_SUBMITTED',
      transactionRef: s.transactionRef || undefined,
      processedAt: s.processedAt ? (s.processedAt instanceof Date ? s.processedAt.toISOString() : String(s.processedAt)) : undefined,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    };
  }
}
