-- Peak / non-peak distance pricing. Additive only: every new column is nullable or defaulted, so
-- existing plans keep pricing exactly as before (no peak windows = never peak, null peak rate =
-- standard rate).

ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "peak_windows_json" JSONB;
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "rate_config_json" JSONB;

ALTER TABLE "pricing_slabs" ADD COLUMN IF NOT EXISTS "vendor_peak_price_paise" INTEGER;
ALTER TABLE "pricing_slabs" ADD COLUMN IF NOT EXISTS "driver_peak_payout_paise" INTEGER;

-- Database-level guard: a peak slab can never pay the driver more than the vendor is charged.
ALTER TABLE "pricing_slabs" DROP CONSTRAINT IF EXISTS "pricing_slabs_peak_margin_check";
ALTER TABLE "pricing_slabs" ADD CONSTRAINT "pricing_slabs_peak_margin_check" CHECK (
  ("vendor_peak_price_paise" IS NULL OR "vendor_peak_price_paise" > 0)
  AND ("driver_peak_payout_paise" IS NULL OR "driver_peak_payout_paise" > 0)
  AND (COALESCE("vendor_peak_price_paise", "vendor_price_paise") >= COALESCE("driver_peak_payout_paise", "driver_payout_paise"))
) NOT VALID; -- enforced for new/updated rows; legacy rows can never block this deploy

ALTER TABLE "trip_quotes" ADD COLUMN IF NOT EXISTS "priced_for_time" TIMESTAMP(3);
ALTER TABLE "trip_quotes" ADD COLUMN IF NOT EXISTS "is_peak" BOOLEAN NOT NULL DEFAULT false;
