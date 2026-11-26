---
title: CI/CD and Release Workflows
description: Trigger, build, test and deployment behavior of the checked-in AdhocX GitHub Actions workflows.
---

# CI/CD and Release Workflows

**Evidence status:** Source-verified against `.github/workflows/`. Workflow
definitions do not prove that a run succeeded or that its target is currently
deployed. Do not dispatch production workflows without authorized change
approval and confirmation of the live infrastructure.

## Workflow inventory

| Workflow | Trigger | What the source does | Important limit |
|---|---|---|---|
| `ci.yml` | Push and pull request to `main`, `develop`, `staging` or `production` | Installs frozen pnpm dependencies; builds contracts; generates Prisma; runs lint and API/Admin builds; starts Postgres/PostGIS and Redis for API tests; runs Jest, the 50-ride dispatch simulation and selected coupon/live-dispatch HTTP scripts | Does not run Flutter tests, browser tests, docs build/typecheck, or API load tests |
| `docker-publish.yml` | Push to `main`, version tag `v*.*.*`, or manual dispatch | Builds API and Admin images and pushes configured tags to GHCR | Optional AWS auth is present, but image metadata/push targets GHCR; this workflow does not demonstrate an ECR image push |
| `deploy-aws.yml` | Successful `docker-publish.yml` on `main`, or manual dispatch | Authenticates to AWS, attempts Prisma schema sync, then invokes ECS service updates for API and Admin | Workflow title also mentions App Runner, but commands update ECS. The DB step continues on connection failure. The `target_service` input does not currently restrict which services are updated |
| `production-deploy.yml` | Push to `production` or manual dispatch | Builds API/Admin/Mobile images; uses SSH to deploy to EC2; syncs Compose/Nginx files; writes environment configuration; runs Prisma schema push; starts the stack and checks health | Uses a `db push --accept-data-loss` step and literal sensitive-setting fallback values. It has no reviewed migration rollback. Do not treat it as production-safe until these issues and secret handling are remediated |
| `deploy-marketing-cloudflare.yml` | Push to `main`/`production`, pull request, or manual dispatch | Builds Astro output and deploys a Cloudflare Worker production version or preview alias | SEO check is report-only by default; browser QA is not automated |
| `mobile-release.yml` | `v*` tag, `production` branch, or manual dispatch | Builds Android APK/AAB and an unsigned iOS app bundle, then uploads release artifacts | Does not run `flutter test`; the publish job is configured to run after build jobs regardless of their result, so verify artifact completeness before release use |

## CI job details

The main CI workflow uses Node 20 and pnpm with a frozen lockfile. Its build
job runs shared-contract build, Prisma generation, `pnpm lint`, API build and
Admin build. The separate API test job starts ephemeral Postgres/PostGIS and
Redis, pushes the test schema, runs the API Jest default suite and a
separately isolated dispatch simulation database, then starts the API with
test credentials for selected HTTP scripts. These are CI test environments,
not deployment credentials.

The workflow's job name includes “Lint & Typecheck”; its actual commands are
the lint task and application builds rather than a root `pnpm typecheck`
command. Check the workflow file itself for the exact gate before relying on
any job label.

## Image build and deploy boundaries

The Docker publishing workflow is a GHCR build path for API and Admin. It
contains AWS authentication steps, but the build metadata and push step use
GHCR image references. Separately, `deploy-aws.yml` performs ECS updates after
the GHCR workflow. Confirm the ECS task definition's image registry and
deployment state with the cloud owner; the checked-in sequence does not prove
that a new image reached ECR/ECS.

The production EC2 workflow is a separate path. It builds API/Admin/Mobile,
then accesses a configured EC2 host and runs Compose there. It writes
production environment values from GitHub expressions, but several sensitive
settings have literal fallback values when secrets are absent. Do not copy
those values into a runbook or run this workflow until an authorized owner
has removed the fallbacks, supplied approved secret storage, and verified the
target. The workflow applies Prisma schema synchronization with
`--accept-data-loss`; it does not provide an automated schema rollback.

The Marketing workflow is independent of the EC2 stack. It builds with
Astro, performs its configured SEO report, checks Cloudflare credentials and
deploys a Worker version. It creates preview aliases for pull requests and
non-production dispatches; the production branch/manual mode selects its
production path.

## Mobile release boundaries

The Mobile workflow creates Android release artifacts and a zip containing
an unsigned iOS `Runner.app`, then publishes GitHub release assets. It does
not upload an iOS-signed App Store package or distribute through Play/App
Store. The Employee app is not part of this release workflow. See the
[mobile release runbook](./mobile-release-runbook.md).

## Deployment safety gates

Before any production dispatch, a responsible operator must verify:

1. The target environment and change approval are explicit.
2. The workflow uses the intended image registry, immutable image reference
   and expected services.
3. Required secrets are stored in the approved secret system; no fallback
   or sample value will be used.
4. Database state, backup/restore status and schema compatibility are
   confirmed by the data owner.
5. TLS certificates and DNS resolve to the intended gateway/Worker.
6. API, gateway, frontend and critical business workflows have verified
   post-deploy checks.
7. Rollback ownership and database compatibility are understood before
   deployment begins.

The checked-in workflows do not establish all of these conditions. See
[deployment boundaries](./deployment-overview.md),
[database migration and recovery](./database-migrations-and-backups.md),
[TLS/DNS](./tls-dns-and-certificates.md), and
[health and incident response](./health-and-recovery.md).

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/docker-publish.yml`
- `.github/workflows/deploy-aws.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/deploy-marketing-cloudflare.yml`
- `.github/workflows/mobile-release.yml`
