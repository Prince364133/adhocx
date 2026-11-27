# 04 — Domain-Wise API Documentation

Endpoints grouped by actual business functionality. All NestJS paths are under `/api/v1`. Roles shown are `@Roles()` metadata; `—` means any authenticated user (JWT only, no role restriction). File paths are repo-relative.

---

## 1. Identity & Authentication

**Controller:** `AuthController` — `apps/api/src/modules/auth/auth.controller.ts` · **Service:** `AuthService` · **Models:** `User`, `AuditLog` · **Infra:** Redis (OTP store, token blacklist, revocation), MSG91 SMS, SMTP, Firebase

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/auth/otp/request` | Send OTP (SMS/email) for phone/email | public, throttled |
| POST | `/auth/otp/verify` | Verify OTP → issue JWT pair, create/link `User` | public |
| POST | `/auth/login` | Password login (bcrypt, 15-min lockout) | public, throttled |
| POST | `/auth/admin/login` + `/auth/admin/mfa-verify` | Admin login + MFA | public → MFA token → JWT |
| POST | `/auth/social` | Social auth | public |
| POST | `/auth/password`, `/auth/password/reset`, `/auth/reset-password` | Password set/reset flows | public |
| GET/POST | `/auth/check-phone` | Phone existence/role lookup (onboarding routing) | public |
| POST | `/auth/refresh`, `/auth/refresh-token` | Rotate refresh token | public (refresh token) |
| GET | `/auth/me`, PATCH `/auth/profile` | Session profile read/update | JWT |
| POST | `/auth/logout` | Blacklist access token in Redis | JWT |
| DELETE | `/auth/account` | Account deletion | JWT |
| GET | `/auth/admin/verify` | Validate admin session | JWT + ADMIN |

---

## 2. User Management (Admin)

**Controller:** `AdminController` (users section) — `apps/api/src/modules/admin/admin.controller.ts` · **Models:** `User`, `AuditLog`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/admin/users` | List users (query: `query`, `page`, `limit`, `status`, `role`, `search`) | ADMIN |
| GET | `/admin/users/:id` | User detail | ADMIN |
| PATCH | `/admin/users/:id` | Update user | ADMIN |
| POST | `/admin/users/:id/status` | Activate/suspend | ADMIN |
| DELETE | `/admin/users/:id` | Delete user | ADMIN |

---

## 3. Driver Management

**Controllers:** `DriversController` (`apps/api/src/modules/drivers/drivers.controller.ts`), `ReferralsController` (`modules/drivers/referrals/referrals.controller.ts`), admin sections of `AdminController` · **Service:** `DriversService` · **Models:** `Driver`, `Vehicle`, `DriverReferral`, `DigioVerification`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| GET/PATCH | `/drivers/profile` | Driver profile read/update (vehicle fields upsert `Vehicle` row) | DRIVER, ADMIN, VENDOR |
| PATCH | `/drivers/bank-details` | Bank details for settlements | DRIVER, ADMIN |
| GET | `/drivers/trust-score` | Trust score breakdown | DRIVER, ADMIN |
| PATCH | `/drivers/availability` | ONLINE/OFFLINE/BUSY duty toggle | DRIVER |
| POST | `/drivers/location` | GPS ping → `LocationsService` geo index | DRIVER |
| POST | `/drivers/kyc` | Submit KYC payload | DRIVER, ADMIN, VENDOR |
| POST | `/drivers/documents/upload` | Multipart document upload (multer) | DRIVER, ADMIN, VENDOR |
| GET/POST | `/drivers/referral/*` | Referral dashboard/validate/claim | DRIVER, ADMIN |
| GET | `/admin/drivers`, `/admin/drivers/:id` | Admin driver directory/detail | ADMIN |
| PATCH | `/admin/drivers/:id`; POST `/:id/{verify,reject,suspend,reactivate,clear-cooldown}` | Lifecycle ops | ADMIN |
| GET/PATCH | `/corporate/ops/drivers[/:driverId]`; POST `/:driverId/{suspend,reactivate,deactivate,activate}` | Ops driver management | OPS, ADMIN |

---

## 4. Vehicle Management

**No dedicated controller.** Vehicles are created/updated inside `DriversService.updateProfile` (plate → upsert `Vehicle` with `VehiclePricingTier` category validation, `drivers.service.ts:395-418`), read via `VehiclesService.findByDriver`, and referenced by `Assignment.vehicleId`, `Trip.vehicleId`, `CorporateRoute.vehicleId`.

