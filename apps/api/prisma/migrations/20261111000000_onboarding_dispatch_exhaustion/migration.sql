-- Phase 0 Migration: Onboarding Policy Controls, Stop Snapshots, and 30m Dispatch Exhaustion Tracking
-- Additive only (safe on existing schemas).

ALTER TABLE "corporate_tenant_policies"
  ADD COLUMN IF NOT EXISTS "stop_dwell_minutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "approach_lead_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "dispatch_window_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "dispatch_retry_interval_minutes" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "search_radius_km" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "corporate_routes"
  ADD COLUMN IF NOT EXISTS "dispatch_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dispatch_window_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_dispatch_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatch_failure_reason" VARCHAR(500);

ALTER TABLE "corporate_route_stops"
  ADD COLUMN IF NOT EXISTS "address_text" TEXT,
  ADD COLUMN IF NOT EXISTS "employee_name" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "employee_phone" VARCHAR(32);

CREATE INDEX IF NOT EXISTS "corporate_routes_dispatch_status_idx"
  ON "corporate_routes"("dispatch_status");
