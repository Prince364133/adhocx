import { Module } from '@nestjs/common';
import { LedgerModule } from '../../modules/ledger/ledger.module';
import { SettlementsModule } from '../../modules/settlements/settlements.module';
import { PaymentsModule } from '../../modules/payments/payments.module';
import { PricingModule } from '../../modules/pricing/pricing.module';
import { CouponsModule } from '../../modules/coupons/coupons.module';
import { SubscriptionsModule } from '../../modules/subscriptions/subscriptions.module';

/**
 * Finance Domain (Bounded Context: Dual Ledgers, Payouts & Tariffs)
 * Encapsulates corporate contract billables, driver payables, payout batches, and tariff calculations.
 */
@Module({
  imports: [
    LedgerModule,
    SettlementsModule,
    PaymentsModule,
    PricingModule,
    CouponsModule,
    SubscriptionsModule,
  ],
  exports: [
    LedgerModule,
    SettlementsModule,
    PaymentsModule,
    PricingModule,
    CouponsModule,
    SubscriptionsModule,
  ],
})
export class FinanceDomainModule {}