| Surface | Endpoint(s) | Access |
|---|---|---|
| Driver profile | `GET/PATCH /drivers/profile` (vehicle fields) | DRIVER, ADMIN, VENDOR |
| KYC docs | `POST /drivers/documents/upload`, `POST /drivers/kyc` | DRIVER, ADMIN, VENDOR |
| Digio vehicle checks | `POST /kyc/digio/vehicle-insurance`, RC endpoints | DRIVER, VENDOR, ADMIN |
| Trip/assignment context | `GET /trips/:id`, `GET /corporate/routes/:id` | role-gated |

**Gap:** no fleet-owner vehicle CRUD, no vehicle status lifecycle beyond `verificationStatus`, no one-active-vehicle constraint (`@@unique([driverId, registrationNumber])` only).

---

## 5. Vendor Management

**Controller:** `VendorsController` — `apps/api/src/modules/vendors/vendors.controller.ts` · **Models:** `Vendor`, `Requirement`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST/PATCH/GET | `/vendors/profile` | Vendor org profile | VENDOR, ADMIN, DRIVER |
| POST | `/vendors/profile-photo` | Logo upload | VENDOR, ADMIN, DRIVER |
| GET/POST/PATCH/DELETE | `/admin/vendors*` | Admin vendor management + fulfillment | ADMIN |

---

## 6. Trip & Dispatch — Marketplace

**Controllers:** `RequirementsController`, `OffersController`, `AssignmentsController`, `TripsController` (`apps/api/src/modules/`) · **Services:** `DispatchService` (wave dispatch, Redis geo, 10s reaper), `DispatchSchedulerService`, `DriverBehaviorService`, `DispatchRankingService` · **Models:** `Requirement`, `Offer`, `Assignment`, `Trip`, `TripEvent`, `TripQuote`, `TripPricingSnapshot` · **State machine:** `packages/contracts/src/state-machines/state-validator.ts`

Flow: `Vendor → POST /requirements → DispatchService waves → Offer(SENT→ACCEPTED) → Assignment(CONFIRMED) → Trip(ASSIGNED→ARRIVED→IN_PROGRESS→COMPLETED/CANCELLED/NO_SHOW)`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST/GET | `/requirements*` | Create/list/summary/detail/cancel/retry demand | VENDOR, ADMIN (+OPS read) |
| GET/POST | `/offers*` | Driver offer list/accept/decline/seen | DRIVER |
| GET | `/assignments` | Assignment list | ADMIN, VENDOR, OPS |
| GET | `/trips*`, `/trips/:id/events` | Trip lists/detail/event log | DRIVER, VENDOR, ADMIN, OPS |
| POST | `/trips/:id/{arrive,arrived,start,complete,cancel,no-show}` | Lifecycle transitions | DRIVER (+VENDOR/ADMIN cancel) |
| PATCH | `/trips/:id/location` | En-route GPS | DRIVER |
| GET/POST | `/trips/:id/messages` | Trip chat | DRIVER, VENDOR, ADMIN |
| POST | `/trips/:id/sos` | SOS alert | DRIVER, VENDOR, ADMIN |
| GET | `/driver/trips/:id` | Driver trip detail + quote | DRIVER, ADMIN |

---

## 7. Corporate ETS — Tenancy & Organization

