---
title: Employee Exact Flutter Route Inventory
description: Source-derived GoRouter route constants.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Employee Exact Flutter Route Inventory

**Coverage status:** Source-mapped. The 110 canonical route constants are
source-derived from `apps/employee_app/lib/routes/app_routes.dart` and each
maps to a registered GoRouter destination and screen source or redirect.
The source declares 21 additional named aliases, mapped in the
[route/screen catalog](./screen-component-catalog.md). Functional workflows
are described in the [commuter feature guide](./commuter-feature-guide.md);
API behavior is traced in the [service/API matrix](./service-api-matrix.md).

| Route constant | Route path | Functional purpose |
|---|---|---|
| `splash` | `/` | Application feature screen or navigation state |
| `welcome` | `/welcome` | Onboarding, permission or setup state |
| `loginOptions` | `/login-options` | Authentication or account recovery |
| `mobileNumber` | `/mobile-number` | Application feature screen or navigation state |
| `otpVerify` | `/otp-verify` | Authentication or account recovery |
| `companySso` | `/company-sso` | Authentication or account recovery |
| `employeeVerified` | `/employee-verified` | Application feature screen or navigation state |
| `permissionLocation` | `/permission-location` | Onboarding, permission or setup state |
| `permissionNotification` | `/permission-notification` | Onboarding, permission or setup state |
| `onboardingSchedule` | `/onboarding/schedule` | Onboarding, permission or setup state |
| `onboardingTracking` | `/onboarding/tracking` | Onboarding, permission or setup state |
| `onboardingSafety` | `/onboarding/safety` | Onboarding, permission or setup state |
| `onboardingComplete` | `/onboarding/complete` | Onboarding, permission or setup state |
| `invalidOtp` | `/error/invalid-otp` | Authentication or account recovery |
| `transportUnavailable` | `/error/transport-unavailable` | Application feature screen or navigation state |
| `home` | `/home` | Application feature screen or navigation state |
| `homeUpcomingPickup` | `/home/upcoming-pickup` | Application feature screen or navigation state |
| `homeUpcomingDrop` | `/home/upcoming-drop` | Application feature screen or navigation state |
| `homeNoTrips` | `/home/no-trips` | Trip lifecycle or trip history |
| `tripPlanning` | `/trips/planning` | Trip lifecycle or trip history |
| `tripAssigned` | `/trips/assigned` | Trip lifecycle or trip history |
| `tripApproaching` | `/trips/approaching` | Trip lifecycle or trip history |
| `tripArrived` | `/trips/arrived` | Trip lifecycle or trip history |
| `tripBoarded` | `/trips/boarded` | Trip lifecycle or trip history |
| `tripInProgress` | `/trips/in-progress` | Trip lifecycle or trip history |
| `tripCompleted` | `/trips/completed` | Trip lifecycle or trip history |
| `tripCancelled` | `/trips/cancelled` | Trip lifecycle or trip history |
| `tripUnserved` | `/trips/unserved` | Trip lifecycle or trip history |
| `tripDetails` | `/trips/details` | Trip lifecycle or trip history |
| `tripDriverVehicle` | `/trips/driver-vehicle` | Trip lifecycle or trip history |
| `scheduleToday` | `/schedule/today` | Schedule or shift information |
| `scheduleDaily` | `/schedule/daily` | Schedule or shift information |
| `scheduleWeekly` | `/schedule/weekly` | Schedule or shift information |
| `scheduleMonthly` | `/schedule/monthly` | Schedule or shift information |
| `shiftDetailsLogin` | `/schedule/shift-details` | Schedule or shift information |
| `shiftDetailsOvernight` | `/schedule/overnight-shift` | Schedule or shift information |
| `scheduleNoTrips` | `/schedule/no-trips` | Schedule or shift information |
| `requestChangeOptions` | `/schedule/request-change` | Schedule or shift information |
| `changeDetails` | `/schedule/change-details` | Schedule or shift information |
| `changeSubmitted` | `/schedule/change-submitted` | Schedule or shift information |
| `requestPending` | `/schedule/request-pending` | Schedule or shift information |
| `requestApproved` | `/schedule/request-approved` | Schedule or shift information |
| `requestRejected` | `/schedule/request-rejected` | Schedule or shift information |
| `cancelTrip` | `/schedule/cancel-trip` | Schedule or shift information |
| `assignmentNotification` | `/driver/assignment-notification` | Profile, settings or notification management |
| `cabAssignedOverview` | `/driver/assigned-overview` | Application feature screen or navigation state |
| `driverDetails` | `/driver/details` | Application feature screen or navigation state |
| `vehicleDetails` | `/driver/vehicle-details` | Application feature screen or navigation state |
| `pickupSequence` | `/driver/pickup-sequence` | Application feature screen or navigation state |
| `cabReassigned` | `/driver/cab-reassigned` | Live tracking, map or vehicle position state |
| `assignmentDelayed` | `/driver/assignment-delayed` | Application feature screen or navigation state |
| `driverReplaced` | `/driver/driver-replaced` | Application feature screen or navigation state |
| `driverDelay` | `/driver/driver-delay` | Application feature screen or navigation state |
| `vehicleIssue` | `/driver/vehicle-issue` | Application feature screen or navigation state |
| `contactDriverSheet` | `/driver/contact` | Application feature screen or navigation state |
| `assignmentHistory` | `/driver/assignment-history` | Trip lifecycle or trip history |
| `noCabAvailable` | `/driver/no-cab-available` | Live tracking, map or vehicle position state |
| `liveTrackingOverview` | `/tracking/overview` | Live tracking, map or vehicle position state |
| `tripLiveMapFull` | `/tracking/map-full` | Live tracking, map or vehicle position state |
| `pickupPointDetails` | `/tracking/pickup-point` | Live tracking, map or vehicle position state |
| `walkingDirections` | `/tracking/walking-directions` | Live tracking, map or vehicle position state |
| `cabApproaching` | `/tracking/cab-approaching` | Live tracking, map or vehicle position state |
| `cabArrived` | `/tracking/cab-arrived` | Live tracking, map or vehicle position state |
| `tripProgressOnTrip` | `/tracking/trip-progress` | Live tracking, map or vehicle position state |
| `routeAndStops` | `/tracking/route-stops` | Live tracking, map or vehicle position state |
| `gpsUnavailable` | `/tracking/gps-unavailable` | Live tracking, map or vehicle position state |
| `staleLocation` | `/tracking/stale-location` | Live tracking, map or vehicle position state |
| `poorNetwork` | `/tracking/poor-network` | Live tracking, map or vehicle position state |
| `reconnecting` | `/tracking/reconnecting` | Live tracking, map or vehicle position state |
| `boardingVerifyOptions` | `/boarding/verify-options` | Boarding verification or trip entry |
| `boardingOtpInput` | `/boarding/otp-input` | Authentication or account recovery |
| `scanBoardingQr` | `/boarding/scan-qr` | Boarding verification or trip entry |
| `verifyingBoarding` | `/boarding/verifying` | Boarding verification or trip entry |
| `boardingSuccessful` | `/boarding/success` | Boarding verification or trip entry |
| `wrongOtp` | `/boarding/wrong-otp` | Authentication or account recovery |
| `boardingIssue` | `/boarding/issue` | Boarding verification or trip entry |
| `tripInProgressEnRoute` | `/boarding/trip-in-progress` | Boarding verification or trip entry |
| `dropReached` | `/boarding/drop-reached` | Boarding verification or trip entry |
| `tripCompletedSummary` | `/boarding/trip-completed` | Boarding verification or trip entry |
| `safeReachConfirmation` | `/boarding/safe-reach` | Boarding verification or trip entry |
| `postTripFeedback` | `/boarding/feedback` | Boarding verification or trip entry |
| `safetyOverview` | `/safety/overview` | Safety, incident or SOS workflow |
| `safetySos` | `/safety/sos` | Safety, incident or SOS workflow |
| `safetySosConfirmed` | `/safety/sos-confirmed` | Safety, incident or SOS workflow |
| `safetyTeamCall` | `/safety/team-call` | Safety, incident or SOS workflow |
| `safetyReportIncident` | `/safety/report-incident` | Safety, incident or SOS workflow |
| `safetyRaiseComplaint` | `/safety/raise-complaint` | Safety, incident or SOS workflow |
| `safetyLostProperty` | `/safety/lost-property` | Safety, incident or SOS workflow |
| `safetyMyRequests` | `/safety/my-requests` | Safety, incident or SOS workflow |
| `safetyRequestDetails` | `/safety/request-details` | Safety, incident or SOS workflow |
| `safetyRequestResolved` | `/safety/request-resolved` | Safety, incident or SOS workflow |
| `safetyEmergencyContacts` | `/safety/emergency-contacts` | Safety, incident or SOS workflow |
| `safetyTips` | `/safety/tips` | Safety, incident or SOS workflow |
| `safetyLiveChat` | `/safety/live-chat` | Safety, incident or SOS workflow |
| `historyOverview` | `/history/overview` | Trip lifecycle or trip history |
| `historyDetails` | `/history/details` | Trip lifecycle or trip history |
| `historyAnalytics` | `/history/analytics` | Trip lifecycle or trip history |
| `historyFeedback` | `/history/feedback` | Trip lifecycle or trip history |
| `notificationsCenter` | `/notifications` | Profile, settings or notification management |
| `profileDetails` | `/profile/details` | Profile, settings or notification management |
| `profileEdit` | `/profile/edit` | Profile, settings or notification management |
| `manageEmergencyContacts` | `/profile/manage-contacts` | Profile, settings or notification management |
| `emergencyContactForm` | `/profile/manage-contacts/form` | Profile, settings or notification management |
| `settingsOverview` | `/settings` | Profile, settings or notification management |
| `settingsLanguage` | `/settings/language` | Profile, settings or notification management |
| `settingsNotifications` | `/settings/notifications` | Profile, settings or notification management |
| `settingsPrivacy` | `/settings/privacy` | Profile, settings or notification management |
| `aboutAdhocx` | `/about` | Application feature screen or navigation state |
| `logoutConfirm` | `/logout-confirm` | Application feature screen or navigation state |
| `deleteAccount` | `/delete-account` | Application feature screen or navigation state |

## Navigation behavior

All 110 canonical path constants have a registered `GoRoute`. The
`/login-options` and `/company-sso` paths redirect to `/mobile-number`;
they do not render distinct login or SSO pages. Alias constants do not add
routes. There is no app-wide GoRouter authentication redirect: session
restoration is handled by auth state and the splash flow. The API remains
authoritative for authentication, role, tenant and data ownership.

The route-to-screen source map, alias behavior and route data passed in
`state.extra` are documented in the
[route/screen catalog](./screen-component-catalog.md).

## Sources and verification

- `apps/employee_app/lib/routes/app_routes.dart` — route constant declarations.
- [Traceability registry](../../platform/traceability-registry.md) — count reconciliation and feature-level cross references.