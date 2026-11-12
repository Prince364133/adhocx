ALTER TABLE "corporate_tenants"
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "registered_address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pin_code" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "primary_contact_name" TEXT,
  ADD COLUMN "primary_contact_email" TEXT,
  ADD COLUMN "primary_contact_phone" TEXT,
  ADD COLUMN "cin" VARCHAR(21),
  ADD COLUMN "registered_business_address" TEXT,
  ADD COLUMN "billing_address" TEXT,
  ADD COLUMN "billing_same_as_registered" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "corporate_offices"
  ADD COLUMN "city" TEXT;
