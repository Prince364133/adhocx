-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralStatus') THEN
        CREATE TYPE "ReferralStatus" AS ENUM ('PENDING_VERIFICATION', 'UNLOCKED_READY_TO_CLAIM', 'CLAIMED', 'REVOKED');
    END IF;
END$$;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "referral_code" VARCHAR(12);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "referred_by_id" UUID;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "referred_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "driver_referrals" (
    "id" UUID NOT NULL,
    "referrer_driver_id" UUID NOT NULL,
    "referee_driver_id" UUID NOT NULL,
    "reward_paise" INTEGER NOT NULL DEFAULT 50000,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "referee_verified_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "ledger_entry_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes & Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_referral_code_key" ON "drivers"("referral_code");
CREATE INDEX IF NOT EXISTS "drivers_referral_code_idx" ON "drivers"("referral_code");
CREATE INDEX IF NOT EXISTS "drivers_referred_by_id_idx" ON "drivers"("referred_by_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_referred_by_id_fkey'
    ) THEN
        ALTER TABLE "drivers" ADD CONSTRAINT "drivers_referred_by_id_fkey"
        FOREIGN KEY ("referred_by_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "driver_referrals_referee_driver_id_key" ON "driver_referrals"("referee_driver_id");
CREATE UNIQUE INDEX IF NOT EXISTS "driver_referrals_ledger_entry_id_key" ON "driver_referrals"("ledger_entry_id");
CREATE INDEX IF NOT EXISTS "driver_referrals_referrer_driver_id_status_idx" ON "driver_referrals"("referrer_driver_id", "status");
CREATE INDEX IF NOT EXISTS "driver_referrals_referee_driver_id_idx" ON "driver_referrals"("referee_driver_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_referrals_referrer_driver_id_fkey'
    ) THEN
        ALTER TABLE "driver_referrals" ADD CONSTRAINT "driver_referrals_referrer_driver_id_fkey"
        FOREIGN KEY ("referrer_driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_referrals_referee_driver_id_fkey'
    ) THEN
        ALTER TABLE "driver_referrals" ADD CONSTRAINT "driver_referrals_referee_driver_id_fkey"
        FOREIGN KEY ("referee_driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
