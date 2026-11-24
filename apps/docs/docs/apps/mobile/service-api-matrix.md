---
title: Mobile Service and API Matrix
description: Source-grounded mapping of Mobile screens and services to HTTP APIs, backend ownership and data areas.
---

# Mobile Service and API Matrix

This page traces the Mobile app's client services to the HTTP endpoint families
they call. Paths below are relative to the `ApiClient.baseUrl`; unless stated
otherwise the client uses bearer authentication. Backend service and model
links identify the code areas that own the behavior. A client call does not
prove that a request succeeds in a deployed environment.

## API client and response contract

| Concern | Implementation |
|---|---|
| Base URL | `apps/mobile/lib/core/networking/api_client.dart`: native defaults to `https://api.adhocx.com/api/v1`; local web uses `http://localhost:7001/api/v1`; web on an AdhocX domain uses the production API; `API_URL`/`API_BASE_URL` compile-time values can override according to the host safeguards. |
| Methods | `ApiClient` implements GET, POST, PATCH, DELETE and multipart POST. JSON payloads are encoded for write calls. |
| Authentication | Bearer access token comes from the in-memory token cache, Flutter Secure Storage, or a SharedPreferences migration/fallback path. Eligible 401 responses attempt refresh and retry. |
| Cache | GET calls may use short-lived in-memory response caching and in-flight request deduplication. Write methods invalidate cached data; feature services also invalidate relevant prefixes. |
| Response | Successful `{success: true, data: ...}` envelopes are unwrapped. Other successful JSON is returned as-is. Unsuccessful HTTP responses are logged and thrown as `ApiException(statusCode, message, data)`. |
| Error display | Some feature helpers propagate `ApiException`; others intentionally return cached/empty/default data for selected reads. Check the owning service before interpreting an empty value as a confirmed empty server result. |

## Identity, session and onboarding

| Endpoint | Method | Purpose / called by | Frontend helper | Backend owner / records |
|---|---|---|---|---|
| `/auth/check-phone` | POST | Check account/registration state before OTP or signup. | `AuthService.checkPhoneAvailability` | `AuthController` / `AuthService`; `User`. |
| `/auth/otp/request`, `/auth/otp/verify` | POST | Request and verify the submitted OTP; verification returns a session/user result. | `AuthService.requestOtp`, `verifyOtp`; auth screens | `AuthController` / `AuthService`; `User` and session/token state. |
| `/auth/login`, `/auth/social` | POST | Password or configured social sign-in. | `AuthService.loginWithPassword`, social sign-in methods | `AuthController`; `User` and session/token state. |
| `/auth/password`, `/auth/reset-password` | POST | Set or reset password after authentication/recovery. | `AuthService.setPassword`, `resetPassword` | `AuthController` / `AuthService`; password state on user. |
| `/auth/me`, `/auth/profile`, `/auth/logout`, `/auth/account`, `/auth/refresh` | GET, PATCH, POST, DELETE | Restore/update the current user, close a session, delete an account, and refresh eligible expired tokens. | `AuthService.fetchCurrentUser`, `updateUserProfile`, `logout`, `deleteAccount`; automatic `ApiClient` refresh | `AuthController` / `AuthService`; `User` and session/token state. |
| `/drivers/profile` | GET, PATCH | Load or update driver profile details. | `DriverService.getProfile`, `updateProfile` | `DriversController`; driver/user profile data. |
| `/drivers/kyc` | POST | Submit onboarding/KYC fields and document references for review. | `DriverService.submitKyc` | `DriversController`; driver, vehicle and document data. |
| `/drivers/documents/upload` | Multipart POST | Upload a KYC/profile document and obtain a stored-file URL. | `DriverService.uploadKycDocument` | `DriversController` and configured object-storage adapter; document metadata. |
| `/kyc/digio/*` | GET, POST | Consent, capability/status, identity/vehicle/bank checks, DigiLocker and biometric workflows. | `DigioService` | `DigioController`, verification provider services and verification records. Aadhaar operations are gated by recorded consent. |

The onboarding UI holds values in `OnboardingProvider`; the server makes the
authoritative decision about account verification. Sensitive tokens and
verification state should not be inferred from local route state alone.