**Controller:** `CorporateTenantController` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts` (34 endpoints) · **Models:** `CorporateTenant`, `CorporateOffice`, `CorporateEmployee`, `CorporateDepartment`, `CorporateTransportZone`, `CorporateCostCenter`, `CorporatePolicy` · **Guard:** `CorporateAccessGuard` + tenant Prisma extension

| Group | Endpoints | Access |
|---|---|---|
| Tenant lifecycle | `POST /corporate/tenants/onboard`, `POST /corporate/tenants`, `GET /corporate/tenants[/:id]`, `PATCH /:id`, `POST /:id/logo`, `PATCH /:id/profile` | ADMIN/OPS onboard; CORP_PORTAL self-service |
| Tenant users | `GET/POST/PATCH /corporate/tenants/:id/users[/:userId]` | CORP_PORTAL, OPS |
| Org structure | `departments`, `transport-zones`, `cost-centers`, `offices` (+`geofences`), `integrations`, `policy`(+`versions`) | CORP_PORTAL (+OPS) |
| Employees | `POST/GET/PATCH/DELETE /corporate/tenants/:id/employees[/:employeeId]`, `GET .../requests`, `POST .../locations` | CORP_PORTAL, OPS |

---

## 8. Corporate ETS — Rosters, Scheduling & Routing

**Controllers:** `CorporateRosterController`, `CorporateSchedulingController`, `CorporateRoutingController` (`domains/corporate/{rosters,scheduling,routing}/`) · **Services:** roster import/validation, `CorporateAutoPlannerService`, CVRPTW solver · **Models:** `CorporateRoster(+Entry)`, `CorporateShiftTemplate`, `CorporateHoliday`, `CorporateRoute`, `CorporateRouteStop`, `CorporateTransportRequest`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| GET/POST | `/corporate/rosters/template`, `/validate`, `/upload`, `/`, `/:id`, `/:id/{approve,publish}`, `/:id/requests` | Excel roster import → approve → publish → generates transport requests | ADMIN, OPS |
| GET/POST | `/corporate/scheduling/shift-templates`, `/holidays` | Shift/holiday masters | ADMIN, OPS |
| POST | `/corporate/scheduling/auto-plan/run` | Trigger auto-planning | ADMIN |
| POST | `/corporate/routes/plan-from-file`, `/plan-stream`, `/plan-from-file/stream` | CVRPTW planning (SSE progress on stream variants) | ADMIN, OPS |
| POST | `/corporate/routes/{commit-plan,optimize,export-plan}` | Persist/optimize/export plan | ADMIN, OPS |
| GET/POST/PATCH/DELETE | `/corporate/routes*`, `/:id/stops*` | Route CRUD + stops | ADMIN, OPS |
| GET | `/corporate/routes/portal`, `/:id`, `/:id/directions` | Portal views, route detail, turn-by-turn | ADMIN, OPS, CORP_*, DRIVER, EMPLOYEE |

---

## 9. Corporate ETS — Dispatch, Execution & Tracking

**Controllers:** `CorporateDispatchController`, `CorporateTripExecutionController`, `CorporateTrackingController`, `CorporateOperationsController`(+2 sibling classes) (`domains/corporate/{dispatch,execution,tracking,operations}/`) · **Services:** `CorporateDispatchService` + scheduler, `CorporateTripExecutionService`, `CorporateGpsIngestService`, `CorporateTelemetryWriter`, `TelemetryStreamHub`, `DriverEligibilityService` · **Models:** `CorporateRoute`, `CorporateRouteStop`, `CorporateDriverOffer`, `CorporateRouteAssignmentEvent`, `CorporateTripEvent`, `CorporateVehiclePosition`, `CorporateSosAlert`

Dispatch flow: scheduler → `corporate:dispatch:queue` ZSET → eligibility → atomic 60s `CorporateDriverOffer` → driver accept → `CorporateRoute.driverId` set → execution → telemetry → SSE.

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/corporate/dispatch/routes/:id/start-now` | Force dispatch | ADMIN, OPS |
| POST | `/corporate/dispatch/routes/:id/offers/{accept,reject}` | Driver offer response | ADMIN, DRIVER (self-scoped) |
| GET | `/corporate/dispatch/{my-offer,driver-offers,driver-duties}` | Driver offer inbox/duties | ADMIN, DRIVER |
| GET | `/corporate/dispatch/routes/:id/{status,traffic-assessment}` | Dispatch status | ADMIN, OPS |
| POST | `/corporate/trips/routes/:id/start`, `stops/:stopId/{arrive,verify-otp,no-show,drop,confirm-safe-reach,confirm-safe-drop,emergency-boarding-override}`, `routes/:id/{complete,telemetry}`, `stops/:stopId/{verify-qr,boarding-qr GET,otp-unlock}` | Route execution lifecycle | ADMIN/OPS/DRIVER/EMPLOYEE per handler |
| POST | `/corporate/trips/requests/:id/{reschedule,admin-reschedule,review}`; GET `/corporate/trips/requests` | Transport-request ops | ADMIN, OPS, CORP_* |
| GET | `/corporate/trips/me/{schedule,next-trip,trips}`, `/corporate/trips/driver/{active-route,routes}` | Rider/driver self views | EMPLOYEE/ADMIN, DRIVER/ADMIN |
| GET | `/corporate/trips/routes/:id/{tracking,timeline,playback}`, `/routes/fleet/live` | Tracking & playback | ADMIN, OPS, CORP_*, DRIVER, EMPLOYEE |
| POST | `/corporate/trips/live-stream-tickets`; SSE `/corporate/trips/routes/{fleet/:id}/live-stream` | Live telemetry (ticket auth) | all authenticated roles |
| GET/POST | `/corporate/ops/{board,live-operations,routes/:id/detail,reassign}` | Ops command centre | ADMIN, OPS |
| GET/POST | `/corporate/ops/drivers*` | Driver ops management | OPS, ADMIN |
| POST | `/corporate/trips/routes/:id/cancel` | Route cancel | ADMIN, OPS |

