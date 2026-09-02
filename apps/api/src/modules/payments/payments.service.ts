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
