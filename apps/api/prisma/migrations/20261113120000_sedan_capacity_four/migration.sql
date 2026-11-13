-- Business rule (confirmed 2026-11-13): a corporate sedan seats 4 passengers, SUV 6.
-- Reverts 20261112110000_sedan_capacity_alignment (DEFAULT 3). Default only; existing
-- tenant policies keep the capacity each company chose.
ALTER TABLE "corporate_tenant_policies"
ALTER COLUMN "default_capacity" SET DEFAULT 4;
