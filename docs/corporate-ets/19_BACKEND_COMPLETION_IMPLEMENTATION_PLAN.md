# 19 — Backend Completion Implementation Plan (closes doc 18)

> **Every agent:** read `18_PRD_VS_CODE_GAP_AUDIT_2026-11-03.md` first. Follow `docs/20_AI_AGENT_RULES.md`, and
> `docs/04_DESIGN_SYSTEM.md and apps/marketing/DESIGN_AND_UI.md` + `docs/05_UI_UX_GUIDELINES.md` for any UI work. Work on `staging` only.
> Do not call anything "100% complete" unless `tsc`, jest (IST **and** `TZ=UTC`) and the relevant simulation pass.

## 0. Architecture decisions (binding)

**Bounded contexts** under `apps/api/src/domains/corporate/` (one folder = one domain, its own module, controller, service, types, tests):

| Domain folder | Owns | PRD IDs |
|---|---|---|
| `tenants/` (exists) | tenants, offices, departments, cost centers, corporate users + 6 roles, office scope, policies (cutoffs) | CP-ADM, COR-01, ADH-01 |
| `rosters/` (exists) + `scheduling/` | shift templates, holidays, roster versions draft→approved→published, demand gen, nightly auto-plan after cutoff | CP-ROS, COR-04 |
| `routing/` (exists) | plan versions, async optimise job, unserved reasons | RTE-* |
| `supply/` (new) | ETS driver/vehicle eligibility (verification, insurance/permit expiry, seats, suspension), duty-hour limits, operating zones | ALLOC-01/06, ADM-04..07, DRV-01..05 |
| `dispatch/` (exists) | persisted `corporate_driver_offers`, ranking, escalation of at-risk routes, driver offer inbox | ALLOC-02..05, DRV-06..08 |
| `execution/` (exists) | trips, stops, boarding, no-show, trip events, reassignment events | DRV-09..12 |
| `tracking/` (new) | GPS ingest → Redis Stream → batched writer → `corporate_vehicle_positions` (time-partitioned); freshness/stale state; playback | OPS-01/06, EMPAPP-08 |
| `rider/` (new) | employee self-service: `/me`, schedule, trips, tracking, notification inbox, history, feedback | EMPAPP-*, EMP-* |
| `safety/` (exists) | incident lifecycle new→ack→investigating→escalated/resolved→closed, escalation timers, support tickets/complaints | SAFE-*, CP-SAFE, OPS-03/05 |
| `operations/` (new) | command-centre live board, at-risk queue, manual reassign (audited), trip timeline | OPS-*, ADH-04 |
| `analytics/` (new) | dashboard + reports KPIs (attendance, late, no-show, on-time %, utilisation) with documented definitions and `asOf` | CP-DASH, CP-RPT, COR-02 |
| `billing/` (exists) + `payouts/` (new) | versioned corporate rate cards; separate driver rate cards; invoice disputes/credits; payout batch FSM + idempotent submit + reconciliation | §12, ADH-05/06, DRV-13/14 |

**Scale rules ("millions of writes"):**
- Hot paths (GPS, offers, timers) write to Redis first. Postgres receives **batched** inserts (GPS: one `createMany` per ≤500 rows / ≤2 s). Sizing: 10 k cabs × 1 fix per 15 s ≈ 670 writes/s ≈ 58 M rows/day, so the table is partitioned by day with a retention job.
- Every state change is a conditional update (`updateMany where status = X`) or runs in a transaction. Unique keys make retries idempotent (offers: `(routeId, driverId, attempt)`; payouts: `idempotencyKey`).
- Each new table gets a `tenantId` (where tenant-owned), indexes on `(tenantId, …date)`, and money in `BigInt` paise.
- Schema changes are **additive only**. Each workstream adds its models in its own marked block in `schema.prisma` and a hand-written SQL migration `prisma/migrations/2026110300xx_<workstream>/migration.sql`.

## 1. Workstreams (run in parallel)

Each workstream ships: code + `test/corporate-<ws>-*.spec.ts` with **10–30 tests** (happy, negative, concurrency/idempotency, tenant-isolation, audit) + one simulation spec.

