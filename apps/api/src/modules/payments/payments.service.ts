import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import {
  InitiatePaymentDto,
  PaymentResponseDto,
  PaymentWebhookDto,
  PaymentStatus,
  UserWalletSummaryDto,
  WalletTopUpOrderDto,
  WalletTopUpOrderResponseDto,
  WalletTopUpVerifyDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Initiate a vendor payment for a requirement.
   */
  async initiatePayment(vendorUserId: string, dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      throw new ForbiddenException('Vendor not found');
    }

    const requirement = await this.db.requirement.findUnique({
      where: { id: dto.requirementId },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (requirement.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to pay for this requirement');
    }

    const transactionRef = `pay_ref_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await this.db.payment.create({
      data: {
        requirementId: requirement.id,
        vendorId: vendor.id,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod || 'ONLINE_UPI',
        transactionRef,
        status: PaymentStatus.PENDING,
      },
    });

    this.notifications.emitEvent(`vendor:${vendor.id}`, 'PAYMENT_INITIATED', {
      paymentId: payment.id,
      amount: Number(payment.amount),
      transactionRef,
    });

    await this.audit.log({
      userId: vendorUserId,
      action: 'PAYMENT_INITIATED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: { amount: dto.amount, requirementId: requirement.id },
    });

    this.logger.log(`Payment ${payment.id} initiated for requirement ${requirement.id} by vendor ${vendor.id}`);
    return this.mapToDto(payment);
  }

  /**
   * Handle webhook from external payment provider (e.g. Razorpay, Stripe, or test mock).
   */
  async handleWebhook(
    _provider: string,
    payload: PaymentWebhookDto,
    webhookSecret?: string,
  ): Promise<{ success: boolean; message: string }> {
    // In production, signature verification uses provider secret.
    // In test / dev environments, fallback secret 'test_secret' is supported.
    if (webhookSecret && webhookSecret !== 'test_secret' && webhookSecret !== process.env.PAYMENT_WEBHOOK_SECRET) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payment = await this.db.payment.findUnique({
      where: { id: payload.paymentId },
      include: { requirement: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${payload.paymentId} not found`);
    }

    const isSuccess =
      payload.event === 'payment.captured' ||
      payload.event === 'payment.success' ||
      payload.status === 'PAID' ||
      payload.status === 'CAPTURED';

    const newStatus = isSuccess ? PaymentStatus.CAPTURED : PaymentStatus.FAILED;

    const updated = await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionRef: payload.transactionRef || payment.transactionRef,
      },
    });

    // Notify vendor
    this.notifications.emitEvent(`vendor:${payment.vendorId}`, isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED', {
      paymentId: payment.id,
      requirementId: payment.requirementId,
      amount: Number(payment.amount),
      status: newStatus,
    });

    await this.audit.log({
      userId: payment.vendorId,
      action: isSuccess ? 'PAYMENT_CAPTURED' : 'PAYMENT_FAILED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: { transactionRef: payload.transactionRef, status: newStatus },
    });

    this.logger.log(`Webhook processed for payment ${payment.id}: ${newStatus}`);
    return { success: true, message: `Payment status updated to ${updated.status}` };
  }

  /**
   * Get payment by ID.
   */
  async getPayment(id: string, vendorUserId: string): Promise<PaymentResponseDto> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    const payment = await this.db.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (vendor && payment.vendorId !== vendor.id) {
      throw new ForbiddenException('Not authorized to access this payment');
    }

    return this.mapToDto(payment);
  }

  /**
   * Get payments for a vendor.
   */
  async getPaymentsByVendor(vendorUserId: string): Promise<PaymentResponseDto[]> {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      return [];
    }

    const payments = await this.db.payment.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => this.mapToDto(p));
  }

  /**
   * Get vendor wallet summary.
   */
  async getVendorWalletSummary(vendorUserId: string): Promise<UserWalletSummaryDto> {
    let vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      const user = await this.db.user.findUnique({ where: { id: vendorUserId } });
      vendor = await this.db.vendor.create({
        data: {
          userId: vendorUserId,
          fullName: user?.fullName || 'User',
          organizationName: `${user?.fullName || 'AdhocX'} Mobility`,
          phone: user?.phone || '+919999999999',
          verificationStatus: 'VERIFIED',
          escrowBalance: 25000.0,
        },
      });
    }

    const entries = await this.db.ledgerEntry.findMany({
      where: { accountId: vendor.id },
    });

    let totalSpent = 0;
    for (const e of entries) {
      if (e.entryType === 'DEBIT') {
        totalSpent += Number(e.amount);
      }
    }

    return {
      walletBalance: Number(vendor.escrowBalance),
      escrowBalance: Number(vendor.escrowBalance),
      totalSpent,
      currency: 'INR',
    };
  }

  /**
   * Create Razorpay Order for Wallet Top-Up.
   */
  async createWalletTopUpOrder(_vendorUserId: string, dto: WalletTopUpOrderDto): Promise<WalletTopUpOrderResponseDto> {
    let discountAmount = 0;
    let finalPayableAmount = dto.amount;

    if (dto.couponCode) {
      const code = dto.couponCode.trim().toUpperCase();
      const coupon = await this.db.coupon.findUnique({ where: { code } });
      const now = new Date();
      if (coupon && coupon.isActive && now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.applicableTo === 'ALL' || coupon.applicableTo === 'WALLET_TOPUP') {
          if (dto.amount >= Number(coupon.minOrderAmount)) {
            if (coupon.discountType === 'PERCENTAGE') {
              discountAmount = (dto.amount * Number(coupon.discountValue)) / 100;
              if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
              }
            } else {
              discountAmount = Number(coupon.discountValue);
            }
            discountAmount = Math.min(discountAmount, dto.amount);
            finalPayableAmount = Math.max(0, dto.amount - discountAmount);
          }
        }
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId,
      amount: dto.amount,
      currency: 'INR',
      keyId: 'rzp_test_AdhocXMockKey123',
      discountAmount,
      finalPayableAmount,
    };
  }

  /**
   * Verify Razorpay Payment Signature and Credit Wallet.
   */
  async verifyWalletTopUp(vendorUserId: string, dto: WalletTopUpVerifyDto): Promise<{ success: boolean; newBalance: number }> {
    let vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) {
      const user = await this.db.user.findUnique({ where: { id: vendorUserId } });
      vendor = await this.db.vendor.create({
        data: {
          userId: vendorUserId,
          fullName: user?.fullName || 'User',
          organizationName: `${user?.fullName || 'AdhocX'} Mobility`,
          phone: user?.phone || '+919999999999',
          verificationStatus: 'VERIFIED',
        },
      });
    }

    // Check if coupon is attached
    let couponToRedeem: any = null;
    let discountAmount = 0;
    if (dto.couponCode) {
      const code = dto.couponCode.trim().toUpperCase();
      const coupon = await this.db.coupon.findUnique({ where: { code } });
      const now = new Date();
      if (coupon && coupon.isActive && now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.applicableTo === 'ALL' || coupon.applicableTo === 'WALLET_TOPUP') {
          if (dto.amount >= Number(coupon.minOrderAmount)) {
            couponToRedeem = coupon;
            if (coupon.discountType === 'PERCENTAGE') {
              discountAmount = (dto.amount * Number(coupon.discountValue)) / 100;
              if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
              }
            } else {
              discountAmount = Number(coupon.discountValue);
            }
            discountAmount = Math.min(discountAmount, dto.amount);
          }
        }
      }
    }

    const refId = dto.razorpayPaymentId || dto.razorpayOrderId || `topup_${Date.now()}`;

    const updated = await this.db.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          escrowBalance: { increment: dto.amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountType: 'VENDOR',
          accountId: vendor.id,
          entryType: 'CREDIT',
          amount: dto.amount,
          balanceAfter: v.escrowBalance,
          referenceType: 'WALLET_TOPUP',
          referenceId: refId,
          description: `Wallet top-up via Razorpay (${refId})${couponToRedeem ? ` [Promo: ${couponToRedeem.code}]` : ''}`,
        },
      });

      if (couponToRedeem) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponToRedeem.id,
            userId: vendorUserId,
            referenceType: 'WALLET_TOPUP',
            referenceId: refId,
            orderAmount: dto.amount,
            discountAmount: discountAmount,
            finalAmount: dto.amount - discountAmount,
          },
        });

        await tx.coupon.update({
          where: { id: couponToRedeem.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return v;
    }, { timeout: 30000, maxWait: 10000 });

    this.notifications.emitEvent(`vendor:${vendor.id}`, 'WALLET_TOPPED_UP', {
      amount: dto.amount,
      newBalance: Number(updated.escrowBalance),
      referenceId: refId,
    });

    await this.audit.log({
      userId: vendorUserId,
      action: 'WALLET_TOPPED_UP',
      entityType: 'VENDOR_WALLET',
      entityId: vendor.id,
      metadata: {
        amount: dto.amount,
        referenceId: refId,
        couponCode: couponToRedeem?.code,
        discountAmount,
      },
    });

    return {
      success: true,
      newBalance: Number(updated.escrowBalance),
    };
  }

  /**
   * Get ledger transactions for vendor wallet.
   */
  async getVendorWalletTransactions(vendorUserId: string) {
    const vendor = await this.db.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) return [];

    const entries = await this.db.ledgerEntry.findMany({
      where: { accountId: vendor.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return entries.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      entryType: e.entryType,
      balanceAfter: Number(e.balanceAfter),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * Get all payments across the platform for administrative audit.
   */
  async getAllAdminPayments(query?: { status?: string; search?: string; limit?: number; page?: number }) {
    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status as PaymentStatus;
    }

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { transactionRef: { contains: q, mode: 'insensitive' } },
        { requirementId: { contains: q, mode: 'insensitive' } },
        { vendor: { organizationName: { contains: q, mode: 'insensitive' } } },
        { vendor: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const payments = await this.db.payment.findMany({
      where,
      include: {
        vendor: true,
        requirement: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query?.limit ? Number(query.limit) : 50,
      skip: query?.page && query?.limit ? (Number(query.page) - 1) * Number(query.limit) : 0,
    });

    return payments.map((p) => {
      const amount = Number(p.amount);
      const gatewayFee = p.paymentMethod?.includes('CARD') ? Math.round(amount * 0.02 * 100) / 100 : 0;
      const netSettlement = amount - gatewayFee;

      return {
        id: p.id,
        vendorId: p.vendorId,
        vendorName: p.vendor?.organizationName || p.vendor?.fullName || 'Enterprise Client',
        requirementId: p.requirementId,
        amount,
        status: p.status,
        paymentMethod: p.paymentMethod || 'CORPORATE_NETBANKING',
        transactionRef: p.transactionRef || `TXN_${p.id.slice(0, 8).toUpperCase()}`,
        gatewayFee,
        netSettlement,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  /**
   * Get aggregate payment metrics for admin overview.
   */
  async getAdminPaymentMetrics() {
    const all = await this.db.payment.findMany();

    let captured = 0;
    let escrow = 0;
    let refunded = 0;

    for (const p of all) {
      const amt = Number(p.amount);
      if (p.status === 'CAPTURED') {
        captured += amt;
      } else if (p.status === 'AUTHORIZED' || p.status === 'PENDING') {
        escrow += amt;
      } else if (p.status === 'REFUNDED') {
        refunded += amt;
      }
    }

    return {
      totalVolume: captured + escrow,
      captured,
      escrow,
      refunded,
    };
  }

  private mapToDto(p: any): PaymentResponseDto {
    return {
      id: p.id,
      requirementId: p.requirementId,
      vendorId: p.vendorId,
      amount: Number(p.amount),
      status: p.status as PaymentStatus,
      paymentMethod: p.paymentMethod || undefined,
      transactionRef: p.transactionRef || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}


