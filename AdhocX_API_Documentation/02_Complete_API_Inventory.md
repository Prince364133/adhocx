# 02 — Complete API Inventory

*Every endpoint discovered by parsing `@Controller`/`@Get|Post|Patch|Put|Delete|Sse` decorators across `apps/api/src` (50 controller classes), plus Flask (`route_planner_app.py`) and Astro SSR endpoints. Base path for all NestJS routes: `/api/v1`. Guards column: `J`=JwtAuthGuard, `R`=RolesGuard, `C`=CorporateAccessGuard — class-level unless noted. Roles are enum names from `UserRole`; `CORP_*`=CORPORATE_ADMIN/CORPORATE_MANAGER.*

## NestJS — `apps/api` (`/api/v1`)

### Platform & infrastructure

| M | Endpoint | Handler | Controller (file) | Guards/Roles |
|---|---|---|---|---|
| GET | `/` | getRoot | AppController (`src/app.controller.ts`) | public |
| GET | `/health`, `/health/live`, `/health/ready` | getHealth / getLiveness / getReadiness | HealthController (`modules/health/health.controller.ts`) | public |
| GET | `/app/version` | getVersion | AppUpdateController (`modules/app-update/app-update.controller.ts`) | public |
| GET | `/uploads/:filename`, `/api/v1/uploads/:filename` | getUploadedFile | UploadsController (`common/storage/uploads.controller.ts`) | public |
| GET | `/private-uploads/:filename`, `/api/v1/private-uploads/:filename` | getPrivateUploadedFile | UploadsController | public ⚠ |
| GET | `/docs` | Swagger UI | `src/main.ts` | non-prod only |

### Auth & identity — `modules/auth/auth.controller.ts` (18)

| M | Endpoint | Handler | Auth |
|---|---|---|---|
| POST | `/auth/admin/login` | adminLogin | public (+ MFA step) |
| POST | `/auth/admin/mfa-verify` | adminMfaVerify | public (mfaSessionToken) |
| GET | `/auth/admin/verify` | verifyAdminSession | JWT + ADMIN |
| POST | `/auth/login` | login | public, rate-limited |
| POST | `/auth/otp/request` | requestOtp | public |
| POST | `/auth/otp/verify` | verifyOtp | public |
| GET, POST | `/auth/check-phone` | checkPhone / checkPhonePost | public |
| POST | `/auth/social` | socialAuth | public |
| POST | `/auth/password` | setPassword | public (post-OTP) |
| POST | `/auth/password/reset`, `/auth/reset-password` | resetPassword | public |
| POST | `/auth/refresh`, `/auth/refresh-token` | refresh | public (refresh token) |
| GET | `/auth/me` | getMe | JWT |
| PATCH | `/auth/profile` | updateProfile | JWT |
| POST | `/auth/logout` | logout | JWT (Redis blacklist) |
| DELETE | `/auth/account` | deleteAccount | JWT |

### Drivers & referrals

| M | Endpoint | Handler | Roles | File |
|---|---|---|---|---|
| GET, PATCH | `/drivers/profile` | getProfile / updateProfile | DRIVER, ADMIN, VENDOR | `modules/drivers/drivers.controller.ts` |
| PATCH | `/drivers/bank-details` | updateBankDetails | DRIVER, ADMIN | same |
| GET | `/drivers/trust-score` | getTrustScore | DRIVER, ADMIN | same |
| PATCH | `/drivers/availability` | updateAvailability | DRIVER | same |
| POST | `/drivers/location` | reportLocation | DRIVER | same |
| POST | `/drivers/kyc` | submitKyc | DRIVER, ADMIN, VENDOR | same |
| POST | `/drivers/documents/upload` | upload (FileInterceptor) | DRIVER, ADMIN, VENDOR | same |
| POST | `/drivers/referral/validate` | validateReferrer | JWT | `modules/drivers/referrals/referrals.controller.ts` |
| GET | `/drivers/referral/dashboard` | getDashboard | DRIVER, ADMIN | same |
| POST | `/drivers/referral/claim/:referralId` | claimReward | DRIVER, ADMIN | same |
| POST | `/drivers/referral/claim-all` | claimAllRewards | DRIVER, ADMIN | same |

