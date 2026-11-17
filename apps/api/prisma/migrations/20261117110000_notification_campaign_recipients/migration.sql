ALTER TABLE "notification_campaigns"
ADD COLUMN "recipient_tracking_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "notification_campaign_recipients" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID,
    "recipient_name" TEXT,
    "recipient_phone" TEXT,
    "recipient_role" TEXT,
    "recipient_email" TEXT,
    "recipient_profile" JSONB,
    "device_details" JSONB,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "device_count" INTEGER NOT NULL DEFAULT 0,
    "provider_accepted_count" INTEGER NOT NULL DEFAULT 0,
    "provider_failed_count" INTEGER NOT NULL DEFAULT 0,
    "provider_message_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attempted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_campaign_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_campaign_recipients_status_check"
      CHECK ("status" IN ('PENDING', 'DELIVERED', 'FAILED')),
    CONSTRAINT "campaign_recipients_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_recipients_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notification_campaign_recipients_campaign_id_user_id_key"
ON "notification_campaign_recipients"("campaign_id", "user_id");

CREATE INDEX "notification_campaign_recipients_campaign_id_status_idx"
ON "notification_campaign_recipients"("campaign_id", "status");

CREATE INDEX "notification_campaign_recipients_user_id_idx"
ON "notification_campaign_recipients"("user_id");
