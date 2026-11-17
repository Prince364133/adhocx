-- Keep the preserved legacy table outside the Prisma-managed public schema.
DO $$
BEGIN
    IF to_regclass('public.corp_vehicle_positions_legacy_20261116') IS NOT NULL THEN
        CREATE SCHEMA IF NOT EXISTS adhocx_legacy_archive;
        ALTER TABLE public.corp_vehicle_positions_legacy_20261116
            SET SCHEMA adhocx_legacy_archive;
    END IF;
END $$;