*No `vehicles.controller.ts` exists — vehicles are managed inside `DriversService.updateProfile` (`modules/drivers/drivers.service.ts`).*

### Vendors

| M | Endpoint | Handler | Roles | File |
|---|---|---|---|---|
| POST, PATCH, GET | `/vendors/profile` | createProfile / updateProfile / getProfile | VENDOR, ADMIN, DRIVER | `modules/vendors/vendors.controller.ts` |
| POST | `/vendors/profile-photo` | upload (FileInterceptor) | VENDOR, ADMIN, DRIVER | same |

### Marketplace demand → trip

`RequirementsController` (`modules/requirements/requirements.controller.ts`, class J+R):

| M | Endpoint | Handler | Roles |
|---|---|---|---|
| POST | `/requirements` | createRequirement | VENDOR, ADMIN |
| GET | `/requirements`, `/requirements/summary`, `/requirements/:id` | getRequirements / getRequirementsSummary / getRequirementDetails | VENDOR, ADMIN (+OPS read) |
| POST | `/requirements/:id/cancel`, `/requirements/:id/retry` | cancelRequirement / retryRequirement | VENDOR, ADMIN |

`OffersController` (`modules/offers/offers.controller.ts`, class J+R, DRIVER):

| M | Endpoint | Handler |
|---|---|---|
| GET | `/offers`, `/offers/:id` | getOffers / getOfferById |
| POST | `/offers/:id/accept`, `/offers/:id/decline`, `/offers/:id/seen` | acceptOffer / declineOffer / markSeen |

`AssignmentsController` (`modules/assignments/assignments.controller.ts`): `GET /assignments` → listAssignments — ADMIN, VENDOR, OPS.

`TripsController` (`modules/trips/trips.controller.ts`, class J+R):

| M | Endpoint | Handler | Roles |
|---|---|---|---|
| GET | `/trips`, `/trips/pending-review`, `/trips/:id`, `/trips/:id/events` | getTrips / getPendingReview / getTrip / getTripEvents | DRIVER, VENDOR, ADMIN (+OPS on list/detail/events) |
| GET, POST | `/trips/:id/messages` | getTripMessages / sendTripMessage | DRIVER, VENDOR, ADMIN |
| POST | `/trips/:id/arrive`, `/trips/:id/arrived` | markArrived (alias pair) | DRIVER |
| POST | `/trips/:id/start`, `/trips/:id/complete`, `/trips/:id/no-show` | startTrip / completeTrip / reportNoShow | DRIVER |
| POST | `/trips/:id/cancel` | cancelTrip | DRIVER, VENDOR, ADMIN |
| PATCH | `/trips/:id/location` | updateLocation | DRIVER |
| POST | `/trips/:id/sos` | triggerSos | DRIVER, VENDOR, ADMIN |

`ReviewsController` (`modules/reviews/reviews.controller.ts`, JWT only — **no @Roles**):

| M | Endpoint | Handler |
|---|---|---|
| POST | `/reviews` | createReview |
| GET | `/reviews/driver/:driverId`, `/reviews/trip/:tripId` | getDriverReviews / getTripReviews |

`DisputesController` (`modules/disputes/disputes.controller.ts`, class JWT+R):

| M | Endpoint | Handler | Roles |
|---|---|---|---|
| POST | `/disputes/support-query` | createSupportQuery | JWT |
| GET | `/disputes/support-query/my` | getMySupportQueries | JWT |
| POST | `/disputes` | createDispute | JWT |
| GET | `/disputes/my`, `/disputes/:id` | getMyDisputes / getDisputeById | JWT |
| GET | `/disputes` | getDisputes | ADMIN |
| PATCH | `/disputes/:id/resolve` | resolveDispute | ADMIN |

### Driver finance (marketplace)

`LedgerController` (`modules/ledger/ledger.controller.ts`): `GET /driver/wallet`, `GET /driver/ledger` — DRIVER.

