-- Hot-path indexes found by the 5,000-driver load test (2026-11-10).
-- trips had no index on driver_id: every driver poll (GET /trips, GET /offers) scanned the whole
-- table (359k sequential scans / 63.9M rows read in one 7-minute run), so latency grew with trip
-- history. On a large production table prefer running these by hand with CREATE INDEX CONCURRENTLY
-- before deploying (IF NOT EXISTS makes this migration a no-op afterwards).

CREATE INDEX IF NOT EXISTS "trips_driver_id_status_idx" ON "trips" ("driver_id", "status");

CREATE INDEX IF NOT EXISTS "offers_driver_id_status_expires_at_idx" ON "offers" ("driver_id", "status", "expires_at");

CREATE INDEX IF NOT EXISTS "drivers_dispatch_fallback_idx"
  ON "drivers" ("availability_status", "verification_status", "last_location_at");

CREATE INDEX IF NOT EXISTS "vehicles_driver_id_idx" ON "vehicles" ("driver_id");
