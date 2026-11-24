---
title: Mobile Exact Flutter Route Inventory
description: Source-derived GoRouter route constants.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Mobile Exact Flutter Route Inventory

**Coverage status:** Source-mapped route inventory. The route file declares
172 named constants: 107 canonical path constants and 65 role/compatibility
constants that alias those paths. The canonical constants map to a registered
GoRouter screen or redirect; one pair shares `/sign-in`, leaving 106 unique
canonical paths. Alias constants are listed separately below and point to
their canonical route row. The router registers 119 `GoRoute` entries overall,
including dynamic deep links that do not have a named constant. Feature/API
workflows are described in the linked references below.

| Route constant | Route path | GoRouter destination or behavior | Screen source | Functional purpose |
|---|---|---|
| `initial` | `/` | `SplashScreen` | `apps/mobile/lib/presentation/01_splash_screen/splash_screen.dart` | Application feature screen or navigation state |
| `splashScreen` | `/splash` | `SplashScreen` | `apps/mobile/lib/presentation/01_splash_screen/splash_screen.dart` | Application feature screen or navigation state |
| `languageSelectionScreen` | `/language` | Redirect -> `/sign-in` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Application feature screen or navigation state |
| `signInScreen` | `/sign-in` | `SignInScreen` | `apps/mobile/lib/presentation/03_sign_in_screen/sign_in_screen.dart` | Application feature screen or navigation state |
| `authScreen` | `/sign-in` | `SignInScreen` | `apps/mobile/lib/presentation/03_sign_in_screen/sign_in_screen.dart` | Application feature screen or navigation state |
| `loginOtpScreen` | `/login-otp` | `LoginOtpScreen` | `apps/mobile/lib/presentation/04_login_otp_screen/login_otp_screen.dart` | Authentication or account recovery |
| `signUpScreen` | `/sign-up` | `SignUpScreen` | `apps/mobile/lib/presentation/05_sign_up_screen/sign_up_screen.dart` | Application feature screen or navigation state |
| `setPasswordScreen` | `/set-password` | `SetPasswordScreen` | `apps/mobile/lib/presentation/06_set_password_screen/set_password_screen.dart` | Authentication or account recovery |
| `forgotPasswordScreen` | `/forgot-password` | `ForgotPasswordScreen` | `apps/mobile/lib/presentation/07_forgot_password_screen/forgot_password_screen.dart` | Authentication or account recovery |
| `forgotPasswordOtpScreen` | `/forgot-password-otp` | `ForgotPasswordOtpScreen` | `apps/mobile/lib/presentation/08_forgot_password_otp_screen/forgot_password_otp_screen.dart` | Authentication or account recovery |
| `resetPasswordScreen` | `/reset-password` | `ResetPasswordScreen` | `apps/mobile/lib/presentation/09_reset_password_screen/reset_password_screen.dart` | Authentication or account recovery |
| `chooseRoleScreen` | `/choose-role` | `ChooseRoleScreen` | `apps/mobile/lib/presentation/10_choose_role_screen/choose_role_screen.dart` | Application feature screen or navigation state |
| `onboardingPersonalScreen` | `/onboarding-personal` | `OnboardingPersonalScreen` | `apps/mobile/lib/presentation/11_onboarding_personal_screen/onboarding_personal_screen.dart` | Onboarding, permission or setup state |
| `onboardingVehicleScreen` | `/onboarding-vehicle` | `OnboardingVehicleScreen` | `apps/mobile/lib/presentation/12_onboarding_vehicle_screen/onboarding_vehicle_screen.dart` | Onboarding, permission or setup state |
| `onboardingDocumentsScreen` | `/onboarding-documents` | `OnboardingDocumentsScreen` | `apps/mobile/lib/presentation/13_onboarding_documents_screen/onboarding_documents_screen.dart` | Onboarding, permission or setup state |
| `onboardingFaceVerificationScreen` | `/onboarding-face-verification` | `OnboardingFaceVerificationScreen` | `apps/mobile/lib/presentation/15_onboarding_face_verification_screen/onboarding_face_verification_screen.dart` | Onboarding, permission or setup state |
| `onboardingReviewScreen` | `/onboarding-review` | `OnboardingReviewScreen` | `apps/mobile/lib/presentation/14_onboarding_review_screen/onboarding_review_screen.dart` | Onboarding, permission or setup state |
| `welcomeSuccessScreen` | `/welcome-success` | `WelcomeSuccessScreen` | `apps/mobile/lib/presentation/15_welcome_success_screen/welcome_success_screen.dart` | Onboarding, permission or setup state |
| `kycUploadScreen` | `/kyc-upload-screen` | `KycUploadScreen` | `apps/mobile/lib/presentation/kyc_upload_screen/kyc_upload_screen.dart` | Application feature screen or navigation state |
| `waitlistGateScreen` | `/waitlist-gate-screen` | `WaitlistGateScreen` | `apps/mobile/lib/presentation/waitlist_gate_screen/waitlist_gate_screen.dart` | Application feature screen or navigation state |
| `homeScreen` | `/home-screen` | `AppScaffold` with `HomeScreen` child | `apps/mobile/lib/presentation/home_screen/home_screen.dart` | Application feature screen or navigation state |
| `tripsScreen` | `/trips-screen` | `TripsScreen` | `apps/mobile/lib/presentation/trips_screen/trips_screen.dart` | Trip lifecycle or trip history |
| `opportunitiesScreen` | `/opportunities-screen` | Redirect -> `/home-screen` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Offer, opportunity or dispatch workflow |
| `walletScreen` | `/wallet-screen` | `EarningsScreen` | `apps/mobile/lib/presentation/wallet_screen/earnings_screen.dart` | Wallet, earnings or payment information |
| `profileScreen` | `/profile-screen` | `AppScaffold` with `ProfileScreen` child | `apps/mobile/lib/presentation/profile_screen/profile_screen.dart` | Profile, settings or notification management |
| `notificationsFeedScreen` | `/notifications` | `NotificationsFeedScreen` | `apps/mobile/lib/presentation/notifications_screen/notifications_feed_screen.dart` | Profile, settings or notification management |
| `personalInfoScreen` | `/profile/personal-info` | `PersonalInformationScreen` | `apps/mobile/lib/presentation/profile_screen/personal_information_screen.dart` | Profile, settings or notification management |
| `editPersonalInfoScreen` | `/profile/personal-info/edit` | `EditPersonalInfoScreen` | `apps/mobile/lib/presentation/profile_screen/edit_personal_info_screen.dart` | Profile, settings or notification management |
| `referralScreen` | `/profile/referral` | `ReferralScreen` | `apps/mobile/lib/presentation/profile_screen/referral_screen.dart` | Profile, settings or notification management |
| `myVehicleScreen` | `/profile/vehicle` | `MyVehicleScreen` | `apps/mobile/lib/presentation/profile_screen/my_vehicle_screen.dart` | Profile, settings or notification management |
| `addVehicleScreen` | `/profile/vehicle/add` | `AddVehicleScreen` | `apps/mobile/lib/presentation/profile_screen/add_vehicle_screen.dart` | Profile, settings or notification management |
| `kycVerificationScreen` | `/profile/kyc` | `KycVerificationScreen` | `apps/mobile/lib/presentation/profile_screen/kyc_verification_screen.dart` | Profile, settings or notification management |
| `driverScoreScreen` | `/driver/score` | `DriverScoreScreen` | `apps/mobile/lib/presentation/driver_score_screen/driver_score_screen.dart` | Application feature screen or navigation state |
| `documentDetailsScreen` | `/profile/documents/details` | Redirect -> `/profile/kyc` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Profile, settings or notification management |
| `accountStatusScreen` | `/profile/account-status` | Redirect -> `/profile/personal-info` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Profile, settings or notification management |
| `helpSupportScreen` | `/profile/support` | `HelpSupportScreen` | `apps/mobile/lib/presentation/profile_screen/help_support_screen.dart` | Help, FAQ or support workflow |
| `faqScreen` | `/profile/support/faq` | `DriverFaqScreen` | `apps/mobile/lib/presentation/profile_screen/driver_faq_screen.dart` | Help, FAQ or support workflow |
| `reportIssueScreen` | `/profile/support/report-issue` | `DriverReportIssueScreen` | `apps/mobile/lib/presentation/profile_screen/driver_report_issue_screen.dart` | Help, FAQ or support workflow |
| `earningsTransactionsScreen` | `/earnings/transactions` | `EarningsTransactionsScreen` | `apps/mobile/lib/presentation/wallet_screen/earnings_transactions_screen.dart` | Wallet, earnings or payment information |
| `earningsWithdrawScreen` | `/earnings/withdraw` | `EarningsWithdrawScreen` | `apps/mobile/lib/presentation/wallet_screen/earnings_withdraw_screen.dart` | Wallet, earnings or payment information |
| `earningsWithdrawalDetailsScreen` | `/earnings/withdrawal-details` | `EarningsWithdrawalDetailsScreen` | `apps/mobile/lib/presentation/wallet_screen/earnings_withdrawal_details_screen.dart` | Wallet, earnings or payment information |
| `tripDetailsScreen` | `/trips/details` | `TripDetailsScreen` | `apps/mobile/lib/presentation/trips_screen/trip_details_screen.dart` | Trip lifecycle or trip history |
| `tripChatScreen` | `/trips/chat` | `TripChatScreen` | `apps/mobile/lib/presentation/trips_screen/trip_chat_screen.dart` | Trip lifecycle or trip history |
| `opportunityDetailsScreen` | `/opportunities/details` | `OpportunityDetailsScreen` | `apps/mobile/lib/presentation/opportunities_screen/opportunity_details_screen.dart` | Offer, opportunity or dispatch workflow |
| `opportunityOfferScreen` | `/opportunities/offer` | `OpportunityOfferScreen` | `apps/mobile/lib/presentation/opportunities_screen/opportunity_offer_screen.dart` | Offer, opportunity or dispatch workflow |
| `universalLocationPickerScreen` | `/universal-location-picker` | `UniversalLocationPickerScreen` | `apps/mobile/lib/presentation/location_picker/universal_location_picker_screen.dart` | Application feature screen or navigation state |
| `universalLocationSearchScreen` | `/universal-location-search` | `UniversalLocationPickerScreen` | `apps/mobile/lib/presentation/location_picker/universal_location_picker_screen.dart` | Application feature screen or navigation state |
| `globalStateGalleryScreen` | `/global-states-gallery` | `GlobalStateGalleryScreen` | `apps/mobile/lib/presentation/edge_cases/global_state_gallery_screen.dart` | Application feature screen or navigation state |
| `userHomeScreen` | `/user/home` | `UserHomeScreen` | `apps/mobile/lib/user/home/user_home_screen.dart` | Application feature screen or navigation state |
| `userRequirementsScreen` | `/user/requirements` | `UserRequirementsListScreen` | `apps/mobile/lib/user/requirements/user_requirements_list_screen.dart` | Vendor requirement or fulfillment workflow |
| `userCreateRequirementScreen` | `/user/requirements/create` | `UserCreateRequirementScreen` | `apps/mobile/lib/user/requirements/user_create_requirement_screen.dart` | Vendor requirement or fulfillment workflow |
| `userCreateRequirementStep2Screen` | `/user/requirements/create-step2` | `UserCreateRequirementStep2Screen` | `apps/mobile/lib/user/requirements/user_create_requirement_step2_screen.dart` | Vendor requirement or fulfillment workflow |
| `userCreateRequirementStep3Screen` | `/user/requirements/create-step3` | `UserCreateRequirementStep3Screen` | `apps/mobile/lib/user/requirements/user_create_requirement_step3_screen.dart` | Vendor requirement or fulfillment workflow |
| `userCreateRequirementStep4Screen` | `/user/requirements/create-step4` | `UserCreateRequirementStep4Screen` | `apps/mobile/lib/user/requirements/user_create_requirement_step4_screen.dart` | Vendor requirement or fulfillment workflow |
| `userReviewRequirementScreen` | `/user/requirements/review` | `UserReviewRequirementScreen` | `apps/mobile/lib/user/requirements/user_review_requirement_screen.dart` | Vendor requirement or fulfillment workflow |
| `userRequirementPostedConfirmationScreen` | `/user/requirements/posted-confirmation` | `UserRequirementPostedConfirmationScreen` | `apps/mobile/lib/user/requirements/user_requirement_posted_confirmation_screen.dart` | Vendor requirement or fulfillment workflow |
| `userDraftRequirementsScreen` | `/user/requirements/drafts` | `UserDraftRequirementsScreen` | `apps/mobile/lib/user/requirements/user_draft_requirements_screen.dart` | Vendor requirement or fulfillment workflow |
| `userEditRequirementScreen` | `/user/requirements/edit` | `UserEditRequirementScreen` | `apps/mobile/lib/user/requirements/user_edit_requirement_screen.dart` | Vendor requirement or fulfillment workflow |
| `userBulkPostingScreen` | `/user/requirements/bulk-posting` | Redirect -> `/user/requirements` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Vendor requirement or fulfillment workflow |
| `userReviewBulkPostingScreen` | `/user/requirements/review-bulk` | Redirect -> `/user/requirements` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Vendor requirement or fulfillment workflow |
| `userRequirementDetailsScreen` | `/user/requirements/details` | `UserActiveTripScreen` | `apps/mobile/lib/user/trips/user_active_trip_screen.dart` | Vendor requirement or fulfillment workflow |
| `userFulfillmentStatusScreen` | `/user/fulfillment/status` | `UserFulfillmentStatusScreen` | `apps/mobile/lib/user/fulfillment/user_fulfillment_status_screen.dart` | Vendor requirement or fulfillment workflow |
| `userFulfillmentOverviewScreen` | `/user/fulfillment/overview` | `UserFulfillmentOverviewScreen` | `apps/mobile/lib/user/fulfillment/user_fulfillment_overview_screen.dart` | Vendor requirement or fulfillment workflow |
| `userDriverMatchingScreen` | `/user/fulfillment/driver-matching` | `UserDriverMatchingScreen` | `apps/mobile/lib/user/fulfillment/user_driver_matching_screen.dart` | Vendor requirement or fulfillment workflow |
| `userRequirementStatusSearchingScreen` | `/user/fulfillment/status-searching` | `UserRequirementStatusScreen` | `apps/mobile/lib/user/fulfillment/user_requirement_status_screen.dart` | Vendor requirement or fulfillment workflow |
| `userRequirementStatusFulfilledScreen` | `/user/fulfillment/status-fulfilled` | `UserRequirementStatusScreen` | `apps/mobile/lib/user/fulfillment/user_requirement_status_screen.dart` | Vendor requirement or fulfillment workflow |
| `userRequirementStatusFailedScreen` | `/user/fulfillment/status-failed` | `UserRequirementStatusScreen` | `apps/mobile/lib/user/fulfillment/user_requirement_status_screen.dart` | Vendor requirement or fulfillment workflow |
| `userDriverAssignmentsListScreen` | `/user/fulfillment/driver-assignments` | `UserDriverAssignmentsListScreen` | `apps/mobile/lib/user/fulfillment/user_driver_assignments_list_screen.dart` | Vendor requirement or fulfillment workflow |
| `userDriverDetailsScreen` | `/user/fulfillment/driver-details` | `UserDriverDetailsScreen` | `apps/mobile/lib/user/fulfillment/user_driver_details_screen.dart` | Vendor requirement or fulfillment workflow |
| `userVehicleDetailsScreen` | `/user/fulfillment/vehicle-details` | `UserVehicleDetailsScreen` | `apps/mobile/lib/user/fulfillment/user_vehicle_details_screen.dart` | Vendor requirement or fulfillment workflow |
| `userAssignmentTimelineScreen` | `/user/fulfillment/assignment-timeline` | `UserAssignmentTimelineScreen` | `apps/mobile/lib/user/fulfillment/user_assignment_timeline_screen.dart` | Vendor requirement or fulfillment workflow |
| `userCancelAssignmentScreen` | `/user/fulfillment/cancel-assignment` | `UserCancelAssignmentScreen` | `apps/mobile/lib/user/fulfillment/user_cancel_assignment_screen.dart` | Vendor requirement or fulfillment workflow |
| `userTripsScreen` | `/user/trips` | Redirect -> `/user/requirements` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Trip lifecycle or trip history |
| `userActiveTripScreen` | `/user/trips/active` | `UserActiveTripScreen` | `apps/mobile/lib/user/trips/user_active_trip_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsUpcomingScreen` | `/user/trips/details-upcoming` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsAssignedScreen` | `/user/trips/details-assigned` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsEnRouteScreen` | `/user/trips/details-enroute` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsArrivedScreen` | `/user/trips/details-arrived` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsStartedScreen` | `/user/trips/details-started` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsInProgressScreen` | `/user/trips/details-inprogress` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsCompletedScreen` | `/user/trips/details-completed` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripDetailsCancelledScreen` | `/user/trips/details-cancelled` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userPassengerNoShowScreen` | `/user/trips/details-noshow` | `UserTripDetailsScreen` | `apps/mobile/lib/user/trips/user_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userTripTimelineActivityScreen` | `/user/trips/timeline-activity` | `UserTripTimelineActivityScreen` | `apps/mobile/lib/user/trips/user_trip_timeline_activity_screen.dart` | Trip lifecycle or trip history |
| `userTripHistoryScreen` | `/user/trips/history` | `UserTripHistoryScreen` | `apps/mobile/lib/user/trips/user_trip_history_screen.dart` | Trip lifecycle or trip history |
| `userHistoricalTripDetailsScreen` | `/user/trips/historical-details` | `UserHistoricalTripDetailsScreen` | `apps/mobile/lib/user/trips/user_historical_trip_details_screen.dart` | Trip lifecycle or trip history |
| `userPaymentsScreen` | `/user/payments` | `UserPaymentsScreen` | `apps/mobile/lib/user/payments/user_payments_screen.dart` | Wallet, earnings or payment information |
| `userPaymentHistoryScreen` | `/user/payments/history` | `UserPaymentHistoryScreen` | `apps/mobile/lib/user/payments/user_payment_history_screen.dart` | Wallet, earnings or payment information |
| `userPaymentDetailsScreen` | `/user/payments/details` | `UserPaymentDetailsScreen` | `apps/mobile/lib/user/payments/user_payment_details_screen.dart` | Wallet, earnings or payment information |
| `userPaymentPendingScreen` | `/user/payments/pending` | `UserPaymentStatusScreen` | `apps/mobile/lib/user/payments/user_payment_status_screen.dart` | Wallet, earnings or payment information |
| `userPaymentProcessingScreen` | `/user/payments/processing` | `UserPaymentStatusScreen` | `apps/mobile/lib/user/payments/user_payment_status_screen.dart` | Wallet, earnings or payment information |
| `userPaymentSuccessfulScreen` | `/user/payments/successful` | `UserPaymentStatusScreen` | `apps/mobile/lib/user/payments/user_payment_status_screen.dart` | Wallet, earnings or payment information |
| `userPaymentFailedScreen` | `/user/payments/failed` | `UserPaymentStatusScreen` | `apps/mobile/lib/user/payments/user_payment_status_screen.dart` | Wallet, earnings or payment information |
| `userProfileScreen` | `/user/profile` | `UserProfileScreen` | `apps/mobile/lib/user/profile/user_profile_screen.dart` | Profile, settings or notification management |
| `userProfileExtendedScreen` | `/user/profile/extended` | `UserProfileExtendedScreen` | `apps/mobile/lib/user/profile/user_profile_extended_screen.dart` | Profile, settings or notification management |
| `userOrganizationInformationScreen` | `/user/profile/organization-info` | `UserOrganizationInformationScreen` | `apps/mobile/lib/user/profile/user_organization_information_screen.dart` | Profile, settings or notification management |
| `userCompanyInformationScreen` | `/user/profile/company-info` | `UserOrganizationInformationScreen` | `apps/mobile/lib/user/profile/user_organization_information_screen.dart` | Profile, settings or notification management |
| `userContactInformationScreen` | `/user/profile/contact-info` | `UserOrganizationInformationScreen` | `apps/mobile/lib/user/profile/user_organization_information_screen.dart` | Profile, settings or notification management |
| `userAccountStatusScreen` | `/user/profile/account-status` | Redirect -> `/user/profile` | See route builder in `apps/mobile/lib/routes/app_routes.dart` | Profile, settings or notification management |
| `userNotificationSettingsScreen` | `/user/profile/notifications-settings` | `UserNotificationSettingsScreen` | `apps/mobile/lib/user/profile/user_notification_settings_screen.dart` | Profile, settings or notification management |
| `userSupportCenterScreen` | `/user/support/center` | `UserSupportCenterScreen` | `apps/mobile/lib/user/support/user_support_center_screen.dart` | Help, FAQ or support workflow |
| `userHelpFaqScreen` | `/user/support/faq` | `UserHelpFaqScreen` | `apps/mobile/lib/user/support/user_help_faq_screen.dart` | Help, FAQ or support workflow |
| `userRaiseIssueScreen` | `/user/support/raise-issue` | `UserRaiseIssueScreen` | `apps/mobile/lib/user/support/user_raise_issue_screen.dart` | Help, FAQ or support workflow |
| `userTicketDetailsOpenScreen` | `/user/support/ticket-open` | `UserTicketDetailsScreen` | `apps/mobile/lib/user/support/user_ticket_details_screen.dart` | Help, FAQ or support workflow |
| `userTicketDetailsInProgressScreen` | `/user/support/ticket-inprogress` | `UserTicketDetailsScreen` | `apps/mobile/lib/user/support/user_ticket_details_screen.dart` | Help, FAQ or support workflow |
| `userTicketDetailsResolvedScreen` | `/user/support/ticket-resolved` | `UserTicketDetailsScreen` | `apps/mobile/lib/user/support/user_ticket_details_screen.dart` | Help, FAQ or support workflow |
| `userAppSettingsScreen` | `/user/profile/settings` | `UserAppSettingsScreen` | `apps/mobile/lib/user/profile/user_app_settings_screen.dart` | Profile, settings or notification management |