`SettlementsController` (`modules/settlements/settlements.controller.ts`, class J+R):

| M | Endpoint | Handler | Roles |
|---|---|---|---|
| POST | `/settlements/withdraw` | requestWithdrawal | DRIVER |
| GET | `/settlements/wallet`, `/settlements`, `/settlements/:id` | getDriverWallet / getSettlements / getSettlement | DRIVER (+ADMIN list/detail) |
| POST | `/settlements/:id/process`, `/settlements/:id/bank-review` | processSettlement / reviewBankDetails | ADMIN |

`SubscriptionsController` (`modules/subscriptions/subscriptions.controller.ts`): `GET /subscriptions/my-status`, `/status`; `POST /subscriptions/create-order`, `/order`, `/verify`, `/pay-from-wallet`, `/renew-wallet` — DRIVER/ADMIN reads, DRIVER writes.

`DriverQuoteController` (`modules/pricing/driver-quote.controller.ts`, class J+R DRIVER,ADMIN): `GET /driver/pricing/rate-card`, `GET /driver/trips/:id`.

### Vendor finance & payments

`PaymentsController` (`modules/payments/payments.controller.ts`, per-method guards):

| M | Endpoint | Handler | Roles |
|---|---|---|---|
| POST | `/payments/initiate` | initiatePayment | VENDOR, ADMIN |
| GET | `/payments`, `/payments/:id`, `/payments/wallet`, `/payments/wallet/transactions` | payment reads | VENDOR, ADMIN |
| POST | `/payments/wallet/top-up/create-order`, `/wallet/top-up/order`, `/wallet/top-up/verify`, `/wallet/top-up/record-status` | Razorpay top-up flow | VENDOR, ADMIN |
| GET | `/payments/admin/metrics`, `/payments/admin/all` | getAdminMetrics / getAllPaymentsAdmin | ADMIN |
| POST | `/payments/webhooks/:provider` | handleWebhook | public — HMAC verified |

`VendorQuoteController` (`modules/pricing/vendor-quote.controller.ts`, class J+R VENDOR,ADMIN): `GET /vendor/pricing/rate-card`; `POST /vendor/trip-quotes`, `/vendor/trips`.

### Pricing

`PricingController` (`modules/pricing/pricing.controller.ts`): public GETs `/pricing`, `/pricing/tiers`, `/pricing/policy-config`, `/pricing/:vehicleType`; admin writes `/pricing/admin/tiers` (POST/DELETE `:vehicleType`), `/pricing/admin/policy-config` (PATCH), `/pricing/admin/:vehicleType` (PATCH) — method-level JWT+ADMIN.

`AdminPricingController` (`modules/pricing/admin-pricing.controller.ts`, class J+R ADMIN): `GET/POST /admin/pricing/plans`, `GET /admin/pricing/plans/:id`, `PUT /admin/pricing/plans/:id/slabs`, `POST /admin/pricing/plans/:id/publish`, `/retire`, `GET /admin/pricing/audit`, `POST /admin/pricing/simulate`.

### KYC — Digio

`DigioController` (`modules/digio/digio.controller.ts`, prefix `kyc/digio`, 40 endpoints): PAN/Aadhaar (mask/analyze, stored+upload variants), passport, voter-id, ID-card, driving-licence, vehicle-insurance, RC, FASTag?, bank IFSC/account verify, UPI VPA verify/search, GST/PAN-to-GST/CIN/DIN/Udyam/FSSAI business verification, fuzzy-match, UAN, DigiLocker session/status/approval/reattempt/media-sync, admin driver/vendor verification views + run-suite, `POST /kyc/digio/webhooks` (public, signature-verified), `GET /kyc/digio/capabilities`, `GET /kyc/digio/me`.
⚠ Several utility routes (`bank/ifsc`, `upi/search`, digilocker status/reattempt) carry no role guard — paid Digio API cost-abuse risk.

### Corporate ETS — `apps/api/src/domains/corporate/` (class guards J+R+C unless noted)

