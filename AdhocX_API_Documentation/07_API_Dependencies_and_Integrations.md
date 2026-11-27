# 07 — API Dependencies & Integrations

## 1. Module dependency map (NestJS DI)

```
app.module.ts
├── DatabaseModule (global) ── DatabaseService extends PrismaClient + tenant-prisma.extension
├── RedisModule (global) ────── RedisService (ioredis), pub/sub, StreamTicketService, token revocation
├── StorageModule (global) ──── S3/R2 uploads, signed access URLs (getDocumentAccessUrl)
├── IdentityDomainModule ────── AuthModule (JWT, OTP, MFA, social)
├── FleetDomainModule ───────── DriversModule, VehiclesModule(service only), VendorsModule
├── MarketplaceDomainModule ─── Requirements, Offers, Assignments, Trips, Reviews, Disputes
├── DispatchDomainModule ────── DispatchModule (wave dispatch, scheduler, ranking, behavior)
├── TripDomainModule ────────── Trips use-cases (application/)
├── FinanceDomainModule ─────── Payments, Settlements, Ledger, Subscriptions, Pricing, Coupons
└── CorporateDomainModule ────── ~200-line module wiring 13 subdomains:
      tenants, rosters, scheduling, routing, supply, dispatch, execution,
      replanning, tracking, safety, billing, operations, analytics, rider
```

`domains/*-domain.module.ts` files (except corporate) are thin re-export wrappers — feature modules in `modules/` hold the real code. `packages/domain-core` DDD aggregates/ports are imported by only ~6 files (`application/` use-cases + `infrastructure/` mappers/repos) — **not** the dominant pattern; most services call `this.db.*` (Prisma) directly.

## 2. Shared services (cross-module dependencies)

| Service | Used by | Provides |
|---|---|---|
| `DatabaseService` (PrismaClient) | ~all services | all persistence; tenant extension auto-scopes ~10 corporate models |
| `RedisService` | dispatch, offers, auth, notifications, tracking | geo indexes, ZSET queues, offer holds, rate limits, OTP store, JWT blacklist/revocation, stream tickets, pub/sub |
| `NotificationsService` / `NotificationQueueService` | trips, dispatch, corporate, auth, safety | FCM + SMTP + MSG91 + in-app fan-out |
| `AuditService` | admin, corporate, settlements, payouts | `AuditLog` writes |
| `LocationsService` | drivers, dispatch, tracking | driver geo index, live positions |
| `StorageService` | drivers, vendors, tenants, blogs | S3/R2 upload + signed URLs |
| `StreamTicketService` | corporate tracking, notifications | single-use SSE tickets |
| `TripEventRecorder` | trip execution, tracking | `TripEvent`/`CorporateTripEvent` append |
| `CorporateAccessGuard` + decorators | all corporate controllers | tenant/driver/employee scoping |
| `TenantContextInterceptor` | global | per-request tenant context for Prisma extension |

## 3. Database dependencies

Single PostgreSQL 16 + PostGIS database (`postgis/postgis:16-3.4-alpine` in docker-compose), Prisma-managed schema `apps/api/prisma/schema.prisma` (~60 models). Key coupling points:

- `Driver` is the hottest model — queried by marketplace dispatch, corporate eligibility, offers, trips, earnings, admin.
- Money integrity depends on `db.$transaction` blocks (settlements, payouts) + `LedgerEntry`/`CorporatePayout*` append-only tables.
- Tenant isolation via `tenant-prisma.extension.ts` extension covering ~10 `Corporate*` models — **writes and `$queryRaw` are not auto-scoped** (documented gap).
- Telemetry volume: `CorporateVehiclePosition`, `CorporateTelemetry*` batched by `CorporateTelemetryWriter`; partitioning maintained by `CorporateGpsPartitionMaintenanceService`.

## 4. Redis dependencies (keys/patterns)