## Named constant aliases

These constants do not define additional path strings: each refers to an
existing constant in `apps/mobile/lib/routes/app_routes.dart`. They therefore
share the canonical route's registered destination, redirect behavior and
screen implementation. The canonical row above is the detailed screen/source
reference.

| Alias constant | Resolves to constant | Effective route path | Behavior |
|---|---|---|---|
| `notificationsSettingsScreen` | `notificationsFeedScreen` | `/notifications` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `driverFaqScreen` | `faqScreen` | `/profile/support/faq` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `driverReportIssueScreen` | `reportIssueScreen` | `/profile/support/report-issue` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `appSettingsScreen` | `profileScreen` | `/profile-screen` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `corporateEarningsScreen` | `walletScreen` | `/wallet-screen` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `corporateDutiesScreen` | `homeScreen` | `/home-screen` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorHomeScreen` | `userHomeScreen` | `/user/home` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementsScreen` | `userRequirementsScreen` | `/user/requirements` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCreateRequirementScreen` | `userCreateRequirementScreen` | `/user/requirements/create` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCreateRequirementStep2Screen` | `userCreateRequirementStep2Screen` | `/user/requirements/create-step2` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCreateRequirementStep3Screen` | `userCreateRequirementStep3Screen` | `/user/requirements/create-step3` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCreateRequirementStep4Screen` | `userCreateRequirementStep4Screen` | `/user/requirements/create-step4` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorReviewRequirementScreen` | `userReviewRequirementScreen` | `/user/requirements/review` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementPostedConfirmationScreen` | `userRequirementPostedConfirmationScreen` | `/user/requirements/posted-confirmation` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorDraftRequirementsScreen` | `userDraftRequirementsScreen` | `/user/requirements/drafts` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorEditRequirementScreen` | `userEditRequirementScreen` | `/user/requirements/edit` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorBulkPostingScreen` | `userBulkPostingScreen` | `/user/requirements/bulk-posting` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorReviewBulkPostingScreen` | `userReviewBulkPostingScreen` | `/user/requirements/review-bulk` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementDetailsScreen` | `userRequirementDetailsScreen` | `/user/requirements/details` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorFulfillmentStatusScreen` | `userFulfillmentStatusScreen` | `/user/fulfillment/status` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorFulfillmentOverviewScreen` | `userFulfillmentOverviewScreen` | `/user/fulfillment/overview` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorDriverMatchingScreen` | `userDriverMatchingScreen` | `/user/fulfillment/driver-matching` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementStatusSearchingScreen` | `userRequirementStatusSearchingScreen` | `/user/fulfillment/status-searching` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementStatusFulfilledScreen` | `userRequirementStatusFulfilledScreen` | `/user/fulfillment/status-fulfilled` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRequirementStatusFailedScreen` | `userRequirementStatusFailedScreen` | `/user/fulfillment/status-failed` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorDriverAssignmentsListScreen` | `userDriverAssignmentsListScreen` | `/user/fulfillment/driver-assignments` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorDriverDetailsScreen` | `userDriverDetailsScreen` | `/user/fulfillment/driver-details` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorVehicleDetailsScreen` | `userVehicleDetailsScreen` | `/user/fulfillment/vehicle-details` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorAssignmentTimelineScreen` | `userAssignmentTimelineScreen` | `/user/fulfillment/assignment-timeline` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCancelAssignmentScreen` | `userCancelAssignmentScreen` | `/user/fulfillment/cancel-assignment` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripsScreen` | `userTripsScreen` | `/user/trips` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorActiveTripScreen` | `userActiveTripScreen` | `/user/trips/active` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsUpcomingScreen` | `userTripDetailsUpcomingScreen` | `/user/trips/details-upcoming` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsAssignedScreen` | `userTripDetailsAssignedScreen` | `/user/trips/details-assigned` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsEnRouteScreen` | `userTripDetailsEnRouteScreen` | `/user/trips/details-enroute` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsArrivedScreen` | `userTripDetailsArrivedScreen` | `/user/trips/details-arrived` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsStartedScreen` | `userTripDetailsStartedScreen` | `/user/trips/details-started` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsInProgressScreen` | `userTripDetailsInProgressScreen` | `/user/trips/details-inprogress` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsCompletedScreen` | `userTripDetailsCompletedScreen` | `/user/trips/details-completed` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripDetailsCancelledScreen` | `userTripDetailsCancelledScreen` | `/user/trips/details-cancelled` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPassengerNoShowScreen` | `userPassengerNoShowScreen` | `/user/trips/details-noshow` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripTimelineActivityScreen` | `userTripTimelineActivityScreen` | `/user/trips/timeline-activity` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTripHistoryScreen` | `userTripHistoryScreen` | `/user/trips/history` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorHistoricalTripDetailsScreen` | `userHistoricalTripDetailsScreen` | `/user/trips/historical-details` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentsScreen` | `userPaymentsScreen` | `/user/payments` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentHistoryScreen` | `userPaymentHistoryScreen` | `/user/payments/history` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentDetailsScreen` | `userPaymentDetailsScreen` | `/user/payments/details` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentPendingScreen` | `userPaymentPendingScreen` | `/user/payments/pending` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentProcessingScreen` | `userPaymentProcessingScreen` | `/user/payments/processing` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentSuccessfulScreen` | `userPaymentSuccessfulScreen` | `/user/payments/successful` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorPaymentFailedScreen` | `userPaymentFailedScreen` | `/user/payments/failed` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorProfileScreen` | `userProfileScreen` | `/user/profile` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorProfileExtendedScreen` | `userProfileExtendedScreen` | `/user/profile/extended` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorOrganizationInformationScreen` | `userOrganizationInformationScreen` | `/user/profile/organization-info` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorCompanyInformationScreen` | `userOrganizationInformationScreen` | `/user/profile/organization-info` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorContactInformationScreen` | `userOrganizationInformationScreen` | `/user/profile/organization-info` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorAccountStatusScreen` | `userAccountStatusScreen` | `/user/profile/account-status` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorNotificationSettingsScreen` | `userNotificationSettingsScreen` | `/user/profile/notifications-settings` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorSupportCenterScreen` | `userSupportCenterScreen` | `/user/support/center` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorHelpFaqScreen` | `userHelpFaqScreen` | `/user/support/faq` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorRaiseIssueScreen` | `userRaiseIssueScreen` | `/user/support/raise-issue` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTicketDetailsOpenScreen` | `userTicketDetailsOpenScreen` | `/user/support/ticket-open` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTicketDetailsInProgressScreen` | `userTicketDetailsInProgressScreen` | `/user/support/ticket-inprogress` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorTicketDetailsResolvedScreen` | `userTicketDetailsResolvedScreen` | `/user/support/ticket-resolved` | Same destination and screen behavior as the target; see the matching canonical route row. |
| `vendorAppSettingsScreen` | `userAppSettingsScreen` | `/user/profile/settings` | Same destination and screen behavior as the target; see the matching canonical route row. |

