---
title: Test Execution and Isolation Runbook
description: Verified AdhocX test commands, safe database setup, and limits of CI and package scripts.
---

# Test Execution and Isolation Runbook

**Evidence status:** Commands below were reconciled with current package
scripts, Jest configuration, Flutter manifests, CI and test setup. This page
does not claim that every suite was executed during the documentation audit.

## Before running tests

1. Install the pinned workspace dependencies with `pnpm install --frozen-lockfile`.
2. Use test credentials and a disposable local database for integration
   suites. Never copy a production `DATABASE_URL` into a test shell.
3. Do not assume a root `pnpm test` ran the Flutter suites: the Mobile and
   Employee package `test` scripts only print a reminder to run `flutter test`.
4. Read the suite's setup code before enabling any live-provider smoke test.
   The API Jest setup clears known live provider secrets by default, but does
   not choose a safe database for you.

## API Jest unit/service suite

The default Jest config discovers `*.spec.ts` files under API `src` and
`test`. The checked-in inventory contains 116 such files.

From the repository root:

```powershell
pnpm --filter @adhocx/contracts build
pnpm --filter @adhocx/api exec prisma generate
pnpm --filter @adhocx/api exec jest --ci
```

Equivalent direct commands from `apps/api` are `npx prisma generate` and
`npx jest --ci`. The test setup replaces known provider-secret environment
variables with empty strings; individual tests should supply fake values when
needed. Avoid `MSG91_LIVE_SMOKE_PHONE` unless intentionally running the
documented opt-in live SMS smoke test with credentials that you control.

## Database-backed API dispatch simulation

The separate `*.int-spec.ts` suite must use a disposable local database. Its
safety check requires a local hostname and a database name containing `sim`
or `test`. CI creates a separate `adhocx_sim` database; do not point this
suite at a shared development or production database.

PowerShell example, after a local PostgreSQL service and the empty test
database are available:

```powershell
$env:SIMULATION_DATABASE_URL = 'postgresql://test_user:test_password@127.0.0.1:5432/adhocx_sim?schema=public'
$env:DATABASE_URL = $env:SIMULATION_DATABASE_URL
Set-Location apps\api
npm run test:sim -- --ci
```

For bash, set both environment variables to the same disposable local
`adhocx_sim` URL before running `npm run test:sim -- --ci`. The suite invokes
real API business services and writes test records; use only the isolated
database and inspect its source safety check before changing the target.

The `test:e2e` manifest entry is currently not a working alternative: it
references `apps/api/test/jest-e2e.json`, which is absent. The CI's coupon and
live-dispatch scripts are separate test-server smoke flows, not that Jest
target.

## Shared package tests

```powershell
pnpm --filter @adhocx/contracts test
pnpm --filter @adhocx/domain-core test
```

`pnpm test:contracts` is also defined at the repository root. CI builds the
contracts package but does not execute these package Jest suites.

## Flutter app tests

Run the app's widget/unit suite from its own directory after dependencies are
available:

```powershell
Set-Location apps\mobile
flutter pub get
flutter test

Set-Location ..\employee_app
flutter pub get
flutter test
```

Run the Employee commands independently if its dependency setup is needed.
The same commands in bash use `cd apps/mobile` and `cd apps/employee_app`.
These commands execute Flutter tests; they are not emulator/device
integration tests. The package-level `pnpm test` commands are placeholders
and do not substitute for them.

## API load and concurrency harness

The Corporate load harness uses a dedicated Docker Compose project with
Postgres bound to `127.0.0.1:55432`, Redis bound to `127.0.0.1:56379`,
temporary database storage, and test-only API credentials. Its helper refuses
non-local database/Redis hosts. It builds the API, pushes the schema to that
dedicated database, and then runs the configured dispatch, acceptance,
telemetry, dashboard-read and scheduler phases.

From the repository root:

```powershell
node apps/api/load-test/setup.mjs
node apps/api/load-test/run.mjs --routes=1000 --instances=2 --concurrency=200 --seconds=30
node apps/api/load-test/setup.mjs --down
```

The run defaults are encoded in `apps/api/load-test/run.mjs`. Setup uses
`prisma db push --accept-data-loss` against its hard-coded isolated local
database, and `--down` removes only the named `adhocx-loadtest` Compose
resources and volume. Do not edit the target to a shared database. The suite
is manual and is not part of CI.

## Marketing build and SEO validation

```powershell
pnpm --filter @adhocx/marketing build
pnpm --filter @adhocx/marketing seo:check
```

The build's `postbuild` hook already runs the SEO checker against generated
output. By default, SEO errors are printed but do not fail the process. To
make SEO errors fail a local build:

```powershell
$env:SEO_STRICT = '1'
pnpm --filter @adhocx/marketing build
if ($LASTEXITCODE -ne 0) { throw 'Marketing build/SEO validation failed.' }
Remove-Item Env:SEO_STRICT
```

For bash, prefix the build with `SEO_STRICT=1`. The Marketing deployment
workflow does not currently set strict mode.

## Docusaurus build and typecheck

```powershell
pnpm --filter @adhocx/docs build
pnpm --filter @adhocx/docs typecheck
```

The Docusaurus configuration throws for broken configured links but only
warns for broken Markdown links. Review build warnings rather than treating a
zero exit code as proof that no Markdown link needs attention. Browser checks
are described in the [browser QA plan](./browser-qa-plan.md).

## Workspace commands and CI limits

The root `pnpm test` and `pnpm test:unit` delegate through Turbo to package
scripts. They do not automatically run every suite listed in this runbook:
Flutter package scripts are placeholders, and the Next.js/Astro/Docusaurus
packages have no test scripts. Prefer the explicit commands above.

`.github/workflows/ci.yml` runs API Jest, a separate real-Postgres dispatch
simulation, and coupon/live-dispatch test-server scripts. It does not run
Flutter tests, the shared-package Jest tests, frontend source-regression
scripts, browser automation, API load tests or Docusaurus validation.

## Sources

- `package.json`, `turbo.json`, and each workspace `package.json`
- `apps/api/jest.config.js`, `apps/api/test/setup.ts`, and `apps/api/test/integration/dispatch-simulation.int-spec.ts`
- `apps/api/load-test/setup.mjs`, `run.mjs`, and `lib.mjs`
- `.github/workflows/ci.yml`, `.github/workflows/mobile-release.yml`, and `.github/workflows/deploy-marketing-cloudflare.yml`
- `apps/marketing/scripts/seo-check.mjs` and `apps/docs/docusaurus.config.ts`
