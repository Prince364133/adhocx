-- CreateTable
CREATE TABLE IF NOT EXISTS "corporate_ticket_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" VARCHAR(32) NOT NULL,
    "sender_name" VARCHAR(128),
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corporate_ticket_messages_ticket_id_created_at_idx" ON "corporate_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corporate_ticket_messages_sender_id_idx" ON "corporate_ticket_messages"("sender_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'corporate_ticket_messages_ticket_id_fkey'
    ) THEN
        ALTER TABLE "corporate_ticket_messages" ADD CONSTRAINT "corporate_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "corporate_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'corporate_ticket_messages_sender_id_fkey'
    ) THEN
        ALTER TABLE "corporate_ticket_messages" ADD CONSTRAINT "corporate_ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

