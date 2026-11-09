-- ============================================================================
-- AdhocX Data Analyst & Metabase Sandboxed Read-Only Role
-- Purpose: Grants complete SELECT permissions across all corporate, trip, and
--          fleet tables while strictly forbidding DROP, DELETE, UPDATE, or TRUNCATE.
-- ============================================================================

-- 1. Create dedicated read-only role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'metabase_readonly') THEN
    CREATE ROLE metabase_readonly WITH LOGIN PASSWORD 'adhocx_analytics_read_2026!';
  END IF;
END
$$;

-- 2. Grant connection and schema usage
GRANT CONNECT ON DATABASE adhocx TO metabase_readonly;
GRANT USAGE ON SCHEMA public TO metabase_readonly;

-- 3. Grant SELECT on all existing tables and views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO metabase_readonly;

-- 4. Automatically grant SELECT on future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO metabase_readonly;

-- Verification query
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'metabase_readonly' 
LIMIT 10;
