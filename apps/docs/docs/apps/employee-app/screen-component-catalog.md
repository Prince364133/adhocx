---
title: Employee App Route and Screen Catalog
description: Source mapping for every Employee GoRouter route, screen, and compatibility alias.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Employee App Route and Screen Catalog

This catalog maps each canonical route to its `GoRouter` destination and
Flutter source file. Functional purpose and route-family workflows are in the
[exact route inventory](./exact-route-inventory.md) and
[detailed route reference](./detailed-route-reference.md).

`apps/employee_app/lib/routes/app_routes.dart` declares 131 string constants:
110 canonical literal paths and 21 aliases. All 110 canonical paths have a
registered `GoRoute`; `/login-options` and `/company-sso` redirect to
`/mobile-number` rather than rendering their own screens. Alias constants
resolve to canonical paths and are listed after the route table.

## Canonical route-to-screen map

| Route constant | Path | GoRouter destination | Screen source |
|---|---|---|---|
| `splash` | `/` | `SplashScreen` | `apps/employee_app/lib/features/auth/onboarding/splash_screen.dart` |
| `welcome` | `/welcome` | `WelcomeScreen` | `apps/employee_app/lib/features/auth/onboarding/welcome_screen.dart` |
| `loginOptions` | `/login-options` | Redirect → `/mobile-number` | `apps/employee_app/lib/routes/app_routes.dart` |
| `mobileNumber` | `/mobile-number` | `MobileNumberScreen` | `apps/employee_app/lib/features/auth/login/mobile_number_screen.dart` |
| `otpVerify` | `/otp-verify` | `OtpVerificationScreen` | `apps/employee_app/lib/features/auth/login/otp_verification_screen.dart` |
| `companySso` | `/company-sso` | Redirect → `/mobile-number` | `apps/employee_app/lib/routes/app_routes.dart` |
| `employeeVerified` | `/employee-verified` | `EmployeeVerificationScreen` | `apps/employee_app/lib/features/auth/verification/employee_verification_screen.dart` |
| `permissionLocation` | `/permission-location` | `LocationPermissionScreen` | `apps/employee_app/lib/features/auth/permissions/location_permission_screen.dart` |
| `permissionNotification` | `/permission-notification` | `NotificationPermissionScreen` | `apps/employee_app/lib/features/auth/permissions/notification_permission_screen.dart` |
| `onboardingSchedule` | `/onboarding/schedule` | `OnboardingScheduleScreen` | `apps/employee_app/lib/features/auth/onboarding/onboarding_schedule_screen.dart` |
| `onboardingTracking` | `/onboarding/tracking` | `OnboardingTrackingScreen` | `apps/employee_app/lib/features/auth/onboarding/onboarding_tracking_screen.dart` |
| `onboardingSafety` | `/onboarding/safety` | `OnboardingSafetyScreen` | `apps/employee_app/lib/features/auth/onboarding/onboarding_safety_screen.dart` |
| `onboardingComplete` | `/onboarding/complete` | `OnboardingCompleteScreen` | `apps/employee_app/lib/features/auth/onboarding/onboarding_complete_screen.dart` |
| `invalidOtp` | `/error/invalid-otp` | `InvalidOtpScreen` | `apps/employee_app/lib/features/auth/login/invalid_otp_screen.dart` |
| `transportUnavailable` | `/error/transport-unavailable` | `TransportUnavailableScreen` | `apps/employee_app/lib/features/auth/verification/transport_unavailable_screen.dart` |
| `home` | `/home` | `HomeScreenPlaceholder` | `apps/employee_app/lib/features/home/home_screen_placeholder.dart` |
| `homeUpcomingPickup` | `/home/upcoming-pickup` | `HomeUpcomingPickupScreen` | `apps/employee_app/lib/features/home/home_upcoming_pickup_screen.dart` |
| `homeUpcomingDrop` | `/home/upcoming-drop` | `HomeUpcomingDropScreen` | `apps/employee_app/lib/features/home/home_upcoming_drop_screen.dart` |
| `homeNoTrips` | `/home/no-trips` | `HomeNoUpcomingTripScreen` | `apps/employee_app/lib/features/home/home_no_upcoming_trip_screen.dart` |
| `tripPlanning` | `/trips/planning` | `TripPlanningScreen` | `apps/employee_app/lib/features/trips/planning/trip_planning_screen.dart` |
| `tripAssigned` | `/trips/assigned` | `TripAssignedScreen` | `apps/employee_app/lib/features/trips/execution/trip_assigned_screen.dart` |
| `tripApproaching` | `/trips/approaching` | `TripApproachingScreen` | `apps/employee_app/lib/features/trips/execution/trip_approaching_screen.dart` |
| `tripArrived` | `/trips/arrived` | `TripArrivedScreen` | `apps/employee_app/lib/features/trips/execution/trip_arrived_screen.dart` |
| `tripBoarded` | `/trips/boarded` | `TripBoardedScreen` | `apps/employee_app/lib/features/trips/execution/trip_boarded_screen.dart` |
| `tripInProgress` | `/trips/in-progress` | `TripInProgressScreen` | `apps/employee_app/lib/features/trips/execution/trip_in_progress_screen.dart` |
| `tripCompleted` | `/trips/completed` | `TripCompletedScreen` | `apps/employee_app/lib/features/trips/summary/trip_completed_screen.dart` |
| `tripCancelled` | `/trips/cancelled` | `TripCancelledScreen` | `apps/employee_app/lib/features/trips/summary/trip_cancelled_screen.dart` |
| `tripUnserved` | `/trips/unserved` | `TripUnservedScreen` | `apps/employee_app/lib/features/trips/summary/trip_unserved_screen.dart` |
| `tripDetails` | `/trips/details` | `TripDetailsCompletedScreen` | `apps/employee_app/lib/features/trips/summary/trip_details_completed_screen.dart` |
| `tripDriverVehicle` | `/trips/driver-vehicle` | `DriverVehicleDetailsScreen` | `apps/employee_app/lib/features/trips/vehicle/driver_vehicle_details_screen.dart` |
| `scheduleToday` | `/schedule/today` | `ScheduleTodayOverviewScreen` | `apps/employee_app/lib/features/schedule/views/schedule_today_overview_screen.dart` |
| `scheduleDaily` | `/schedule/daily` | `ScheduleDailyScreen` | `apps/employee_app/lib/features/schedule/views/schedule_daily_screen.dart` |
| `scheduleWeekly` | `/schedule/weekly` | `ScheduleWeeklyScreen` | `apps/employee_app/lib/features/schedule/views/schedule_weekly_screen.dart` |
| `scheduleMonthly` | `/schedule/monthly` | `ScheduleMonthlyScreen` | `apps/employee_app/lib/features/schedule/views/schedule_monthly_screen.dart` |
| `shiftDetailsLogin` | `/schedule/shift-details` | `ShiftDetailsLoginScreen` | `apps/employee_app/lib/features/schedule/shifts/shift_details_login_screen.dart` |
| `shiftDetailsOvernight` | `/schedule/overnight-shift` | `ShiftDetailsOvernightScreen` | `apps/employee_app/lib/features/schedule/shifts/shift_details_overnight_screen.dart` |
| `scheduleNoTrips` | `/schedule/no-trips` | `ScheduleNoTripsScreen` | `apps/employee_app/lib/features/schedule/views/schedule_no_trips_screen.dart` |
| `requestChangeOptions` | `/schedule/request-change` | `RequestChangeOptionsScreen` | `apps/employee_app/lib/features/schedule/requests/request_change_options_screen.dart` |
| `changeDetails` | `/schedule/change-details` | `ChangeRequestDetailsScreen` | `apps/employee_app/lib/features/schedule/requests/change_request_details_screen.dart` |
| `changeSubmitted` | `/schedule/change-submitted` | `ChangeRequestSubmittedScreen` | `apps/employee_app/lib/features/schedule/requests/change_request_submitted_screen.dart` |
| `requestPending` | `/schedule/request-pending` | `RequestStatusPendingScreen` | `apps/employee_app/lib/features/schedule/requests/request_status_pending_screen.dart` |
| `requestApproved` | `/schedule/request-approved` | `RequestStatusApprovedScreen` | `apps/employee_app/lib/features/schedule/requests/request_status_approved_screen.dart` |
| `requestRejected` | `/schedule/request-rejected` | `RequestStatusRejectedScreen` | `apps/employee_app/lib/features/schedule/requests/request_status_rejected_screen.dart` |
| `cancelTrip` | `/schedule/cancel-trip` | `CancelTripRequestScreen` | `apps/employee_app/lib/features/schedule/requests/cancel_trip_request_screen.dart` |
| `assignmentNotification` | `/driver/assignment-notification` | `AssignmentNotificationScreen` | `apps/employee_app/lib/features/driver/assignment/assignment_notification_screen.dart` |
| `cabAssignedOverview` | `/driver/assigned-overview` | `CabAssignedOverviewScreen` | `apps/employee_app/lib/features/driver/assignment/cab_assigned_overview_screen.dart` |
| `driverDetails` | `/driver/details` | `DriverDetailsScreen` | `apps/employee_app/lib/features/driver/profiles/driver_details_screen.dart` |
| `vehicleDetails` | `/driver/vehicle-details` | `VehicleDetailsScreen` | `apps/employee_app/lib/features/driver/profiles/vehicle_details_screen.dart` |
| `pickupSequence` | `/driver/pickup-sequence` | `PickupSequenceScreen` | `apps/employee_app/lib/features/driver/route/pickup_sequence_screen.dart` |
| `cabReassigned` | `/driver/cab-reassigned` | `CabReassignedScreen` | `apps/employee_app/lib/features/driver/assignment/cab_reassigned_screen.dart` |
| `assignmentDelayed` | `/driver/assignment-delayed` | `AssignmentDelayedScreen` | `apps/employee_app/lib/features/driver/assignment/assignment_delayed_screen.dart` |
| `driverReplaced` | `/driver/driver-replaced` | `DriverReplacedScreen` | `apps/employee_app/lib/features/driver/alerts/driver_replaced_screen.dart` |
| `driverDelay` | `/driver/driver-delay` | `DriverDelayScreen` | `apps/employee_app/lib/features/driver/alerts/driver_delay_screen.dart` |
| `vehicleIssue` | `/driver/vehicle-issue` | `VehicleIssueScreen` | `apps/employee_app/lib/features/driver/alerts/vehicle_issue_screen.dart` |
| `contactDriverSheet` | `/driver/contact` | `ContactDriverSheetScreen` | `apps/employee_app/lib/features/driver/profiles/contact_driver_sheet_screen.dart` |
| `assignmentHistory` | `/driver/assignment-history` | `AssignmentHistoryScreen` | `apps/employee_app/lib/features/driver/assignment/assignment_history_screen.dart` |
| `noCabAvailable` | `/driver/no-cab-available` | `NoCabAvailableScreen` | `apps/employee_app/lib/features/driver/alerts/no_cab_available_screen.dart` |
| `liveTrackingOverview` | `/tracking/overview` | `LiveTrackingOverviewScreen` | `apps/employee_app/lib/features/tracking/live_map/live_tracking_overview_screen.dart` |
| `tripLiveMapFull` | `/tracking/map-full` | `TripLiveMapFullScreen` | `apps/employee_app/lib/features/tracking/live_map/trip_live_map_full_screen.dart` |
| `pickupPointDetails` | `/tracking/pickup-point` | `PickupPointDetailsScreen` | `apps/employee_app/lib/features/tracking/directions/pickup_point_details_screen.dart` |
| `walkingDirections` | `/tracking/walking-directions` | `WalkingDirectionsScreen` | `apps/employee_app/lib/features/tracking/directions/walking_directions_screen.dart` |
| `cabApproaching` | `/tracking/cab-approaching` | `CabApproachingScreen` | `apps/employee_app/lib/features/tracking/proximity/cab_approaching_screen.dart` |
| `cabArrived` | `/tracking/cab-arrived` | `CabArrivedScreen` | `apps/employee_app/lib/features/tracking/proximity/cab_arrived_screen.dart` |
| `tripProgressOnTrip` | `/tracking/trip-progress` | `TripProgressOnTripScreen` | `apps/employee_app/lib/features/tracking/proximity/trip_progress_on_trip_screen.dart` |
| `routeAndStops` | `/tracking/route-stops` | `RouteAndStopsScreen` | `apps/employee_app/lib/features/tracking/directions/route_and_stops_screen.dart` |
| `gpsUnavailable` | `/tracking/gps-unavailable` | `GpsUnavailableScreen` | `apps/employee_app/lib/features/tracking/connectivity/gps_unavailable_screen.dart` |
| `staleLocation` | `/tracking/stale-location` | `StaleLocationScreen` | `apps/employee_app/lib/features/tracking/connectivity/stale_location_screen.dart` |
| `poorNetwork` | `/tracking/poor-network` | `PoorNetworkScreen` | `apps/employee_app/lib/features/tracking/connectivity/poor_network_screen.dart` |
| `reconnecting` | `/tracking/reconnecting` | `ReconnectingScreen` | `apps/employee_app/lib/features/tracking/connectivity/reconnecting_screen.dart` |
| `boardingVerifyOptions` | `/boarding/verify-options` | `BoardingVerifyOptionsScreen` | `apps/employee_app/lib/features/boarding/verification/boarding_verify_options_screen.dart` |
| `boardingOtpInput` | `/boarding/otp-input` | `BoardingOtpInputScreen` | `apps/employee_app/lib/features/boarding/verification/boarding_otp_input_screen.dart` |
| `scanBoardingQr` | `/boarding/scan-qr` | `ScanBoardingQrScreen` | `apps/employee_app/lib/features/boarding/verification/scan_boarding_qr_screen.dart` |
| `verifyingBoarding` | `/boarding/verifying` | `VerifyingBoardingScreen` | `apps/employee_app/lib/features/boarding/verification/verifying_boarding_screen.dart` |
| `boardingSuccessful` | `/boarding/success` | `BoardingSuccessfulScreen` | `apps/employee_app/lib/features/boarding/verification/boarding_successful_screen.dart` |
| `wrongOtp` | `/boarding/wrong-otp` | `WrongOtpScreen` | `apps/employee_app/lib/features/boarding/verification/wrong_otp_screen.dart` |
| `boardingIssue` | `/boarding/issue` | `BoardingIssueScreen` | `apps/employee_app/lib/features/boarding/en_route/boarding_issue_screen.dart` |
| `tripInProgressEnRoute` | `/boarding/trip-in-progress` | `TripInProgressEnRouteScreen` | `apps/employee_app/lib/features/boarding/en_route/trip_in_progress_en_route_screen.dart` |
| `dropReached` | `/boarding/drop-reached` | `DropReachedScreen` | `apps/employee_app/lib/features/boarding/completion/drop_reached_screen.dart` |
| `tripCompletedSummary` | `/boarding/trip-completed` | `TripCompletedSummaryScreen` | `apps/employee_app/lib/features/boarding/completion/trip_completed_summary_screen.dart` |
| `safeReachConfirmation` | `/boarding/safe-reach` | `SafeReachConfirmationScreen` | `apps/employee_app/lib/features/boarding/completion/safe_reach_confirmation_screen.dart` |
| `postTripFeedback` | `/boarding/feedback` | `PostTripFeedbackScreen` | `apps/employee_app/lib/features/boarding/completion/post_trip_feedback_screen.dart` |
| `safetyOverview` | `/safety/overview` | `SafetyCenterOverviewScreen` | `apps/employee_app/lib/features/safety_support/safety_center/safety_center_overview_screen.dart` |
| `safetySos` | `/safety/sos` | `SosActivateScreen` | `apps/employee_app/lib/features/safety_support/emergency_sos/sos_activate_screen.dart` |
| `safetySosConfirmed` | `/safety/sos-confirmed` | `SosAlertConfirmedScreen` | `apps/employee_app/lib/features/safety_support/emergency_sos/sos_alert_confirmed_screen.dart` |
| `safetyTeamCall` | `/safety/team-call` | `SafetyTeamCallScreen` | `apps/employee_app/lib/features/safety_support/emergency_sos/safety_team_call_screen.dart` |
| `safetyReportIncident` | `/safety/report-incident` | `ReportIncidentScreen` | `apps/employee_app/lib/features/safety_support/incident_reporting/report_incident_screen.dart` |
| `safetyRaiseComplaint` | `/safety/raise-complaint` | `RaiseComplaintScreen` | `apps/employee_app/lib/features/safety_support/incident_reporting/raise_complaint_screen.dart` |
| `safetyLostProperty` | `/safety/lost-property` | `LostPropertyScreen` | `apps/employee_app/lib/features/safety_support/incident_reporting/lost_property_screen.dart` |
| `safetyMyRequests` | `/safety/my-requests` | `MyRequestsTicketsScreen` | `apps/employee_app/lib/features/safety_support/help_desk/my_requests_tickets_screen.dart` |
| `safetyRequestDetails` | `/safety/request-details` | `RequestDetailsTrackingScreen` | `apps/employee_app/lib/features/safety_support/help_desk/request_details_tracking_screen.dart` |
| `safetyRequestResolved` | `/safety/request-resolved` | `RequestResolvedScreen` | `apps/employee_app/lib/features/safety_support/help_desk/request_resolved_screen.dart` |
| `safetyEmergencyContacts` | `/safety/emergency-contacts` | `EmergencyContactsScreen` | `apps/employee_app/lib/features/safety_support/emergency_sos/emergency_contacts_screen.dart` |
| `safetyTips` | `/safety/tips` | `SafetyTipsGuidelinesScreen` | `apps/employee_app/lib/features/safety_support/safety_center/safety_tips_guidelines_screen.dart` |
| `safetyLiveChat` | `/safety/live-chat` | `LiveSupportChatScreen` | `apps/employee_app/lib/features/safety_support/help_desk/live_support_chat_screen.dart` |
| `historyOverview` | `/history/overview` | `TripHistoryOverviewScreen` | `apps/employee_app/lib/features/profile_settings/history/trip_history_overview_screen.dart` |
| `historyDetails` | `/history/details` | `TripHistoryDetailsScreen` | `apps/employee_app/lib/features/profile_settings/history/trip_history_details_screen.dart` |
| `historyAnalytics` | `/history/analytics` | `TripSummaryAnalyticsScreen` | `apps/employee_app/lib/features/profile_settings/history/trip_summary_analytics_screen.dart` |
| `historyFeedback` | `/history/feedback` | `TripFeedbackFormScreen` | `apps/employee_app/lib/features/profile_settings/history/trip_feedback_form_screen.dart` |
| `notificationsCenter` | `/notifications` | `NotificationsCenterScreen` | `apps/employee_app/lib/features/profile_settings/notifications/notifications_center_screen.dart` |
| `profileDetails` | `/profile/details` | `ProfileMyDetailsScreen` | `apps/employee_app/lib/features/profile_settings/profile/profile_my_details_screen.dart` |
| `profileEdit` | `/profile/edit` | `EditProfileScreen` | `apps/employee_app/lib/features/profile_settings/profile/edit_profile_screen.dart` |
| `manageEmergencyContacts` | `/profile/manage-contacts` | `ManageEmergencyContactsScreen` | `apps/employee_app/lib/features/profile_settings/profile/manage_emergency_contacts_screen.dart` |
| `emergencyContactForm` | `/profile/manage-contacts/form` | `EmergencyContactFormScreen` | `apps/employee_app/lib/features/profile_settings/profile/manage_emergency_contacts_screen.dart` |
| `settingsOverview` | `/settings` | `SettingsOverviewScreen` | `apps/employee_app/lib/features/profile_settings/settings/settings_overview_screen.dart` |
| `settingsLanguage` | `/settings/language` | `SelectLanguageScreen` | `apps/employee_app/lib/features/profile_settings/settings/select_language_screen.dart` |
| `settingsNotifications` | `/settings/notifications` | `NotificationPreferencesScreen` | `apps/employee_app/lib/features/profile_settings/notifications/notification_preferences_screen.dart` |
| `settingsPrivacy` | `/settings/privacy` | `PrivacyDataScreen` | `apps/employee_app/lib/features/profile_settings/settings/privacy_data_screen.dart` |
| `aboutAdhocx` | `/about` | `AboutAdhocxScreen` | `apps/employee_app/lib/features/profile_settings/settings/about_adhocx_screen.dart` |
| `logoutConfirm` | `/logout-confirm` | `LogoutConfirmScreen` | `apps/employee_app/lib/features/profile_settings/account/logout_confirm_screen.dart` |
| `deleteAccount` | `/delete-account` | `DeleteAccountScreen` | `apps/employee_app/lib/features/profile_settings/account/delete_account_screen.dart` |

