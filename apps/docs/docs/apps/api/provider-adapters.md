---
title: API Provider Adapters and Integration Boundaries
description: How API services call Google, payment, messaging, verification and file-storage providers.
status: source-verified
last_reviewed: "2026-11-23"
---

# API Provider Adapters and Integration Boundaries

## What a provider boundary means in this codebase

An external provider is not always behind a formal interface. Corporate
routing and payouts use explicit ports/adapters; several other integrations
are called directly from NestJS services. That distinction matters when
testing, replacing a provider or deciding what happens when the provider is
unavailable.

The API persists business state in PostgreSQL. Redis caches or coordinates
operational work where a service explicitly uses it. Provider acceptance,
notification delivery and a locally computed estimate are not equivalent to
a completed trip, paid payout or verified identity.

## Integration inventory

| Integration | API caller / implementation | Purpose and flow | Failure/fallback boundary |
|---|---|---|---|
| Google Maps / Routes | `GoogleMapsService`; corporate geocoding, Routes, travel-matrix and traffic adapters | Geocodes addresses and estimates road distance/duration for location, roster planning, directions and dispatch decisions. | Some callers use labeled Haversine/road-factor/traffic heuristics or cached results. Those values must remain distinguishable from a live Google response. |
| Razorpay | `PaymentsService` and `SubscriptionsService` | Creates wallet/subscription orders and accepts payment-provider callbacks after signature checks; payment and ledger state is then updated by API business logic. | The order request is made directly with `fetch`; there is no shared `PaymentsProviderPort` in the inspected source. A failed provider call is not a successful payment. |
| Firebase Cloud Messaging | `NotificationsService` | Sends push notifications to registered device tokens after the relevant business service requests delivery. | Provider delivery results are separate from persisted notification/business state; invalid tokens may be reported/handled without rolling back a trip. |
| MSG91 | `Msg91Service`, called by `NotificationsService` | Sends OTP and SMS through MSG91 Flow/OTP APIs using normalized phone numbers and configured templates. | An explicit simulation result exists when the service is disabled/unconfigured. Test runs suppress real sends unless the test opt-in is set. |
| SMTP | `NotificationsService` using Nodemailer | Sends email notifications when SMTP transport configuration is present. | Email is a delivery side effect; it is not the authoritative account or trip state. |
| DigiO / DigiLocker | `DigioService` → `DigioClient` | Performs identity, document-AI, vehicle, bank/UPI, business and guided DigiLocker verification; persists workflow/result metadata through the service. | Client timeouts, upstream errors and missing configuration become explicit API errors. Webhook processing requires a checksum secret. |
| Cloudflare R2 (S3-compatible) | `StorageService` using AWS SDK S3 client | Stores sanitized files, produces managed file references and serves private/presigned access paths. | If R2 is not configured or an upload fails, writes fall back to local disk. Local disk is instance-local and not durable shared storage. |
| Corporate payout provider | `CorporatePayoutService` → `CorporatePayoutProviderPort` | Submits payout instructions and awaits a separately authenticated provider callback before recording paid state. | Development/test can bind a deterministic mock. Production with no real provider configured binds a fail-closed implementation that throws, rather than reporting fake success. |

Configuration names and environment-specific values are maintained in the
API configuration/secret-management setup. Do not copy credentials, tokens
or private provider payloads into docs or logs. See the [integration
configuration guide](../../platform/integrations/configuration-and-failures.md)
for configuration categories.

## Corporate routing and traffic

The Corporate domain is the clearest example of an explicit adapter
architecture:

1. `CorporateRoutePlannerService` asks the travel-time port for matrix
   estimates while planning stops and routes.
2. `CorporateDomainModule` binds `TRAVEL_TIME_MATRIX_PORT` to a
   `GoogleTravelTimeMatrixAdapter`, a `RedisMatrixCache` and a
   `HaversineTravelTimeMatrix` fallback.
3. `GoogleTravelTimeMatrixAdapter` snaps points to H3 cells, deduplicates
   cell pairs, groups cache misses within Google request limits, caches
   successful results and fills unavailable/missing legs with Haversine
   estimates. Its result exposes the contributing source.
4. `GoogleTrafficEstimatorAdapter`, bound to `TRAFFIC_ESTIMATOR_PORT`,
   requests Google traffic-aware route duration for corporate dispatch.
   It de-duplicates concurrent identical calls, caches successful results,
   briefly caches heuristic failures, and labels heuristic estimates.
5. `GoogleGeocodingAdapter` and `GoogleRoutesV2Adapter` support address
   resolution and route directions.

| Port or adapter | Caller and responsibility | Source |
|---|---|---|
| `TRAVEL_TIME_MATRIX_PORT` | `CorporateRoutePlannerService`; matrix duration/distance for planning | `apps/api/src/domains/corporate/routing/travel-time-matrix.port.ts` |
| `GoogleTravelTimeMatrixAdapter` | Google matrix calls, H3 snapping, bounded request chunks, Redis cache and Haversine fallback | `apps/api/src/domains/corporate/routing/google-travel-time-matrix.adapter.ts` |
| `HaversineTravelTimeMatrix` | Offline straight-line distance/time fallback; not a road route | `apps/api/src/domains/corporate/routing/haversine-travel-time-matrix.ts` |
| `GoogleGeocodingAdapter` | Converts normalized addresses to coordinates using the Google Maps key | `apps/api/src/domains/corporate/routing/google-geocoding.adapter.ts` |
| `GoogleRoutesV2Adapter` | Corporate route directions and route estimates through Google Routes | `apps/api/src/domains/corporate/routing/google-routes-v2.adapter.ts` |
| `TRAFFIC_ESTIMATOR_PORT` | `CorporateDispatchService`; traffic-adjusted route estimate for dispatch | `apps/api/src/domains/corporate/dispatch/traffic/traffic-estimator.port.ts` |
| `GoogleTrafficEstimatorAdapter` | Google traffic estimate with cache, timeout, in-flight de-duplication and heuristic fallback | `apps/api/src/domains/corporate/dispatch/traffic/google-traffic-estimator.adapter.ts` |
| `heuristicTrafficDelay` | Local time/distance-based estimate used when live traffic is unavailable | `apps/api/src/domains/corporate/dispatch/traffic/heuristic-traffic.ts` |

