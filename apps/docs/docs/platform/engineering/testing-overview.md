---
title: Testing and QA Overview
description: Source-verified test layers, continuous-integration evidence, and current QA gaps across AdhocX.
---

# Testing and QA Overview

**Evidence status:** Checked against workspace manifests, test files, the
GitHub Actions workflows, and the Marketing/Docusaurus configuration. File
counts are a repository snapshot, not a coverage percentage.

## What the repository currently tests

| Area | Checked-in evidence | How it is executed today | Important limit |
|---|---|---|---|
| API unit/service tests | 116 Jest `*.spec.ts` files in the API source and test trees, including a 12-simulation Corporate ETS full-lifecycle suite | The default API Jest configuration; the CI workflow runs `npx jest --ci` | The lifecycle suite uses real Nest services with in-memory Prisma/Redis test doubles; it is not an HTTP/browser test or real-database run. A file count does not prove that every endpoint or feature has a test |
| API dispatch simulation | One `*.int-spec.ts` suite, `apps/api/test/integration/dispatch-simulation.int-spec.ts` | `test:sim` against a disposable local Postgres database; CI provisions a separate simulation database | It exercises a bounded marketplace dispatch lifecycle, not every integration |
| API HTTP smoke/E2E scripts | Coupon verification and live dispatch/fulfillment scripts | CI starts a test API with test database/Redis credentials and invokes the scripts | These do not replace a general browser-driven suite; `test:e2e` currently references a missing Jest config |
| API load and concurrency | `apps/api/load-test/` harness with Postgres, Redis, multiple API instances, dispatch races, telemetry and reads | Manual, local-only Docker Compose workflow | It is not run by CI and writes disposable test data; follow its local-target guard and cleanup instructions |
| Shared contracts and domain packages | Nine Jest `*.spec.ts` files across `packages/contracts` and `packages/domain-core` | Package Jest scripts; CI builds contracts but does not run these Jest suites | A package build is not equivalent to executing the tests |
| Admin, Ops and Corporate | One Node built-in `node:test` source-regression file in each app's `scripts/` directory | Files exist, but no app `test` script or CI job invokes them | They inspect source/helpers and simulate selected cases; they are not browser E2E tests. Their direct TypeScript imports also need an explicitly supported Node loader before CI adoption |
| Mobile driver/vendor app | 31 Flutter `*_test.dart` files | `cd apps/mobile; flutter test` | The package `test` script only prints a reminder; it does not run Flutter tests. No Flutter test job was found in CI |
| Employee app | 23 Flutter `*_test.dart` files | `cd apps/employee_app; flutter test` | The package `test` script only prints a reminder; it does not run Flutter tests. No Flutter test job was found in CI |
| Marketing | Astro production build plus `scripts/seo-check.mjs` | `pnpm --filter @adhocx/marketing build` invokes `postbuild`; `seo:check` reruns the checker | SEO errors are report-only unless `SEO_STRICT=1`; there is no browser automation suite |
| Documentation site | Docusaurus production build, Mermaid rendering and TypeScript check | `pnpm --filter @adhocx/docs build` and `typecheck` | Docusaurus throws for configured broken links, but broken Markdown links are warnings. No dedicated docs browser suite or CI job was found |
| Admin/Ops/Corporate browser behavior | No Playwright, Cypress, WebDriver or equivalent browser-test configuration found | Manual browser QA is currently needed | Route-level browser automation, cross-browser checks and formal execution records are gaps |

The API's `test:e2e` package script points to
`apps/api/test/jest-e2e.json`, which is not present in the repository. Do not
count that script as a runnable E2E suite until the config or script is fixed.
The separate CI smoke scripts do run and are documented in the
[coverage matrix](./test-coverage-matrix.md).

The checked-in [5,000-driver benchmark](../../apps/api/testing/load/24_LOAD_TEST_5000_DRIVERS.md)
and [k6 dispatch-correctness report](../../apps/api/dispatch/testing/25_DISPATCH_CORRECTNESS_SIMULATION.md)
are dated 2026-11-10 snapshots. Their k6 scripts were not committed; their
results are historical evidence, not repeatable current commands or a
production capacity guarantee. The current checked-in load harness is the
separate local-only tool described in the [execution runbook](./test-execution.md).

## CI is not the same as the whole test inventory

The main workflow at `.github/workflows/ci.yml` runs dependency
installation, shared-contract build, Prisma generation, lint, API/Admin
builds, API Jest tests, a 50-ride dispatch simulation, and test-server coupon
and dispatch/fulfillment checks. It does **not** run the Flutter test suites,
the shared-package Jest tests, the Admin/Ops/Corporate source-regression
scripts, browser automation, the API load harness, or a Docusaurus build.

The Marketing deployment workflow builds the Astro site, which runs the
SEO checker in report-only mode unless its environment explicitly enables
strict checking. The Mobile release workflow builds distribution artifacts;
that workflow is build evidence, not Flutter test evidence.

## Ownership and evidence

No repository `CODEOWNERS` file or named test-owner registry was found. The
following is a suggested responsibility map, not an existing assignment:

| Test area | Suggested accountable role |
|---|---|
| API, database-backed behavior, dispatch and provider adapters | API/service maintainer; coordinate with the relevant feature owner |
| Admin, Ops and Corporate browser workflows | Respective web-app maintainer, with API maintainer for cross-layer failures |
| Mobile driver/vendor app | Mobile maintainer; involve the release owner for physical-device sign-off |
| Employee commuter app | Employee-app maintainer; involve the release owner for physical-device sign-off |
| Marketing content, lead workflow and SEO | Marketing maintainer, with API/product owner for lead submission behavior |
| Documentation build, links and diagrams | Documentation maintainer; feature owner verifies domain-specific claims |

The [test coverage matrix](./test-coverage-matrix.md) separates existing
automated evidence from recommendations. The [browser QA plan](./browser-qa-plan.md),
[mobile device matrix](./mobile-device-test-matrix.md), and
[test execution runbook](./test-execution.md) provide actionable manual
coverage and safe commands.

## Sources and verification

- `package.json`, workspace package manifests, and `turbo.json`
- `apps/api/jest.config.js`, `apps/api/test/`, and `apps/api/load-test/`
- `apps/mobile/test/` and `apps/employee_app/test/`
- `apps/admin/scripts/`, `apps/ops/scripts/`, and `apps/corporate/scripts/`
- `.github/workflows/ci.yml`, `.github/workflows/deploy-marketing-cloudflare.yml`, and `.github/workflows/mobile-release.yml`
- `apps/marketing/scripts/seo-check.mjs` and `apps/docs/docusaurus.config.ts`