### WS-A Supply eligibility + persisted offers + escalation
1. `supply/driver-eligibility.service.ts`: driver VERIFIED, not suspended, has a VERIFIED vehicle whose category matches the route and whose seats ≥ route maxCapacity, `insuranceExpiry` > route end. **Null vehicle type must NOT match.** Duty limit: ≤ N committed hours per 24 h (`CORPORATE_MAX_DUTY_HOURS`, default 12).
2. `CorporateDriverOffer` table (created/sent/accepted/rejected/expired/withdrawn, `expiresAt`, `respondedAt`, `reason`). Redis stays the fast path; the DB is the audit trail. Late accept of expired/withdrawn → 409.
3. Ranking: ETA to pickup, then acceptance rate, then fewest ETS duties today (fairness).
4. Escalation: a route still unassigned at `pickup1 − CORPORATE_ESCALATION_LEAD_MIN` (default 30) → `atRisk = true`, ops alert event `corporate.route.at_risk`, notify admins.
5. `GET /corporate/dispatch/driver-offers` (driver's pending offer, for app reconnect) and `GET /corporate/dispatch/driver-duties` (upcoming committed routes).
Tests: eligibility matrix, expiry, seats, null type, duty overlap, offer FSM, late accept, ranking order, escalation timing IST/UTC, 50-driver concurrent accept.

### WS-B Tracking + trip events
1. `CorporateVehiclePosition` (routeId, driverId, lat, lng, speed, heading, accuracy, battery, recordedAt, receivedAt). Daily partitioning in raw SQL.
2. `ingestTelemetry` → `XADD corporate:gps:stream`. Then a `TelemetryWriter` (every instance, consumer group) batch-writes. Keep the existing Redis latest-position key.
3. Freshness: `LIVE` ≤ 45 s, `STALE` ≤ 180 s, else `OFFLINE`. It is returned on every tracking read.
4. `CorporateTripEvent` (routeId, stopId?, type, actorId, actorRole, payload, at): written by execution/dispatch/replanning for every transition. `CorporateRouteAssignmentEvent` for reassign/replace history.
5. `GET /corporate/trips/routes/:id/tracking`, `GET …/timeline`, `GET …/playback?from&to`.
Tests: batching, idempotent re-delivery, stale thresholds, out-of-order fixes, playback ordering, a 10 k fixes/s burst simulation.

### WS-C Rider (employee) API + safety lifecycle + support
1. `rider/`: `GET /corporate/me`, `/me/schedule?from&to` (with cutoff + canModify), `/me/trips` (history), `/me/trips/next`, `/me/trips/:routeId/tracking` (only the employee's own route; driver name/photo/plate/model, ETA, GPS freshness; no driver phone, which goes through a masked contact), `/me/notifications` (persisted inbox), `POST /me/trips/:routeId/feedback`, `POST /me/trips/:routeId/safe-reach`.
2. Safety: `POST alerts/:id/acknowledge|investigate|escalate|close`, transitions guarded, responder + timestamps + notes; escalation timer (unacked after `CORPORATE_SOS_ACK_SLA_SEC`, default 120 s → escalate).
3. `CorporateSupportTicket` (complaint, lost property, unsafe driving, billing): employee/corporate create; admin update.
Tests: cross-employee isolation, unassigned states, FSM illegal transitions, escalation timer, ticket scoping.

### WS-D Operations (command centre) + analytics
1. `operations/`: `GET /corporate/ops/board` (counts and lists by PLANNED/DISPATCHING/at-risk/ASSIGNED/IN_TRANSIT, stale GPS), `POST /corporate/ops/routes/:id/reassign` (withdraw current offer/assignment, audited reason, notify employees + old/new driver), `POST …/unassign`.
2. `analytics/`: `GET /corporate/analytics/dashboard?tenantId&officeId&from&to&direction` (scheduled/planned/assigned/active/completed/cancelled/unserved trips **and** employees served, on-time %, no-shows, seat utilisation, `asOf`), `GET …/attendance` (per employee: rides, no-shows, late days), `GET …/reports/:type.csv`. Every metric has numerator, denominator, timezone (IST) in `analytics/metric-definitions.ts`.
Tests: KPI math on fixture data, tenant isolation, office filter, CSV, reassign race, IST day boundaries.

### WS-E Billing rate cards + payouts
1. `CorporateRateCard` (tenant, vehicleCategory, basePaise, perKmPaise, perHourPaise?, minimumPaise, noShowPaise, effectiveFrom/To, version) and `CorporateDriverRateCard` (same pattern, no tenant). **Remove hard-coded fares from dispatch**: the offer payout comes from the driver card, the invoice from the corporate card. Fallback = current constants, logged.
2. Payout batch FSM: `CorporatePayoutBatch` DRAFTED→APPROVED (maker≠checker)→SUBMITTED→PROCESSING→PAID/FAILED→REVERSED; per-driver `CorporatePayout` with `idempotencyKey` unique; retry of FAILED reuses the key; PAID only on a provider confirmation call/webhook.
3. Reconciliation endpoint; invoice disputes + credit notes (immutable, never edit an issued invoice).
4. Corporate responses never include driver payout/margin fields (test it).
Tests: effective-date selection, mid-period change, paise rounding, maker-checker, duplicate submit, failed retry, reconciliation mismatch, dispute.

### WS-F Tenancy roles + scheduling + autonomous planning
1. Roles: add `corporateRole` on User (SUPER_ADMIN, HR, TRANSPORT, FINANCE, SAFETY, READ_ONLY) + `officeIds` scope. Keep the existing `UserRole` enum and map the role to permissions in the guard. Invite endpoint.
2. Departments + cost centers tables. Tenant policy table (cancelCutoffHours default 9, maxRideMinutes, vehicleCategory, capacity, escalation lead).
3. Shift templates (login/logout times, weekdays, overnight flag) + holidays; roster versions (DRAFT→APPROVED→PUBLISHED; publish generates demand idempotently).
4. **Autonomous nightly planner:** at `shiftDate − cutoff`, for every published roster without routes, run optimise and persist (multi-instance safe lock). This closes the "no human needed" gap.
Tests: role permission matrix, office scope, policy-driven cutoff, overnight shift dates, idempotent publish, auto-plan lock.

## 2. Integration gate (after merge)
`pnpm -C apps/api exec tsc --noEmit`; jest `-w 4` in IST and `TZ=UTC`; the 500-commute simulation; the load test (`apps/api/load-test`, needs Docker). Then update docs 03/14/15 to match reality.
