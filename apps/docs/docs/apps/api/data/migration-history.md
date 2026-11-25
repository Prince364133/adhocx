---
title: Prisma Migration History
description: Inventory and functional summary of the 33 checked-in PostgreSQL migration directories.
status: source-verified
last_reviewed: "2026-11-23"
---

# Prisma Migration History

Prisma migration SQL lives in `apps/api/prisma/migrations/`; the migration
lock declares `postgresql`. The repository currently contains **33
migration directories**, including the initial baseline. This is a source
inventory, not evidence that every migration has been applied to any
particular database.

The directory names contain timestamps, but several directories share the
same timestamp and are distinguished by their suffix. Preserve the full
directory name when referring to a migration. `prisma migrate status` against
an authorized target database is needed to determine applied/pending status.

## Migration directory catalog

| Migration directory | Functional/schema purpose |
|---|---|
| `20261101000000_baseline_initial` | Rebuildable baseline for the original account, supply, marketplace, trip, payment and related tables. The migration comment identifies disaster-recovery and test environments as its purpose. |
| `20261102000000_corporate_user_tenant_link` | Links corporate login users and employee records to tenant identity, with supporting unique/index constraints. |
| `20261103000002_ws_b_tracking_events` | Adds corporate GPS history, trip lifecycle events and route assignment history. GPS history is range-partitioned by `received_at`; the migration describes the partition key, deduplication key and rationale for omitting foreign keys on the high-volume telemetry path. |
| `20261104000100_ws_a_driver_offers` | Persists corporate driver offers and related status/attempt data, with route, driver, expiry and tenant lookup indexes. |
| `20261104000150_ws_c_sos_status_values` | Adds the SOS status enum value in a separate migration because PostgreSQL does not permit using a newly added enum value in the same migration transaction. |
| `20261104000200_ws_c_rider_support_sos` | Adds rider self-service feedback, SOS alerts and the initial corporate support-ticket structures/statuses. |
| `20261104000300_ws_e_rate_cards_payout_batches` | Adds dual rate-card structures, driver earnings and maker/checker payout batches with identifiers and lookup constraints. |
| `20261104000400_ws_f_roles_shift_templates` | Adds corporate roles/office scope, departments and cost centers, tenant policies, shift templates and holidays. |
| `20261104000500_wire_dispatch_ops` | Changes manual reassignment handling so driver earnings are voided rather than deleted. |
| `20261104000600_wire_safety_support` | Adds the SOS escalation scan index used to find alerts requiring escalation. |
| `20261104000700_wire_billing_payouts` | Adds/version-controls corporate billing and payout structures, including invoice lines, provider events, disputes and credit notes. It also installs database triggers that reject updates/deletes for immutable credit notes and provider events and reject payout deletion. |
| `20261104000900_schema_drift_fix` | Applies a schema-diff correction after the preceding corporate migrations; inspect this SQL before changing related constraints or indexes. |
| `20261109000000_distance_pricing_engine` | Adds pricing plans/slabs/audit records, trip quotes and immutable pricing snapshots with quote/plan lookup indexes. |
| `20261110000000_distance_escort_fee` | Extends system policy, quote and snapshot data for the escort-fee calculation. |
| `20261110120000_hot_path_indexes` | Adds indexes identified by the 5,000-driver load test for trips, offers, driver dispatch fallback and vehicles. The migration comments recommend creating indexes concurrently by hand on large production tables before deployment; `IF NOT EXISTS` then makes the migration statements no-ops. |
| `20261111000000_onboarding_dispatch_exhaustion` | Adds onboarding policy controls, route-stop snapshots and state/index support for dispatch-exhaustion tracking. |
| `20261111000000_shared_support_workflow` | Expands support tickets into a shared workflow with attachment, comment and activity records, statuses/categories and queue indexes. |
| `20261111120000_live_operations_indexes` | Adds an index for corporate route shift/date/tenant/status live-operations lookups. |
| `20261112000000_corporate_profile_details` | Adds corporate tenant and office profile fields. |
| `20261112000000_corporate_ticket_messages` | Adds persisted corporate ticket messages and ticket/time and sender indexes. |
| `20261112000000_pricing_peak_hours` | Adds peak/non-peak pricing windows and quote/snapshot fields for applying those windows. |
| `20261112110000_corporate_profile_enrichment` | Adds tenant/office/department/transport-zone profile fields and tenant-scoped zone identifiers/indexes. |
| `20261112110000_sedan_capacity_alignment` | Aligns the tenant policy's sedan-capacity configuration with the then-current vehicle rule. |
| `20261113000000_remove_platform_commission` | Removes the retired platform-commission policy and updates pricing-tier/zonal-quote snapshot structures. |
| `20261113120000_sedan_capacity_four` | Applies the confirmed business rule that a corporate sedan seats four passengers; the migration comment dates that confirmation to 2026-11-13. |
| `20261114000000_dynamic_vehicle_categories` | Adjusts corporate and driver rate-card/policy structures to support dynamic vehicle categories. |
| `20261115000000_settlement_bank_name_snapshot` | Adds the bank-name snapshot to settlement records so the processed payout retains the submitted bank name. |
| `20261115120001_reconcile_legacy_db_side_effects` | Archives the previous GPS table only if it is empty, creates the partitioned GPS parent and initial daily partitions, and reasserts financial immutability triggers. It deliberately aborts rather than renaming a populated legacy GPS table. |
| `20261116000000_driver_safety_feedback` | Adds corporate driver safety feedback and its driver lookup index. |
| `20261116000001_scope_legacy_gps_archive` | Moves the preserved legacy GPS table into the `adhocx_legacy_archive` schema, outside the Prisma-managed public schema. |
| `20261117110000_notification_campaign_recipients` | Adds notification campaign recipients, per-recipient delivery state and campaign/user lookup constraints. |
| `20261117163000_allow_shared_vehicles` | Drops the driver/registration uniqueness restriction that prevented a vehicle record from being shared by drivers. |
| `20261119000000_driver_referral_engine` | Adds driver referral status/code fields and referral records with referee, ledger and code uniqueness/index constraints. |

## Schema and migration differences to keep visible

Prisma describes the `CorporateVehiclePosition` parent model, but the
migrations add PostgreSQL behaviors that are not ordinary Prisma model
attributes:

- The parent is partitioned by UTC `received_at`; daily child partitions are
  created for today through today + 3 days.
- The database primary key and deduplication key include the partition key.
  The schema documents this explicitly on `CorporateVehiclePosition`.
- The partition maintenance service creates future partitions and drops
  expired whole-day partitions. Child partitions are managed outside
  `schema.prisma`.
- The migration documents that telemetry rows intentionally have no
  foreign keys so history survives route deletion and the hot insert path
  stays cheap.
- Financial immutability triggers are custom SQL behavior and do not appear
  as Prisma model fields.

The model dictionary describes the current declared Prisma shape; this
migration history describes checked-in evolution and custom SQL. Neither
proves that a deployed database has no drift. Use a migration diff and
authorized database introspection before making production schema claims.

## Operational references

- [Data dictionary](./data-dictionary.md) — model fields and declared relations.
- [Migrations and database operations](./migrations-and-indexes.md) — safe
  deployment, index and retention guidance.
- `apps/api/prisma/migrations/migration_lock.toml` — PostgreSQL provider.
- `apps/api/src/domains/corporate/tracking/corporate-gps-partition-maintenance.service.ts` — runtime GPS partition lifecycle.
