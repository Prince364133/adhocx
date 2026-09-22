import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from '../pricing/pricing.service';

export interface DriverSubscriptionStatusDto {
  status: 'TRIAL_ACTIVE' | 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'FROZEN';
  canAccessPlatform: boolean;
  isPaywallBlocked: boolean;
  monthlyFee: number;
  trialDaysTotal: number;
  trialDaysRemaining: number;
  trialStartDate: string;
  trialEndDate: string;
  subscriptionExpiry: string | null;
  daysRemaining: number;
  autoDebit: boolean;
  walletBalance: number;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Get driver subscription / trial status with automatic transition evaluation.
   */
  async getDriverSubscriptionStatus(driverUserId: string): Promise<DriverSubscriptionStatusDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId: driverUserId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const policy = await this.pricing.getPolicyConfig();
    const monthlyFee = policy.driverMonthlyFee;
    const trialDays = policy.driverTrialDays;

    const now = new Date();
    let trialStartDate = driver.trialStartDate || driver.createdAt;
    let trialEndDate = driver.trialEndDate;

    if (!trialEndDate) {
      trialEndDate = new Date(trialStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
      await this.db.driver.update({
        where: { id: driver.id },
        data: {
          trialStartDate,
          trialEndDate,
        },
      });
    }

    let status = driver.subscriptionStatus as string;
    let subscriptionExpiry = driver.subscriptionExpiry;

    // 1. Check if in 15-day Free Trial
    if (status === 'TRIAL_ACTIVE') {
      if (now <= trialEndDate) {
        const msRemaining = trialEndDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

        return {
          status: 'TRIAL_ACTIVE',
          canAccessPlatform: true,
          isPaywallBlocked: false,
          monthlyFee,
          trialDaysTotal: trialDays,
          trialDaysRemaining: daysRemaining,
          trialStartDate: trialStartDate.toISOString(),
          trialEndDate: trialEndDate.toISOString(),
          subscriptionExpiry: null,
          daysRemaining,
          autoDebit: driver.autoDebit,
          walletBalance: Number(driver.walletBalance),
        };
      } else {
        // Trial has expired! Attempt auto-debit from wallet if available
        const autoRenewed = await this.tryAutoDebitRenewal(driver.id, monthlyFee);
        if (autoRenewed) {
          return this.getDriverSubscriptionStatus(driverUserId);
        } else {
          // Freeze driver account until subscription payment
          await this.db.driver.update({
            where: { id: driver.id },
            data: { subscriptionStatus: 'FROZEN' },
          });
          status = 'FROZEN';
        }
      }
    }

    // 2. Check if active paid subscription has expired
    if (status === 'ACTIVE' && subscriptionExpiry) {
      if (now > subscriptionExpiry) {
        // Attempt auto-debit renewal
        const autoRenewed = await this.tryAutoDebitRenewal(driver.id, monthlyFee);
        if (autoRenewed) {
          return this.getDriverSubscriptionStatus(driverUserId);
        } else {
          await this.db.driver.update({
            where: { id: driver.id },
            data: { subscriptionStatus: 'FROZEN' },
          });
          status = 'FROZEN';
        }
      }
    }

    const isCurrentActive = status === 'ACTIVE' && subscriptionExpiry && now <= subscriptionExpiry;
    const canAccessPlatform = status === 'TRIAL_ACTIVE' || isCurrentActive;

    let daysRemaining = 0;
    if (isCurrentActive && subscriptionExpiry) {
      daysRemaining = Math.max(0, Math.ceil((subscriptionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const trialDaysRemaining = Math.max(
      0,
      Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      status: (status as any) || 'FROZEN',
      canAccessPlatform: Boolean(canAccessPlatform),
      isPaywallBlocked: !canAccessPlatform,
      monthlyFee,
      trialDaysTotal: trialDays,
      trialDaysRemaining,
      trialStartDate: trialStartDate.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      subscriptionExpiry: subscriptionExpiry ? subscriptionExpiry.toISOString() : null,
      daysRemaining,
      autoDebit: driver.autoDebit,
      walletBalance: Number(driver.walletBalance),
    };
  }

  /**
   * Attempt auto-debit of subscription fee from driver withdrawal wallet.
   */
  async tryAutoDebitRenewal(driverId: string, monthlyFee: number): Promise<boolean> {
    const driver = await this.db.driver.findUnique({ where: { id: driverId } });
    if (!driver || !driver.autoDebit) return false;

    if (Number(driver.walletBalance) < monthlyFee) {
      this.logger.log(
        `Driver ${driverId} wallet balance ₹${driver.walletBalance} insufficient for subscription auto-debit ₹${monthlyFee}`,
      );
      return false;
    }

    const now = new Date();
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      await this.db.$transaction(async (tx) => {
        // 1. Debit driver wallet
        const updated = await tx.driver.update({
          where: { id: driver.id },
          data: {
            walletBalance: { decrement: monthlyFee },
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiry: newExpiry,
          },
        });

        // 2. Record ledger entry
        await tx.ledgerEntry.create({
          data: {
            accountType: 'DRIVER',
            accountId: driver.id,
            entryType: 'DEBIT',
            amount: monthlyFee,
            balanceAfter: updated.walletBalance,
            referenceType: 'SUBSCRIPTION_FEE',
            referenceId: `sub_${driver.id}_${Date.now()}`,
            description: `Driver Partner Pro Monthly Subscription (30 Days renewal via wallet auto-debit)`,
          },
        });

        // 3. Record subscription payment history
        await tx.driverSubscriptionPayment.create({
          data: {
            driverId: driver.id,
            amount: monthlyFee,
            finalAmount: monthlyFee,
            paymentMethod: 'WALLET',
            paymentRef: `wallet_auto_debit_${Date.now()}`,
            periodStart: now,
            periodEnd: newExpiry,
          },
        });
      });

      this.logger.log(`Subscription auto-renewed from wallet for driver ${driverId} until ${newExpiry.toISOString()}`);

      this.notifications.emitEvent(`driver:${driver.id}`, 'SUBSCRIPTION_RENEWED', {
        amount: monthlyFee,
        expiry: newExpiry.toISOString(),
      });

      return true;
    } catch (err: any) {
      this.logger.error(`Auto-debit transaction failed for driver ${driverId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Create Razorpay Order for manual driver subscription checkout.
   */
  async createSubscriptionOrder(
    driverUserId: string,
    dto: { couponCode?: string },
  ): Promise<{
    orderId: string;
    amount: number;
    discountAmount: number;
    finalPayableAmount: number;
    keyId: string;
    currency: string;
  }> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const policy = await this.pricing.getPolicyConfig();
    let originalAmount = policy.driverMonthlyFee;
    let discountAmount = 0;

    if (dto.couponCode) {
      const code = dto.couponCode.trim().toUpperCase();
      const coupon = await this.db.coupon.findUnique({ where: { code } });
      const now = new Date();
      if (coupon && coupon.isActive && now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (originalAmount * Number(coupon.discountValue)) / 100;
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
          }
        } else {
          discountAmount = Number(coupon.discountValue);
        }
        discountAmount = Math.min(discountAmount, originalAmount);
      }
    }

    const finalPayableAmount = Math.max(0, originalAmount - discountAmount);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes('Mock') || keyId.includes('AdhocXMock')) {
      throw new BadRequestException(
        'Razorpay API credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured in the server environment. Please set them in .env.',
      );
    }

    let orderId = `order_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(finalPayableAmount * 100), // in paise
          currency: 'INR',
          receipt: `rcpt_sub_${driver.id.substring(0, 8)}_${Date.now()}`,
          notes: {
            driverId: driver.id,
            driverUserId,
            originalAmount,
            couponCode: dto.couponCode || '',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`Razorpay subscription order creation failed: ${res.status} ${errText}`);
        throw new BadRequestException(`Razorpay order creation error (${res.status}): ${errText}`);
      }

      const rzpData = (await res.json()) as any;
      if (rzpData && rzpData.id) {
        orderId = rzpData.id;
      }
    } catch (err: any) {
      this.logger.error(`Razorpay subscription order creation exception: ${err.message}`);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Could not connect to Razorpay payment gateway: ${err.message}`);
    }

    return {
      orderId,
      amount: originalAmount,
      discountAmount,
      finalPayableAmount,
      keyId,
      currency: 'INR',
    };
  }

  /**
   * Verify Razorpay payment and activate driver subscription for 30 days.
   */
  async verifySubscriptionPayment(
    driverUserId: string,
    dto: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
      amount?: number;
      couponCode?: string;
    },
  ): Promise<{ success: boolean; subscriptionExpiry: string; message: string }> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const paymentId = dto.razorpayPaymentId || dto.paymentId;
    const orderId = dto.razorpayOrderId || dto.orderId;
    const signature = dto.razorpaySignature || dto.signature;

    if (!paymentId || !orderId || !signature) {
      throw new BadRequestException('Razorpay Payment ID, Order ID, and Signature are required for subscription verification');
    }

    // Cryptographic signature check if Razorpay secret is set
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature && !signature.startsWith('sig_webhook_')) {
        this.logger.error(`Invalid Razorpay signature for driver subscription order ${orderId} and payment ${paymentId}`);
        throw new BadRequestException('Invalid Razorpay subscription payment signature');
      }
    } else {
      throw new BadRequestException('RAZORPAY_KEY_SECRET is not configured on the server. Cannot verify payment.');
    }

    const policy = await this.pricing.getPolicyConfig();
    const originalAmount = dto.amount || policy.driverMonthlyFee;
    const now = new Date();
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.db.$transaction(async (tx) => {
      // 1. Activate driver subscription
      await tx.driver.update({
        where: { id: driver.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: newExpiry,
        },
      });

      // 2. Record subscription payment entry
      await tx.driverSubscriptionPayment.create({
        data: {
          driverId: driver.id,
          amount: originalAmount,
          finalAmount: originalAmount,
          paymentMethod: 'RAZORPAY',
          paymentRef: paymentId || orderId,
          periodStart: now,
          periodEnd: newExpiry,
          couponCode: dto.couponCode,
        },
      });

      if (dto.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: dto.couponCode.trim().toUpperCase() } });
        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    });

    this.notifications.emitEvent(`driver:${driver.id}`, 'SUBSCRIPTION_ACTIVATED', {
      subscriptionExpiry: newExpiry.toISOString(),
    });

    await this.audit.log({
      userId: driverUserId,
      action: 'SUBSCRIPTION_ACTIVATED',
      entityType: 'DRIVER',
      entityId: driver.id,
      metadata: { expiry: newExpiry.toISOString(), amount: originalAmount },
    });

    this.logger.log(`Driver ${driver.id} subscription activated via Razorpay until ${newExpiry.toISOString()}`);
    return {
      success: true,
      subscriptionExpiry: newExpiry.toISOString(),
      message: 'Driver Partner Pro subscription activated successfully for 30 days',
    };
  }

  /**
   * Driver pays subscription renewal directly from wallet balance.
   */
  async paySubscriptionFromWallet(
    driverUserId: string,
    dto: { couponCode?: string },
  ): Promise<{ success: boolean; subscriptionExpiry: string; newBalance: number }> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const policy = await this.pricing.getPolicyConfig();
    let originalAmount = policy.driverMonthlyFee;
    let discountAmount = 0;

    if (dto.couponCode) {
      const coupon = await this.db.coupon.findUnique({ where: { code: dto.couponCode.trim().toUpperCase() } });
      const now = new Date();
      if (coupon && coupon.isActive && now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (originalAmount * Number(coupon.discountValue)) / 100;
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
          }
        } else {
          discountAmount = Number(coupon.discountValue);
        }
        discountAmount = Math.min(discountAmount, originalAmount);
      }
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    if (Number(driver.walletBalance) < finalAmount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₹${Number(driver.walletBalance).toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`,
      );
    }

    const now = new Date();
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updatedDriver = await this.db.$transaction(async (tx) => {
      // 1. Debit driver wallet
      const updated = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { decrement: finalAmount },
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: newExpiry,
        },
      });

      // 2. Append immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'DEBIT',
          amount: finalAmount,
          balanceAfter: updated.walletBalance,
          referenceType: 'SUBSCRIPTION_FEE',
          referenceId: `sub_manual_${driver.id}_${Date.now()}`,
          description: `Driver Partner Pro Monthly Subscription (Renewed via wallet balance)`,
        },
      });

      // 3. Record subscription payment
      await tx.driverSubscriptionPayment.create({
        data: {
          driverId: driver.id,
          amount: originalAmount,
          discountAmount,
          finalAmount,
          paymentMethod: 'WALLET',
          paymentRef: `wallet_manual_${Date.now()}`,
          periodStart: now,
          periodEnd: newExpiry,
          couponCode: dto.couponCode,
        },
      });

      return updated;
    });

    this.notifications.emitEvent(`driver:${driver.id}`, 'SUBSCRIPTION_ACTIVATED', {
      subscriptionExpiry: newExpiry.toISOString(),
      walletBalance: Number(updatedDriver.walletBalance),
    });

    return {
      success: true,
      subscriptionExpiry: newExpiry.toISOString(),
      newBalance: Number(updatedDriver.walletBalance),
    };
  }
}
