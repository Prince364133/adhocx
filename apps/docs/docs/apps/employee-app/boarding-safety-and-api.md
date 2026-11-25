---
title: Employee Boarding, Safety and API Integration
description: Boarding verification, live tracking, SOS and employee API dependencies.
---

# Employee Boarding, Safety and API Integration

**Evidence status:** Source-mapped from Employee screens/repositories and
NestJS controllers. Several registered pages are presentation flows rather
than server mutations; the distinctions below are intentional.

## Boarding

The app defines routes for:

- boarding verification options
- OTP entry
- QR scanning
- verification/loading state
- boarding success
- wrong OTP
- boarding issues
- in-progress trip
- drop reached
- completed trip
- safe-reach confirmation
- post-trip feedback

The app's boarding routes present:

- Safe-reach confirmation
- Trip feedback
- Trip cancellation

The OTP-entry screen reads `boardingOtp` from next-trip/tracking data and
compares the entered string locally. The QR pass screen displays the
`dynamicQrToken` and OTP from tracking data. No Employee repository request
calls the backend execution `verify-otp` or `verify-qr` endpoint. Those server
endpoints validate a driver's request and record the `BOARDED` transition.
Therefore the Employee app's current success/wrong-code navigation is not
server-side verification and should not be described as recording boarding.

The safe-reach button normally resolves a stop ID and sends
`POST /corporate/me/trips/:stopId/safe-reach`. There is an implementation
caveat: if the provider or stop ID is unavailable, the current screen skips
the request but still shows its success message and navigates to feedback.
Only a successful API response with a valid stop is evidence that the server
recorded the confirmation.

Trip feedback is submitted to `POST /corporate/me/trips/:stopId/feedback`
with a rating and optional `feltSafe`, comment and tags. Cancellation is a
separate `POST /corporate/me/trips/:stopId/cancel` flow and checks for a
cancellable stop before showing the confirmation state.

## Live Tracking

The app provides routes for:

- live tracking overview
- full-screen map
- pickup-point details
- walking directions
- cab approaching/arrived states
- trip progress
- route and stops
- GPS unavailable
- stale location
- poor network
- reconnecting

API-backed data comes from `GET /corporate/me/trips/:id/tracking`. The
provider resolves the identifier from the active stop or route, caches the
response for ten seconds, and exposes loading/error state to screens. The
permission onboarding requests location access, but the Employee repository
does not upload or stream the employee phone's location.

## Safety and SOS

The app includes:

- SOS activation
- SOS confirmed
- safety team call
- incident reporting
- complaints
- lost property
- support tickets
- emergency contacts
- safety guidance
- live support

The SOS screen requires a three-second press-and-hold, then uses next-trip
and tracking data to find a route ID and coordinates. It sends:

```http
POST /api/v1/corporate/safety/sos
```

Payload:

- `routeId`
- `latitude`
- `longitude`
- optional `triggerReason`

If it cannot find a route or the request fails, the screen offers the configured
safety helpline and 112 rather than claiming delivery. One data-quality caveat
in the current client is that coordinates fall back to `0.0, 0.0` if neither
driver nor pickup coordinates are available; the controller rejects missing
coordinates but does not reject zero coordinates. Treat the displayed
location as source data that may be absent/invalid, not as a device GPS fix.

## Support Tickets

The Employee repository supports:

- Create and list tickets through `/corporate/me/tickets`
- Read ticket details and messages and post messages through
  `/corporate/support/tickets/:id`
- Incident forms submit JSON only; Employee ticket creation does not attach
  files
- Ticket creation validates category/title/description/priority, applies a
  per-user limit and calculates SLA in the backend support service

The shared support service uses the same corporate ticket records for rider
self-service and the Corporate/Ops support desk. Tenant, employee and ticket
ownership checks are server-side.

## Feedback

Post-trip feedback submits:

- 1-5 star rating
- felt-safe response
- comment
- tags

The API call uses the stop/trip context and is delivered through the
`POST /corporate/me/trips/:stopId/feedback` endpoint. The backend verifies
the authenticated actor and stop before persisting feedback.

## Endpoints and deeper flow references

The [service/API matrix](./service-api-matrix.md) lists all Employee
repository methods, HTTP methods, request bodies, NestJS controllers/services,
database areas, guards and implementation caveats. The [commuter feature
guide](./commuter-feature-guide.md) describes the business workflows and
their end-to-end sequence.

## Session and Error Handling

The Employee API client:

- Adds bearer authorization where a protected token exists
- Replays 401 responses after refresh
- Parses successful JSON responses and throws `ApiException` for non-2xx
  responses; response-envelope unwrapping happens in repositories
- Throws typed API exceptions
- Supports logout and account deletion

Transport ineligibility is a distinct authentication state and must not be
mistaken for invalid credentials. Some `EmployeeDataProvider` loaders retain
cached data and return it after a request error; callers must inspect their
resource-specific error fields as well as data/loading state.
