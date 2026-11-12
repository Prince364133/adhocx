CREATE INDEX IF NOT EXISTS "corporate_routes_shift_date_tenant_id_status_idx"
  ON "corporate_routes" ("shift_date", "tenant_id", "status");
