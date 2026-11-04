-- WS-E: Dual Rate Cards & Driver Payout Batch FSM
-- Migration 20261104000300_ws_e_rate_cards_payout_batches

DO $$ BEGIN
  CREATE TYPE "CorporatePayoutBatchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "corporate_payout_batches" (
  "id" UUID NOT NULL,
  "batch_number" VARCHAR(32) NOT NULL,
  "idempotency_key" VARCHAR(64) NOT NULL,
  "status" "CorporatePayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "total_drivers" INTEGER NOT NULL,
  "total_routes" INTEGER NOT NULL,
  "gross_paise" BIGINT NOT NULL,
  "tds_paise" BIGINT NOT NULL,
  "net_payout_paise" BIGINT NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "disbursement_reference" VARCHAR(64),
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_payout_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payout_batches_batch_number_key" ON "corporate_payout_batches"("batch_number");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payout_batches_idempotency_key_key" ON "corporate_payout_batches"("idempotency_key");
CREATE INDEX IF NOT EXISTS "corporate_payout_batches_status_idx" ON "corporate_payout_batches"("status");
CREATE INDEX IF NOT EXISTS "corporate_payout_batches_created_at_idx" ON "corporate_payout_batches"("created_at");

CREATE TABLE IF NOT EXISTS "corporate_rate_cards" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "vehicle_category" VARCHAR(16) NOT NULL DEFAULT 'SEDAN',
  "base_fare_paise" BIGINT NOT NULL,
  "base_distance_meters" INTEGER NOT NULL DEFAULT 10000,
  "per_km_paise" BIGINT NOT NULL,
  "per_extra_stop_paise" BIGINT NOT NULL DEFAULT 0,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_rate_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "corporate_rate_cards_tenant_id_vehicle_category_is_active_idx" ON "corporate_rate_cards"("tenant_id", "vehicle_category", "is_active");

CREATE TABLE IF NOT EXISTS "corporate_driver_rate_cards" (
  "id" UUID NOT NULL,
  "vehicle_category" VARCHAR(16) NOT NULL DEFAULT 'SEDAN',
  "base_payout_paise" BIGINT NOT NULL,
  "base_distance_meters" INTEGER NOT NULL DEFAULT 10000,
  "per_km_paise" BIGINT NOT NULL,
  "toll_reimbursement_paise" BIGINT NOT NULL DEFAULT 0,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_driver_rate_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "corporate_driver_rate_cards_vehicle_category_is_active_idx" ON "corporate_driver_rate_cards"("vehicle_category", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_rate_cards_tenant_id_fkey'
  ) THEN
    ALTER TABLE "corporate_rate_cards"
      ADD CONSTRAINT "corporate_rate_cards_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_driver_earnings_payout_batch_id_fkey'
  ) THEN
    ALTER TABLE "corporate_driver_earnings"
      ADD CONSTRAINT "corporate_driver_earnings_payout_batch_id_fkey"
      FOREIGN KEY ("payout_batch_id") REFERENCES "corporate_payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
