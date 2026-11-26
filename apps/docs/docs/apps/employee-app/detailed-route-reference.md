---
title: Employee Complete Route Reference
description: Functional and technical detail for Employee Flutter routes and screens.
---

# Employee Complete Route Reference

**Evidence status:** Source-mapped from `apps/employee_app/lib/routes/app_routes.dart`,
feature screens, providers, repositories and API controller source.

## Functional Perspective

The Employee app gives a corporate commuter a single place to authenticate,
review upcoming shifts and trips, watch cab progress, verify boarding,
request changes, report safety issues and receive support. The app presents
both normal commute states and degraded states such as no trips, stale GPS,
poor network and unavailable transport.

## Technical Perspective

`apps/employee_app/lib/main.dart` registers auth, rider data, permission and
theme providers. `GoRouter` is configured in
`apps/employee_app/lib/routes/app_routes.dart`; feature screens are organized
under `apps/employee_app/lib/features`. `EmployeeApiClient` resolves the API
base URL, stores tokens and retries one 401 after refresh.
`HttpEmployeeAuthRepository` and `HttpEmployeeRiderRepository` map responses
to app state and call documented endpoints. See the [state/provider
catalog](./state-provider-catalog.md) and [service/API
matrix](./service-api-matrix.md) for precise call and failure behavior.

## Route Group Catalog

| Route group | Routes | Purpose and user actions | Technical implementation |
|---|---|---|---|
| Authentication | `/`, `/welcome`, `/login-options`, `/mobile-number`, `/otp-verify`, `/company-sso`, `/employee-verified`, `/error/*` | Splash, welcome, OTP/password/SSO-style login and eligibility outcome | GoRouter, `EmployeeAuthProvider`, HTTP auth repository, `/auth/*`, `/corporate/me` |
| Onboarding | `/permission-location`, `/permission-notification`, `/onboarding/*` | Permission and schedule/tracking/safety onboarding | Flutter state, shared settings, local preferences |
| Home | `/home`, `/home/upcoming-pickup`, `/home/upcoming-drop`, `/home/no-trips` | Current commute overview | `EmployeeDataProvider`, `/corporate/me/trips/next` |
| Schedule | `/schedule/today`, `/daily`, `/weekly`, `/monthly`, `/shift-details`, `/overnight-shift`, `/no-trips` | View shift/commute calendar | Rider repository `/corporate/me/schedule` |
| Change/cancel | `/schedule/request-change`, `/change-details`, `/change-submitted`, `/request-pending`, `/approved`, `/rejected`, `/cancel-trip` | Submit and track schedule changes | Request/reschedule API and status provider |
| Trips | `/trips/planning`, `/assigned`, `/approaching`, `/arrived`, `/boarded`, `/in-progress`, `/completed`, `/cancelled`, `/unserved` | Trip lifecycle screens | Rider repository and corporate trip execution endpoints |
| Trip details | `/trips/details`, `/trips/driver-vehicle`, `/history/*` | Trip and history data | `/corporate/me/trips*`, stop/route API |
| Driver | `/driver/assignment-notification`, `/assigned-overview`, `/details`, `/vehicle-details`, `/pickup-sequence`, reassignment/delay screens | View assigned cab/driver and changes | Rider/dispatch route and trip APIs |
| Tracking | `/tracking/overview`, `/map-full`, `/pickup-point`, `/walking-directions`, `/cab-approaching`, `/cab-arrived`, `/trip-progress`, `/route-stops`, connectivity states | Live trip position and directions | `/corporate/me/trips/:id/tracking`; permission prompts do not upload employee-device location |
| Boarding | `/boarding/verify-options`, `/otp-input`, `/scan-qr`, `/verifying`, `/success`, `/wrong-otp`, `/issue`, `/safe-reach`, `/feedback` | Present boarding and post-trip steps | OTP is compared locally using next-trip/tracking data; this app does not call execution `verify-otp`/`verify-qr`. Safe reach and feedback have server APIs. |
| Safety/support | `/safety/overview`, `/sos*`, `/report-incident`, `/raise-complaint`, `/lost-property`, `/my-requests`, `/request-details`, ticket/live chat | Safety, SOS and support | `/corporate/safety/sos`, `/corporate/me/tickets`, support APIs |
| Profile/history | `/history/*`, `/notifications`, `/profile/*`, `/settings/*`, `/about`, `/logout-confirm`, `/delete-account` | Profile, preferences and account lifecycle | HTTP auth/rider repository, notification endpoints |

## Authentication and session implementation

`main.dart` registers `EmployeeAuthProvider`, `EmployeeDataProvider`,
`EmployeePermissionProvider`, API client and theme provider. The auth provider restores cached state and fetches `/corporate/me`. The API
client stores tokens and attempts one refresh/replay after a 401. Router
presence does not enforce session authorization; the backend is the
authorization boundary.

## Schedule flow

```text
Employee opens Home
→ EmployeeDataProvider.loadSchedule/loadNextTrip
→ EmployeeApiClient GET /corporate/me/schedule or /corporate/me/trips/next
→ CorporateRiderController
→ CorporateRiderService
→ Prisma Corporate employee/roster/route/stop
→ API response
→ Screen/provider update
```

Cancellation and rescheduling are mutations, not only local route changes:
cancellation posts to `/corporate/me/trips/:stopId/cancel`; rescheduling
posts to `/corporate/trips/requests/:requestId/reschedule`. The server
enforces employee ownership and the tenant change cutoff. Detailed payloads,
model relationships and end-to-end flows are in the
[commuter feature guide](./commuter-feature-guide.md) and
[service/API matrix](./service-api-matrix.md).
