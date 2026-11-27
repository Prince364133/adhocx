# 08 — API Migration Assessment

Assessment for planning extraction/migration of API endpoints. Based on verified coupling analysis (DI graph, shared Prisma schema, Redis keys, guard chain, frontend consumers).

---

## 1. APIs suitable for independent migration (low coupling)

These touch few shared services, have no dispatch/payout criticality, and map cleanly to bounded contexts:

| Group | Endpoints | Why independent | Migration notes |
|---|---|---|---|
| Content & marketing | blogs (10), leads (3), coupons admin reads, feature-flags admin (5) | own tables (`BlogPost`, `LeadCapture`, `Coupon`, `FeatureFlag`), public reads, admin writes | trivially extractable; keep public GETs behind CDN-friendly routes |
| Health/version/uploads | health×3, app/version, uploads×4 | infra only | move with platform layer, not per-domain |
| Reviews | 3 | thin: `Review` table + JWT | depends on `Trip`/`Driver` IDs — keep ID references stable |
| Admin reports (read-only analytics subset) | `/admin/reports/*`, `/admin/analytics/*`, `/admin/finance/*` (≈15) | read-only aggregates | can become a reporting service; heavy DB scans — watch load |
| Corporate analytics | 5 | read-only, tenant-scoped | same caveat; depends on tenant context machinery |
| KYC (Digio) | 40 | self-contained client + `DigioVerification` table | webhook must move with it; ⚠ fix unguarded paid routes during migration |
| Notifications admin campaigns | ~6 of 18 | admin-only fan-out | keep device-token/in-app endpoints with user-facing service |

## 2. APIs with strong dependencies (high-risk / migrate last)

| Group | Endpoints | Coupling |
|---|---|---|
| **Corporate ETS core** (dispatch, execution, tracking, routing, rosters, scheduling, safety, ops) | ~120 | `CorporateDispatchService` (~1.9k lines) shares Redis keys, `DriverEligibilityService`, rate cards, telemetry pipeline, tenant extension, `CorporateAccessGuard`, in-process schedulers. Extraction requires moving the whole subdomain or careful anti-corruption layer. |
| **Corporate billing/payouts** | ~25 | dual-ledger correctness, maker-checker, idempotency keys, provider webhook, `db.$transaction`, TDS math. Financial correctness — highest blast radius. |
| **Marketplace dispatch + trips** | ~40 (requirements/offers/assignments/trips/dispatch internals) | Redis geo index, wave scheduler, offer expiry reaper, `TripEvent` recorder, pricing snapshots, `ModuleRef` circular dep on `DistancePricingService`. State machine in `packages/contracts`. |
| **Payments/settlements/ledger/subscriptions** | ~27 | Razorpay webhook contract, wallet invariants (`$transaction` + `LedgerEntry`), in-memory top-up order store (must be fixed before any scaling/migration). |
| **Auth** | 18 | JWT issuance/blacklist/revocation/min-iat shared by every guarded endpoint; OTP store, MFA, social, role aliases in `RolesGuard`. Must migrate first or be shared as a service. |
| **Drivers/vendors core** | ~16 | `Driver` model is referenced by dispatch, trips, earnings, corporate supply, admin — schema changes ripple everywhere. |

## 3. Duplicate / overlapping APIs (verified)

| Pair/cluster | Evidence | Recommendation |
|---|---|---|
| `POST /trips/:id/arrive` **and** `/trips/:id/arrived` | `trips.controller.ts` — both → `markArrived` | deprecate one alias during migration |
| `POST /auth/password/reset` **and** `/auth/reset-password`; `/auth/refresh` **and** `/auth/refresh-token` | `auth.controller.ts` | keep one canonical each |
| `POST /payments/wallet/top-up/create-order` **and** `/wallet/top-up/order` | `payments.controller.ts` | alias; consolidate |
| `POST /corporate/trips/routes/:id/stops/:stopId/confirm-safe-reach` **and** `POST /corporate/safety/routes/:id/stops/:stopId/confirm-safe-reach` | `corporate-trip-execution.controller.ts` vs `corporate-safety.controller.ts` | same-named action in two controllers — verify whether distinct logic or duplication |
| `PATCH /corporate/support/tickets/:id/assignment` **and** `/assign`, `/priority`, `/comments`, `/notes` **and** `/ops/.../updates` | `corporate-support-ticket.controller.ts` | overlapping admin ticket ops — consolidate |
| `GET /admin/reports/corridors` **and** `GET /admin/corridors`; `GET /admin/reports/analytics-trends` **and** `GET /admin/analytics/trends`; `GET /admin/reports/analytics` | `admin.controller.ts` | reporting aliases |
| `POST /vendors/profile` **and** `PATCH /vendors/profile` plus `GET` on same path | `vendors.controller.ts` | normal REST, not a defect |

