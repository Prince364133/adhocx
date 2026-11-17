-- Preserve the empty pre-partitioned GPS table under an archive name, then install
-- the partitioned parent expected by the tracking maintenance job.
DO $$
DECLARE
    table_kind "char";
    row_count BIGINT;
BEGIN
    SELECT c.relkind
      INTO table_kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = 'corporate_vehicle_positions';

    IF table_kind = 'r' THEN
        IF to_regclass(format('%I.%I', current_schema(), 'corp_vehicle_positions_legacy_20261116')) IS NOT NULL THEN
            RAISE EXCEPTION 'GPS archive table already exists; refusing to rename corporate_vehicle_positions';
        END IF;

        LOCK TABLE "corporate_vehicle_positions" IN ACCESS EXCLUSIVE MODE;
        SELECT count(*) INTO row_count FROM "corporate_vehicle_positions";
        IF row_count <> 0 THEN
            RAISE EXCEPTION 'corporate_vehicle_positions contains % rows; refusing to archive it automatically', row_count;
        END IF;

        ALTER TABLE "corporate_vehicle_positions" RENAME TO "corp_vehicle_positions_legacy_20261116";
        ALTER TABLE "corp_vehicle_positions_legacy_20261116"
            RENAME CONSTRAINT "corporate_vehicle_positions_pkey" TO "cvp_legacy_20261116_pkey";
        ALTER INDEX "corporate_vehicle_positions_dedupe_key" RENAME TO "cvp_legacy_20261116_dedupe_key";
        ALTER INDEX "corporate_vehicle_positions_driver_id_recorded_at_idx" RENAME TO "cvp_legacy_20261116_driver_idx";

        IF to_regclass(format('%I.%I', current_schema(), 'corporate_vehicle_positions_id_seq')) IS NOT NULL THEN
            IF to_regclass(format('%I.%I', current_schema(), 'cvp_legacy_20261116_id_seq')) IS NOT NULL THEN
                RAISE EXCEPTION 'GPS archive sequence already exists; refusing to rename corporate_vehicle_positions_id_seq';
            END IF;
            ALTER SEQUENCE "corporate_vehicle_positions_id_seq" RENAME TO "cvp_legacy_20261116_id_seq";
        END IF;
    ELSIF table_kind IS NOT NULL AND table_kind <> 'p' THEN
        RAISE EXCEPTION 'corporate_vehicle_positions has unsupported relation kind %', table_kind;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "corporate_vehicle_positions" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_vehicle_positions_dedupe_key"
    ON "corporate_vehicle_positions"("route_id", "recorded_at", "driver_id", "received_at");
CREATE INDEX IF NOT EXISTS "corporate_vehicle_positions_driver_id_recorded_at_idx"
    ON "corporate_vehicle_positions"("driver_id", "recorded_at");

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

CREATE OR REPLACE FUNCTION corporate_reject_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% on % is not allowed: financial records are immutable', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS corporate_credit_notes_immutable ON "corporate_credit_notes";
CREATE TRIGGER corporate_credit_notes_immutable
    BEFORE UPDATE OR DELETE ON "corporate_credit_notes"
    FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();

DROP TRIGGER IF EXISTS corporate_payout_provider_events_immutable ON "corporate_payout_provider_events";
CREATE TRIGGER corporate_payout_provider_events_immutable
    BEFORE UPDATE OR DELETE ON "corporate_payout_provider_events"
    FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();

DROP TRIGGER IF EXISTS corporate_payouts_no_delete ON "corporate_payouts";
CREATE TRIGGER corporate_payouts_no_delete
    BEFORE DELETE ON "corporate_payouts"
    FOR EACH ROW EXECUTE FUNCTION corporate_reject_mutation();