## Named route aliases

Each alias below refers to another `AppRoutes` constant and therefore resolves
to the same path and screen as the target. An alias does not add a GoRouter
entry or a new page.

| Alias constant | Target constant | Effective path |
|---|---|---|
| `safetyCenterOverview` | `safetyOverview` | `/safety/overview` |
| `sosActivate` | `safetySos` | `/safety/sos` |
| `sosAlertConfirmed` | `safetySosConfirmed` | `/safety/sos-confirmed` |
| `reportIncident` | `safetyReportIncident` | `/safety/report-incident` |
| `raiseComplaint` | `safetyRaiseComplaint` | `/safety/raise-complaint` |
| `lostProperty` | `safetyLostProperty` | `/safety/lost-property` |
| `myRequestsTickets` | `safetyMyRequests` | `/safety/my-requests` |
| `requestDetailsTracking` | `safetyRequestDetails` | `/safety/request-details` |
| `requestResolved` | `safetyRequestResolved` | `/safety/request-resolved` |
| `emergencyContacts` | `safetyEmergencyContacts` | `/safety/emergency-contacts` |
| `safetyTipsGuidelines` | `safetyTips` | `/safety/tips` |
| `liveSupportChat` | `safetyLiveChat` | `/safety/live-chat` |
| `tripHistoryOverview` | `historyOverview` | `/history/overview` |
| `tripHistoryDetails` | `historyDetails` | `/history/details` |
| `tripSummaryAnalytics` | `historyAnalytics` | `/history/analytics` |
| `tripFeedbackForm` | `historyFeedback` | `/history/feedback` |
| `profileMyDetails` | `profileDetails` | `/profile/details` |
| `editProfile` | `profileEdit` | `/profile/edit` |
| `notificationPreferences` | `settingsNotifications` | `/settings/notifications` |
| `selectLanguage` | `settingsLanguage` | `/settings/language` |
| `privacyData` | `settingsPrivacy` | `/settings/privacy` |

