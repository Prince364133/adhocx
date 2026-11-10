-- Baseline migration to allow rebuilding database from scratch (disaster recovery / test environments)

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VENDOR', 'DRIVER', 'ADMIN', 'CORPORATE_ADMIN', 'CORPORATE_MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DriverAvailability" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'HATCHBACK', 'TEMPO_TRAVELLER', 'BUS', 'TATA_ACE', 'PICKUP_TRUCK');

-- CreateEnum
CREATE TYPE "FulfillmentMode" AS ENUM ('DIRECT_DISPATCH');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'POSTED', 'DISPATCHING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_AVAILABLE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('CREATED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "CouponApplicableContext" AS ENUM ('WALLET_TOPUP', 'REQUIREMENT_BOOKING', 'ALL');

-- CreateEnum
CREATE TYPE "DriverSubscriptionStatus" AS ENUM ('TRIAL_ACTIVE', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'FROZEN');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'TRIP_OFFER', 'TRIP_ASSIGNED', 'TRIP_STATUS', 'REQUIREMENT_UPDATE', 'KYC_UPDATE', 'WALLET_UPDATE', 'MARKETING_PROMO', 'BROADCAST');

-- CreateEnum
CREATE TYPE "RateCardAudience" AS ENUM ('VENDOR', 'DRIVER');

-- CreateEnum
CREATE TYPE "RateCardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "LocalityReviewStatus" AS ENUM ('VERIFIED', 'PENDING_REVIEW', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CorporateTenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CorporateGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CorporateRosterStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CorporateTransportDirection" AS ENUM ('LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "CorporateRequestStatus" AS ENUM ('APPROVED', 'PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'UNSERVED');

