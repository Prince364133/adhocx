-- DropIndex
DROP INDEX IF EXISTS "vehicles_registration_number_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicles_registration_number_idx" ON "vehicles"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_driver_id_registration_number_key" ON "vehicles"("driver_id", "registration_number");
