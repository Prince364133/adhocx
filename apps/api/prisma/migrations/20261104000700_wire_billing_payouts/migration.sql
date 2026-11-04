-- wire/billing-payouts: versioned rate-card terms, invoice pricing snapshot, per-driver payouts,
-- signed provider confirmations, invoice disputes and immutable credit notes.
-- Migration 20261104000700_wire_billing_payouts. Additive only: new columns have defaults or are
-- nullable, new tables/enums only. Hand-written; idempotent guards so a re-run is harmless.

-- ---------------------------------------------------------------------------
-- 1. Rate cards: version + terms + retirement audit
-- ---------------------------------------------------------------------------
ALTER TABLE "corporate_rate_cards"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "per_hour_paise" BIGINT,
  ADD COLUMN IF NOT EXISTS "minimum_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "no_show_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancellation_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "retired_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retired_by_user_id" UUID;

ALTER TABLE "corporate_driver_rate_cards"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "per_hour_paise" BIGINT,
  ADD COLUMN IF NOT EXISTS "minimum_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "no_show_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancellation_paise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "retired_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retired_by_user_id" UUID;

-- Existing rows all defaulted to version 1: number them per (tenant, category) / category in
-- effective order before the unique index is created.
UPDATE "corporate_rate_cards" rc
SET "version" = v.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tenant_id", "vehicle_category" ORDER BY "effective_from", "created_at", "id") AS rn
  FROM "corporate_rate_cards"
) v
WHERE rc."id" = v."id" AND rc."version" <> v.rn;

UPDATE "corporate_driver_rate_cards" rc
SET "version" = v.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "vehicle_category" ORDER BY "effective_from", "created_at", "id") AS rn
  FROM "corporate_driver_rate_cards"
) v
WHERE rc."id" = v."id" AND rc."version" <> v.rn;

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_rate_cards_tenant_id_vehicle_category_version_key"
  ON "corporate_rate_cards"("tenant_id", "vehicle_category", "version");
CREATE INDEX IF NOT EXISTS "corporate_rate_cards_tenant_id_vehicle_category_effective_from_idx"
  ON "corporate_rate_cards"("tenant_id", "vehicle_category", "effective_from");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_driver_rate_cards_vehicle_category_version_key"
  ON "corporate_driver_rate_cards"("vehicle_category", "version");
CREATE INDEX IF NOT EXISTS "corporate_driver_rate_cards_vehicle_category_effective_from_idx"
  ON "corporate_driver_rate_cards"("vehicle_category", "effective_from");

-- ---------------------------------------------------------------------------
-- 2. Invoice lines: pricing snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE "corporate_invoice_lines"
  ADD COLUMN IF NOT EXISTS "line_type" VARCHAR(16) NOT NULL DEFAULT 'TRIP',
  ADD COLUMN IF NOT EXISTS "rate_card_id" UUID,
  ADD COLUMN IF NOT EXISTS "rate_card_version" INTEGER,
  ADD COLUMN IF NOT EXISTS "no_show_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "no_show_paise" BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "corporate_invoice_lines_rate_card_id_idx" ON "corporate_invoice_lines"("rate_card_id");

-- ---------------------------------------------------------------------------
-- 3. Payout batches: provider submission
-- ---------------------------------------------------------------------------
ALTER TABLE "corporate_payout_batches"
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submitted_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "provider" VARCHAR(32);

