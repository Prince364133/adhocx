-- Corporate access control: link login accounts to corporate tenants / employees.
-- Purely additive: two nullable columns, one index, one unique index, two FKs.
-- No table rewrite, no data change. Existing rows get NULL and must be backfilled
-- (see note at the bottom) before corporate admins / employees can use the API.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "corporate_tenant_id" UUID;

-- AlterTable
ALTER TABLE "corporate_employees" ADD COLUMN "user_id" UUID;

-- CreateIndex
CREATE INDEX "users_corporate_tenant_id_idx" ON "users"("corporate_tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_employees_user_id_key" ON "corporate_employees"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_corporate_tenant_id_fkey" FOREIGN KEY ("corporate_tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (run manually once tenant ownership is confirmed; NOT executed by this migration):
--   UPDATE "users" SET "corporate_tenant_id" = '<tenant-uuid>' WHERE "id" IN (...corporate admins/managers...);
--   UPDATE "corporate_employees" ce SET "user_id" = u."id"
--     FROM "users" u
--    WHERE ce."user_id" IS NULL AND u."role" = 'EMPLOYEE'
--      AND (lower(u."email") = lower(ce."email") OR u."phone" = ce."phone_number");
--   UPDATE "users" u SET "corporate_tenant_id" = ce."tenant_id"
--     FROM "corporate_employees" ce WHERE ce."user_id" = u."id" AND u."corporate_tenant_id" IS NULL;
