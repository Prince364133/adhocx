---
title: Database Migrations, Backup and Restore
description: Current Prisma deployment behavior, safe migration verification, and the missing production backup/restore evidence.
---

# Database Migrations, Backup and Restore

**Evidence status:** Verified against the Prisma schema/migration tree,
`verify-migrations.mjs`, Compose and deployment workflows. No production
database, backup repository or restore environment was accessed. The
procedures below are gates and rehearsal guidance, not authorization to
change production data.

## Database boundaries

The production Compose file declares a Postgres/PostGIS service with a
persistent named volume. It also declares Redis with append-only mode and a
named volume. Persistent volumes survive container recreation; they are not
off-host backups and do not provide a verified recovery point.

The audit-evidence index describes an expected staging snapshot-restore log,
but the referenced log is absent from the checked-in evidence folder. No
scheduled backup job, retention configuration, restore automation, RPO/RTO
target or successful restore record was found in the repository. The actual
production database provider (local Compose volume versus an externally
managed database) must be confirmed by the data owner before a backup or
restore procedure is run.

## Schema and migration source

| Source | Responsibility |
|---|---|
| `apps/api/prisma/schema.prisma` | Current declared data model and Prisma configuration |
| `apps/api/prisma/migrations/` | Hand-written, timestamped SQL migrations |
| `apps/api/prisma/migrations/migration_lock.toml` | Prisma migration-provider metadata |
| `apps/api/scripts/verify-migrations.mjs` | Local-only migration regression check using a throwaway Postgres stack |
| `.github/workflows/production-deploy.yml` | EC2 deployment currently runs `prisma db push --skip-generate --accept-data-loss` |
| `.github/workflows/deploy-aws.yml` | ECS path also attempts `db push --accept-data-loss`, but continues when its database connection fails |

The checked-in workflows do not run `prisma migrate deploy`. A schema push
compares the Prisma schema to the target database; it is not the same as
applying and recording the checked-in migration history. The `--accept-data-loss`
flag can permit destructive schema changes. The two AWS workflows also have
different failure behavior, so neither should be assumed to provide a safe,
consistent migration gate.

## Safe local migration verification

`apps/api/scripts/verify-migrations.mjs` creates/reuses the dedicated
`adhocx-loadtest` Compose Postgres on loopback with temporary storage, creates
a `migtest` database inside that isolated container, constructs a baseline
schema from a Git ref, applies later migrations transactionally, and compares
the result to `schema.prisma`. It is not a production migration or backup
command and is not wired into CI.

From the repository root, with Docker Desktop and the required Git baseline
available:

```powershell
node apps/api/scripts/verify-migrations.mjs
```

The script defaults to the Corporate ETS baseline documented in its source.
Use `--base-ref=<ref>` and `--after=<migration-directory>` only when the
migration owner has reviewed the range. It uses the same named local
Compose project as the Corporate load harness; do not run the migration
checker while another test is using that stack. The documented load-test
cleanup command removes that isolated project and its volume, so use it only
after all local jobs using the project have stopped.

## Required migration release gate

Before any production schema change:

1. Confirm the authoritative database, owner, maintenance window and affected
   service version.
2. Review the SQL diff and data-preservation implications with the database
   owner. Do not rely on a passing TypeScript or Docker build as migration
   validation.
3. Run the migration verifier and relevant integration tests against an
   isolated disposable database.
4. Rehearse forward migration and application compatibility on a
   representative non-production copy.
5. Confirm an independently stored, recent backup and a tested restore path.
   Record the backup identifier, timestamp, retention and restore owner
   without copying credentials into the record.
6. Confirm old and new application versions can safely operate during the
   rollout, or plan an explicit maintenance window.
7. Obtain the database/platform owner's approval before applying any
   production change. The current workflow's `db push --accept-data-loss`
   must not be used as an implicit approval.
8. Afterward, verify the expected schema, API health and representative
   read/write flows; record the migration and deployment identifiers.

No automatic schema rollback was found. Rolling back application images does
not reverse a database schema change. Any down migration or restore must be
chosen by the database owner based on the verified backup and compatibility
plan.

## Backup and restore rehearsal

The repository does not establish a production backup provider, schedule,
retention window or executable restore procedure. Do not run guessed
`pg_restore`, volume deletion, or restore-over-source commands against
production.

For an approved **non-production** rehearsal, the database owner should:

1. Identify the source system and take a provider-supported snapshot or
   database dump into access-controlled storage.
2. Record the source, timestamp, encryption/storage location, retention
   policy and checksum or provider snapshot ID.
3. Restore into an isolated, network-restricted target with no production
   credentials or external side effects.
4. Validate Postgres starts, expected schema is present, representative
   business records reconcile, the API can connect, and critical read-only
   workflows behave as expected.
5. Measure elapsed restore time and data-loss window; compare with
   owner-approved RTO/RPO targets (none are declared in the repository).
6. Record failures, cleanup the isolated copy through the approved provider
   procedure, and retain the evidence log.

Do not promote this rehearsal to production instructions until the data
provider, backup owner, access controls, retention and tested restore method
are recorded.

## Sources and related runbooks

- `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`
- `apps/api/scripts/verify-migrations.mjs`
- `.github/workflows/production-deploy.yml` and `.github/workflows/deploy-aws.yml`
- `docker-compose.prod.yml`
- `audit_evidence/04_aws_cloud_infrastructure/README.md` (evidence requirements, not proof of completion)
- [Deployment workflow boundaries](./ci-cd.md)
- [Health and recovery](./health-and-recovery.md)