These are estimates used by planning/dispatch, not guaranteed arrival times.
The corporate APIs and persisted results expose source/freshness metadata
where implemented. The [corporate service map](./corporate-module-services.md)
explains where the estimates enter the route and dispatch workflows.

## Payments versus corporate payouts

Marketplace payments and corporate driver payouts are separate flows.

### Marketplace order and payment flow

`PaymentsService` calls Razorpay directly to create wallet top-up orders,
retains short-lived order metadata for verification, validates a callback
signature, then credits a wallet or updates a `Payment` record and emits
audit/notification events. `SubscriptionsService` has its own subscription
order path. The endpoint contract and exact request/response shapes are in
the [Payments](./reference/endpoints/payments-controller.md) and
[Subscriptions](./reference/endpoints/subscriptions-controller.md)
references.

There is no shared provider interface for these Razorpay calls in the
current module. Provider-specific request code therefore remains coupled to
the service; tests must mock the relevant fetch path or service boundary.
Payment callback processing is distinct from provider order creation. The
wallet top-up path checks the order's in-memory vendor/amount snapshot when
available, validates the checkout HMAC or authenticated webhook, and checks
for an existing ledger reference before crediting inside a database
transaction. The order snapshot is process-local, so do not document it as
durable across API restarts.

### Corporate payout confirmation flow

`CorporatePayoutService` receives a `CorporatePayoutProviderPort` through
the `CORPORATE_PAYOUT_PROVIDER` token. `CorporateDomainModule` selects the
adapter using `createPayoutProviderFromEnv`:

- The mock provider is deterministic and idempotent by payout key. It is
  selected outside production by default or explicitly with `mock`.
- The unconfigured provider in production throws `ServiceUnavailableException`;
  it does not pretend a transfer was accepted.
- A successful submit means only that the provider accepted an instruction.
  The batch remains processing until a signed provider callback verifies
  amount, event and allowed status transition.
- Retries reuse each payout's idempotency key. A reversal creates a
  compensating record rather than deleting financial history.

The port, mock and production default are implemented in
`apps/api/src/domains/corporate/billing/payout-provider.port.ts`.
The [payout controller reference](./reference/endpoints/corporate-payout-webhook-controller.md)
documents the callback route.

## Notifications and delivery

`NotificationsService` coordinates in-app notification persistence,
Firebase push, SMTP email, MSG91 SMS and realtime events. Producers include
authentication, dispatch, trip execution, payments and corporate workflows.
The notification queue and each provider have their own results; a sent
message does not change the business record that prompted it.

The feature module is registered by `NotificationsModule` and is exported
globally. Firebase setup is in
`apps/api/src/modules/notifications/firebase.config.ts`; MSG91 request
format/configuration is in `msg91.service.ts`; Nodemailer transport setup is
in `notifications.service.ts`. Campaigns have recipient/result persistence
in the Prisma schema and are not the same as a one-off user notification.

## Verification and managed files

`DigioClient` uses configured Basic authentication, a bounded request timeout
and controlled exception mapping. It supports JSON and multipart requests,
binary media downloads and HMAC checksum verification. `DigioService` applies
workflow-specific validation, reuse/expiry rules and persistence; direct
client calls should not bypass that orchestration. `AppModule` and
`AdminModule` import `DigioModule`; `DigioModule` imports `AuthModule` for
its authenticated controller boundary.

`StorageService` sanitizes file content before writing, computes a checksum
and uses R2 when credentials/endpoint configuration are available. For
identity documents it can create short-lived signed or presigned access
paths; private managed attachment paths require a signing secret. If R2
cannot be used, local files are served through API-controlled upload paths.
`FileSanitizerService` owns file-type/content checks and sanitization.
`UploadsController` and private-file controller behavior are documented in
the [upload endpoint reference](./reference/endpoints/uploads-controller.md).

## Operational and test implications

- Provider configuration is environment-specific; an integration appearing
  in source does not prove that credentials or network access exist in a
  deployed environment.
- Cached estimates are not fresh provider results. Read the source label and
  timestamp where the API exposes them.
- Durable records and external side effects need reconciliation on retries;
  use idempotency keys and authenticated callbacks where implemented.
- Redis local fallbacks are single-process. They do not coordinate multiple
  API instances.
- Tests should replace provider boundaries where an interface exists. Where
  provider calls are direct (for example Razorpay), tests must isolate the
  HTTP request path explicitly.

## Source references

- [API module/service reference](./module-service-reference.md)
- [Corporate service map](./corporate-module-services.md)
- [External integration overview](../../platform/integrations/external-services.md)
- [Integration configuration and failure principles](../../platform/integrations/configuration-and-failures.md)
- [Redis and shared services](../../platform/integrations/shared-services.md)