---

## 10. Corporate ETS — Safety & Support

**Controllers:** `CorporateSafetyController`, `CorporateSupportTicketController`, `OpsSupportTicketController` (`domains/corporate/safety/`) · **Models:** `CorporateSosAlert`, `CorporateSupportTicket(+Reply/Message/Activity)`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/corporate/safety/sos` | Trigger SOS | ADMIN, EMPLOYEE, DRIVER |
| GET | `/corporate/safety/alerts`; POST `/alerts/:id/{acknowledge,investigate,escalate,close,resolve}` | Alert queue workflow | reads: +CORP_*; writes: ADMIN, OPS |
| POST | `/corporate/safety/routes/:id/check-deviation` | Geofence deviation check | ADMIN, DRIVER |
| POST | `/corporate/safety/routes/:id/stops/:stopId/{confirm-safe-drop,confirm-safe-reach,emergency-boarding-override}`; GET `/stops/:stopId/safe-drop-status`, `/tracking-loss` | Safe-reach/drop confirmations | ADMIN, DRIVER, EMPLOYEE |
| POST/GET | `/corporate/support/tickets*` (create/list/summary/:id/replies/reopen/status/assignment/assign/priority/comments/notes/messages/activity) | Tenant support ticketing | ADMIN, OPS, CORP_*, EMPLOYEE (+DRIVER read) |
| GET/POST/PATCH | `/ops/support/tickets*` | Ops ticket queue | OPS, ADMIN |
| POST/GET | `/corporate/me/tickets` | Rider self-service tickets | EMPLOYEE, CORP_*, ADMIN |

---

## 11. Corporate ETS — Rider Self-Service

**Controller:** `CorporateRiderController` — `domains/corporate/rider/corporate-rider.controller.ts` · **Models:** `CorporateEmployee`, `CorporateRouteStop`, `CorporateTripFeedback`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| GET/PATCH | `/corporate/me` | Employee profile | EMPLOYEE, CORP_*, ADMIN |
| GET | `/corporate/me/schedule`, `/me/trips`, `/me/trips/next`, `/me/trips/:id/tracking`, `/me/notifications` | Schedule/trip/tracking views | same |
| POST | `/corporate/me/trips/:id/{cancel,safe-reach,feedback}` | Rider actions | same |
| GET/POST | `/corporate/me/tickets` | Rider tickets | same |

---

## 12. Finance & Payments — Marketplace

**Controllers:** `PaymentsController`, `SettlementsController`, `LedgerController`, `SubscriptionsController` (`apps/api/src/modules/`) · **Services:** `PaymentsService` (Razorpay), `SettlementsService`, `LedgerService` · **Models:** `Payment`, `Settlement`, `LedgerEntry`, `DriverSubscriptionPayment`, `Coupon`, `CouponRedemption` · **External:** Razorpay orders + HMAC webhook

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/payments/initiate` | Create Razorpay order for requirement | VENDOR, ADMIN |
| POST | `/payments/wallet/top-up/{create-order,order,verify,record-status}` | Driver/vendor wallet top-up | VENDOR, ADMIN |
| GET | `/payments*`, `/payments/admin/*`, `/payments/wallet*` | Payment lists/metrics/transactions | VENDOR, ADMIN |
| POST | `/payments/webhooks/:provider` | Razorpay webhook (HMAC) | public |
| POST | `/settlements/withdraw` | Driver payout request (wallet→bank) | DRIVER |
| GET | `/settlements*`, `/settlements/wallet` | Settlement history/wallet | DRIVER, ADMIN |
| POST | `/settlements/:id/{process,bank-review}` | Admin settlement processing | ADMIN |
| GET | `/driver/wallet`, `/driver/ledger` | Wallet balance + ledger entries | DRIVER |
| GET/POST | `/subscriptions/*` | Driver subscription purchase/renew (Razorpay or wallet) | DRIVER |

⚠ `PaymentsService` keeps top-up orders in an **in-memory Map** — lost on restart.

---