-- CreateEnum
CREATE TYPE "CorporateRouteStatus" AS ENUM ('PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CorporateStopStatus" AS ENUM ('PENDING', 'ARRIVED', 'BOARDED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CorporateInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CorporateDriverEarningStatus" AS ENUM ('UNPAID', 'PROCESSING', 'PAID');

-- CreateEnum
CREATE TYPE "CorporateSosStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDED', 'RESOLVED', 'FALSE_ALARM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "gst_number" TEXT,
    "address" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "escrow_balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "rejection_reason" TEXT,
    "kyc_documents" JSONB,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "availability_status" "DriverAvailability" NOT NULL DEFAULT 'OFFLINE',
    "vehicle_type" VARCHAR(50),
    "vehicle_model" TEXT,
    "vehicle_plate" TEXT,
    "wallet_balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_trips" INTEGER NOT NULL DEFAULT 0,
    "acceptance_rate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "accepted_offers" INTEGER NOT NULL DEFAULT 0,
    "declined_offers" INTEGER NOT NULL DEFAULT 0,
    "consecutive_declines" INTEGER NOT NULL DEFAULT 0,
    "cooldown_until" TIMESTAMP(3),
    "cooldown_level" INTEGER NOT NULL DEFAULT 0,
    "last_cooldown_at" TIMESTAMP(3),
    "current_lat" DECIMAL(10,7),
    "current_lng" DECIMAL(10,7),
    "last_location_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "kyc_documents" JSONB,
    "dl_front_url" TEXT,
    "dl_back_url" TEXT,
    "rc_doc_url" TEXT,
    "insurance_doc_url" TEXT,
    "vehicle_photo_url" TEXT,
    "aadhar_front_url" TEXT,
    "aadhar_back_url" TEXT,
    "pan_doc_url" TEXT,
    "subscription_status" "DriverSubscriptionStatus" NOT NULL DEFAULT 'TRIAL_ACTIVE',
    "trial_start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_end_date" TIMESTAMP(3),
    "subscription_expiry" TIMESTAMP(3),
    "auto_debit" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "make" TEXT,
    "model" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rc_number" TEXT,
    "insurance_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "fulfillment_mode" "FulfillmentMode" NOT NULL DEFAULT 'DIRECT_DISPATCH',
    "vehicle_type" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "assigned_quantity" INTEGER NOT NULL DEFAULT 0,
    "pickup_lat" DECIMAL(10,7) NOT NULL,
    "pickup_lng" DECIMAL(10,7) NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "drop_lat" DECIMAL(10,7) NOT NULL,
    "drop_lng" DECIMAL(10,7) NOT NULL,
    "drop_address" TEXT NOT NULL,
    "reporting_time" TIMESTAMP(3) NOT NULL,
    "rate_per_vehicle" DECIMAL(10,2),
    "suggested_budget" DECIMAL(10,2),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'POSTED',
    "dispatch_waves" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "offered_rate" DECIMAL(10,2) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "wave_number" INTEGER NOT NULL DEFAULT 1,
    "distance_km" DOUBLE PRECISION,
    "eta_minutes" INTEGER,
    "seen_at" TIMESTAMP(3),
    "counts_for_ar" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "offer_id" UUID,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "drop_address" TEXT NOT NULL,
    "reporting_time" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'ASSIGNED',
    "otp" TEXT NOT NULL DEFAULT '1234',
    "driver_rate" DECIMAL(10,2) NOT NULL,
    "toll_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "parking_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_driver_earnings" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_events" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewee_id" UUID NOT NULL,
    "driver_id" UUID,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "accused_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "transaction_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "account_type" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc" TEXT,
    "transaction_ref" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_discount_amount" DECIMAL(10,2),
    "min_order_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "applicable_to" "CouponApplicableContext" NOT NULL DEFAULT 'ALL',
    "usage_limit_total" INTEGER,
    "usage_limit_per_user" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "order_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "final_amount" DECIMAL(12,2) NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_image" TEXT,
    "author_name" TEXT NOT NULL DEFAULT 'AdhocX Team',
    "author_role" TEXT DEFAULT 'Fleet Operations & Mobility Research',
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "views" INTEGER NOT NULL DEFAULT 0,
    "read_time" TEXT NOT NULL DEFAULT '5 min read',
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'ANDROID',
    "device_model" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "data" JSONB,
    "image_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "is_clicked" BOOLEAN NOT NULL DEFAULT false,
    "clicked_at" TIMESTAMP(3),
    "idempotency_key" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'high',
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "trip_alerts" BOOLEAN NOT NULL DEFAULT true,
    "marketing_promos" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "action_url" TEXT,
    "target_role" TEXT,
    "target_filter" JSONB,
    "total_targeted" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sent_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_pricing_tiers" (
    "id" UUID NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "category_label" TEXT NOT NULL,
    "seating_capacity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_key" TEXT DEFAULT 'car',
    "base_fare" DECIMAL(10,2) NOT NULL,
    "base_km" DECIMAL(10,2) NOT NULL,
    "per_km_rate" DECIMAL(10,2) NOT NULL,
    "driver_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
    "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "surge_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "vehicle_pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_policy_configs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "driver_monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 499.00,
    "driver_trial_days" INTEGER NOT NULL DEFAULT 15,
    "min_withdrawal_amount" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_policy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_subscription_payments" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_ref" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "coupon_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_captures" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "contact_name" TEXT,
    "city" TEXT,
    "fleet_requirements" TEXT,
    "monthly_trips_estimate" TEXT,
    "preferred_vehicles" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_versions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "audience" "RateCardAudience" NOT NULL,
    "status" "RateCardStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,

    CONSTRAINT "rate_card_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_rows" (
    "id" UUID NOT NULL,
    "rate_card_version_id" UUID NOT NULL,
    "hub_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "base_amount_paise" INTEGER NOT NULL,
    "escort_max_paise" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_card_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locality_masters" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "aliases" TEXT[],
    "zone_id" TEXT NOT NULL,
    "center_lat" DECIMAL(10,7),
    "center_lng" DECIMAL(10,7),
    "h3_index_res8" TEXT,
    "review_status" "LocalityReviewStatus" NOT NULL DEFAULT 'VERIFIED',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locality_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonal_quote_snapshots" (
    "id" UUID NOT NULL,
    "requirement_id" UUID,
    "requested_by" UUID,
    "rate_version" TEXT NOT NULL,
    "driver_rate_version" TEXT,
    "direction" VARCHAR(32),
    "hub_id" TEXT NOT NULL,
    "locality_id" TEXT NOT NULL,
    "locality_name" TEXT,
    "zone_id" TEXT NOT NULL,
    "pickup_lat" DECIMAL(10,7),
    "pickup_lng" DECIMAL(10,7),
    "drop_lat" DECIMAL(10,7),
    "drop_lng" DECIMAL(10,7),
    "consumed_at" TIMESTAMP(3),
    "vehicle_type" VARCHAR(50) NOT NULL,
    "has_escort" BOOLEAN NOT NULL DEFAULT false,
    "base_fare_paise" INTEGER NOT NULL,
    "escort_fare_paise" INTEGER NOT NULL DEFAULT 0,
    "total_fare_paise" INTEGER NOT NULL,
    "driver_fare_paise" INTEGER NOT NULL,
    "platform_fee_paise" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zonal_quote_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_tenants" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "legal_entity_name" TEXT NOT NULL,
    "gstin" VARCHAR(15),
    "status" "CorporateTenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_offices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "address_text" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "h3_res8_index" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_employees" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "employee_code" VARCHAR(64) NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "gender" "CorporateGender" NOT NULL DEFAULT 'MALE',
    "department" VARCHAR(64),
    "cost_center" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_employee_locations" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "address_text" TEXT NOT NULL,
    "landmark" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "h3_res8_index" VARCHAR(15) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_employee_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_rosters" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "roster_date" DATE NOT NULL,
    "shift_time" VARCHAR(8) NOT NULL,
    "direction" "CorporateTransportDirection" NOT NULL,
    "status" "CorporateRosterStatus" NOT NULL DEFAULT 'DRAFT',
    "passenger_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_transport_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "roster_id" UUID,
    "employee_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "shift_time" VARCHAR(8) NOT NULL,
    "direction" "CorporateTransportDirection" NOT NULL,
    "pickup_lat" DECIMAL(10,7) NOT NULL,
    "pickup_lng" DECIMAL(10,7) NOT NULL,
    "dropoff_lat" DECIMAL(10,7) NOT NULL,
    "dropoff_lng" DECIMAL(10,7) NOT NULL,
    "h3_pickup_index" VARCHAR(15) NOT NULL,
    "status" "CorporateRequestStatus" NOT NULL DEFAULT 'APPROVED',
    "idempotency_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_transport_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_routes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "shift_date" DATE NOT NULL,
    "shift_time" VARCHAR(8) NOT NULL,
    "direction" "CorporateTransportDirection" NOT NULL,
    "vehicle_category" VARCHAR(32) NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "assigned_passenger_count" INTEGER NOT NULL,
    "target_pickup_1_time" TIMESTAMP(3) NOT NULL,
    "target_office_arrival_time" TIMESTAMP(3) NOT NULL,
    "est_distance_meters" INTEGER NOT NULL,
    "est_duration_seconds" INTEGER NOT NULL,
    "status" "CorporateRouteStatus" NOT NULL DEFAULT 'PLANNED',
    "driver_id" UUID,
    "vehicle_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_route_stops" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_type" VARCHAR(16) NOT NULL,
    "transport_request_id" UUID,
    "employee_id" UUID,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "planned_eta" TIMESTAMP(3) NOT NULL,
    "actual_arrival_time" TIMESTAMP(3),
    "actual_departure_time" TIMESTAMP(3),
    "boarding_otp" VARCHAR(6) NOT NULL,
    "dwell_buffer_seconds" INTEGER NOT NULL DEFAULT 300,
    "status" "CorporateStopStatus" NOT NULL DEFAULT 'PENDING',
    "no_show_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_number" VARCHAR(64) NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "subtotal_paise" BIGINT NOT NULL,
    "gst_paise" BIGINT NOT NULL,
    "total_amount_paise" BIGINT NOT NULL,
    "status" "CorporateInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_invoice_lines" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "billable_distance_meters" INTEGER NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_driver_earnings" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "payout_batch_id" UUID,
    "route_fare_paise" BIGINT NOT NULL,
    "approach_bonus_paise" BIGINT NOT NULL DEFAULT 0,
    "toll_reimbursement_paise" BIGINT NOT NULL DEFAULT 0,
    "total_earned_paise" BIGINT NOT NULL,
    "payout_status" "CorporateDriverEarningStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_driver_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_sos_alerts" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "stop_id" UUID,
    "triggered_by_id" UUID NOT NULL,
    "triggered_by_role" VARCHAR(32) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "battery_pct" INTEGER,
    "audio_url" TEXT,
    "status" "CorporateSosStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" UUID,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_user_id_key" ON "vendors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "offers_status_expires_at_idx" ON "offers"("status", "expires_at");

-- CreateIndex
CREATE INDEX "offers_requirement_id_status_idx" ON "offers"("requirement_id", "status");

-- CreateIndex
CREATE INDEX "offers_driver_id_counts_for_ar_responded_at_idx" ON "offers"("driver_id", "counts_for_ar", "responded_at");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_offer_id_key" ON "assignments"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_assignment_id_key" ON "trips"("assignment_id");

-- CreateIndex
CREATE INDEX "trips_vendor_id_status_completed_at_idx" ON "trips"("vendor_id", "status", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_trip_id_reviewer_id_key" ON "reviews"("trip_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "disputes_trip_id_status_idx" ON "disputes"("trip_id", "status");

-- CreateIndex
CREATE INDEX "disputes_reporter_id_idx" ON "disputes"("reporter_id");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_name_entity_id_idx" ON "audit_logs"("entity_name", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_user_id_idx" ON "coupon_redemptions"("coupon_id", "user_id");

-- CreateIndex
CREATE INDEX "coupon_redemptions_user_id_idx" ON "coupon_redemptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_is_active_idx" ON "device_tokens"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_idempotency_key_idx" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_campaigns_created_at_idx" ON "notification_campaigns"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_pricing_tiers_vehicle_type_key" ON "vehicle_pricing_tiers"("vehicle_type");

-- CreateIndex
CREATE UNIQUE INDEX "system_policy_configs_key_key" ON "system_policy_configs"("key");

-- CreateIndex
CREATE INDEX "rate_card_versions_audience_status_idx" ON "rate_card_versions"("audience", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rate_card_versions_audience_version_key" ON "rate_card_versions"("audience", "version");

-- CreateIndex
CREATE UNIQUE INDEX "rate_card_rows_rate_card_version_id_hub_id_zone_id_vehicle__key" ON "rate_card_rows"("rate_card_version_id", "hub_id", "zone_id", "vehicle_type");

-- CreateIndex
CREATE UNIQUE INDEX "locality_masters_display_name_key" ON "locality_masters"("display_name");

-- CreateIndex
CREATE INDEX "locality_masters_zone_id_idx" ON "locality_masters"("zone_id");

-- CreateIndex
CREATE INDEX "locality_masters_h3_index_res8_idx" ON "locality_masters"("h3_index_res8");

-- CreateIndex
CREATE UNIQUE INDEX "zonal_quote_snapshots_requirement_id_key" ON "zonal_quote_snapshots"("requirement_id");

-- CreateIndex
CREATE INDEX "zonal_quote_snapshots_requested_by_created_at_idx" ON "zonal_quote_snapshots"("requested_by", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_tenants_code_key" ON "corporate_tenants"("code");

-- CreateIndex
CREATE INDEX "corporate_offices_tenant_id_idx" ON "corporate_offices"("tenant_id");

-- CreateIndex
CREATE INDEX "corporate_offices_h3_res8_index_idx" ON "corporate_offices"("h3_res8_index");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_offices_tenant_id_code_key" ON "corporate_offices"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "corporate_employees_tenant_id_idx" ON "corporate_employees"("tenant_id");

-- CreateIndex
CREATE INDEX "corporate_employees_office_id_idx" ON "corporate_employees"("office_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_employees_tenant_id_employee_code_key" ON "corporate_employees"("tenant_id", "employee_code");

-- CreateIndex
CREATE INDEX "corporate_employee_locations_employee_id_idx" ON "corporate_employee_locations"("employee_id");

-- CreateIndex
CREATE INDEX "corporate_employee_locations_h3_res8_index_idx" ON "corporate_employee_locations"("h3_res8_index");

-- CreateIndex
CREATE INDEX "corporate_rosters_tenant_id_roster_date_idx" ON "corporate_rosters"("tenant_id", "roster_date");

-- CreateIndex
CREATE INDEX "corporate_rosters_office_id_idx" ON "corporate_rosters"("office_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_transport_requests_idempotency_hash_key" ON "corporate_transport_requests"("idempotency_hash");

-- CreateIndex
CREATE INDEX "corporate_transport_requests_tenant_id_scheduled_date_shift_idx" ON "corporate_transport_requests"("tenant_id", "scheduled_date", "shift_time");

-- CreateIndex
CREATE INDEX "corporate_transport_requests_employee_id_idx" ON "corporate_transport_requests"("employee_id");

-- CreateIndex
CREATE INDEX "corporate_transport_requests_h3_pickup_index_idx" ON "corporate_transport_requests"("h3_pickup_index");

-- CreateIndex
CREATE INDEX "corporate_routes_tenant_id_shift_date_shift_time_idx" ON "corporate_routes"("tenant_id", "shift_date", "shift_time");

-- CreateIndex
CREATE INDEX "corporate_routes_driver_id_idx" ON "corporate_routes"("driver_id");

-- CreateIndex
CREATE INDEX "corporate_routes_status_idx" ON "corporate_routes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_route_stops_transport_request_id_key" ON "corporate_route_stops"("transport_request_id");

-- CreateIndex
CREATE INDEX "corporate_route_stops_route_id_idx" ON "corporate_route_stops"("route_id");

-- CreateIndex
CREATE INDEX "corporate_route_stops_employee_id_idx" ON "corporate_route_stops"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_route_stops_route_id_stop_sequence_key" ON "corporate_route_stops"("route_id", "stop_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_invoices_invoice_number_key" ON "corporate_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "corporate_invoices_tenant_id_billing_period_start_idx" ON "corporate_invoices"("tenant_id", "billing_period_start");

-- CreateIndex
CREATE INDEX "corporate_invoice_lines_invoice_id_idx" ON "corporate_invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "corporate_invoice_lines_route_id_idx" ON "corporate_invoice_lines"("route_id");

-- CreateIndex
CREATE INDEX "corporate_driver_earnings_driver_id_payout_status_idx" ON "corporate_driver_earnings"("driver_id", "payout_status");

-- CreateIndex
CREATE INDEX "corporate_driver_earnings_route_id_idx" ON "corporate_driver_earnings"("route_id");

-- CreateIndex
CREATE INDEX "corporate_sos_alerts_route_id_idx" ON "corporate_sos_alerts"("route_id");

-- CreateIndex
CREATE INDEX "corporate_sos_alerts_status_idx" ON "corporate_sos_alerts"("status");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_accused_id_fkey" FOREIGN KEY ("accused_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_subscription_payments" ADD CONSTRAINT "driver_subscription_payments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_card_rows" ADD CONSTRAINT "rate_card_rows_rate_card_version_id_fkey" FOREIGN KEY ("rate_card_version_id") REFERENCES "rate_card_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonal_quote_snapshots" ADD CONSTRAINT "zonal_quote_snapshots_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_offices" ADD CONSTRAINT "corporate_offices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employee_locations" ADD CONSTRAINT "corporate_employee_locations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_rosters" ADD CONSTRAINT "corporate_rosters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_rosters" ADD CONSTRAINT "corporate_rosters_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_transport_requests" ADD CONSTRAINT "corporate_transport_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_transport_requests" ADD CONSTRAINT "corporate_transport_requests_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "corporate_rosters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_transport_requests" ADD CONSTRAINT "corporate_transport_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_routes" ADD CONSTRAINT "corporate_routes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_routes" ADD CONSTRAINT "corporate_routes_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "corporate_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_routes" ADD CONSTRAINT "corporate_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_routes" ADD CONSTRAINT "corporate_routes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_route_stops" ADD CONSTRAINT "corporate_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "corporate_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_route_stops" ADD CONSTRAINT "corporate_route_stops_transport_request_id_fkey" FOREIGN KEY ("transport_request_id") REFERENCES "corporate_transport_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_route_stops" ADD CONSTRAINT "corporate_route_stops_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "corporate_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_invoices" ADD CONSTRAINT "corporate_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "corporate_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_invoice_lines" ADD CONSTRAINT "corporate_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "corporate_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_invoice_lines" ADD CONSTRAINT "corporate_invoice_lines_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "corporate_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_driver_earnings" ADD CONSTRAINT "corporate_driver_earnings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_driver_earnings" ADD CONSTRAINT "corporate_driver_earnings_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "corporate_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_sos_alerts" ADD CONSTRAINT "corporate_sos_alerts_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "corporate_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

