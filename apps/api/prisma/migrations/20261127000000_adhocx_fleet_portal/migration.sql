-- CreateEnum
CREATE TYPE "FleetCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "FleetAdminRole" AS ENUM ('FLEET_OWNER', 'FLEET_MANAGER');

-- CreateEnum
CREATE TYPE "FleetAdminStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FleetPayoutStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'SETTLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FleetIncentiveType" AS ENUM ('TARGET_BASED', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "FleetIncentiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "FleetIncentiveEligibility" AS ENUM ('ALL', 'SELECTED');

-- CreateEnum
CREATE TYPE "FleetSupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FleetNotificationEventType" AS ENUM ('DRIVER_JOINED', 'DRIVER_FLEET_CODE_LOGIN', 'FLEET_CODE_CHANGED', 'DRIVER_VERIFICATION_CHANGED', 'SHIFT_ASSIGNMENT_EVENT', 'FLEET_ANNOUNCEMENT', 'SUPPORT_TICKET_REPLY', 'INCENTIVE_LIFECYCLE', 'INCENTIVE_APPROACHING', 'INCENTIVE_QUALIFIED');

-- CreateEnum
CREATE TYPE "FleetShiftStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "fleets" ADD COLUMN     "code_rotated_at" TIMESTAMP(3),
ADD COLUMN     "code_status" "FleetCodeStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "fleet_admin_users" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160),
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "FleetAdminRole" NOT NULL DEFAULT 'FLEET_OWNER',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "status" "FleetAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_payout_requests" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "reference_code" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "status" "FleetPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "rejection_reason" TEXT,
    "notes" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_shortfall_records" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "minimum_trips_required" INTEGER NOT NULL,
    "actual_trips_offered" INTEGER NOT NULL,
    "shortfall_trips" INTEGER NOT NULL,
    "compensation_amount" DECIMAL(12,2),
    "status" VARCHAR(32) NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_shortfall_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_incentives" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "FleetIncentiveType" NOT NULL,
    "target_trips" INTEGER,
    "required_duration_minutes" INTEGER,
    "time_window_start" VARCHAR(16),
    "time_window_end" VARCHAR(16),
    "eligibility_scope" "FleetIncentiveEligibility" NOT NULL DEFAULT 'ALL',
    "eligible_driver_ids" JSONB NOT NULL DEFAULT '[]',
    "reward_amount" DECIMAL(12,2) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "FleetIncentiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_incentive_progresses" (
    "id" UUID NOT NULL,
    "incentive_id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "active_minutes" INTEGER NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "qualified_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_incentive_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_support_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" VARCHAR(40) NOT NULL,
    "fleet_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FleetSupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_support_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_role" VARCHAR(40) NOT NULL,
    "sender_name" VARCHAR(120),
    "body" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_notifications" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "event_type" "FleetNotificationEventType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" VARCHAR(60),
    "entity_id" UUID,
    "action_url" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_shifts" (
    "id" UUID NOT NULL,
    "fleet_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "shift_start" TIMESTAMP(3) NOT NULL,
    "shift_end" TIMESTAMP(3) NOT NULL,
    "status" "FleetShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fleet_admin_users_email_key" ON "fleet_admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_admin_users_phone_key" ON "fleet_admin_users"("phone");

-- CreateIndex
CREATE INDEX "fleet_admin_users_fleet_id_idx" ON "fleet_admin_users"("fleet_id");

-- CreateIndex
CREATE INDEX "fleet_admin_users_status_idx" ON "fleet_admin_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_payout_requests_reference_code_key" ON "fleet_payout_requests"("reference_code");

-- CreateIndex
CREATE INDEX "fleet_payout_requests_fleet_id_status_idx" ON "fleet_payout_requests"("fleet_id", "status");

-- CreateIndex
CREATE INDEX "fleet_payout_requests_created_at_idx" ON "fleet_payout_requests"("created_at");

-- CreateIndex
CREATE INDEX "fleet_shortfall_records_fleet_id_idx" ON "fleet_shortfall_records"("fleet_id");

-- CreateIndex
CREATE INDEX "fleet_incentives_fleet_id_status_idx" ON "fleet_incentives"("fleet_id", "status");

-- CreateIndex
CREATE INDEX "fleet_incentive_progresses_fleet_id_driver_id_idx" ON "fleet_incentive_progresses"("fleet_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_incentive_progresses_incentive_id_driver_id_key" ON "fleet_incentive_progresses"("incentive_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_support_tickets_ticket_number_key" ON "fleet_support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "fleet_support_tickets_fleet_id_status_idx" ON "fleet_support_tickets"("fleet_id", "status");

-- CreateIndex
CREATE INDEX "fleet_support_messages_ticket_id_idx" ON "fleet_support_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "fleet_notifications_fleet_id_is_read_idx" ON "fleet_notifications"("fleet_id", "is_read");

-- CreateIndex
CREATE INDEX "fleet_notifications_created_at_idx" ON "fleet_notifications"("created_at");

-- CreateIndex
CREATE INDEX "fleet_shifts_fleet_id_shift_start_idx" ON "fleet_shifts"("fleet_id", "shift_start");

-- CreateIndex
CREATE INDEX "fleet_shifts_driver_id_shift_start_idx" ON "fleet_shifts"("driver_id", "shift_start");

-- AddForeignKey
ALTER TABLE "fleet_admin_users" ADD CONSTRAINT "fleet_admin_users_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_payout_requests" ADD CONSTRAINT "fleet_payout_requests_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_payout_requests" ADD CONSTRAINT "fleet_payout_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "fleet_admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shortfall_records" ADD CONSTRAINT "fleet_shortfall_records_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incentives" ADD CONSTRAINT "fleet_incentives_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incentive_progresses" ADD CONSTRAINT "fleet_incentive_progresses_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "fleet_incentives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incentive_progresses" ADD CONSTRAINT "fleet_incentive_progresses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_support_tickets" ADD CONSTRAINT "fleet_support_tickets_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_support_tickets" ADD CONSTRAINT "fleet_support_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "fleet_admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_support_messages" ADD CONSTRAINT "fleet_support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "fleet_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_notifications" ADD CONSTRAINT "fleet_notifications_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shifts" ADD CONSTRAINT "fleet_shifts_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "fleets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shifts" ADD CONSTRAINT "fleet_shifts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

