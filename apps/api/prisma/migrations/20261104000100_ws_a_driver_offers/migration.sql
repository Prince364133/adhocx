-- WS-A: Corporate driver offers persistence, audit trail & at-risk escalation (docs/corporate-ets/19 §1 WS-A)
-- Purely additive: new table, new enum, at_risk column on corporate_routes, no data loss.

-- CreateEnum
CREATE TYPE "CorporateDriverOfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- AlterTable corporate_routes: add at_risk flag
ALTER TABLE "corporate_routes" ADD COLUMN IF NOT EXISTS "at_risk" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "corporate_driver_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "CorporateDriverOfferStatus" NOT NULL DEFAULT 'SENT',
    "payout_paise" BIGINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_driver_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corporate_driver_offers_route_id_driver_id_attempt_key" ON "corporate_driver_offers"("route_id", "driver_id", "attempt");

-- CreateIndex
CREATE INDEX "corporate_driver_offers_driver_id_status_expires_at_idx" ON "corporate_driver_offers"("driver_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "corporate_driver_offers_route_id_status_idx" ON "corporate_driver_offers"("route_id", "status");

-- CreateIndex
CREATE INDEX "corporate_driver_offers_tenant_id_created_at_idx" ON "corporate_driver_offers"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "corporate_driver_offers" ADD CONSTRAINT "corporate_driver_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_driver_offers" ADD CONSTRAINT "corporate_driver_offers_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "corporate_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_driver_offers" ADD CONSTRAINT "corporate_driver_offers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