## Screen and reusable-component organization

The route builders use the feature barrel at
`apps/employee_app/lib/features/features.dart`. Feature areas are split into
auth/onboarding, home, schedule and change requests, driver assignment,
tracking, boarding, trip lifecycle, safety/support, and profile/settings.
Within those areas, screens are grouped by workflow phase rather than by a
single shared page class.

The current 197 Dart files under `lib/` reconcile by top-level source
directory as follows:

| Source area | Dart files | Responsibility |
|---|---:|---|
| `features/` | 132 | Authentication/onboarding, home, schedule, driver, tracking, boarding, trip lifecycle, safety/support and profile/settings screens and widgets |
| `shared/` | 30 | Shared visual components, theme tokens, maps and common UI helpers |
| `widgets/` | 15 | App-level reusable widgets |
| `theme/` | 7 | Theme provider and app theme |
| `state/` | 3 | Auth, commuter data and permission providers |
| `repositories/` | 3 | Auth contract and HTTP auth/rider repositories |
| `services/` | 2 | HTTP API client and language preference service |
| `models/` | 2 | Employee identity and authentication state |
| `routes/` | 1 | GoRouter path constants, aliases, builders and notification navigation |
| App root (`main.dart`, `app.dart`) | 2 | Provider composition and `MaterialApp.router` bootstrap |
| **Total** | **197** | All Dart files currently under `apps/employee_app/lib/` |

