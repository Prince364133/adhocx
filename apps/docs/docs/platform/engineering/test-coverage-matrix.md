---
title: Test Coverage and Ownership Matrix
description: Source-grounded inventory of automated verification, CI execution, and remaining AdhocX QA gaps.
---

# Test Coverage and Ownership Matrix

**Evidence status:** Source-verified against test files, package scripts,
workspace configuration and checked-in workflows. “Present” means source
exists; it does not mean the test was run in this audit or that the feature
has exhaustive coverage.

## Application and layer matrix

| Area | Existing evidence | Runner / CI status | Coverage status and remaining gap |
|---|---|---|---|
| API unit/service behavior | 116 Jest `*.spec.ts` files; includes a 12-simulation Corporate ETS lifecycle suite using real Nest services with in-memory Prisma/Redis test doubles | `pnpm --filter @adhocx/api exec jest --ci`; CI runs `npx jest --ci` | Partial. The in-memory service simulation is not an HTTP/browser or real-database test. Map critical routes/features to assertions and record results; file count is not a feature-coverage metric |
| API dispatch lifecycle | `apps/api/test/integration/dispatch-simulation.int-spec.ts` uses real Postgres and bounded deterministic routing stubs | `test:sim`; CI provisions a separate `adhocx_sim` database and runs the simulation | Partial. One scenario set does not certify all dispatch, safety, finance or provider paths |
| API live HTTP smoke tests | `scripts/seed-and-test-coupons.js` and `scripts/test_live_dispatch_e2e.js` | Invoked by the CI workflow against its test API and test database | Partial. These are selected flows, not a general endpoint suite or browser workflow |
| API `test:e2e` script | Manifest command points to `test/jest-e2e.json`; that path is absent | Not runnable as checked in; not used by CI | Gap: restore/create the intended config and tests or remove/replace the stale script |
| API concurrency/load | Current checked-in harness under `apps/api/load-test/`; separate 2026-11-10 k6 benchmark/correctness reports are historical and their scripts are absent | Current harness is manual/local-only; historical k6 scripts cannot be rerun from this repository | Partial. Run the checked-in harness only on its dedicated throwaway local Postgres/Redis; dated benchmark results are not a current capacity threshold |
| Shared contracts/domain | Nine Jest `*.spec.ts` files across `packages/contracts` and `packages/domain-core` | Package `test` scripts; `pnpm test:contracts` targets contracts; CI builds contracts but does not execute package Jest tests | Partial. Add or run a clear domain-core test target in CI if these assertions are release gates |
| Admin | One `node:test` source-regression script at `apps/admin/scripts/e2e-flow-simulation.test.mjs` | No package `test` script and no CI invocation | Partial. Includes selected helper/source and simulated HTTP checks; does not launch a browser or exercise the rendered app |
| Ops | One `node:test` source-regression script at `apps/ops/scripts/e2e-flow-simulation.test.mjs` | No package `test` script and no CI invocation | Partial. Covers selected helpers and source wiring; not a browser or live API test |
| Corporate | One `node:test` source-regression script at `apps/corporate/scripts/e2e-flow-simulation.test.mjs` | No package `test` script and no CI invocation | Partial. Covers selected source/helper expectations; not a browser or live API test |
| Admin/Ops/Corporate browser flows | No browser automation configuration or package test scripts found | Manual QA plan only | Gap. No cross-browser execution record, login/role journey suite or frontend-to-API browser test is checked in |
| Mobile driver/vendor app | 31 Flutter `*_test.dart` files under `apps/mobile/test/` | Run `flutter test` from `apps/mobile`; no Flutter test job in CI | Partial. Widget/unit assertions exist; Android/iOS device, plugin and release acceptance still need a recorded matrix |
| Employee commuter app | 23 Flutter `*_test.dart` files under `apps/employee_app/test/` | Run `flutter test` from `apps/employee_app`; no Flutter test job in CI | Partial. Widget/unit assertions exist; device, permission and end-to-end commute flows need recorded runtime evidence |
| Marketing site | Astro build runs the SEO checker against generated output; `seo:check` is also available | Marketing deployment workflow builds the app; SEO errors do not fail unless `SEO_STRICT=1` | Partial. SEO output checks are source-present, but normal CI is report-only and browser form/navigation behavior is not automated |
| Docusaurus site | Production build, Mermaid configuration and TypeScript check | Local commands are documented; no docs CI job found | Partial. `onBrokenLinks: 'throw'`; `onBrokenMarkdownLinks: 'warn'`. Review warnings and manually inspect responsive layout/diagrams |

## Test evidence versus product behavior

The API integration simulation exercises the marketplace dispatch lifecycle
using real Postgres and deterministic routing/push substitutes. The separate
Corporate load harness exercises multi-instance dispatch races, acceptance
races, telemetry, dashboard reads and the scheduler against a local test
stack. Neither should be described as proof that all API routes, providers or
business features are verified.

The Admin, Ops and Corporate files are named “E2E flow simulation” but their
assertions primarily call pure helpers and inspect source text; Admin also
simulates a limited local HTTP round trip. They do not automate a user in a
browser. Their direct `.ts` imports also require a compatible Node runtime;
the CI workflow uses Node 20 and does not currently run them.

Flutter file counts do not identify which device/plugin integrations have
been exercised. `flutter test` is the documented automated command;
emulator/physical-device acceptance is a separate manual activity.

## Test ownership

There is no checked-in `CODEOWNERS` or named test-owner file. Treat this as a
proposed assignment model until maintainers accept and record ownership:

| Surface | Proposed accountable owner | Required partner for cross-layer failures |
|---|---|---|
| API and shared packages | API/service maintainer | Feature owner or data owner |
| Admin, Ops, Corporate | Corresponding frontend maintainer | API maintainer |
| Mobile and Employee | Corresponding Flutter app maintainer | API maintainer; release owner for device sign-off |
| Marketing | Marketing maintainer | API/product owner for lead submission |
| Documentation | Documentation maintainer | Subject-matter owner for application claims |

## Follow-up gaps

1. Make the API `test:e2e` command valid or remove it.
2. Wire the three frontend source-regression scripts into named package
   commands and CI after confirming supported Node/TypeScript loading.
3. Add browser automation or keep a repeatable, evidence-backed manual browser
   release checklist for Admin, Ops, Corporate and Marketing.
4. Add Flutter tests to an appropriate CI job and document supported emulator
   and physical-device targets.
5. Decide whether SEO violations should fail the Marketing deployment; strict
   mode is currently opt-in.
6. Add docs build/typecheck and visual/link-warning review to CI if the docs
   site is a release-critical artifact.
7. Assign owners and maintain a route/feature-to-test mapping for critical
   user journeys.

See the [QA overview](./testing-overview.md),
[browser plan](./browser-qa-plan.md),
[device matrix](./mobile-device-test-matrix.md), and
[execution runbook](./test-execution.md).