-- ---------------------------------------------------------------------------
-- 4. Per-driver payouts
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "CorporatePayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "corporate_payouts" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "kind" VARCHAR(16) NOT NULL DEFAULT 'PAYOUT',
  "reversal_of_id" UUID,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "status" "CorporatePayoutStatus" NOT NULL DEFAULT 'PENDING',
  "gross_paise" BIGINT NOT NULL,
  "tds_paise" BIGINT NOT NULL,
  "net_paise" BIGINT NOT NULL,
  "earning_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "provider_payout_id" VARCHAR(128),
  "provider_reference" VARCHAR(128),
  "failure_reason" TEXT,
  "submitted_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "reversed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_payouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_payouts_kind_check" CHECK ("kind" IN ('PAYOUT', 'REVERSAL')),
  CONSTRAINT "corporate_payouts_reversal_shape_check" CHECK (
    ("kind" = 'PAYOUT' AND "reversal_of_id" IS NULL AND "net_paise" >= 0)
    OR ("kind" = 'REVERSAL' AND "reversal_of_id" IS NOT NULL AND "net_paise" <= 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payouts_idempotency_key_key" ON "corporate_payouts"("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payouts_reversal_of_id_key" ON "corporate_payouts"("reversal_of_id");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payouts_batch_id_driver_id_kind_key" ON "corporate_payouts"("batch_id", "driver_id", "kind");
CREATE INDEX IF NOT EXISTS "corporate_payouts_driver_id_status_idx" ON "corporate_payouts"("driver_id", "status");
CREATE INDEX IF NOT EXISTS "corporate_payouts_status_updated_at_idx" ON "corporate_payouts"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "corporate_payouts_provider_payout_id_idx" ON "corporate_payouts"("provider_payout_id");

-- ---------------------------------------------------------------------------
-- 5. Provider confirmations (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "corporate_payout_provider_events" (
  "id" UUID NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "event_id" VARCHAR(128) NOT NULL,
  "payout_id" UUID,
  "idempotency_key" VARCHAR(128),
  "provider_payout_id" VARCHAR(128),
  "status" VARCHAR(16) NOT NULL,
  "amount_paise" BIGINT,
  "provider_reference" VARCHAR(128),
  "outcome" VARCHAR(32) NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "corporate_payout_provider_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_payout_provider_events_provider_event_id_key"
  ON "corporate_payout_provider_events"("provider", "event_id");
CREATE INDEX IF NOT EXISTS "corporate_payout_provider_events_received_at_idx" ON "corporate_payout_provider_events"("received_at");
CREATE INDEX IF NOT EXISTS "corporate_payout_provider_events_payout_id_occurred_at_idx"
  ON "corporate_payout_provider_events"("payout_id", "occurred_at");

-- ---------------------------------------------------------------------------
-- 6. Invoice disputes and credit notes
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "CorporateInvoiceDisputeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "corporate_invoice_disputes" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "invoice_line_id" UUID,
  "raised_by_user_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "claimed_amount_paise" BIGINT NOT NULL,
  "status" "CorporateInvoiceDisputeStatus" NOT NULL DEFAULT 'OPEN',
  "approved_amount_paise" BIGINT,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMP(3),
  "resolution_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_invoice_disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_invoice_disputes_claimed_positive_check" CHECK ("claimed_amount_paise" > 0)
);

CREATE INDEX IF NOT EXISTS "corporate_invoice_disputes_tenant_id_created_at_idx" ON "corporate_invoice_disputes"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "corporate_invoice_disputes_invoice_id_idx" ON "corporate_invoice_disputes"("invoice_id");

CREATE TABLE IF NOT EXISTS "corporate_credit_notes" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "dispute_id" UUID NOT NULL,
  "credit_note_number" VARCHAR(80) NOT NULL,
  "subtotal_paise" BIGINT NOT NULL,
  "gst_paise" BIGINT NOT NULL,
  "total_paise" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "issued_by_user_id" UUID NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_credit_notes_amounts_check" CHECK ("subtotal_paise" > 0 AND "gst_paise" >= 0 AND "total_paise" = "subtotal_paise" + "gst_paise")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_credit_notes_dispute_id_key" ON "corporate_credit_notes"("dispute_id");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_credit_notes_credit_note_number_key" ON "corporate_credit_notes"("credit_note_number");
CREATE INDEX IF NOT EXISTS "corporate_credit_notes_tenant_id_issued_at_idx" ON "corporate_credit_notes"("tenant_id", "issued_at");
CREATE INDEX IF NOT EXISTS "corporate_credit_notes_invoice_id_idx" ON "corporate_credit_notes"("invoice_id");

-- ---------------------------------------------------------------------------
-- 7. Foreign keys
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_payouts_batch_id_fkey') THEN
    ALTER TABLE "corporate_payouts" ADD CONSTRAINT "corporate_payouts_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "corporate_payout_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_payouts_driver_id_fkey') THEN
    ALTER TABLE "corporate_payouts" ADD CONSTRAINT "corporate_payouts_driver_id_fkey"
      FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_payouts_reversal_of_id_fkey') THEN
    ALTER TABLE "corporate_payouts" ADD CONSTRAINT "corporate_payouts_reversal_of_id_fkey"
      FOREIGN KEY ("reversal_of_id") REFERENCES "corporate_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_invoice_disputes_tenant_id_fkey') THEN
    ALTER TABLE "corporate_invoice_disputes" ADD CONSTRAINT "corporate_invoice_disputes_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_invoice_disputes_invoice_id_fkey') THEN
    ALTER TABLE "corporate_invoice_disputes" ADD CONSTRAINT "corporate_invoice_disputes_invoice_id_fkey"
      FOREIGN KEY ("invoice_id") REFERENCES "corporate_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_invoice_disputes_invoice_line_id_fkey') THEN
    ALTER TABLE "corporate_invoice_disputes" ADD CONSTRAINT "corporate_invoice_disputes_invoice_line_id_fkey"
      FOREIGN KEY ("invoice_line_id") REFERENCES "corporate_invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_credit_notes_tenant_id_fkey') THEN
    ALTER TABLE "corporate_credit_notes" ADD CONSTRAINT "corporate_credit_notes_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_credit_notes_invoice_id_fkey') THEN
    ALTER TABLE "corporate_credit_notes" ADD CONSTRAINT "corporate_credit_notes_invoice_id_fkey"
      FOREIGN KEY ("invoice_id") REFERENCES "corporate_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corporate_credit_notes_dispute_id_fkey') THEN
    ALTER TABLE "corporate_credit_notes" ADD CONSTRAINT "corporate_credit_notes_dispute_id_fkey"
      FOREIGN KEY ("dispute_id") REFERENCES "corporate_invoice_disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Immutability guards (financial records are corrected additively, never edited/deleted)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION corporate_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: financial records are immutable', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS corporate_credit_notes_immutable ON "corporate_credit_notes";
CREATE TRIGGER corporate_credit_notes_immutable
  BEFORE UPDATE OR DELETE ON "corporate_credit_notes"
  FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();

DROP TRIGGER IF EXISTS corporate_payout_provider_events_immutable ON "corporate_payout_provider_events";
CREATE TRIGGER corporate_payout_provider_events_immutable
  BEFORE UPDATE OR DELETE ON "corporate_payout_provider_events"
  FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();

DROP TRIGGER IF EXISTS corporate_payouts_no_delete ON "corporate_payouts";
CREATE TRIGGER corporate_payouts_no_delete
  BEFORE DELETE ON "corporate_payouts"
  FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();
