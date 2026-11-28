---
title: Testing and simulations
description: Automated endpoint test matrix, RBAC & cross-tenant isolation tests, repeatable workflow simulations, load benchmarks, Vitest & E2E verification for AdhocX Fleet.
last_reviewed: "2026-11-27"
---

# Testing and simulations

Every endpoint in `apps/api/src/domains/fleet/` (`FleetDomainModule`) and screen in `apps/fleet` is verified across four layers before completion.

## 1. Endpoint Test Matrix (`apps/api/test/`)

Each endpoint is tested with Jest + Supertest against all 12 conditions:
1. Valid happy-path response & schema contract
2. Invalid request payload (`400`)
3. Missing required fields (`400`)
4. Invalid data types / enum values (`400`)
5. Missing, malformed, or expired JWT (`401`)
6. Forbidden role (`FLEET_MANAGER` vs `FLEET_OWNER`) & cross-fleet `fleetId` isolation (`403` / `404`)
7. Invalid UUID parameter format (`400`)
8. Non-existent resource (`404`)
9. Duplicate submission (`409` — e.g. already associated with another fleet, duplicate code)
10. Simulated database error handling (`500` / `503` without stack-trace leakage)
11. Unexpected server error structured logging
12. Pagination & date-range boundary checks

## 2. Repeatable Simulation Scripts (`apps/api/scripts/simulations/fleet/`)

Run standalone in isolated service-harness mode or against a non-production Postgres instance via `--confirm-host=<db-host>`:

- `pnpm --filter @adhocx/api run sim:fleet:onboarding`
- `pnpm --filter @adhocx/api run sim:fleet:earnings`
- `pnpm --filter @adhocx/api run sim:fleet:incentives`

| Script | Simulated End-to-End Flow | Cleanup & Report |
| :--- | :--- | :--- |
| `fleet-onboarding.sim.ts` | Seed Fleet + Owners -> Copy/Validate Fleet Code -> New & late driver association -> Verify `FleetDriverHistory` + `DRIVER_JOINED` notification -> Assert one-fleet `409` block -> Remove driver & reassign 1:1 vehicle | Deletes seeded test records; writes Markdown/JSON execution report |
| `fleet-earnings-payout.sim.ts` | Seed trips & earnings -> Verify Fleet Owner sees earnings while Driver response omits earnings -> Reject over-balance payout -> Submit valid `FleetPayoutRequest` -> Verify DB state | Deletes seeded test records; writes report |
| `fleet-incentives-support.sim.ts` | Create Target-Based & Time-Based incentives -> Simulate trip/time progress -> Verify `FleetIncentiveProgress`, Driver `/me/incentives`, `INCENTIVE_APPROACHING` / `INCENTIVE_QUALIFIED` notifications -> Create support ticket & reply | Deletes seeded test records; writes report |

Simulations enforce `NODE_ENV !== 'production'` and write reports into `apps/api/scripts/simulations/fleet/reports/`. HTTP 12-case matrix coverage lives in `apps/api/test/fleet-endpoints-matrix.spec.ts` alongside service specs (`fleet-phase5.spec.ts`).

## 3. Performance, Security & Frontend Verification

- **Load & Concurrency (`apps/api/test/load/fleet-load.spec.ts`)**: Verifies `p95 < 250ms` across `listDrivers`, `getLiveOperations`, `getEarnings`, and `listNotifications` with 1,000+ drivers and 10,000+ trips across 20 fleets; verifies atomic CAS locks on concurrent Fleet Code associations (`409` on second association) and concurrent payout requests (`400 INSUFFICIENT_FLEET_BALANCE` on double-draw); verifies attachment MIME allowlist and traversal/cross-fleet key blocks.
- **Cross-Tenant & Security Audit (`apps/api/test/fleet-security-audit.spec.ts`)**: Attempts cross-fleet read/mutation across every portal service (`Fleet B` against `Fleet A` resources) and verifies hardcoded-secret & forbidden-route absence.
- **Frontend Unit & SSR Tests (`apps/fleet/src/__tests__/`)**: Executed via `pnpm --filter @adhocx/fleet test` (`vitest`) verifying adaptive skeletons, empty/error/retry states, confirmation dialogs, role gating, forbidden route exclusion, API error envelope parsing, and `401` session clearing.
- **Browser E2E & Responsive Verification**:
  - Playwright specs in `apps/fleet/e2e/` (`auth-and-dashboard.spec.ts`, `drivers-and-live-ops.spec.ts`, `earnings-incentives-support.spec.ts`) covering Desktop (`1440px`), Tablet (`768px`), Mobile (`375px`), and Light/Dark themes (requires `@playwright/test` in CI/browser test runner).
  - Live headless Chrome DevTools verification script (`apps/fleet/scripts/verify-live-browser-e2e.mjs`) booting `next start` and driving local headless Chrome across viewports/themes to verify live DOM rendering without runtime errors or horizontal overflow.
