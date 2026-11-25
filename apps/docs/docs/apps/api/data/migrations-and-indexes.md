---
title: Migrations and Database Operations
description: Prisma migrations, hot-path indexes and data safety conventions.
status: partial
last_reviewed: "2026-11-23"
---

# Migrations and Database Operations

**Evidence status:** Verified against migration directories and Docker
health/Compose configuration.

## Migration Location

Prisma migrations are stored in:

```text
apps/api/prisma/migrations
```

The repository contains **33 timestamped migration directories** and a
`migration_lock.toml` declaring PostgreSQL. See the
[chronological migration history](./migration-history.md) for every directory
and its schema purpose.

Deployments should use an intentional migration command rather than relying
on local Prisma state. Typical Prisma CLI operations are:

```text
prisma migrate status --schema prisma/schema.prisma
prisma migrate deploy --schema prisma/schema.prisma
```

`migrate deploy` applies checked-in migrations; it does not generate or
repair migrations. Use `migrate dev` only in a development database to
author/evolve a migration. Review SQL and test on a disposable database
before production. This repository session did not connect to a live
database, run migrations or certify deployment state.

## Migration Principles

- Baseline/rebuild from a known migration set.
- Add backward-compatible columns before application reads change.
- Backfill in bounded jobs or migrations.
- Add indexes according to measured query plans.
- Prefer concurrent index creation for high-volume production tables.
- Never place real credentials in migrations or seed data.
- Verify migrations against a disposable test database before production.

## Hot-Path Index Examples

Verified examples include:

- Trip by driver and status
- Offer by driver, status and expiry
- Driver availability/verification/location fallback
- Vehicle by driver
- Corporate route tenant/date/status combinations
- Corporate vehicle position by route and recorded time
- Notification, support and billing lookup indexes

The schema pages enumerate declared Prisma indexes. Custom SQL indexes,
triggers and partition structures can exist outside Prisma's ordinary model
metadata. Exact live index state requires an authorized migration diff and
database introspection.

## PostGIS and Geospatial Data

Coordinate fields are stored primarily as Decimal latitude/longitude columns
and H3 index strings. Corporate vehicle telemetry uses float coordinates.

The deployment image is PostGIS-enabled, but application logic must not
assume a live spatial database feature unless the migration or service code
explicitly uses it.

## JSON and Audit Data

Prisma `Json` fields are used for:

- KYC documents and provider responses
- Transport-zone service areas
- Pricing and notification metadata
- Trip event payloads
- Feature configuration

JSON fields are useful for provider/audit payloads but should not replace
normalized relational fields for high-volume ownership and filtering.

## Retention and Partitioning

Corporate vehicle positions are range-partitioned by UTC `received_at`.
`CorporateGpsPartitionMaintenance` creates the current day plus the next
three days and drops whole partitions older than
`CORPORATE_GPS_RETENTION_DAYS` (default 90; minimum accepted value 1), running
hourly behind a Redis lock. Set
`CORPORATE_GPS_PARTITION_MAINTENANCE_ENABLED=false` to disable the scheduled
maintenance. Review the [migration history](./migration-history.md) and
`apps/api/src/domains/corporate/tracking/corporate-gps-partition-maintenance.service.ts`
before changing retention. This documents configured behavior, not a legal
retention decision or proof of a production environment's resolved value.

The migration history also records financial immutability triggers and the
legacy GPS archive schema. Those database objects are not all represented as
Prisma models/attributes; do not treat `schema.prisma` alone as the full set
of physical database behavior.
