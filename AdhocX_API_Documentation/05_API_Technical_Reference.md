# 05 — API Technical Reference

## Global conventions (verified in `apps/api/src/main.ts`)

- **Base URL:** `http://<host>:7001/api/v1` (dev). Swagger UI at `/docs` when `NODE_ENV !== 'production'`.
- **Request headers:** `Authorization: Bearer <accessToken>` for protected endpoints; `Content-Type: application/json` (multipart on upload endpoints); SSE streams authenticate via `?ticket=<streamTicket>` or the Bearer header.
- **Response envelope:** `TransformInterceptor` wraps successful responses as `{ "data": ... }` (verify per-endpoint — some streaming/file endpoints bypass it).
- **Validation:** global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` — unknown body fields → `400`; DTO rules from `class-validator` in `packages/contracts/src/dtos/*` or inline types.
- **Errors:** `HttpExceptionFilter` normalizes to NestJS error shape `{ statusCode, message, error }`; domain errors throw `BadRequestException`/`ForbiddenException`/`NotFoundException`/`ConflictException`/`UnauthorizedException`.
- **Guards:** `JwtAuthGuard` (signature + Redis blacklist + per-user revocation + `minTokenIssuedAt`) → `RolesGuard` (`@Roles`, ADMIN bypass, legacy role aliases) → `CorporateAccessGuard` (tenant/resource scoping via `@CorporateResource`, `@CorporateTenantScoped`, `@CorporateDriverSelfScoped`).
- **Status codes:** 200/201 success; 400 validation; 401 missing/invalid/expired token; 403 role/tenant/ownership failure; 404 not found; 409 state conflict (e.g., invalid transition, duplicate); 429 throttled; 500 unhandled.

## Detailed endpoint references (verified DTOs/params)

### Auth — `AuthController` (`modules/auth/auth.controller.ts`), DTOs in `packages/contracts/src/dtos/auth.dto.ts`

**POST `/auth/otp/request`** — public
- Body `RequestOtpDto`: `phone?`, `countryCode?`, `email?`, `channel?: 'SMS'|'EMAIL'`, `role?`, `isRegister?`, `fullName?`, `companyName?`, `referralCode?`
- → `AuthService.requestOtp` → OTP stored in Redis, dispatched via MSG91/SMTP
- Response: `RequestOtpResponseDto { requestId, expiresAt, retryAfterSeconds, message? }`

**POST `/auth/otp/verify`** — public
- Body `VerifyOtpDto`: `requestId?`, `phone?`, `countryCode?`, `email?`, `otp` (6 digits, required), `role?`, `isRegister?`, `fullName?`, `referralCode?`
- → `AuthService.verifyOtp` → creates/links `User` (1-account-1-role), issues access+refresh JWT
- Response: token pair + user profile (exact shape in `AuthService`; refresh via `/auth/refresh`)

**POST `/auth/login`** — public, throttled
- Body `LoginDto`: `identifier` (phone/email), `password`, `role?`
- → bcrypt verify, 15-min lockout on failures → JWT pair

**POST `/auth/admin/login`** — public
- Body `LoginDto & { mfaCode? }` → `AuthService.adminLogin`; if MFA enabled returns `{ mfaSessionToken }` challenge → `POST /auth/admin/mfa-verify` `{ mfaSessionToken, mfaCode }` → JWT

**POST `/auth/refresh` / `/auth/refresh-token`** — public
- Body `RefreshTokenDto` (refresh token) → rotated pair; old token blacklisted

**POST `/auth/social`** — public
- Body `SocialAuthDto`: `provider: 'GOOGLE'|'APPLE'`, `email`, `idToken?/token?`, `fullName?`, `photoUrl?`, `role?`

**POST `/auth/password`, `/auth/password/reset`, `/auth/reset-password`** — public
- `SetPasswordDto` / `ResetPasswordDto`: `identifier`, `otp` (6), `password` (+ confirm per DTO)

**GET `/auth/me`**, **PATCH `/auth/profile`** (`UpdateUserDto`), **POST `/auth/logout`**, **DELETE `/auth/account`** — JWT

**GET `/auth/check-phone`** — query `phone` (+ `countryCode`) → availability/role lookup for onboarding

### Drivers — `DriversController` (`modules/drivers/drivers.controller.ts`)

Class guards: JwtAuthGuard + RolesGuard.

| Endpoint | Method roles | Params/Body | Service | DB models |
|---|---|---|---|---|
| `GET /drivers/profile` | DRIVER, ADMIN, VENDOR | — | `DriversService.getProfile(userId)` | `Driver` (+`Vehicle`, docs via StorageService URLs) |
| `PATCH /drivers/profile` | DRIVER, ADMIN, VENDOR | profile DTO (name, vehicleType/Model/Plate, etc.) | `DriversService.updateProfile` — **upserts `Vehicle` row** when `vehiclePlate` present (`drivers.service.ts:395-418`) | `Driver`, `Vehicle`, `VehiclePricingTier` (validation) |
| `PATCH /drivers/bank-details` | DRIVER, ADMIN | bank fields DTO | `DriversService` | `Driver` |
| `GET /drivers/trust-score` | DRIVER, ADMIN | — | trust-score computation | `Driver`, trip/acceptance aggregates |
| `PATCH /drivers/availability` | DRIVER | `{ availabilityStatus }` | `DriversService` | `Driver.availabilityStatus` |
| `POST /drivers/location` | DRIVER | `{ lat, lng, ... }` | → `LocationsService.indexDriverLocation` (Redis geo) | `Driver.currentLat/Lng/lastLocationAt` |
| `POST /drivers/kyc` | DRIVER, ADMIN, VENDOR | KYC payload DTO | `DriversService`/Digio | `Driver`, `DigioVerification` |
| `POST /drivers/documents/upload` | DRIVER, ADMIN, VENDOR | multipart file (`FileInterceptor`) | storage upload → doc URL | `Driver` KYC doc fields |

### Trips (marketplace) — `TripsController` (`modules/trips/trips.controller.ts`)

Class guards: JwtAuthGuard + RolesGuard. Service: `TripsService`; state transitions validated by `packages/contracts/src/state-machines/state-validator.ts` (`Trip: ASSIGNED→ARRIVED→IN_PROGRESS→COMPLETED|CANCELLED|NO_SHOW`).

| Endpoint | Roles | Notes |
|---|---|---|
| `GET /trips` | DRIVER, VENDOR, ADMIN, OPS | query filters (role-scoped list) |
| `GET /trips/:id`, `/trips/:id/events`, `/trips/pending-review` | DRIVER, VENDOR, ADMIN (+OPS) | detail/event log |
| `POST /trips/:id/arrive` + `/arrived` | DRIVER | alias pair — both → `markArrived` |
| `POST /trips/:id/start`, `/complete`, `/no-show` | DRIVER | lifecycle transitions |
| `POST /trips/:id/cancel` | DRIVER, VENDOR, ADMIN | cancel |
| `PATCH /trips/:id/location` | DRIVER | en-route GPS → TripEvent |
| `POST /trips/:id/sos` | DRIVER, VENDOR, ADMIN | SOS → notification/alert fan-out |
| `GET/POST /trips/:id/messages` | DRIVER, VENDOR, ADMIN | trip chat |

Models: `Trip`, `TripEvent`, `Assignment`, `Requirement`, `Offer`. Earnings fields on `Trip`: `driverRate`, `tollCharges`, `parkingCharges`, `totalDriverEarnings`, `otp` (⚠ `@default("1234")`

### Settlements — `SettlementsController` (`modules/settlements/settlements.controller.ts`)

| Endpoint | Roles | Body/Notes | DB |
|---|---|---|---|
| `POST /settlements/withdraw` | DRIVER | amount/bank DTO | `Settlement` + `Driver.walletBalance` decrement inside `db.$transaction` with `LedgerEntry` rows (`settlements.service.ts:108-132`) |
| `GET /settlements`, `/:id`, `/wallet` | DRIVER, ADMIN | — | `Settlement`, `Driver` |
| `POST /settlements/:id/process`, `/bank-review` | ADMIN | process payout / review bank details | `Settlement` status transitions |

### Payments — `PaymentsController` (`modules/payments/payments.controller.ts`)

| Endpoint | Roles | Notes |
|---|---|---|
| `POST /payments/initiate` | VENDOR, ADMIN | Razorpay order for `Requirement` payment |
| `POST /payments/wallet/top-up/{create-order,order,verify,record-status}` | VENDOR, ADMIN | ⚠ order store is in-memory `Map` — lost on restart |
| `POST /payments/webhooks/:provider` | public | Razorpay HMAC signature verification in service |
| `GET /payments*`, `/payments/admin/*` | VENDOR, ADMIN / ADMIN | payment lists & metrics |

### Corporate billing — `CorporateBillingController` (`domains/corporate/billing/corporate-billing.controller.ts`)

Class guards J+R+C (18 endpoints). Key params: `tenantId`, `status`, `page`, `limit` (invoices list); payout batch maker-checker (`createdByUserId`/`approvedByUserId`, `idempotencyKey`); `GET /drivers/:driverId/earnings` is ADMIN+DRIVER with `@CorporateResource('driver')` self-scope → `CorporateBillingService.getDriverEarningsSummary` aggregates `CorporateDriverEarning` (routeFare + approachBonus + tollReimbursement, TDS breakdown).

Webhook: `POST /corporate/billing/payouts/provider-callback` — public, provider signature → append-only `CorporatePayoutProviderEvent` (`(provider,eventId)` unique) → `CorporatePayout` status transitions (PENDING→PROCESSING→PAID/FAILED/REVERSED).

### Corporate dispatch — `CorporateDispatchController` (`domains/corporate/dispatch/corporate-dispatch.controller.ts`)

| Endpoint | Roles | Notes |
|---|---|---|
| `POST /routes/:id/start-now` | ADMIN, OPS | force dispatch bypass |
| `POST /routes/:id/offers/{accept,reject}` | ADMIN, DRIVER | atomic Redis offer accept (60s TTL) → `CorporateRoute.driverId` + `CorporateRouteAssignmentEvent` |
| `GET /my-offer`, `/driver-offers`, `/driver-duties` | ADMIN, DRIVER | `@CorporateDriverSelfScoped` — driver sees only own |
| `GET /routes/:id/{status,traffic-assessment}` | ADMIN, OPS | dispatch state / Google traffic |

### Corporate trip execution — `CorporateTripExecutionController` (`domains/corporate/execution/corporate-trip-execution.controller.ts`)

22 endpoints, class J+R+C. Pattern: `POST /corporate/trips/routes/:id/...` with `@Param('id') routeId`, `@Param('stopId') stopId`; bodies are inline/DTO-typed (verify-otp body carries OTP; telemetry body carries position batch; reschedule carries new schedule). Execution → `CorporateTripExecutionService` → stop state machine → on `complete` creates `CorporateDriverEarning` from `CorporateDriverRateCard`. QR boarding: `GET stops/:stopId/boarding-qr` + `POST stops/:stopId/verify-qr`; OTP unlock admin-only `POST stops/:stopId/otp-unlock`.

### Corporate tracking/SSE — `CorporateTrackingController` (`domains/corporate/tracking/corporate-tracking.controller.ts`)

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /corporate/trips/routes/:id/tracking` | J+R+C, resource-scoped | query `from,to,limit,cursor,tenantId` — position history |
| `GET .../timeline`, `.../playback` | ADMIN, OPS, CORP_* | event timeline / GPS playback |
| `GET /corporate/trips/routes/fleet/live` | ADMIN, OPS, CORP_* | live fleet snapshot |
| `POST /corporate/trips/live-stream-tickets` | any authenticated | issues single-use SSE ticket |
| SSE `/corporate/trips/routes/{:id/,fleet/}live-stream` | `?ticket=` | `TelemetryStreamHub` stream |

### Notifications — `NotificationsController` (`modules/notifications/notifications.controller.ts`)

18 endpoints; class has no guard — **each method carries its own `@UseGuards(JwtAuthGuard)`** (admin/* also `@Roles(ADMIN)`). `SSE /notifications/events` streams per-user notifications; device-token register/unregister feeds FCM; in-app inbox CRUD; admin broadcast/campaign endpoints fan out via `NotificationQueueService` (FCM + SMTP + MSG91).

### Admin — `AdminController` (`modules/admin/admin.controller.ts`)

Class J+R ADMIN (39 endpoints). List endpoints accept `page`, `limit`, `search`/`query`, `status`, `role`, `range`, `startDate`, `endDate` query params (verified in extracted signatures). All mutations write `AuditLog` via `AuditService`.

### KYC — `DigioController` (`modules/digio/digio.controller.ts`)

40 endpoints under `/kyc/digio`. Per-method guards (roles vary: DRIVER/VENDOR/CORPORATE_ADMIN/ADMIN). `POST /kyc/digio/webhooks` public + provider signature. ⚠ Unauthenticated paid-proxy routes: `POST /kyc/digio/bank/ifsc`, `POST /kyc/digio/upi/search`, digilocker `status`/`reattempt` GET/POST.

## Endpoint coverage note

The remaining ~380 endpoints follow identical patterns documented above: class/method guards → controller → single service → Prisma via `DatabaseService` (or tenant-scoped extension for the ~10 corporate models) → `{data}` envelope. Per-endpoint body DTO class names are declared in each controller signature; most DTOs live in `packages/contracts/src/dtos/` (auth verified) or inline in the controller file. Where a DTO could not be mechanically verified it is marked **unverified** rather than invented — consult the controller file path cited in `02_Complete_API_Inventory.md` for exact fields.
