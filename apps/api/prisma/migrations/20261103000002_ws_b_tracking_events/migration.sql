-- WS-B: GPS tracking history, trip events and route assignment history (docs/corporate-ets/19 §1 WS-B).
-- Purely additive: three new tables, no change to existing tables or data.
--
-- ---------------------------------------------------------------------------------------------
-- corporate_vehicle_positions: time-partitioned GPS history
-- ---------------------------------------------------------------------------------------------
-- Sizing (doc 19 §0): 10k cabs x 1 fix / 15 s ~ 670 rows/s ~ 58 M rows/day. The table is a
-- PARTITION BY RANGE (received_at) parent with one partition per UTC day, so retention is a
-- cheap DROP TABLE of a whole partition instead of a DELETE.
--
-- How this works with Prisma:
--  * Prisma only knows the parent table ("CorporateVehiclePosition"). Inserts (createMany) and
--    reads go to the parent; Postgres routes each row to its day partition.
--  * Postgres requires the partition key in every primary key / unique constraint, so the PK is
--    (id, received_at) and the de-duplication key is (route_id, recorded_at, driver_id, received_at).
--    received_at is fixed once at ingest and travels inside the Redis Stream entry, so a stream
--    re-delivery produces the identical key and `createMany({ skipDuplicates: true })`
--    (INSERT ... ON CONFLICT DO NOTHING) drops it. Device re-uploads of the same fix are dropped
--    earlier, at ingest (Redis SET NX on route + driver + recorded_at).
--  * Invariant: received_at >= recorded_at (ingest clamps future device clocks). Playback queries
--    therefore add `received_at >= :from` so Postgres prunes partitions older than the window.
--  * Partitions are created here for today .. today+3 (UTC) and afterwards by
--    CorporateGpsPartitionMaintenance (hourly, one instance via Redis lock): it creates the next
--    3 days and drops partitions older than CORPORATE_GPS_RETENTION_DAYS (default 90).
--    There is deliberately no DEFAULT partition: rows in a default partition would block
--    creating the matching day partition later. If a partition is missing the writer leaves the
--    batch un-acked in the stream, triggers maintenance and the batch is re-delivered.
--  * `prisma migrate diff` / `db pull` may list the child tables (corporate_vehicle_positions_pYYYYMMDD)
--    as unknown tables. They are managed outside Prisma on purpose; do not add them to schema.prisma.
--  * No foreign keys: keeps the hot insert path cheap and history survives route deletion.

-- CreateTable (partitioned parent)
CREATE TABLE "corporate_vehicle_positions" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed_kph" REAL,
    "heading" REAL,
    "accuracy_m" REAL,
    "battery_pct" SMALLINT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_vehicle_positions_pkey" PRIMARY KEY ("id", "received_at")
) PARTITION BY RANGE ("received_at");

-- CreateIndex (propagated to every partition)
CREATE UNIQUE INDEX "corporate_vehicle_positions_dedupe_key"
    ON "corporate_vehicle_positions"("route_id", "recorded_at", "driver_id", "received_at");

-- CreateIndex
CREATE INDEX "corporate_vehicle_positions_driver_id_recorded_at_idx"
    ON "corporate_vehicle_positions"("driver_id", "recorded_at");

-- Initial daily partitions: today .. today + 3 (UTC days; columns store UTC wall-clock).
DO $$
DECLARE
    d DATE;
    base DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
    FOR i IN 0..3 LOOP
        d := base + i;
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "corporate_vehicle_positions" FOR VALUES FROM (%L) TO (%L)',
            'corporate_vehicle_positions_p' || to_char(d, 'YYYYMMDD'),
            d::timestamp,
            (d + 1)::timestamp
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- corporate_trip_events: every trip lifecycle transition (timeline)
-- ---------------------------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "corporate_trip_events" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "stop_id" UUID,
    "type" VARCHAR(48) NOT NULL,
    "actor_id" VARCHAR(64),
    "actor_role" VARCHAR(32),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporate_trip_events_route_id_at_idx" ON "corporate_trip_events"("route_id", "at");

-- CreateIndex
CREATE INDEX "corporate_trip_events_tenant_id_at_idx" ON "corporate_trip_events"("tenant_id", "at");

-- ---------------------------------------------------------------------------------------------
-- corporate_route_assignment_events: assignment / reassignment / replacement history
-- ---------------------------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "corporate_route_assignment_events" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "from_driver_id" UUID,
    "to_driver_id" UUID,
    "reason" VARCHAR(64) NOT NULL,
    "actor_id" VARCHAR(64),
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_route_assignment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporate_route_assignment_events_route_id_at_idx" ON "corporate_route_assignment_events"("route_id", "at");

-- CreateIndex
CREATE INDEX "corporate_route_assignment_events_tenant_id_at_idx" ON "corporate_route_assignment_events"("tenant_id", "at");
