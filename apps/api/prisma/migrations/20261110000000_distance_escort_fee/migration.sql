-- AlterTable
ALTER TABLE "system_policy_configs" ADD COLUMN IF NOT EXISTS "escort_fee" DECIMAL(10,2) NOT NULL DEFAULT 300.00;

-- AlterTable
ALTER TABLE "trip_quotes" ADD COLUMN IF NOT EXISTS "has_escort" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trip_quotes" ADD COLUMN IF NOT EXISTS "escort_fare_paise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trip_pricing_snapshots" ADD COLUMN IF NOT EXISTS "has_escort" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trip_pricing_snapshots" ADD COLUMN IF NOT EXISTS "escort_fare_paise" INTEGER NOT NULL DEFAULT 0;