## 4. Potentially unused APIs (evidence-based)

| Candidate | Evidence | Confidence |
|---|---|---|
| Entire `route_planner_app.py` Flask app (8 endpoints) | no imports/references from `apps/*`; in-memory state; duplicates NestJS routing | **High** — verify with team before removal |
| `apps/employee` folder | marked deprecated in repo docs/structure | Medium — verify |
| `GET /admin/corridors` alias | duplicated by `/admin/reports/corridors` | Medium |
| `/auth/check-phone` GET **and** POST | dual registration for same lookup | Low — may serve different clients |
| Public pricing GETs (`/pricing*`) | consumed by marketing app — likely used | keep |

*Cannot verify client-side usage definitively without telemetry — confirm with frontend teams.*

## 5. Migration risks

1. **Shared database** — one Postgres schema for all domains; any service split needs shared-DB (anti-pattern long-term) or data migration. `Corporate*` tenant extension assumes single Prisma client.
2. **Auth coupling** — every protected endpoint depends on `JwtAuthGuard` + Redis blacklist + role aliases; migrating auth last blocks everything.
3. **Redis key contracts** — dispatch queues, offer holds, geo index, stream tickets are implicit cross-component contracts; splitting services without moving keys breaks dispatch/tracking.
4. **In-process schedulers/jobs** — 9 background jobs listed in `07`; any horizontal scaling or extraction must relocate them (leader election or job queue).
5. **In-memory degradations** — wallet top-up orders (`payments.service.ts` Map), Redis fallback paths; financial flows assume single instance.
6. **Webhook contracts** — Razorpay HMAC, Digio signature, payout-provider callback; endpoints must move with their verification logic.
7. **SSE/ticket auth** — `?ticket=` flow couples tracking + notifications + Redis ticket store.
8. **Tenant isolation gaps** — `tenant-prisma.extension.ts` covers ~10 models for reads; writes/`$queryRaw` unscoped — any new service must re-implement scoping or leaks cross tenants.
9. **Frontend coupling** — 3 Next.js portals + 2 Flutter apps call fixed paths; route aliases/duplicates mean clients may depend on either variant.
10. **`packages/contracts` DTOs/state machines** — shared enums + `state-validator.ts` must version alongside any extracted service.

## 6. Recommended migration order

1. **Foundation:** auth/session service (JWT, OTP, refresh, blacklist) + shared contracts package versioning.
2. **Low-risk content plane:** blogs, leads, feature-flags, coupons, health, uploads.
3. **Read-heavy reporting:** admin reports/analytics, corporate analytics (behind tenant context).
4. **KYC service:** Digio module incl. webhook.
5. **Notifications service:** device tokens, preferences, in-app, campaigns, SSE.
6. **Driver/vendor profiles:** drivers, vehicles (via profile), vendors, referrals.
7. **Marketplace core:** requirements → offers → assignments → trips → reviews/disputes (with dispatch).
8. **Finance:** payments, wallet, ledger, settlements, subscriptions, pricing.
9. **Corporate ETS:** tenants/org → rosters/scheduling/routing → dispatch/execution/tracking/safety → billing/payouts (last — highest complexity & financial risk).
10. **Fleet Management (new):** build on top of driver/vehicle/trip primitives; requires new `Fleet`/`FleetMember` models, `FleetAccessGuard` (modeled on `CorporateAccessGuard`), fleet-scoped earnings/payout/support endpoints — see findings in `04` §19.

Each step should ship behind the existing `/api/v1` gateway/proxy so frontend clients don't change until cutover.
