ALTER TABLE "system_policy_configs"
  DROP COLUMN IF EXISTS "commission_percent";

ALTER TABLE "vehicle_pricing_tiers"
  DROP COLUMN IF EXISTS "platform_fee_percent";

ALTER TABLE "vehicle_pricing_tiers"
  DROP COLUMN IF EXISTS "driver_share_percent";

ALTER TABLE "zonal_quote_snapshots"
  DROP COLUMN IF EXISTS "platform_fee_paise";