Reusable UI components live under `apps/employee_app/lib/shared/components/`:

| Component group | Responsibility |
|---|---|
| `buttons/` | Primary, secondary, danger and pill-filter actions with shared visual behavior |
| `cards/`, `trip/` | Driver, trip and hero-trip summaries used by commute pages |
| `inputs/` | OTP input fields with digit-count and error-state presentation |
| `navigation/`, `layout/` | App bar, bottom navigation, centered content and navigation tiles |
| `feedback/` | Empty/loading states, step tracker, entrance/press feedback and no-transition route pages |
| `sheets/`, `badges/` | Confirmation flows and status labels |

The app also centralizes theme tokens and theme mode in
`apps/employee_app/lib/theme/`. Route presence alone does not establish that
every workflow has equivalent backend wiring: see the
[service/API matrix](./service-api-matrix.md) for connected operations and
known gaps.

## Navigation data and source behavior

`AppRoutes.router` starts at `/`. The `/login-options` and `/company-sso`
entries redirect to `/mobile-number`; the current company-email verification
implementation sends an OTP rather than performing an external identity
provider handshake. `tripCompleted`, `dropReached` and `tripCompletedSummary`
read optional `state.extra` map data. Change-request submission/status routes
also accept request data through `state.extra`. `/driver/contact` is rendered
as a transparent, non-opaque route page for a sheet-like contact screen.

There is no app-wide GoRouter authentication redirect in the current router.
Session restoration is performed by `EmployeeAuthProvider` and the splash
screen; backend JWT, role, tenant and ownership checks remain authoritative.

## Sources and validation

- `apps/employee_app/lib/routes/app_routes.dart` — constants, aliases and builders.
- `apps/employee_app/lib/features/features.dart` — feature barrel exports.
- `apps/employee_app/lib/shared/components/` — reusable UI.
- All 110 canonical GoRoute destinations and all 21 aliases are reconciled
  against source in the Phase 10 completion plan.