**CorporateTenantController** (`tenants/corporate-tenant.controller.ts`, 34):

| M | Endpoint | Roles |
|---|---|---|
| POST | `/corporate/tenants/onboard` | ADMIN, OPS |
| POST `/corporate/tenants`; PATCH `/:id` | `/corporate/tenants` | ADMIN |
| GET `/corporate/tenants`, `/:id` | | ADMIN, OPS (+CORP_PORTAL on :id) |
| POST `/:id/logo` (FileInterceptor) | | CORP_PORTAL |
| PATCH `/:id/profile` | | CORP_PORTAL |
| GET/POST/PATCH `/:id/users[/:userId]` | | CORP_PORTAL, OPS |
| GET/POST/PATCH `/:id/departments[/:departmentId]` | | CORP_PORTAL |
| GET/POST/PATCH `/:id/transport-zones[/:zoneId]` | | CORP_PORTAL |
| GET/POST `/:id/cost-centers` | | CORP_PORTAL |
| GET/POST `/:id/policy`, GET `/:id/policy/versions` | | CORP_PORTAL, OPS |
| POST/GET/PATCH `/:id/offices[/:officeId]`, GET `.../geofences`, GET `.../integrations` | | CORP_PORTAL (+OPS on create/list) |
| POST/GET/PATCH/DELETE `/:id/employees[/:employeeId]`, GET `.../requests`, POST `.../locations` | | CORP_PORTAL, OPS |

**CorporateRiderController** (`rider/corporate-rider.controller.ts`, class J+R, 12): `GET/PATCH /corporate/me`; `GET /corporate/me/{schedule,trips,trips/next,trips/:id/tracking,notifications}`; `POST /corporate/me/trips/:id/{cancel,safe-reach,feedback}`, `/corporate/me/tickets` (GET/POST) — EMPLOYEE, CORP_ADMIN, CORP_MANAGER, ADMIN.

**CorporateRosterController** (`rosters/corporate-roster.controller.ts`, class J+R+C, 8, ADMIN/OPS): `GET /corporate/rosters/template`, `POST /validate`, `POST /upload`, `GET /`, `GET /:id`, `POST /:id/approve`, `POST /:id/publish`, `GET /:id/requests`.

**CorporateRoutingController** (`routing/corporate-routing.controller.ts`, class J+R+C, 17):

| M | Endpoint | Roles |
|---|---|---|
| POST | `/corporate/routes/plan-from-file`, `/plan-stream`, `/plan-from-file/stream`, `/commit-plan`, `/export-plan`, `/optimize` | ADMIN, OPS |
| GET | `/corporate/routes/sample-template`, `/corporate/routes` | ADMIN, OPS |
| GET | `/corporate/routes/portal` | ADMIN, OPS, CORP_* |
| POST `/corporate/routes`; PATCH/DELETE `/:id`; POST/PATCH/DELETE `/:id/stops[/:stopId]` | | ADMIN, OPS |
| GET | `/corporate/routes/:id/directions`, `/:id` | ADMIN, OPS, DRIVER, EMPLOYEE, CORP_* |

`planStream`/`planFromFileStream` emit `text/event-stream` progress manually.

**CorporateSchedulingController** (`scheduling/corporate-scheduling.controller.ts`, 5, J+R+C): `GET/POST /corporate/scheduling/shift-templates`, `GET/POST /holidays`, `POST /auto-plan/run` (ADMIN).

**CorporateDispatchController** (`dispatch/corporate-dispatch.controller.ts`, 8, J+R+C):

| M | Endpoint | Roles |
|---|---|---|
| POST | `/corporate/dispatch/routes/:id/start-now` | ADMIN, OPS |
| POST | `/corporate/dispatch/routes/:id/offers/accept`, `/offers/reject` | ADMIN, DRIVER |
| GET | `/corporate/dispatch/routes/:id/traffic-assessment`, `/status` | ADMIN, OPS |
| GET | `/corporate/dispatch/my-offer`, `/driver-offers`, `/driver-duties` | ADMIN, DRIVER (`@CorporateDriverSelfScoped`) |

