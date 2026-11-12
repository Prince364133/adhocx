ALTER TABLE "corporate_tenants"
  ADD COLUMN "cin" VARCHAR(21),
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "registered_address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pin_code" VARCHAR(12),
  ADD COLUMN "country" TEXT,
  ADD COLUMN "primary_contact_name" TEXT,
  ADD COLUMN "primary_contact_email" TEXT,
  ADD COLUMN "primary_contact_phone" VARCHAR(32),
  ADD COLUMN "billing_address" TEXT,
  ADD COLUMN "billing_same_as_registered" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "corporate_offices"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pin_code" VARCHAR(12),
  ADD COLUMN "country" TEXT,
  ADD COLUMN "contact_name" TEXT,
  ADD COLUMN "contact_email" TEXT,
  ADD COLUMN "contact_phone" VARCHAR(32),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "corporate_departments"
  ADD COLUMN "department_head" TEXT,
  ADD COLUMN "office_id" UUID,
  ADD COLUMN "description" TEXT;

ALTER TABLE "corporate_departments"
  ADD CONSTRAINT "corporate_departments_office_id_fkey"
  FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "corporate_transport_zones" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "office_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "service_area" TEXT NOT NULL,
  "pickup_locations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "drop_locations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_transport_zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "corporate_transport_zones_tenant_id_code_key"
  ON "corporate_transport_zones"("tenant_id", "code");
CREATE INDEX "corporate_transport_zones_tenant_id_office_id_idx"
  ON "corporate_transport_zones"("tenant_id", "office_id");

ALTER TABLE "corporate_transport_zones"
  ADD CONSTRAINT "corporate_transport_zones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corporate_transport_zones"
  ADD CONSTRAINT "corporate_transport_zones_office_id_fkey"
  FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
