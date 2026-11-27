# 06 — API Workflows

End-to-end flows traced through controllers → services → Prisma/Redis → external providers. All API paths include `/api/v1`. "DB" = PostgreSQL via Prisma (`DatabaseService`); "Redis" = `RedisService` (ioredis, in-memory fallback when unreachable).

---

## W1 — Driver registration & onboarding (marketplace)

```
Flutter app (apps/mobile)
  │
  ├─ POST /auth/otp/request {phone|email, channel?}        → OTP → Redis + MSG91/SMTP
  ├─ POST /auth/otp/verify {otp, isRegister, fullName, role:'DRIVER', referralCode?}
  │      → AuthService.verifyOtp → User(role=DRIVER) → JWT pair
  ├─ PATCH /drivers/profile {vehicleType, vehicleModel, vehiclePlate, ...}
  │      → DriversService.updateProfile → VehiclePricingTier validation
  │      → upsert Vehicle(driverId, registrationNumber)         [drivers.service.ts:395]
  ├─ POST /drivers/kyc + POST /drivers/documents/upload (multipart)
  │      → DigioVerification records → Digio API
  ├─ POST /kyc/digio/{aadhaar,pan,...} variants (per doc type)
  │      → Digio hosted verification → webhook POST /kyc/digio/webhooks
  └─ admin: POST /admin/drivers/:id/verify → Driver.verificationStatus=VERIFIED
```

DB writes: `User`, `Driver`, `Vehicle`, `DigioVerification`, `AuditLog`. External: MSG91, SMTP, Digio, S3/R2 (document upload).

---

## W2 — Marketplace trip lifecycle (vendor demand → completed trip)

```
VENDOR                                    DRIVER                          SYSTEM
  │ POST /requirements {…}                   │                               │
  │  → Requirement(POSTED)                  │                               │
  │                                         │                               │ DispatchService wave job
  │                                         │                               │  → geo/H3 driver selection
  │                                         │                               │  → Offer(SENT, expiresAt) + Redis hold
  │      GET /offers (poll/SSE-notify)      │                               │
  │                                         │ POST /offers/:id/seen         │
  │                                         │ POST /offers/:id/accept       │ atomic accept → Offer.ACCEPTED
  │                                         │                               │ → Assignment(CONFIRMED) → Trip(ASSIGNED)
  │                                         │ POST /trips/:id/location      │ GPS → TripEvent
  │                                         │ POST /trips/:id/arrive(d)     │ Trip.ARRIVED
  │                                         │ POST /trips/:id/start         │ Trip.IN_PROGRESS
  │                                         │ PATCH /trips/:id/location     │ ongoing GPS
  │                                         │ POST /trips/:id/complete      │ Trip.COMPLETED
  │                                         │                               │ → totalDriverEarnings computed
  │ POST /payments/initiate (Razorpay)      │                               │ (vendor-side payment)
  │ POST /payments/webhooks/razorpay        │                               │ HMAC verify → Payment PAID
```

Earnings path: `Trip.totalDriverEarnings` → `LedgerEntry` rows → `Driver.walletBalance` → driver `POST /settlements/withdraw` → `Settlement` → admin `POST /settlements/:id/process` → bank payout. Reviews: `POST /reviews`; disputes: `POST /disputes`.

Background: `DispatchSchedulerService` (exact-time waves), 10s reaper in `DispatchService.onModuleInit` (offer expiry sweep), `DispatchRankingService` + `DriverBehaviorService` (acceptance-rate cooldowns).

---

## W3 — Corporate ETS: roster → route → dispatch → trip → billing

```
OPS/CORP_ADMIN                          DRIVER                         SYSTEM
  │ POST /corporate/rosters/upload (xlsx)   │                            │
  │  → Roster(DRAFT) → validate → approve  │                            │
  │  → publish → CorporateTransportRequest │                            │
  │ POST /corporate/routes/plan-from-file   │                            │ CVRPTW solver
  │  (or /plan-stream → SSE progress)       │                            │ → CorporateRoute(DRAFT→OPTIMIZED)
  │ POST /corporate/routes/commit-plan      │                            │ persists routes+stops
  │ POST /corporate/scheduling/auto-plan/run│                            │ (or scheduler-driven)
  │                                        │ GET /corporate/dispatch/    │
  │                                        │   my-offer / driver-offers  │
  │                                        │ POST .../offers/accept      │ atomic 60s Redis offer
  │                                        │                            │ → Route.driverId, AssignmentEvent
  │                                        │ POST /corporate/trips/      │
  │                                        │   routes/:id/start          │ EN_ROUTE→IN_PROGRESS
  │                                        │ POST .../stops/:id/arrive   │ per-stop
  │                                        │ GET .../boarding-qr (emp)   │ employee boards w/ QR
  │                                        │ POST .../verify-otp/qr      │ OTP/QR boarding verify
  │                                        │ POST .../telemetry          │ GPS batch → Redis →
  │ GET /corporate/trips/routes/:id/       │                            │ CorporateTelemetryWriter →
  │   tracking / SSE live-stream            │                            │ CorporateVehiclePosition → SSE
  │                                        │ POST .../stops/:id/drop     │ employee drop
  │                                        │ POST .../routes/:id/complete│ Route.COMPLETED
  │                                        │                            │ → CorporateDriverEarning (rate card math)
  │ POST /corporate/billing/invoices/      │                            │
  │   generate-batch                       │                            │ → CorporateInvoice+Lines (tenant)
  │ POST /corporate/billing/payouts/       │                            │
  │   prepare-batch → batches → approve    │                            │ → CorporatePayoutBatch (maker-checker,
  │   → submit                            │                            │   TDS 1%, idempotencyKey)
  │                                        │                            │ → payout provider → webhook
  │ POST /corporate/billing/payouts/       │                            │ provider-callback →
  │   provider-callback (public)           │                            │ CorporatePayout status
```