## Driver dispatch, trip and earnings calls

| Endpoint | Method | Purpose / calling screen | Frontend helper | Backend owner / records |
|---|---|---|---|---|
| `/drivers/availability` | PATCH | Change whether a driver is available and optionally submit current coordinates. | `DriverService.updateAvailability` | `DriversController`; driver availability/location state. |
| `/drivers/location` | POST | Send an idle-driver heartbeat with coordinates, accuracy, source and recorded time. | `DriverService.sendLocationHeartbeat`; heartbeat service | `DriversController`; driver position/location history. |
| `/offers`, `/offers/:id` | GET | Load dispatch opportunities and one offer. | `DriverService.getOffers`, `getOfferById` | `OffersController`; `Offer` and related eligibility records. |
| `/offers/:id/accept`, `/offers/:id/decline`, `/offers/:id/seen` | POST | Accept/decline or record offer display. | `DriverService.acceptOffer`, `declineOffer`, `markOfferSeen` | `OffersController`; `Offer`, `Assignment` and downstream trip state. |
| `/trips`, `/trips/:id` | GET | Load current/history trip data and detail. | `DriverService.getTrips`, `getTrip` | `TripsController`; `Trip` and `TripEvent`. |
| `/trips/:id/arrive`, `/trips/:id/start`, `/trips/:id/complete` | POST | Progress a driver trip. Start includes OTP and current location; complete includes location and toll/parking charges. | `DriverService.markArrived`, `startTrip`, `completeTrip` | `TripsController` / trip lifecycle service; trip status and event history. |
| `/trips/:id/location` | PATCH | Submit live location for an active standard trip. | `DriverService.sendLocationPing` | `TripsController`; trip tracking/event records. |
| `/trips/:id/messages` | GET, POST | Read/send trip chat messages. | `DriverService.getTripMessages`, `sendTripMessage` | `TripsController` or messaging service; trip messages. |
| `/trips/:id/sos` | POST | Raise a safety alert associated with a standard trip. | `DriverService.triggerSos` | Trips/safety backend; trip and alert records. |
| `/drivers/trust-score` | GET | Show driver performance/trust information. | `DriverService.getTrustScore` | `DriversController`; score inputs/summary. |
| `/settlements/wallet`, `/settlements`, `/settlements/:id` | GET | Read driver wallet summary, settlement history and detail. | `DriverService.getWalletSummary`, `getSettlements`, `getSettlementDetails` | `SettlementsController`; `Settlement` and ledger data. |
| `/settlements/withdraw` | POST | Request a withdrawal using amount and bank details. | `DriverService.requestWithdrawal` | `SettlementsController`; settlement/withdrawal and ledger records. |
| `/drivers/bank-details` | PATCH | Update payout bank details. | `DriverService.updateBankDetails` | `DriversController`; driver payout profile. |
| `/subscriptions/status`, `/subscriptions/order`, `/subscriptions/verify`, `/subscriptions/renew-wallet` | GET, POST | Read, purchase, verify or renew a driver subscription. | `DriverService` subscription methods; subscription paywall | `SubscriptionsController` / payment verification service; subscription and payment records. |
| `/pricing`, `/pricing/tiers`, `/pricing/policy-config`, `/driver/pricing/rate-card` | GET | Load vehicle categories, published pricing/policy and driver payout rate card. | `DriverService.getPricingTiers`, `getDriverDistanceRateCard`, `getPolicyConfig` | Pricing and driver quote controllers/services; active pricing plans and policy configuration. |
| `/drivers/referral/*` | POST, GET | Validate referral identifiers, load reward dashboard and claim a reward. | `DriverService` referral methods | `ReferralsController`; referral and reward records. |

## Vendor/booker requirements, payments and support