**CorporateTripExecutionController** (`execution/corporate-trip-execution.controller.ts`, 22, J+R+C): `POST routes/:id/start`; `POST routes/:id/stops/:stopId/{arrive,verify-otp,no-show,otp-unlock,drop,confirm-safe-reach,confirm-safe-drop,emergency-boarding-override}`; `POST routes/:id/{complete,telemetry}`; `GET routes/:id/{waypoints,stops/:stopId/boarding-qr}`; `POST routes/:id/stops/:stopId/verify-qr`; `POST requests/:id/{reschedule,admin-reschedule,review}`; `GET requests`; `GET me/{schedule,next-trip,trips}`; `GET driver/{active-route,routes}` — roles ADMIN/OPS/DRIVER/EMPLOYEE per handler.

**CorporateTrackingController** (`tracking/corporate-tracking.controller.ts`, 7, J+R+C): `GET routes/:id/{tracking,timeline,playback}`, `GET routes/fleet/live`, `POST live-stream-tickets`, **SSE** `routes/fleet/live-stream`, **SSE** `routes/:id/live-stream` (auth via `?ticket=`).

**CorporateOperationsController + CorporateRouteCancellationController + CorporateOpsDriversController** (`operations/corporate-operations.controller.ts`, 11, J+R+C): `GET /corporate/ops/{board,live-operations}`, `GET /ops/routes/:id/detail`, `POST /ops/routes/:id/reassign`, `POST /corporate/trips/routes/:id/cancel` (ADMIN,OPS); `GET /ops/drivers`, `GET /ops/drivers/:driverId`, `POST /ops/drivers/:driverId/{suspend,reactivate,deactivate,activate}` (OPS,ADMIN).

**CorporateSafetyController** (`safety/corporate-safety.controller.ts`, 13, J+R+C): `POST /corporate/safety/sos`; `GET /alerts`; `POST /alerts/:id/{acknowledge,investigate,escalate,close,resolve}`; `POST /routes/:id/check-deviation`; `POST /routes/:id/stops/:stopId/{confirm-safe-drop,confirm-safe-reach,emergency-boarding-override}`; `GET /tracking-loss`; `GET /stops/:stopId/safe-drop-status`.

**CorporateSupportTicketController + OpsSupportTicketController** (`safety/corporate-support-ticket.controller.ts`, 19, J+R+C): `POST/GET /corporate/support/tickets`, `GET /summary`, `GET /:id`, `POST /:id/{replies,reopen,comments,notes,messages}`, `PATCH /:id/{status,assignment,assign,priority}`, `GET /:id/{messages,activity}` — ADMIN/OPS/CORP_*/EMPLOYEE (+DRIVER on :id reads/messages); `GET /ops/support/tickets`, `GET /:id`, `POST /:id/updates`, `PATCH /:id/status` (OPS,ADMIN).

**CorporateAnalyticsController** (`analytics/corporate-analytics.controller.ts`, 5, J+R+C): `GET /corporate/analytics/{metric-definitions,dashboard,exceptions,attendance,reports/:type}`.

**CorporateBillingController** (`billing/corporate-billing.controller.ts`, 18, J+R+C): `POST /invoices/generate-batch`; `GET /invoices[/:id]`, `GET /invoices/:id/pdf`; `POST /payouts/prepare-batch`; `GET /payouts/preview`; `GET /drivers/:driverId/earnings` (ADMIN,DRIVER self via `@CorporateResource`); `POST /invoices/:id/disputes`; `GET /disputes`; `POST /disputes/:id/{accept,reject}`; `GET /credit-notes`; `POST/GET /payouts/batches[/:id]`; `POST /payouts/batches/:id/{approve,submit}`; `GET /reconciliations`.

**CorporateRateCardController** (`billing/corporate-rate-card.controller.ts`, 6, J+R+C): `POST/GET /corporate/billing/rate-cards/corporate`, `POST /:id/retire`, `POST/GET .../driver`, `POST .../driver/:id/retire`.

