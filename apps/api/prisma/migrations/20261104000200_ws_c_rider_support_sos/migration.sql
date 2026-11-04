-- WS-C: Rider Self-Service, SOS 5-Stage FSM and Support Tickets
-- Migration 20261104000200_ws_c_rider_support_sos

-- 1. Upgrade CorporateSosStatus enum with NEW, INVESTIGATING, ESCALATED
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'INVESTIGATING';
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

-- 2. Upgrade CorporateSosAlert table with FSM and auto-escalation audit columns
ALTER TABLE "corporate_sos_alerts"
  ADD COLUMN IF NOT EXISTS "tenant_id" UUID,
  ADD COLUMN IF NOT EXISTS "acknowledged_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "auto_escalated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "assigned_to_admin_id" UUID,
  ADD COLUMN IF NOT EXISTS "assigned_admin_name" VARCHAR(128);

ALTER TABLE "corporate_sos_alerts" ALTER COLUMN "status" SET DEFAULT 'NEW';

CREATE INDEX IF NOT EXISTS "corporate_sos_alerts_tenant_id_idx" ON "corporate_sos_alerts"("tenant_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_sos_alerts_tenant_id_fkey'
  ) THEN
    ALTER TABLE "corporate_sos_alerts"
      ADD CONSTRAINT "corporate_sos_alerts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Ticket category, priority and status enums
DO $$ BEGIN
  CREATE TYPE "CorporateTicketCategory" AS ENUM (
    'CAB_DELAY', 'DRIVER_BEHAVIOR', 'ROUTE_ISSUE', 'BILLING', 'LOST_ITEM', 'VEHICLE_CONDITION', 'SAFETY_CONCERN', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CorporateTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CorporateTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Create corporate_support_tickets table
CREATE TABLE IF NOT EXISTS "corporate_support_tickets" (
  "id" UUID NOT NULL,
  "ticket_number" VARCHAR(32) NOT NULL,
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "route_id" UUID,
  "stop_id" UUID,
  "category" "CorporateTicketCategory" NOT NULL DEFAULT 'OTHER',
  "priority" "CorporateTicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "CorporateTicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "admin_notes" TEXT,
  "resolution_notes" TEXT,
  "assigned_to_user_id" UUID,
  "sla_minutes" INTEGER NOT NULL DEFAULT 240,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_support_tickets_ticket_number_key" ON "corporate_support_tickets"("ticket_number");
CREATE INDEX IF NOT EXISTS "corporate_support_tickets_tenant_id_status_idx" ON "corporate_support_tickets"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "corporate_support_tickets_employee_id_idx" ON "corporate_support_tickets"("employee_id");
CREATE INDEX IF NOT EXISTS "corporate_support_tickets_status_priority_idx" ON "corporate_support_tickets"("status", "priority");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_support_tickets_tenant_id_fkey'
  ) THEN
    ALTER TABLE "corporate_support_tickets"
      ADD CONSTRAINT "corporate_support_tickets_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_support_tickets_employee_id_fkey'
  ) THEN
    ALTER TABLE "corporate_support_tickets"
      ADD CONSTRAINT "corporate_support_tickets_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Create corporate_trip_feedback table
CREATE TABLE IF NOT EXISTS "corporate_trip_feedback" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "route_id" UUID NOT NULL,
  "stop_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_trip_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_trip_feedback_stop_id_key" ON "corporate_trip_feedback"("stop_id");
CREATE INDEX IF NOT EXISTS "corporate_trip_feedback_tenant_id_idx" ON "corporate_trip_feedback"("tenant_id");
CREATE INDEX IF NOT EXISTS "corporate_trip_feedback_employee_id_idx" ON "corporate_trip_feedback"("employee_id");
CREATE INDEX IF NOT EXISTS "corporate_trip_feedback_route_id_idx" ON "corporate_trip_feedback"("route_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_trip_feedback_tenant_id_fkey'
  ) THEN
    ALTER TABLE "corporate_trip_feedback"
      ADD CONSTRAINT "corporate_trip_feedback_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_trip_feedback_employee_id_fkey'
  ) THEN
    ALTER TABLE "corporate_trip_feedback"
      ADD CONSTRAINT "corporate_trip_feedback_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'corporate_trip_feedback_stop_id_fkey'
  ) THEN
    ALTER TABLE "corporate_trip_feedback"
      ADD CONSTRAINT "corporate_trip_feedback_stop_id_fkey"
      FOREIGN KEY ("stop_id") REFERENCES "corporate_route_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
