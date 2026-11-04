import { GoneException } from '@nestjs/common';
import { CorporateBillingController } from '../src/domains/corporate/billing/corporate-billing.controller';

/**
 * The legacy POST corporate/billing/payouts/prepare-batch marked every UNPAID earning PAID with no
 * money moved, no checker and no provider confirmation. It is retired (410) and its calculation
 * survives only as a read-only preview.
 */
describe('legacy payout batch endpoint is retired', () => {
  const billing = { previewDriverPayoutBatch: jest.fn().mockResolvedValue({ totalDrivers: 0, disbursements: [] }) };
  const ctrl = new CorporateBillingController(billing as any, {} as any, {} as any);

  it('POST payouts/prepare-batch answers 410 Gone and points to the maker-checker flow', () => {
    expect(() => ctrl.retiredPreparePayoutBatch()).toThrow(GoneException);
    expect(() => ctrl.retiredPreparePayoutBatch()).toThrow(/payouts\/batches/);
  });

  it('GET payouts/preview passes filters through to the read-only preview', async () => {
    await ctrl.previewPayoutBatch('drv-1, drv-2,', '2026-11-01');
    expect(billing.previewDriverPayoutBatch).toHaveBeenCalledWith({ driverIds: ['drv-1', 'drv-2'], cutoffDate: '2026-11-01' });
  });

  it('the old service method that marked earnings PAID no longer exists', () => {
    const { CorporateBillingService } = jest.requireActual('../src/domains/corporate/billing/corporate-billing.service');
    expect(CorporateBillingService.prototype.prepareDriverPayoutBatch).toBeUndefined();
    expect(typeof CorporateBillingService.prototype.previewDriverPayoutBatch).toBe('function');
  });
});
