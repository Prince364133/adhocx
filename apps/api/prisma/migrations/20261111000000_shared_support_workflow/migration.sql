ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'TECHNICAL_ISSUE';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'EMPLOYEE_MANAGEMENT';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'ROUTE_MANAGEMENT';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'TRANSPORT_OPERATIONS';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'BILLING_PAYMENTS';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'ACCOUNT_ACCESS';
ALTER TYPE "CorporateTicketCategory" ADD VALUE IF NOT EXISTS 'GENERAL_SUPPORT';

ALTER TYPE "CorporateTicketStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "CorporateTicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_CORPORATE';
ALTER TYPE "CorporateTicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';

DO $$ BEGIN
  CREATE TYPE "CorporateTicketCommentVisibility" AS ENUM ('PUBLIC', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "corporate_support_tickets"
  ADD COLUMN IF NOT EXISTS "raised_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "assigned_team" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "corporate_support_tickets_assigned_team_status_idx"
  ON "corporate_support_tickets"("assigned_team", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_support_tickets_idempotency_key_key"
  ON "corporate_support_tickets"("idempotency_key");

CREATE TABLE IF NOT EXISTS "corporate_support_ticket_attachments" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(100) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "storage_reference" TEXT NOT NULL,
  "uploaded_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_support_ticket_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_support_ticket_attachments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "corporate_support_tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "corporate_support_ticket_attachments_ticket_id_created_at_idx"
  ON "corporate_support_ticket_attachments"("ticket_id", "created_at");

CREATE TABLE IF NOT EXISTS "corporate_support_ticket_comments" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "visibility" "CorporateTicketCommentVisibility" NOT NULL DEFAULT 'PUBLIC',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_support_ticket_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_support_ticket_comments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "corporate_support_tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "corporate_support_ticket_comments_ticket_id_created_at_idx"
  ON "corporate_support_ticket_comments"("ticket_id", "created_at");

CREATE TABLE IF NOT EXISTS "corporate_support_ticket_activities" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "performed_by" UUID NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "previous_value" VARCHAR(255),
  "new_value" VARCHAR(255),
  "description" VARCHAR(1000) NOT NULL,
  "visibility" "CorporateTicketCommentVisibility" NOT NULL DEFAULT 'PUBLIC',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_support_ticket_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_support_ticket_activities_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "corporate_support_tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "corporate_support_ticket_activities_ticket_id_created_at_idx"
  ON "corporate_support_ticket_activities"("ticket_id", "created_at");
