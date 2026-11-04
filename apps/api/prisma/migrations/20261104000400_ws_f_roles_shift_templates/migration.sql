-- WS-F: tenancy roles, office scope, departments / cost centers, versioned tenant policy,
-- shift templates, holidays, roster versioning (DRAFT -> APPROVED -> PUBLISHED) and roster entries.
-- Purely additive: one new enum + one enum value, nullable / defaulted columns, new tables, indexes, FKs.
-- No table rewrite, no data change. Generated with `prisma migrate diff` (schema -> schema) and reviewed.
-- NOTE: `ALTER TYPE ... ADD VALUE` needs PostgreSQL >= 12 to run inside the migration transaction.

-- CreateEnum
CREATE TYPE "CorporateUserRole" AS ENUM ('CORP_SUPER_ADMIN', 'HR', 'TRANSPORT', 'FINANCE', 'SAFETY', 'READ_ONLY');

-- AlterEnum
ALTER TYPE "CorporateRosterStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "corporate_office_ids" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN     "corporate_role" "CorporateUserRole";

-- AlterTable
ALTER TABLE "corporate_employees" ADD COLUMN     "cost_center_id" UUID,
ADD COLUMN     "department_id" UUID;

-- AlterTable
ALTER TABLE "corporate_rosters" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "published_by_id" UUID,
ADD COLUMN     "uploaded_by_id" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "corporate_departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_cost_centers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_tenant_policies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "cancel_cutoff_hours" INTEGER NOT NULL DEFAULT 9,
    "max_ride_minutes" INTEGER NOT NULL DEFAULT 120,
    "default_vehicle_category" VARCHAR(32) NOT NULL DEFAULT 'SEDAN',
    "default_capacity" INTEGER NOT NULL DEFAULT 4,
    "escalation_lead_minutes" INTEGER NOT NULL DEFAULT 30,
    "office_arrival_buffer_minutes" INTEGER NOT NULL DEFAULT 10,
    "night_shift_start" VARCHAR(5) NOT NULL DEFAULT '20:00',
    "night_shift_end" VARCHAR(5) NOT NULL DEFAULT '06:00',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_tenant_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_shift_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "login_time" VARCHAR(5) NOT NULL,
    "logout_time" VARCHAR(5) NOT NULL,
    "weekdays" INTEGER[],
    "is_overnight" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_holidays" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "office_id" UUID,
    "holiday_date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_roster_entries" (
    "id" UUID NOT NULL,
    "roster_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "shift_time" VARCHAR(8) NOT NULL,
    "direction" "CorporateTransportDirection" NOT NULL,
    "pickup_lat" DECIMAL(10,7) NOT NULL,
    "pickup_lng" DECIMAL(10,7) NOT NULL,
    "dropoff_lat" DECIMAL(10,7) NOT NULL,
    "dropoff_lng" DECIMAL(10,7) NOT NULL,
    "h3_pickup_index" VARCHAR(15) NOT NULL,
    "idempotency_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporate_departments_tenant_id_idx" ON "corporate_departments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_departments_tenant_id_code_key" ON "corporate_departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "corporate_cost_centers_tenant_id_idx" ON "corporate_cost_centers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_cost_centers_tenant_id_code_key" ON "corporate_cost_centers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "corporate_tenant_policies_tenant_id_effective_from_idx" ON "corporate_tenant_policies"("tenant_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_tenant_policies_tenant_id_version_key" ON "corporate_tenant_policies"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "corporate_shift_templates_tenant_id_office_id_idx" ON "corporate_shift_templates"("tenant_id", "office_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_shift_templates_tenant_id_office_id_name_key" ON "corporate_shift_templates"("tenant_id", "office_id", "name");

-- CreateIndex
CREATE INDEX "corporate_holidays_tenant_id_holiday_date_idx" ON "corporate_holidays"("tenant_id", "holiday_date");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_holidays_tenant_id_office_id_holiday_date_key" ON "corporate_holidays"("tenant_id", "office_id", "holiday_date");

-- Tenant-wide holidays (office_id IS NULL) are not covered by the index above (NULLs are distinct).
CREATE UNIQUE INDEX "corporate_holidays_tenant_wide_date_key" ON "corporate_holidays"("tenant_id", "holiday_date") WHERE "office_id" IS NULL;

-- CreateIndex
CREATE INDEX "corporate_roster_entries_roster_id_idx" ON "corporate_roster_entries"("roster_id");

-- CreateIndex
CREATE INDEX "corporate_roster_entries_tenant_id_scheduled_date_idx" ON "corporate_roster_entries"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_roster_entries_roster_id_idempotency_hash_key" ON "corporate_roster_entries"("roster_id", "idempotency_hash");

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "corporate_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "corporate_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_departments" ADD CONSTRAINT "corporate_departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_cost_centers" ADD CONSTRAINT "corporate_cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_tenant_policies" ADD CONSTRAINT "corporate_tenant_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_shift_templates" ADD CONSTRAINT "corporate_shift_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_shift_templates" ADD CONSTRAINT "corporate_shift_templates_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_holidays" ADD CONSTRAINT "corporate_holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_holidays" ADD CONSTRAINT "corporate_holidays_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_roster_entries" ADD CONSTRAINT "corporate_roster_entries_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "corporate_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_roster_entries" ADD CONSTRAINT "corporate_roster_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing corporate users need no backfill: a NULL corporate_role is mapped in code
-- (CORPORATE_ADMIN -> CORP_SUPER_ADMIN, CORPORATE_MANAGER -> TRANSPORT); an empty office list means all offices.