| Endpoint | Method | Purpose / calling screen | Frontend helper | Backend owner / records |
|---|---|---|---|---|
| `/requirements`, `/requirements/summary`, `/requirements/:id` | GET, POST | Create and list a vendor requirement; load details and dashboard counts. | `UserService.createRequirement`, `getRequirements`, `getRequirementsSummary`, `getRequirement` | `RequirementsController` / `RequirementsService`; `Requirement`, vendor/user and related route/assignment records. |
| `/requirements/:id/cancel`, `/requirements/:id/retry` | POST | Request eligible requirement cancellation or retry. | `UserService.cancelRequirement`, `retryRequirement` | `RequirementsController`; requirement lifecycle rules and associated assignments. |
| `/vendor/pricing/rate-card`, `/vendor/trip-quotes` | GET, POST | Load vendor pricing terms and request an authoritative route/vehicle quote. | `UserService.getVendorRateCard`, `createDistanceTripQuote` | Vendor quote/pricing controller and pricing service; quote snapshot/pricing inputs. The quote ID is passed to requirement creation. |
| `/pricing/tiers`, `/pricing/policy-config` | GET | Load vehicle categories and optional policy/escort values. | `UserService.getPricingTiers`, `getEscortFee` | Pricing controller/service; active pricing/policy configuration. |
| `/trips`, `/trips/:id`, `/trips/:id/cancel`, `/trips/:id/messages` | GET, POST | Vendor trip list/detail, cancellation and trip chat. | `UserService.getTrips`, `getTrip`, `cancelTrip`, chat methods | `TripsController`; `Trip`, `TripEvent` and message records. |
| `/trips/pending-review`, `/reviews` | GET, POST | Find a pending review and submit a rating/feedback. | `UserService.getPendingReview`, `submitReview`; driver review helper also posts `/reviews` | Trips/Reviews controllers; trip review records. |
| `/payments/wallet`, `/payments/wallet/transactions` | GET | Load vendor wallet, transaction history and spend/escrow summaries. | `UserService.getWalletSummary`, `getWalletTransactions` | Payments/Ledger controllers; wallet/ledger transactions. |
| `/payments/wallet/top-up/create-order`, `/payments/wallet/top-up/verify`, `/payments/wallet/top-up/record-status` | POST | Create provider order, verify provider signature, or record cancellation/failure. | `UserService` wallet-top-up methods and `RazorpayCheckoutService` | Payments controller; `Payment`, wallet and ledger data. Server verification is authoritative. |
| `/coupons/available`, `/coupons/validate` | GET, POST | List or validate a discount for a payment/booking context. | `UserService.getAvailableCoupons`, `validateCoupon` | Coupons controller/service; coupon/redemption records. |
| `/vendors/profile`, `/vendors/profile-photo` | GET, POST | Load/update vendor details and upload a profile image. | `UserService` profile methods | Vendor controller/service and configured object storage; vendor/user profile data. |
| `/notifications/preferences` | GET, PATCH | Read/update notification preferences. | `UserService` preference methods | Notifications controller; per-user notification preferences. |
| `/disputes/support-query*`, `/disputes*` | GET, POST | Submit a support query or dispute and view existing cases. | `UserService` and `DriverService` support/dispute methods | `DisputesController`; `Dispute` and support-query data. |

`UserService.createRequirement` builds a payload with vehicle type, quantity,
pickup/drop address and coordinates, UTC reporting time, fulfillment mode,
schedule state and optional instructions/escort/coupon/quote ID. When a quote
ID exists, it omits client-side rate values. See the [vendor guide](./vendor-feature-guide.md)
for the complete user workflow and visible source rules.

## Corporate ETS driver helpers

The following service methods and `CorporateEtsApi` port exist in source, but
the app currently has no GoRouter registration for `CorporateActiveRouteScreen`.
They are API helper evidence, not proof of a reachable feature.

| Endpoint family | Methods | Source service | Backend areas |
|---|---|---|---|
| `/corporate/dispatch/driver-offers`, `/corporate/dispatch/routes/:id/offers/*`, `/corporate/dispatch/driver-duties` | GET and POST offer, accept/reject, duties | `DriverService` through `DriverServiceCorporateEtsApi` | Corporate dispatch controller/service; corporate driver offer and route records. |
| `/corporate/trips/driver/routes`, `/corporate/trips/driver/active-route`, `/corporate/trips/routes/:id/*` | GET routes/active/waypoints; POST start, telemetry, arrive, verify-otp, no-show, complete, drop | `DriverService` / `CorporateEtsApi` | Corporate execution/tracking controllers and services; route/stop/transport-request records. |
| `/corporate/safety/routes/:id/stops/:stopId/confirm-safe-drop`, `/corporate/safety/sos` | POST safe-drop confirmation and SOS | `DriverService` / `CorporateEtsApi` | Corporate Safety controller/service; safety and trip event records. |
| `/corporate/billing/drivers/:driverId/earnings` | GET corporate earnings | `DriverService` / `CorporateEtsApi` | Corporate billing controller/service; corporate earnings/payout records. |

