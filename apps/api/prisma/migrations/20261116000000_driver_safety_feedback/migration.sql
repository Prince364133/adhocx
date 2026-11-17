ALTER TABLE "corporate_trip_feedback"
  ADD COLUMN "driver_id" UUID,
  ADD COLUMN "felt_safe" BOOLEAN;

CREATE INDEX "corporate_trip_feedback_driver_id_idx"
  ON "corporate_trip_feedback"("driver_id");

ALTER TABLE "corporate_trip_feedback"
  ADD CONSTRAINT "corporate_trip_feedback_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
