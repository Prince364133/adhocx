# 01 — Executive Summary

## 1. Overall API Architecture

AdhocX is a **modular monolith**: a single NestJS 10 application (`apps/api`) serves every product API under the global prefix `/api/v1` (`apps/api/src/main.ts`). All frontends (3 Next.js portals, 2 Flutter apps, Astro marketing site) are pure API clients — **no frontend application implements its own API routes**.

Two parallel business workflows share one codebase and one PostgreSQL database:

1. **Enterprise ETS (corporate transport)** — `apps/api/src/domains/corporate/` (~182 endpoints): tenants → rosters → CVRPTW routing → Redis-queued dispatch → driver offers → trip execution (OTP/QR boarding, telemetry, SSE live tracking) → dual-ledger billing (tenant invoices vs driver payouts).
2. **Adhoc marketplace** — `apps/api/src/modules/` (~257 endpoints): vendors post `Requirement`s → wave dispatch creates `Offer`s → driver accepts → `Assignment` → `Trip` → Razorpay payments → wallet/ledger → `Settlement` withdrawals.

Realtime is **Server-Sent Events only** (3 `@Sse` endpoints + ticket-authenticated EventSource streams). No WebSocket gateways, no GraphQL, no gRPC.

## 2. Technology Stack Summary

| Layer | Technology | Version / evidence |
|---|---|---|
| API framework | NestJS (Express platform) | `apps/api/package.json` — NestJS 10.4.x |
| Language | TypeScript | throughout `apps/api/src` |
| ORM / DB | Prisma 6.19 + PostgreSQL 16 + PostGIS | `apps/api/prisma/schema.prisma` (2,299 lines, ~60 models) |
| Cache / queues / geo | Redis 7 (ioredis) | `apps/api/src/redis/` — dispatch ZSETs, offer holds, rate limits, JWT blacklist, SSE tickets |
| Auth | JWT access (1h) + refresh (30d), Redis revocation, OTP via MSG91/SMTP, Firebase FCM, admin MFA, Digio KYC | `modules/auth`, `common/` guards |
| Payments | Razorpay (orders + HMAC webhook), driver wallet, subscriptions, corporate payout provider port | `modules/payments`, `modules/subscriptions`, `domains/corporate/billing` |
| Web portals | Next.js 14 App Router ×3 (`admin`, `ops`, `corporate`) — **UI only, zero `route.ts` handlers** | `apps/*/src` |
| Marketing | Astro 4 — 2 SSR endpoints (`/rss.xml`, `/sitemap.xml`) | `apps/marketing/src/pages/` |
| Mobile | Flutter ×2 (`apps/mobile` driver, `apps/employee_app` employee) — clients only | `apps/*/lib` |
| Standalone utility | Flask (Python) route-planner prototype | `route_planner_app.py` (repo root) — **not wired into any app** |
| Shared packages | `packages/contracts` (enums, DTOs, state machines), `packages/domain-core` (DDD aggregates/ports — minimally adopted) | `packages/` |

## 3. API Counts

| Technology stack | Framework | Base path | Endpoints | Source |
|---|---|---|---|---|
| NestJS | NestJS 10.4 | `/api/v1` | **439** (436 REST + 3 SSE) | `apps/api/src/**` — 50 controller classes in 44 files |
| Flask | Flask (Python) | `/` | **8** | `route_planner_app.py` |
| Astro SSR | Astro 4 | site root | **2** (GET) | `apps/marketing/src/pages/{rss.xml,sitemap.xml}.ts` |
| **Total product APIs** | | | **449** | |

By HTTP method (NestJS): GET 189 · POST 199 · PATCH 34 · DELETE 13 · PUT 1 · SSE 3.

By application: `apps/api` 439 · `apps/marketing` 2 · repo-root Flask tool 8 · all other apps 0.

Auth split (NestJS, method-level guard analysis): ~35 public endpoints (health, auth login/OTP/refresh, public content GETs, webhooks, uploads, leads) vs ~404 JWT-protected. Exact public/protected boundary requires manual verification for ~6 flagged endpoints (see `08` and §5).

## 4. Important Findings and Risks

**Confirmed findings**

- Single-process monolith: all schedulers, dispatch reapers, telemetry writers, and webhook handlers run in-process (`onModuleInit` intervals). Horizontal scaling requires sticky sessions or a refactor.
- In-memory degradations exist: payment top-up order store is an in-memory `Map` (`modules/payments/payments.service.ts`) — orders are lost on restart.
- Tenant isolation relies on `tenant-prisma.extension.ts` covering ~10 corporate models; writes/`$queryRaw` paths and non-listed models are **not** auto-scoped — cross-tenant leak risk.
- `UploadsController` serves `/private-uploads/:filename` with no auth guard — KYC document URLs rely on filename unguessability (UUIDs). Flagged for verification.
- `Trip.otp` has `@default("1234")` in schema — static OTP fallback is a security smell.
- Duplicate/overlapping routes exist (aliases and near-duplicates, see `08_API_Migration_Assessment.md`).
- Legacy `route_planner_app.py` Flask app duplicates routing/assignment logic outside the API — no auth, in-memory state; evidence suggests it is a prototype.

**Assumptions / unverified**

- Exact request-body DTO fields for most endpoints were not exhaustively extracted; DTO classes live beside controllers/services — see `05_API_Technical_Reference.md` for per-endpoint pointers and explicit "unverified" markers.
- Swagger (`/docs`) is enabled only outside production (`main.ts`); production consumers rely on `packages/contracts`.

## 5. Report Set

| File | Content |
|---|---|
| `01_Executive_Summary.md` | this file |
| `02_Complete_API_Inventory.md` | all 449 endpoints with method, path, handler, file |
| `03_Technology_Stack_Wise_APIs.md` | per-framework breakdown |
| `04_Domain_Wise_API_Documentation.md` | endpoints grouped by business domain |
| `05_API_Technical_Reference.md` | per-endpoint params/auth/service/models/status codes |
| `06_API_Workflows.md` | end-to-end traced workflows |
| `07_API_Dependencies_and_Integrations.md` | module/service/Redis/external/webhook/scheduler map |
| `08_API_Migration_Assessment.md` | coupling, duplicates, unused, risks, order |
