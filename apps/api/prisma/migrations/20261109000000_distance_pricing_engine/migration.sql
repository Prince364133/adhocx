-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" UUID NOT NULL,
    "vehicle_category" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "version" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_by" TEXT,
    "published_by" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_slabs" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "min_distance_m_exclusive" INTEGER NOT NULL,
    "max_distance_m_inclusive" INTEGER NOT NULL,
    "vendor_price_paise" INTEGER NOT NULL,
    "driver_payout_paise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pricing_slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_audit" (
    "id" UUID NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'PRICING_PLAN',
    "entity_id" TEXT NOT NULL,
    "old_value_json" JSONB,
    "new_value_json" JSONB,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_quotes" (
    "id" UUID NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "pickup_address" TEXT,
    "pickup_lat" DECIMAL(10,7),
    "pickup_lng" DECIMAL(10,7),
    "drop_address" TEXT,
    "drop_lat" DECIMAL(10,7),
    "drop_lng" DECIMAL(10,7),
    "vehicle_category" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "route_distance_m" INTEGER NOT NULL,
    "plan_id" UUID,
    "plan_version" TEXT,
    "slab_id" UUID,
    "vendor_price_paise" INTEGER NOT NULL,
    "driver_payout_paise" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "route_summary" TEXT,
    "route_source" VARCHAR(32),
    "routing_preference" VARCHAR(32),
    "requirement_id" UUID,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_pricing_snapshots" (
    "id" UUID NOT NULL,
    "trip_id" UUID,
    "requirement_id" UUID,
    "quote_id" UUID,
    "plan_id" UUID,
    "plan_version" TEXT NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "slab_id" UUID,
    "vendor_price_paise" INTEGER NOT NULL,
    "driver_payout_paise" INTEGER NOT NULL,
    "gross_spread_paise" INTEGER NOT NULL,
    "quoted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_pricing_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_plans_vehicle_category_status_idx" ON "pricing_plans"("vehicle_category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_vehicle_category_version_key" ON "pricing_plans"("vehicle_category", "version");

-- CreateIndex
CREATE INDEX "pricing_slabs_plan_id_active_idx" ON "pricing_slabs"("plan_id", "active");

-- CreateIndex
CREATE INDEX "pricing_audit_entity_id_idx" ON "pricing_audit"("entity_id");

-- CreateIndex
CREATE INDEX "pricing_audit_timestamp_idx" ON "pricing_audit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "trip_quotes_requirement_id_key" ON "trip_quotes"("requirement_id");

-- CreateIndex
CREATE INDEX "trip_quotes_vendor_id_status_idx" ON "trip_quotes"("vendor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_pricing_snapshots_trip_id_key" ON "trip_pricing_snapshots"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_pricing_snapshots_requirement_id_key" ON "trip_pricing_snapshots"("requirement_id");

-- CreateIndex
CREATE INDEX "trip_pricing_snapshots_plan_version_idx" ON "trip_pricing_snapshots"("plan_version");

-- AddForeignKey
ALTER TABLE "pricing_slabs" ADD CONSTRAINT "pricing_slabs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_quotes" ADD CONSTRAINT "trip_quotes_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_quotes" ADD CONSTRAINT "trip_quotes_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_pricing_snapshots" ADD CONSTRAINT "trip_pricing_snapshots_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_pricing_snapshots" ADD CONSTRAINT "trip_pricing_snapshots_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_pricing_snapshots" ADD CONSTRAINT "trip_pricing_snapshots_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Integrity guarantees the pricing engine relies on (not expressible in Prisma)
-- ---------------------------------------------------------------------------

-- At most one ACTIVE plan per vehicle category (PRD 4 / 7).
CREATE UNIQUE INDEX "pricing_plans_one_active_per_category"
  ON "pricing_plans" ("vehicle_category") WHERE "status" = 'ACTIVE';

ALTER TABLE "pricing_plans"
  ADD CONSTRAINT "pricing_plans_status_check"
  CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'ACTIVE', 'RETIRED'));

-- Slabs: positive integer paise, a real range, payout never above the vendor charge.
ALTER TABLE "pricing_slabs"
  ADD CONSTRAINT "pricing_slabs_range_check"
  CHECK ("min_distance_m_exclusive" >= 0 AND "max_distance_m_inclusive" > "min_distance_m_exclusive");
ALTER TABLE "pricing_slabs"
  ADD CONSTRAINT "pricing_slabs_amounts_check"
  CHECK ("vendor_price_paise" > 0 AND "driver_payout_paise" > 0 AND "driver_payout_paise" <= "vendor_price_paise");

-- No two slabs of one plan share a lower boundary (gaps/overlaps are validated in the service
-- inside the same transaction that replaces the slabs).
CREATE UNIQUE INDEX "pricing_slabs_plan_min_unique"
  ON "pricing_slabs" ("plan_id", "min_distance_m_exclusive");

ALTER TABLE "trip_quotes"
  ADD CONSTRAINT "trip_quotes_status_check"
  CHECK ("status" IN ('ACTIVE', 'CONFIRMED', 'EXPIRED'));
ALTER TABLE "trip_quotes"
  ADD CONSTRAINT "trip_quotes_amounts_check"
  CHECK ("route_distance_m" > 0 AND "vendor_price_paise" > 0 AND "driver_payout_paise" > 0);