`UserService` also contains Corporate employee schedule/history/reschedule and
boarding-QR helpers, but the main Mobile route inventory does not map them to a
registered screen. Do not equate method presence with a launched UI workflow.

## Notifications, location and external integrations

| Integration | What it does | Implementation and constraints |
|---|---|---|
| Firebase Cloud Messaging | Receives push messages and routes offer/trip updates to screens. | `FcmService` registers `/notifications/device-token`, listens for foreground/background/open events and calls `AppRoutes.handleNotificationNavigation`. Background offer handling can show local notifications, vibration, sound and the Android assistive overlay. |
| In-app notifications | Loads a paginated feed and changes read/delete state and unread count. | `NotificationService` uses GET `/notifications/in-app`, PATCH `/:id/read` and `/read-all`, DELETE `/:id` or the collection. Some errors are logged and represented as empty/default state. |
| Corporate realtime | Subscribes to notification events for a `driver:<id>` channel. | `CorporateRealtimeClient` uses a WebSocket endpoint derived from the API base URL; this is part of the unregistered Corporate ETS source flow. |
| Google Maps Platform | Place search, reverse geocoding, road distance/ETA, alternative routes and map rendering. | `LocationService` uses Places, Geocoding and Routes APIs; `GoogleRouteMapWidget` renders map context. Route preview is separate from the server quote. |
| OpenStreetMap Nominatim | Reverse-geocoding fallback when Google/network access is unavailable in supported cases. | Direct HTTP request in `LocationService`; fallback behavior may return incomplete location data. |
| Razorpay | Vendor wallet top-up and driver subscription checkout. | `RazorpayCheckoutService` uses native Razorpay SDK on Android/iOS and a browser `postMessage` bridge on web. The server creates orders and verifies payment signatures. |
| DigiO / DigiLocker | Identity, document, bank/business and biometric verification. | `DigioService` calls AdhocX `/kyc/digio/*`; provider capabilities/outcomes are returned through the backend. Aadhaar processing requires recorded consent. |
| Camera and ML Kit | Capture document/selfie evidence and support face-related UI. | `camera`, `image_picker` and `google_mlkit_face_detection`; platform permissions and device availability apply. |
| Secure/local storage | Persist auth tokens and small local settings/cache values. | Flutter Secure Storage, SharedPreferences and in-memory state; do not treat local state as the authority for account or payment state. |
| App updates | Show an update prompt using backend release metadata and Android Play Core where available. | `AppUpdateService` calls `/app/version`, reads package version and opens Play Store or a configured fallback. Automatic Android/Play behavior is not equivalent to iOS release enforcement. |
| Feature flags | Synchronize server-controlled UI capabilities and cache them for startup. | `FeatureFlagsService` calls `GET /feature-flags`, saves flags in SharedPreferences and updates the legacy static vendor-wallet flag. A client flag controls presentation/routing only; backend authorization remains required. |

## Backend/data references

The exact controller method inventory and data definitions are maintained in
the shared API docs. Key platform models used by these feature families include
`User`, `Vehicle`, `Requirement`, `Offer`, `Assignment`, `Trip`, `Settlement`,
`Notification`, and Corporate route/safety models. These names describe the
backend data area; this Mobile mapping does not claim that every frontend call
touches every listed model or that a live database was inspected.

- [API endpoint inventory](../api/reference/exact-controller-endpoints.md)
- [API module/service reference](../api/module-service-reference.md)
- [Prisma data dictionary](../api/data/data-dictionary.md)
- [Driver feature guide](./driver-feature-guide.md)
- [Vendor feature guide](./vendor-feature-guide.md)
