import * as crypto from 'crypto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';

/**
 * Regression tests: payment and subscription credits must never be obtainable without a valid
 * Razorpay signature (previously any signature starting with `sig_webhook_` was accepted, the
 * webhook skipped verification when no signature header was sent, and `test_secret` always passed).
 */
const ENV = ['RAZORPAY_WEBHOOK_SECRET', 'PAYMENT_WEBHOOK_SECRET', 'RAZORPAY_KEY_SECRET'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ENV) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const hmac = (secret: string, body: string) => crypto.createHmac('sha256', secret).update(body).digest('hex');

function makePayments() {
  const db: any = {
    vendor: { findUnique: jest.fn().mockResolvedValue({ id: 'vnd-1', userId: 'usr-1', escrowBalance: 0 }) },
    payment: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pay-1', vendorId: 'vnd-1', requirementId: 'req-1', amount: 100 }),
      update: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'CAPTURED' }),
    },
  };
  const svc = new PaymentsService(db, { emitEvent: jest.fn() } as any, { log: jest.fn() } as any);
  return { svc, db };
}

describe('payment webhook authentication', () => {
  const payload = { event: 'payment.captured', paymentId: 'pay-1' };

  it('is refused when no webhook secret is configured on the server', async () => {
    const { svc, db } = makePayments();
    await expect(svc.handleWebhook('razorpay', payload, 'test_secret')).rejects.toThrow(ForbiddenException);
    expect(db.payment.update).not.toHaveBeenCalled();
  });

  it('is refused when the request carries no signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_live_1';
    const { svc, db } = makePayments();
    await expect(svc.handleWebhook('razorpay', payload, undefined)).rejects.toThrow(/Missing webhook signature/);
    expect(db.payment.update).not.toHaveBeenCalled();
  });

  it('no longer accepts the literal "test_secret"', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_live_1';
    const { svc } = makePayments();
    await expect(svc.handleWebhook('razorpay', payload, 'test_secret')).rejects.toThrow(/Invalid webhook signature/);
  });

  it('accepts a valid HMAC of the body', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_live_1';
    const { svc, db } = makePayments();
    const res = await svc.handleWebhook('razorpay', payload, hmac('whsec_live_1', JSON.stringify(payload)));
    expect(res.success).toBe(true);
    expect(db.payment.update).toHaveBeenCalled();
  });

  it('accepts the configured secret itself (x-webhook-secret) and rejects a wrong one', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'internal_secret_9';
    const { svc } = makePayments();
    await expect(svc.handleWebhook('mock', payload, 'internal_secret_9')).resolves.toMatchObject({ success: true });
    await expect(svc.handleWebhook('mock', payload, 'internal_secret_8')).rejects.toThrow(ForbiddenException);
  });

  it('a verified top-up webhook credits through the internal path, not a magic signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_live_1';
    const { svc } = makePayments();
    const spy = jest.spyOn(svc, 'verifyWalletTopUp').mockResolvedValue({ success: true, newBalance: 500 });
    const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_rzp_1', order_id: 'order_1', amount: 50000, notes: { vendorUserId: 'usr-1' } } } } };
    const res = await svc.handleWebhook('razorpay', body, hmac('whsec_live_1', JSON.stringify(body)));
    expect(res.success).toBe(true);
    expect(spy).toHaveBeenCalledWith('usr-1', expect.objectContaining({ amount: 500 }), { verifiedByWebhook: true });
    expect(spy.mock.calls[0][1].razorpaySignature).not.toMatch(/^sig_webhook_/);
  });
});

describe('client-side Razorpay signature checks', () => {
  it('wallet top-up rejects a forged "sig_webhook_" signature', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_key_secret';
    const { svc } = makePayments();
    await expect(
      svc.verifyWalletTopUp('usr-1', {
        razorpayOrderId: 'order_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig_webhook_anything',
        amount: 100000,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('driver subscription rejects a forged "sig_webhook_" signature', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_key_secret';
    const db: any = { driver: { findUnique: jest.fn().mockResolvedValue({ id: 'drv-1', userId: 'usr-d' }) } };
    const svc = new SubscriptionsService(db, { emitEvent: jest.fn() } as any, { log: jest.fn() } as any, {} as any);
    await expect(
      svc.verifySubscriptionPayment('usr-d', { orderId: 'order_9', paymentId: 'pay_9', signature: 'sig_webhook_x' }),
    ).rejects.toThrow(/Invalid Razorpay subscription payment signature/);
  });
});