DB: `CorporateTenant/Office/Employee/Department/TransportZone/CostCenter/Policy`, `CorporateRoster(+Entry)`, `CorporateShiftTemplate/Holiday`, `CorporateTransportRequest`, `CorporateRoute(+Stop)`, `CorporateDriverOffer`, `CorporateRouteAssignmentEvent`, `CorporateTripEvent`, `CorporateVehiclePosition`, `CorporateRateCard`, `CorporateDriverRateCard`, `CorporateDriverEarning`, `CorporateInvoice(+Line/Dispute/CreditNote)`, `CorporatePayoutBatch/Payout/ProviderEvent`, `CorporateSosAlert`, `CorporateSupportTicket*`, `CorporateTripFeedback`.

Schedulers: `CorporateDispatchSchedulerService`, `CorporateAutoPlannerService`, `CorporateSosEscalationScheduler`, `CorporateTelemetryWriter`, `CorporateGpsPartitionMaintenanceService`, `DistancePricingService.activateDuePlans`.

---

## W4 — Authentication & session flows

- **OTP:** `requestOtp` → Redis OTP (TTL) + MSG91/SMTP → `verifyOtp` → `User` upsert by phone/email → JWT `{accessToken(1h), refreshToken(30d)}`.
- **Login:** `login` → bcrypt + lockout → same JWT pair. `admin/login` adds MFA challenge (`mfaSessionToken` → `mfa-verify`).
- **Refresh:** `refresh` → validate refresh token (Redis) → rotate pair, blacklist old.
- **Logout:** `logout` → access token added to Redis blacklist; per-user `revocation`/`minTokenIssuedAt` invalidates all sessions.
- **SSE auth:** `POST /corporate/trips/live-stream-tickets` (or notifications ticket) → single-use ticket → `EventSource('?ticket=…')`.

---

## W5 — Payments & settlements (money flows)

- **Vendor payment:** `POST /payments/initiate` → Razorpay order → vendor pays → `POST /payments/webhooks/razorpay` (HMAC) → `Payment` PAID → `Requirement` fulfillment.
- **Wallet top-up:** `POST /payments/wallet/top-up/create-order` (⚠ in-memory order store) → Razorpay checkout → `verify`/`record-status` → wallet credit.
- **Driver earnings → cash:** `Trip.totalDriverEarnings`/`CorporateDriverEarning` → `LedgerEntry`/`walletBalance` → `POST /settlements/withdraw` → `Settlement(PENDING)` → admin `process`/`bank-review` → paid.
- **Corporate payouts:** earnings → `payouts/prepare-batch` → `batches` create → `approve` (maker-checker) → `submit` → provider → `provider-callback` webhook → `CorporatePayout` terminal state; `REVERSAL` kind supported; provider events append-only.

---

## W6 — KYC verification (Digio)

`POST /drivers/kyc` or Digio endpoints → Digio API (hosted verification) → `DigioVerification` row → webhook `POST /kyc/digio/webhooks` updates status → admin review `GET /kyc/digio/admin/driver/:id`, `run-suite` → driver `verificationStatus` gates dispatch eligibility (`DriverEligibilityService`).

---

## W7 — Notifications fan-out

Domain services call `NotificationsService` → `NotificationQueueService` → channels: FCM (`DeviceToken`), SMTP email, MSG91 SMS, in-app `Notification` rows → SSE `/notifications/events` + `/corporate/trips/.../live-stream` for realtime clients. Admin campaigns: `/notifications/admin/broadcast*` with audience estimate + progress tracking.

---

## W8 — API-to-API & internal call graph (key edges)

- `TripsService` → `LedgerService` (earnings), `NotificationsService`, `AuditService`, `LocationsService`
- `CorporateDispatchService` → `DriverEligibilityService`, `RateCardService`, `LocationsService`, `NotificationsService`, `AuditService`, `TripEventRecorder`; Redis keys under `CorporateDispatchKeys`
- `CorporateBillingService` → rate-card services, payout provider port, invoice PDF generation
- `CorporateTripExecutionService` → `CorporateGpsIngestService` → `CorporateTelemetryWriter` → `TelemetryStreamHub` (SSE)
- `PaymentsService` → Razorpay client; `SettlementsService` → `DatabaseService.$transaction` + `LedgerEntry`
- `DispatchService` → `ModuleRef` lazy `DistancePricingService` (circular-dep workaround), `driver-behavior.service`, geo index in Redis
- Tenant scoping: `TenantContextInterceptor` + `tenant-prisma.extension.ts` auto-injects `tenantId` filters on ~10 corporate models

No service-to-service HTTP calls exist — all internal communication is in-process DI.