## Additional registered aliases

These `GoRoute` entries are registered in addition to the 107 canonical path
constants and 65 named constant aliases. They support external navigation,
role routing or compatibility; they are not additional `AppRoutes` constants.

| Route | Destination or behavior |
|---|---|
| `/offers/:id`, `/offers` | Build `OpportunityOfferScreen`; use path/query ID or `state.extra`. |
| `/trips/:id` | Driver opens `TripDetailsScreen`; vendor opens `UserActiveTripScreen`. |
| `/requirements/:id` | Opens `UserActiveTripScreen` with the requirement ID. |
| `/trips` | Redirects to driver trips or vendor requirements according to the authenticated role. |
| `/requirements` | Redirects to the role-specific requirements/opportunities destination. |
| `/wallet`, `/coupons` | Redirect by role and the vendor-wallet feature flag. |
| `/verifications`, `/support` | Redirect to the role-appropriate verification/support screen. |
| `/trips/:id/chat` | Builds `TripChatScreen` with the path trip ID included in route data. |
| `/profile/notifications`, `/profile/settings` | Compatibility redirects to the current notification/profile routes. |

Additional redirects: `/language` goes to `/sign-in`; `/profile/documents/details`
forwards a filter to KYC verification; driver `/profile/account-status` goes to
personal information; vendor bulk-posting aliases go to requirements; vendor
`/user/trips` goes to requirements; vendor account status goes to the profile.

## Navigation behavior

The app-wide GoRouter redirect in `AppRoutes.resolveRedirect` gates access by
session, password setup, onboarding completion, verification status, role and
the vendor-wallet feature flag. Unauthenticated users are sent to the splash
route except for public authentication routes. Drivers cannot open `/user/*`;
vendors are sent away from driver-only screens. These client redirects improve
UX but do not replace backend authentication, role checks or ownership rules.

`/language` is not a language-selection page in the router: it redirects to
`/sign-in`. Language support is managed through the language provider and the
auth-screen language switcher. Routes redirected elsewhere are not separate
functional pages even where a similarly named screen file exists.

## Sources and verification

- `apps/mobile/lib/routes/app_routes.dart` — route constant declarations.
- [Traceability registry](../../platform/traceability-registry.md) — count reconciliation and feature-level cross references.