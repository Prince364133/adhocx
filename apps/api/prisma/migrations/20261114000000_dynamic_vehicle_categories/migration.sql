ALTER TABLE "corporate_rate_cards"
  ALTER COLUMN "vehicle_category" DROP DEFAULT;

ALTER TABLE "corporate_driver_rate_cards"
  ALTER COLUMN "vehicle_category" DROP DEFAULT;

ALTER TABLE "corporate_tenant_policies"
  ALTER COLUMN "default_vehicle_category" DROP DEFAULT,
  ALTER COLUMN "default_capacity" DROP DEFAULT;

DROP TYPE IF EXISTS "VehicleType";