## 13. Corporate ETS — Billing, Rate Cards & Payouts

**Controllers:** `CorporateBillingController`, `CorporateRateCardController`, `CorporatePayoutWebhookController`, `CorporateAnalyticsController` (`domains/corporate/{billing,analytics}/`) · **Services:** `CorporateBillingService`, rate-card services, payout provider port · **Models:** `CorporateRateCard`, `CorporateDriverRateCard`, `CorporateInvoice(+Line)`, `CorporateInvoiceDispute`, `CorporateCreditNote`, `CorporateDriverEarning`, `CorporatePayoutBatch`, `CorporatePayout`, `CorporatePayoutProviderEvent` · **External:** payout provider webhook

Dual ledger: *receivable* (tenant rate card → invoices, GST paise, additive credit notes) vs *payable* (driver rate card → earnings → maker-checker payout batches, 1% TDS u/s 194C, idempotency keys, append-only provider events).

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/corporate/billing/invoices/generate-batch` | Generate tenant invoices | ADMIN |
| GET | `/corporate/billing/invoices*`, `/invoices/:id/pdf`, `/disputes*`, `/credit-notes`, `/reconciliations` | Billing reads/disputes | ADMIN, CORP_* |
| POST | `/corporate/billing/invoices/:id/disputes`, `/disputes/:id/{accept,reject}` | Dispute workflow | CORP_* raise; ADMIN resolve |
| POST/GET | `/corporate/billing/payouts/{prepare-batch,batches*}`, `/batches/:id/{approve,submit}`, `/preview` | Driver payout batches (maker-checker) | ADMIN |
| GET | `/corporate/billing/drivers/:driverId/earnings` | Per-driver earnings summary | ADMIN, DRIVER (self via `@CorporateResource`) |
| POST/GET | `/corporate/billing/rate-cards/{corporate,driver}*` | Rate card versioning | ADMIN (+CORP read on corporate) |
| POST | `/corporate/billing/payouts/provider-callback` | Payout provider webhook | public (signature) |
| GET | `/corporate/analytics/{metric-definitions,dashboard,exceptions,attendance,reports/:type}` | ETS analytics | ADMIN, OPS, CORP_* |

---

## 14. Pricing

**Controllers:** `PricingController`, `AdminPricingController`, `DriverQuoteController`, `VendorQuoteController` (`apps/api/src/modules/pricing/`) · **Models:** `VehiclePricingTier`, `PricingPlan`, `PricingSlab`, `RateCardVersion(+Row)`, `ZonalQuoteSnapshot`, `LocalityMaster`, `SystemPolicyConfig`

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/pricing`, `/tiers`, `/policy-config`, `/:vehicleType` | Public price catalogue | public |
| POST/DELETE/PATCH | `/pricing/admin/*` | Tier/policy admin | ADMIN |
| GET/POST/PUT | `/admin/pricing/plans*`, `/audit`, `/simulate` | Distance-pricing plan management | ADMIN |
| GET | `/driver/pricing/rate-card` | Driver's applicable rate card | DRIVER, ADMIN |
| GET/POST | `/vendor/pricing/rate-card`, `/vendor/trip-quotes`, `/vendor/trips` | Vendor quotes & trip confirm | VENDOR, ADMIN |

---

## 15. KYC & Verification

**Controller:** `DigioController` — `apps/api/src/modules/digio/digio.controller.ts` (40 endpoints) · **Service:** Digio client · **Model:** `DigioVerification`

| Group | Endpoints | Access |
|---|---|---|
| Identity docs | `/kyc/digio/{aadhaar,pan,passport,voter-id,id-card,driving-licence}/*` (stored+upload, mask/analyze variants) | DRIVER, VENDOR, CORP_ADMIN, ADMIN |
| Vehicle/business | `/kyc/digio/{vehicle-insurance,rc,bank/*,upi/*,business/*}` | role-gated per endpoint |
| Biometrics | `/kyc/digio/biometric/{face-match,liveness}{,-stored}` | DRIVER, VENDOR, ADMIN |
| DigiLocker | `/kyc/digio/digilocker/*` | DRIVER, VENDOR, CORP_ADMIN, ADMIN |
| Admin | `/kyc/digio/admin/{driver,vendor}/:id`, `/admin/driver/:id/run-suite` | ADMIN |
| Meta/webhook | `GET /kyc/digio/capabilities`, `GET /kyc/digio/me`, `POST /kyc/digio/webhooks` | mixed; webhook public+signed |