**CorporatePayoutWebhookController** (`billing/corporate-payout-webhook.controller.ts`, 1, **public**, provider-signature verified): `POST /corporate/billing/payouts/provider-callback`.

### Admin governance

`AdminController` (`modules/admin/admin.controller.ts`, class J+R ADMIN, 39): drivers CRUD-ish (`GET /admin/drivers`, `GET/PATCH /:id`, verify/reject/suspend/reactivate/clear-cooldown), vendors (`POST/GET /admin/vendors`, `GET /:id`, `/fulfillment`, `PATCH`, verify/reject/delete, `POST /:id/status`), users (`GET /admin/users`, `GET/PATCH /:id`, `POST /:id/status`, `DELETE /:id`), `GET /admin/metrics`, `GET /admin/audit-logs`, `GET /admin/finance/{dashboard,transactions,driver/:id}`, reports (`/admin/reports`, `/admin/reports/{corridors,trips,trips/weekly,financial-companies,financial-daily,analytics-trends,analytics}`, `/admin/corridors`, `/admin/analytics/trends`), `GET /admin/support/tickets`, `POST /admin/support/tickets/:id/resolve`.

### Content, flags, leads, misc

| Controller | File | Endpoints |
|---|---|---|
| BlogsController `blogs` | `modules/blogs/blogs.controller.ts` | `GET /blogs`, `/featured`, `/categories`, `/:slug` — public/ADMIN on slug |
| AdminBlogsController `admin/blogs` | same | 6 CRUD — class ADMIN |
| CouponsController `coupons` | `modules/coupons/coupons.controller.ts` | `POST /coupons/validate`, `GET /coupons/available` — JWT |
| AdminCouponsController `admin/coupons` | same | 7 CRUD+metrics+redemptions — class ADMIN |
| FeatureFlagsController `feature-flags` | `modules/feature-flags/feature-flags.controller.ts` | `GET /feature-flags`, `/:key` — public/JWT |
| AdminFeatureFlagsController `admin/feature-flags` | same | 5 CRUD+toggle — class ADMIN |
| LeadsController `leads` | `modules/leads/leads.controller.ts` | `POST /leads/enterprise`, `/newsletter` (public), `GET /leads` (ADMIN) |
| NotificationsController `notifications` | `modules/notifications/notifications.controller.ts` | 18: **SSE** `/events`, device-token POST/DELETE, preferences GET/PATCH, in-app list/read/interact/read-all/clear/delete, admin broadcast/progress/audience-estimate/test-push/campaigns/metrics — method-level JWT; admin/* ADMIN |

## Flask — `route_planner_app.py` (repo root, standalone; **no auth**, in-memory state)

| M | Endpoint | Purpose |
|---|---|---|
| GET | `/` | landing/info |
| GET | `/sample.csv` | sample input download |
| POST | `/api/legacy-plan` | legacy route plan |
| GET | `/frontend` | planner UI |
| GET | `/maps-loader.js` | Google Maps loader |
| POST | `/api/plan/stream` | SSE progress variant |
| POST | `/api/plan` | route plan (Google Routes API) |
| POST | `/api/assignments/confirm` | confirm assignment |

## Astro SSR — `apps/marketing`

| M | Endpoint | File |
|---|---|---|
| GET | `/rss.xml` | `apps/marketing/src/pages/rss.xml.ts` |
| GET | `/sitemap.xml` | `apps/marketing/src/pages/sitemap.xml.ts` |

## Totals

| Stack | Endpoints |
|---|---|
| NestJS REST | 436 |
| NestJS SSE | 3 |
| Flask | 8 |
| Astro | 2 |
| **Total** | **449** |

**Discrepancy notes:** multi-path decorators (`[':id/arrive',':id/arrived']`, uploads dual paths, auth refresh aliases) are counted as separate registered routes; Swagger `/docs` and dev-only `apps/*/scripts/dev.js` static/SSE servers are excluded from product totals. A small number of handler-name extractions in automated parsing were ambiguous (marked where relevant in `05`); paths/methods/roles above were verified against source.
