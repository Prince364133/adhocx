-- wire/dispatch-ops: driver earnings are voided on manual reassign instead of being deleted.
-- Migration 20261104000500_wire_dispatch_ops (additive only; hand-written).
-- NOTE: `ALTER TYPE ... ADD VALUE` needs PostgreSQL >= 12 to run inside the migration transaction.

ALTER TYPE "CorporateDriverEarningStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

ALTER TABLE "corporate_driver_earnings"
  ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "void_reason" VARCHAR(500);