| Key family | Purpose | Producer/Consumer |
|---|---|---|
| `corporate:dispatch:queue` (ZSET) | corporate dispatch scheduling | `CorporateDispatchSchedulerService` → `CorporateDispatchService` |
| `CorporateDispatchKeys.*` | offer holds, route locks, driver offers (60s atomic TTL) | `CorporateDispatchService` |
| Driver geo index | marketplace wave dispatch H3/geo matching | `LocationsService` ↔ `DispatchService` |
| `Offer[status,expiresAt]` + DB `Offer` rows | marketplace offer expiry | `DispatchService` reaper (10s) |
| OTP store | auth OTP TTL | `AuthService` |
| JWT blacklist + per-user revocation + `minTokenIssuedAt` | session invalidation | `JwtAuthGuard`/`AuthService` |
| Stream tickets | single-use SSE auth | `StreamTicketService` ↔ tracking/notifications SSE |
| Rate-limit counters | auth/OTP throttling | guards/interceptors |
| Pub/sub | cross-instance events (when scaled) | `RedisService` |

⚠ When Redis is unreachable the service degrades to **in-memory** structures — correctness (offer holds, rate limits, blacklist) then assumes a single instance.

## 5. Third-party integrations

| Provider | Used by | Endpoints/APIs touched |
|---|---|---|
| **Razorpay** | payments, subscriptions, wallet top-ups | `POST /payments/initiate`, top-up order/verify, `/payments/webhooks/:provider`, `/subscriptions/*` |
| **MSG91** | OTP SMS, notifications | `/auth/otp/*`, notification fan-out |
| **Firebase FCM** | push notifications | `/notifications/*`, device-token register |
| **SMTP** (nodemailer) | email OTP, notifications, invoices | auth, notifications |
| **Digio** | KYC/KYB/biometric/DigiLocker/bank/UPI/business verification | all `/kyc/digio/*` (40 endpoints) + `/kyc/digio/webhooks` |
| **Google Maps/Routes/Geocoding/Traffic** | routing, dispatch ETA, pricing zones | `CorporateRoutingController` plan/optimize/directions, `traffic-assessment`, `DistancePricingService` |
| **AWS S3 / Cloudflare R2** | file storage | uploads controller, driver/vendor/tenant docs, invoice PDFs |
| **Corporate payout provider** (port `payout-provider.port.ts`) | corporate driver payouts | `payouts/*` + `provider-callback` webhook |
| Social auth providers | Google/Apple sign-in | `POST /auth/social` |

## 6. Webhooks (inbound, signature-verified)

| Endpoint | Provider | Verification |
|---|---|---|
| `POST /payments/webhooks/:provider` | Razorpay | HMAC signature in `PaymentsService` |
| `POST /corporate/billing/payouts/provider-callback` | payout provider | provider signature → `CorporatePayoutProviderEvent` (unique `(provider,eventId)`) |
| `POST /kyc/digio/webhooks` | Digio | provider signature → `DigioVerification` updates |

## 7. Scheduled / background jobs (all in-process)

| Job | Interval/trigger | File |
|---|---|---|
| Marketplace dispatch wave scheduler | cron-ish via `DispatchSchedulerService` | `modules/dispatch/` |
| Offer expiry reaper | 10s sweep in `onModuleInit` | `modules/dispatch/dispatch.service.ts` |
| Corporate dispatch scheduler | queue processing | `domains/corporate/dispatch/` |
| Corporate auto-planner | `POST /corporate/scheduling/auto-plan/run` + scheduler | `domains/corporate/scheduling/`, `replanning/` |
| SOS escalation | scheduled | `domains/corporate/safety/` |
| Telemetry writer (batch flush) | interval | `domains/corporate/tracking/` |
| GPS partition maintenance | scheduled | `domains/corporate/tracking/` |
| Distance-pricing plan activation | scheduled | `modules/pricing/` |
| Notification queue drain | queue processor | `modules/notifications/` |

⚠ All run inside the single NestJS process — no external queue (BullMQ etc.); horizontal scaling requires leader election or moving jobs out.

## 8. Internal service-to-service communication

**None over HTTP.** All cross-module calls are NestJS DI within one process. The only HTTP boundaries are: (a) inbound client → API, (b) inbound provider → webhook endpoints, (c) outbound API → third-party providers listed above.