⚠ Unguarded paid-API routes: `bank/ifsc`, `upi/search`, digilocker `status`/`reattempt`.

---

## 16. Notifications

**Controller:** `NotificationsController` — `apps/api/src/modules/notifications/notifications.controller.ts` (18) · **Services:** FCM push, SMTP email, MSG91 SMS · **Models:** `Notification`, `NotificationPreference`, `DeviceToken`, broadcast campaign tables

| M | Endpoint | Purpose | Access |
|---|---|---|---|
| SSE | `/notifications/events` | Per-user notification stream | JWT (ticket/session) |
| POST/DELETE | `/notifications/device-token` | FCM token register/remove | JWT |
| GET/PATCH | `/notifications/preferences` | Channel preferences | JWT |
| GET/PATCH/POST/DELETE | `/notifications/in-app*` | In-app inbox CRUD/read-state | JWT |
| POST/GET | `/notifications/admin/{broadcast,broadcast-progress/:id,audience-estimate,test-push,campaigns,campaigns/:id/recipients,metrics}` | Admin push campaigns | ADMIN |

---

## 17. Admin & Operations Governance

**Controller:** `AdminController` — `apps/api/src/modules/admin/admin.controller.ts` (39, class ADMIN) · **Models:** all domains · **Service:** `AdminService`

| Group | Endpoints |
|---|---|
| Drivers | `GET /admin/drivers[/:id]`, `PATCH /:id`, verify/reject/suspend/reactivate/clear-cooldown |
| Vendors | `POST/GET /admin/vendors[/:id]`, `/fulfillment`, `PATCH`, verify/reject/delete, `/:id/status` |
| Users | `GET /admin/users[/:id]`, `PATCH`, `/:id/status`, `DELETE` |
| Platform | `GET /admin/metrics`, `GET /admin/audit-logs`, `GET /admin/support/tickets`, `POST /admin/support/tickets/:id/resolve` |
| Finance reports | `GET /admin/finance/{dashboard,transactions,driver/:id}` |
| Operational reports | `GET /admin/reports*`, `/admin/corridors`, `/admin/analytics/trends` (corridor/trip-frequency/financial/analytics reports) |

---

## 18. Content, Marketing & Platform Misc

| Domain | Endpoints | Access | File |
|---|---|---|---|
| Blogs | `GET /blogs{,/featured,/categories,/:slug}` public; `admin/blogs` CRUD | public read / ADMIN write | `modules/blogs/blogs.controller.ts` |
| Coupons | `POST /coupons/validate`, `GET /coupons/available` (JWT); `admin/coupons` CRUD+metrics+redemptions | JWT / ADMIN | `modules/coupons/coupons.controller.ts` |
| Feature flags | `GET /feature-flags{,/:key}` public; `admin/feature-flags` CRUD+toggle | public / ADMIN | `modules/feature-flags/feature-flags.controller.ts` |
| Leads | `POST /leads/{enterprise,newsletter}` public; `GET /leads` ADMIN | public / ADMIN | `modules/leads/leads.controller.ts` |
| Disputes | `/disputes*` marketplace disputes + support queries | JWT; resolve ADMIN | `modules/disputes/disputes.controller.ts` |
| Reviews | `POST /reviews`, `GET /reviews/{driver,trip}/:id` | JWT only (no role check ⚠) | `modules/reviews/reviews.controller.ts` |
| Health/version | `GET /health{,/live,/ready}`, `GET /app/version`, `GET /` | public | `modules/health`, `modules/app-update`, `app.controller.ts` |
| Uploads | `GET /uploads/:filename`, `GET /private-uploads/:filename` (+`/api/v1` aliases) | public ⚠ | `common/storage/uploads.controller.ts` |
| Pricing admin | `admin/pricing/*` distance-pricing plans | ADMIN | `modules/pricing/admin-pricing.controller.ts` |

---

## 19. Fleet Management — Current State

**No fleet-owner domain exists.** Searches for `fleetOwner|fleet_owner|fleetId|fleet_id` across `apps/`, `packages/`, and the Prisma schema return zero ownership-related hits. "Fleet" appears only as (a) `FleetDomainModule` (`apps/api/src/domains/fleet/fleet-domain.module.ts`) which merely re-exports Drivers/Vehicles/Vendors modules, and (b) `/corporate/trips/routes/fleet/live` (live-vehicle snapshot). `UserRole` has no fleet role. See `08_API_Migration_Assessment.md` for integration impact.
