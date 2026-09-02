import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../presentation/01_splash_screen/splash_screen.dart';
import '../presentation/02_language_selection_screen/language_selection_screen.dart';
import '../presentation/03_sign_in_screen/sign_in_screen.dart';
import '../presentation/04_login_otp_screen/login_otp_screen.dart';
import '../presentation/05_sign_up_screen/sign_up_screen.dart';
import '../presentation/06_set_password_screen/set_password_screen.dart';
import '../presentation/07_forgot_password_screen/forgot_password_screen.dart';
import '../presentation/08_forgot_password_otp_screen/forgot_password_otp_screen.dart';
import '../presentation/09_reset_password_screen/reset_password_screen.dart';
import '../presentation/10_choose_role_screen/choose_role_screen.dart';
import '../presentation/11_onboarding_personal_screen/onboarding_personal_screen.dart';
import '../presentation/12_onboarding_vehicle_screen/onboarding_vehicle_screen.dart';
import '../presentation/13_onboarding_documents_screen/onboarding_documents_screen.dart';
import '../presentation/14_onboarding_review_screen/onboarding_review_screen.dart';
import '../presentation/15_welcome_success_screen/welcome_success_screen.dart';
import '../presentation/edge_cases/global_state_gallery_screen.dart';
import '../presentation/home_screen/home_screen.dart';
import '../presentation/kyc_upload_screen/kyc_upload_screen.dart';
import '../presentation/notifications_screen/notifications_feed_screen.dart';
import '../presentation/opportunities_screen/opportunities_screen.dart';
import '../presentation/opportunities_screen/opportunity_details_screen.dart';
import '../presentation/opportunities_screen/opportunity_offer_screen.dart';
import '../presentation/profile_screen/account_status_screen.dart';
import '../presentation/profile_screen/add_vehicle_screen.dart';
import '../presentation/profile_screen/app_settings_screen.dart';
import '../presentation/profile_screen/document_details_screen.dart';
import '../presentation/profile_screen/edit_personal_info_screen.dart';
import '../presentation/profile_screen/help_support_screen.dart';
import '../presentation/profile_screen/kyc_verification_screen.dart';
import '../presentation/profile_screen/my_vehicle_screen.dart';
import '../presentation/profile_screen/notifications_settings_screen.dart';
import '../presentation/profile_screen/personal_information_screen.dart';
import '../presentation/profile_screen/profile_screen.dart';
import '../presentation/trips_screen/trip_details_screen.dart';
import '../presentation/trips_screen/trips_screen.dart';
import '../presentation/waitlist_gate_screen/waitlist_gate_screen.dart';
import '../presentation/wallet_screen/earnings_screen.dart';
import '../presentation/wallet_screen/earnings_transactions_screen.dart';
import '../presentation/wallet_screen/earnings_withdraw_screen.dart';
import '../presentation/wallet_screen/earnings_withdrawal_details_screen.dart';
import '../services/auth_service.dart';
import '../widgets/app_scaffold.dart';
import '../vendor/home/vendor_home_screen.dart';
import '../vendor/requirements/vendor_requirements_list_screen.dart';
import '../vendor/requirements/vendor_create_requirement_screen.dart';
import '../vendor/requirements/vendor_create_requirement_step2_screen.dart';
import '../vendor/requirements/vendor_create_requirement_step3_screen.dart';
import '../vendor/requirements/vendor_create_requirement_step4_screen.dart';
import '../vendor/requirements/vendor_review_requirement_screen.dart';
import '../vendor/requirements/vendor_requirement_posted_confirmation_screen.dart';
import '../vendor/requirements/vendor_draft_requirements_screen.dart';
import '../vendor/requirements/vendor_edit_requirement_screen.dart';
import '../vendor/requirements/vendor_bulk_posting_screen.dart';
import '../vendor/requirements/vendor_review_bulk_posting_screen.dart';
import '../vendor/requirements/vendor_requirement_details_screen.dart';
import '../vendor/fulfillment/vendor_fulfillment_status_screen.dart';
import '../vendor/fulfillment/vendor_fulfillment_overview_screen.dart';
import '../vendor/fulfillment/vendor_driver_matching_screen.dart';
import '../vendor/fulfillment/vendor_requirement_status_screen.dart';
import '../vendor/fulfillment/vendor_driver_assignments_list_screen.dart';
import '../vendor/fulfillment/vendor_driver_details_screen.dart';
import '../vendor/fulfillment/vendor_vehicle_details_screen.dart';
import '../vendor/fulfillment/vendor_assignment_timeline_screen.dart';
import '../vendor/fulfillment/vendor_cancel_assignment_screen.dart';
import '../vendor/trips/vendor_trips_list_screen.dart';
import '../vendor/trips/vendor_active_trip_screen.dart';
import '../vendor/trips/vendor_trip_details_screen.dart';
import '../vendor/trips/vendor_trip_timeline_activity_screen.dart';
import '../vendor/trips/vendor_trip_history_screen.dart';
import '../vendor/trips/vendor_historical_trip_details_screen.dart';
import '../vendor/payments/vendor_payments_screen.dart';
import '../vendor/payments/vendor_payment_history_screen.dart';
import '../vendor/payments/vendor_payment_details_screen.dart';
import '../vendor/payments/vendor_payment_status_screen.dart';
import '../vendor/profile/vendor_profile_screen.dart';
import '../vendor/profile/vendor_profile_extended_screen.dart';
import '../vendor/profile/vendor_company_information_screen.dart';
import '../vendor/profile/vendor_contact_information_screen.dart';
import '../vendor/profile/vendor_account_status_screen.dart';
import '../vendor/profile/vendor_notification_settings_screen.dart';
import '../vendor/profile/vendor_app_settings_screen.dart';
import '../vendor/support/vendor_support_center_screen.dart';
import '../vendor/support/vendor_help_faq_screen.dart';
import '../vendor/support/vendor_raise_issue_screen.dart';
import '../vendor/support/vendor_ticket_details_screen.dart';

class AppRoutes {
  static const String initial = '/';
  static const String splashScreen = '/splash';
  static const String languageSelectionScreen = '/language';
  static const String signInScreen = '/sign-in';
  static const String authScreen = '/sign-in';
  static const String loginOtpScreen = '/login-otp';

  static const String signUpScreen = '/sign-up';
  static const String setPasswordScreen = '/set-password';
  static const String forgotPasswordScreen = '/forgot-password';
  static const String forgotPasswordOtpScreen = '/forgot-password-otp';
  static const String resetPasswordScreen = '/reset-password';
  static const String chooseRoleScreen = '/choose-role';
  static const String onboardingPersonalScreen = '/onboarding-personal';
  static const String onboardingVehicleScreen = '/onboarding-vehicle';
  static const String onboardingDocumentsScreen = '/onboarding-documents';
  static const String onboardingReviewScreen = '/onboarding-review';
  static const String welcomeSuccessScreen = '/welcome-success';

  static const String kycUploadScreen = '/kyc-upload-screen';
  static const String waitlistGateScreen = '/waitlist-gate-screen';
  static const String homeScreen = '/home-screen';
  static const String tripsScreen = '/trips-screen';
  static const String opportunitiesScreen = '/opportunities-screen';
  static const String walletScreen = '/wallet-screen';
  static const String profileScreen = '/profile-screen';

  // Notifications Feed Route
  static const String notificationsFeedScreen = '/notifications';

  // Profile & Settings Detail Screens
  static const String personalInfoScreen = '/profile/personal-info';
  static const String editPersonalInfoScreen = '/profile/personal-info/edit';
  static const String myVehicleScreen = '/profile/vehicle';
  static const String addVehicleScreen = '/profile/vehicle/add';
  static const String kycVerificationScreen = '/profile/kyc';
  static const String documentDetailsScreen = '/profile/documents/details';
  static const String accountStatusScreen = '/profile/account-status';
  static const String notificationsSettingsScreen = '/profile/notifications';
  static const String helpSupportScreen = '/profile/support';
  static const String appSettingsScreen = '/profile/settings';

  // 4 Earnings & Financial Screens
  static const String earningsTransactionsScreen = '/earnings/transactions';
  static const String earningsWithdrawScreen = '/earnings/withdraw';
  static const String earningsWithdrawalDetailsScreen = '/earnings/withdrawal-details';

  // Trips & Operations Detail Screens
  static const String tripDetailsScreen = '/trips/details';

  // Opportunities & Trip Dispatch Detail Screens
  static const String opportunityDetailsScreen = '/opportunities/details';
  static const String opportunityOfferScreen = '/opportunities/offer';

  // 10 Global States Gallery
  static const String globalStateGalleryScreen = '/global-states-gallery';

  // ── 60 Vendor Screens Routes ───────────────────────────────────────────────
  static const String vendorHomeScreen = '/vendor/home';
  static const String vendorRequirementsScreen = '/vendor/requirements';
  static const String vendorCreateRequirementScreen = '/vendor/requirements/create';
  static const String vendorCreateRequirementStep2Screen = '/vendor/requirements/create-step2';
  static const String vendorCreateRequirementStep3Screen = '/vendor/requirements/create-step3';
  static const String vendorCreateRequirementStep4Screen = '/vendor/requirements/create-step4';
  static const String vendorReviewRequirementScreen = '/vendor/requirements/review';
  static const String vendorRequirementPostedConfirmationScreen = '/vendor/requirements/posted-confirmation';
  static const String vendorDraftRequirementsScreen = '/vendor/requirements/drafts';
  static const String vendorEditRequirementScreen = '/vendor/requirements/edit';
  static const String vendorBulkPostingScreen = '/vendor/requirements/bulk-posting';
  static const String vendorReviewBulkPostingScreen = '/vendor/requirements/review-bulk';
  static const String vendorRequirementDetailsScreen = '/vendor/requirements/details';
  static const String vendorFulfillmentStatusScreen = '/vendor/fulfillment/status';
  static const String vendorFulfillmentOverviewScreen = '/vendor/fulfillment/overview';
  static const String vendorDriverMatchingScreen = '/vendor/fulfillment/driver-matching';
  static const String vendorRequirementStatusSearchingScreen = '/vendor/fulfillment/status-searching';
  static const String vendorRequirementStatusFulfilledScreen = '/vendor/fulfillment/status-fulfilled';
  static const String vendorRequirementStatusFailedScreen = '/vendor/fulfillment/status-failed';
  static const String vendorDriverAssignmentsListScreen = '/vendor/fulfillment/driver-assignments';
  static const String vendorDriverDetailsScreen = '/vendor/fulfillment/driver-details';
  static const String vendorVehicleDetailsScreen = '/vendor/fulfillment/vehicle-details';
  static const String vendorAssignmentTimelineScreen = '/vendor/fulfillment/assignment-timeline';
  static const String vendorCancelAssignmentScreen = '/vendor/fulfillment/cancel-assignment';
  static const String vendorTripsScreen = '/vendor/trips';
  static const String vendorActiveTripScreen = '/vendor/trips/active';
  static const String vendorTripDetailsUpcomingScreen = '/vendor/trips/details-upcoming';
  static const String vendorTripDetailsAssignedScreen = '/vendor/trips/details-assigned';
  static const String vendorTripDetailsEnRouteScreen = '/vendor/trips/details-enroute';
  static const String vendorTripDetailsArrivedScreen = '/vendor/trips/details-arrived';
  static const String vendorTripDetailsStartedScreen = '/vendor/trips/details-started';
  static const String vendorTripDetailsInProgressScreen = '/vendor/trips/details-inprogress';
  static const String vendorTripDetailsCompletedScreen = '/vendor/trips/details-completed';
  static const String vendorTripDetailsCancelledScreen = '/vendor/trips/details-cancelled';
  static const String vendorPassengerNoShowScreen = '/vendor/trips/details-noshow';
  static const String vendorTripTimelineActivityScreen = '/vendor/trips/timeline-activity';
  static const String vendorTripHistoryScreen = '/vendor/trips/history';
  static const String vendorHistoricalTripDetailsScreen = '/vendor/trips/historical-details';
  static const String vendorPaymentsScreen = '/vendor/payments';
  static const String vendorPaymentHistoryScreen = '/vendor/payments/history';
  static const String vendorPaymentDetailsScreen = '/vendor/payments/details';
  static const String vendorPaymentPendingScreen = '/vendor/payments/pending';
  static const String vendorPaymentProcessingScreen = '/vendor/payments/processing';
  static const String vendorPaymentSuccessfulScreen = '/vendor/payments/successful';
  static const String vendorPaymentFailedScreen = '/vendor/payments/failed';
  static const String vendorProfileScreen = '/vendor/profile';
  static const String vendorProfileExtendedScreen = '/vendor/profile/extended';
  static const String vendorCompanyInformationScreen = '/vendor/profile/company-info';
  static const String vendorContactInformationScreen = '/vendor/profile/contact-info';
  static const String vendorAccountStatusScreen = '/vendor/profile/account-status';
  static const String vendorNotificationSettingsScreen = '/vendor/profile/notifications-settings';
  static const String vendorSupportCenterScreen = '/vendor/support/center';
  static const String vendorHelpFaqScreen = '/vendor/support/faq';
  static const String vendorRaiseIssueScreen = '/vendor/support/raise-issue';
  static const String vendorTicketDetailsOpenScreen = '/vendor/support/ticket-open';
  static const String vendorTicketDetailsInProgressScreen = '/vendor/support/ticket-inprogress';
  static const String vendorTicketDetailsResolvedScreen = '/vendor/support/ticket-resolved';
  static const String vendorAppSettingsScreen = '/vendor/profile/settings';
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.splashScreen,
  redirect: (BuildContext context, GoRouterState state) async {
    final user = AuthService.instance.currentUser;
    final isLoggedIn = user != null;
    final currentPath = state.matchedLocation;

    // Public onboarding & detail routes that don't require restrictive session gating
    const publicRoutes = {
      AppRoutes.splashScreen,
      AppRoutes.languageSelectionScreen,
      AppRoutes.signInScreen,
      AppRoutes.loginOtpScreen,
      AppRoutes.signUpScreen,
      AppRoutes.setPasswordScreen,
      AppRoutes.forgotPasswordScreen,
      AppRoutes.forgotPasswordOtpScreen,
      AppRoutes.resetPasswordScreen,
      AppRoutes.chooseRoleScreen,
      AppRoutes.onboardingPersonalScreen,
      AppRoutes.onboardingVehicleScreen,
      AppRoutes.onboardingDocumentsScreen,
      AppRoutes.onboardingReviewScreen,
      AppRoutes.welcomeSuccessScreen,
      AppRoutes.homeScreen,
      AppRoutes.notificationsFeedScreen,
      AppRoutes.personalInfoScreen,
      AppRoutes.editPersonalInfoScreen,
      AppRoutes.myVehicleScreen,
      AppRoutes.addVehicleScreen,
      AppRoutes.kycVerificationScreen,
      AppRoutes.documentDetailsScreen,
      AppRoutes.accountStatusScreen,
      AppRoutes.notificationsSettingsScreen,
      AppRoutes.helpSupportScreen,
      AppRoutes.appSettingsScreen,
      AppRoutes.earningsTransactionsScreen,
      AppRoutes.earningsWithdrawScreen,
      AppRoutes.earningsWithdrawalDetailsScreen,
      AppRoutes.tripDetailsScreen,
      AppRoutes.opportunityDetailsScreen,
      AppRoutes.opportunityOfferScreen,
      AppRoutes.globalStateGalleryScreen,
      AppRoutes.vendorHomeScreen,
      AppRoutes.vendorRequirementsScreen,
      AppRoutes.vendorCreateRequirementScreen,
      AppRoutes.vendorCreateRequirementStep2Screen,
      AppRoutes.vendorCreateRequirementStep3Screen,
      AppRoutes.vendorCreateRequirementStep4Screen,
      AppRoutes.vendorReviewRequirementScreen,
      AppRoutes.vendorRequirementPostedConfirmationScreen,
      AppRoutes.vendorDraftRequirementsScreen,
      AppRoutes.vendorEditRequirementScreen,
      AppRoutes.vendorBulkPostingScreen,
      AppRoutes.vendorReviewBulkPostingScreen,
      AppRoutes.vendorRequirementDetailsScreen,
      AppRoutes.vendorFulfillmentStatusScreen,
      AppRoutes.vendorFulfillmentOverviewScreen,
      AppRoutes.vendorDriverMatchingScreen,
      AppRoutes.vendorRequirementStatusSearchingScreen,
      AppRoutes.vendorRequirementStatusFulfilledScreen,
      AppRoutes.vendorRequirementStatusFailedScreen,
      AppRoutes.vendorDriverAssignmentsListScreen,
      AppRoutes.vendorDriverDetailsScreen,
      AppRoutes.vendorVehicleDetailsScreen,
      AppRoutes.vendorAssignmentTimelineScreen,
      AppRoutes.vendorCancelAssignmentScreen,
      AppRoutes.vendorTripsScreen,
      AppRoutes.vendorActiveTripScreen,
      AppRoutes.vendorTripDetailsUpcomingScreen,
      AppRoutes.vendorTripDetailsAssignedScreen,
      AppRoutes.vendorTripDetailsEnRouteScreen,
      AppRoutes.vendorTripDetailsArrivedScreen,
      AppRoutes.vendorTripDetailsStartedScreen,
      AppRoutes.vendorTripDetailsInProgressScreen,
      AppRoutes.vendorTripDetailsCompletedScreen,
      AppRoutes.vendorTripDetailsCancelledScreen,
      AppRoutes.vendorPassengerNoShowScreen,
      AppRoutes.vendorTripTimelineActivityScreen,
      AppRoutes.vendorTripHistoryScreen,
      AppRoutes.vendorHistoricalTripDetailsScreen,
      AppRoutes.vendorPaymentsScreen,
      AppRoutes.vendorPaymentHistoryScreen,
      AppRoutes.vendorPaymentDetailsScreen,
      AppRoutes.vendorPaymentPendingScreen,
      AppRoutes.vendorPaymentProcessingScreen,
      AppRoutes.vendorPaymentSuccessfulScreen,
      AppRoutes.vendorPaymentFailedScreen,
      AppRoutes.vendorProfileScreen,
      AppRoutes.vendorProfileExtendedScreen,
      AppRoutes.vendorCompanyInformationScreen,
      AppRoutes.vendorContactInformationScreen,
      AppRoutes.vendorAccountStatusScreen,
      AppRoutes.vendorNotificationSettingsScreen,
      AppRoutes.vendorSupportCenterScreen,
      AppRoutes.vendorHelpFaqScreen,
      AppRoutes.vendorRaiseIssueScreen,
      AppRoutes.vendorTicketDetailsOpenScreen,
      AppRoutes.vendorTicketDetailsInProgressScreen,
      AppRoutes.vendorTicketDetailsResolvedScreen,
      AppRoutes.vendorAppSettingsScreen,
    };

    if (publicRoutes.contains(currentPath)) {
      return null;
    }

    if (!isLoggedIn) {
      return AppRoutes.signInScreen;
    }

    return null;
  },
  routes: [
    GoRoute(
      path: AppRoutes.splashScreen,
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: AppRoutes.languageSelectionScreen,
      builder: (context, state) => const LanguageSelectionScreen(),
    ),
    GoRoute(
      path: AppRoutes.signInScreen,
      builder: (context, state) => const SignInScreen(),
    ),
    GoRoute(
      path: AppRoutes.loginOtpScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return LoginOtpScreen(
          phone: extra['phone'],
          email: extra['email'],
          role: extra['role'] ?? 'DRIVER',
          isRegister: extra['isRegister'] ?? false,
        );
      },
    ),
    GoRoute(
      path: AppRoutes.signUpScreen,
      builder: (context, state) => const SignUpScreen(),
    ),
    GoRoute(
      path: AppRoutes.setPasswordScreen,
      builder: (context, state) => const SetPasswordScreen(),
    ),
    GoRoute(
      path: AppRoutes.forgotPasswordScreen,
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: AppRoutes.forgotPasswordOtpScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ForgotPasswordOtpScreen(
          phone: extra['phone'] ?? '+91 98765 43210',
        );
      },
    ),
    GoRoute(
      path: AppRoutes.resetPasswordScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ResetPasswordScreen(
          phone: extra['phone'] ?? '+91 98765 43210',
          otp: extra['otp'],
        );
      },
    ),
    GoRoute(
      path: AppRoutes.chooseRoleScreen,
      builder: (context, state) => const ChooseRoleScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboardingPersonalScreen,
      builder: (context, state) => const OnboardingPersonalScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboardingVehicleScreen,
      builder: (context, state) => const OnboardingVehicleScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboardingDocumentsScreen,
      builder: (context, state) => const OnboardingDocumentsScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboardingReviewScreen,
      builder: (context, state) => const OnboardingReviewScreen(),
    ),
    GoRoute(
      path: AppRoutes.welcomeSuccessScreen,
      builder: (context, state) => const WelcomeSuccessScreen(),
    ),
    GoRoute(
      path: AppRoutes.waitlistGateScreen,
      builder: (context, state) => const WaitlistGateScreen(),
    ),
    GoRoute(
      path: AppRoutes.kycUploadScreen,
      builder: (context, state) => const KycUploadScreen(),
    ),
    GoRoute(
      path: AppRoutes.notificationsFeedScreen,
      builder: (context, state) => const NotificationsFeedScreen(),
    ),

    // ── Profile & Settings Sub-Routes ─────────────────────────────────────────
    GoRoute(
      path: AppRoutes.personalInfoScreen,
      builder: (context, state) => const PersonalInformationScreen(),
    ),
    GoRoute(
      path: AppRoutes.editPersonalInfoScreen,
      builder: (context, state) => const EditPersonalInfoScreen(),
    ),
    GoRoute(
      path: AppRoutes.myVehicleScreen,
      builder: (context, state) => const MyVehicleScreen(),
    ),
    GoRoute(
      path: AppRoutes.addVehicleScreen,
      builder: (context, state) => const AddVehicleScreen(),
    ),
    GoRoute(
      path: AppRoutes.kycVerificationScreen,
      builder: (context, state) => const KycVerificationScreen(),
    ),
    GoRoute(
      path: AppRoutes.documentDetailsScreen,
      builder: (context, state) => const DocumentDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.accountStatusScreen,
      builder: (context, state) => const AccountStatusScreen(),
    ),
    GoRoute(
      path: AppRoutes.notificationsSettingsScreen,
      builder: (context, state) => const NotificationsSettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.helpSupportScreen,
      builder: (context, state) => const HelpSupportScreen(),
    ),
    GoRoute(
      path: AppRoutes.appSettingsScreen,
      builder: (context, state) => const AppSettingsScreen(),
    ),

    // ── 4 Earnings & Financial Routes ────────────────────────────────────────
    GoRoute(
      path: AppRoutes.earningsTransactionsScreen,
      builder: (context, state) => const EarningsTransactionsScreen(),
    ),
    GoRoute(
      path: AppRoutes.earningsWithdrawScreen,
      builder: (context, state) => const EarningsWithdrawScreen(),
    ),
    GoRoute(
      path: AppRoutes.earningsWithdrawalDetailsScreen,
      builder: (context, state) => const EarningsWithdrawalDetailsScreen(),
    ),

    // ── Trips & Operations Detail Routes ─────────────────────────────────────
    GoRoute(
      path: AppRoutes.tripDetailsScreen,
      builder: (context, state) => const TripDetailsScreen(),
    ),

    // ── Opportunities & Trip Dispatch Detail Routes ─────────────────────────
    GoRoute(
      path: AppRoutes.opportunityDetailsScreen,
      builder: (context, state) => const OpportunityDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.opportunityOfferScreen,
      builder: (context, state) => const OpportunityOfferScreen(),
    ),

    // ── 20 Vendor Screen Routes ──────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.vendorHomeScreen,
      builder: (context, state) => const VendorHomeScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementsScreen,
      builder: (context, state) => const VendorRequirementsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCreateRequirementScreen,
      builder: (context, state) => const VendorCreateRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCreateRequirementStep2Screen,
      builder: (context, state) => const VendorCreateRequirementStep2Screen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCreateRequirementStep3Screen,
      builder: (context, state) => const VendorCreateRequirementStep3Screen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCreateRequirementStep4Screen,
      builder: (context, state) => const VendorCreateRequirementStep4Screen(),
    ),
    GoRoute(
      path: AppRoutes.vendorReviewRequirementScreen,
      builder: (context, state) => const VendorReviewRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementPostedConfirmationScreen,
      builder: (context, state) => const VendorRequirementPostedConfirmationScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorDraftRequirementsScreen,
      builder: (context, state) => const VendorDraftRequirementsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorEditRequirementScreen,
      builder: (context, state) => const VendorEditRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorBulkPostingScreen,
      builder: (context, state) => const VendorBulkPostingScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorReviewBulkPostingScreen,
      builder: (context, state) => const VendorReviewBulkPostingScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementDetailsScreen,
      builder: (context, state) => const VendorRequirementDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorFulfillmentStatusScreen,
      builder: (context, state) => const VendorFulfillmentStatusScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorFulfillmentOverviewScreen,
      builder: (context, state) => const VendorFulfillmentOverviewScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorDriverMatchingScreen,
      builder: (context, state) => const VendorDriverMatchingScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementStatusSearchingScreen,
      builder: (context, state) => const VendorRequirementStatusScreen(initialState: RequirementFulfillmentState.searching),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementStatusFulfilledScreen,
      builder: (context, state) => const VendorRequirementStatusScreen(initialState: RequirementFulfillmentState.fulfilled),
    ),
    GoRoute(
      path: AppRoutes.vendorRequirementStatusFailedScreen,
      builder: (context, state) => const VendorRequirementStatusScreen(initialState: RequirementFulfillmentState.failed),
    ),
    GoRoute(
      path: AppRoutes.vendorDriverAssignmentsListScreen,
      builder: (context, state) => const VendorDriverAssignmentsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorDriverDetailsScreen,
      builder: (context, state) => const VendorDriverDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorVehicleDetailsScreen,
      builder: (context, state) => const VendorVehicleDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorAssignmentTimelineScreen,
      builder: (context, state) => const VendorAssignmentTimelineScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCancelAssignmentScreen,
      builder: (context, state) => const VendorCancelAssignmentScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorTripsScreen,
      builder: (context, state) => const VendorTripsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorActiveTripScreen,
      builder: (context, state) => const VendorActiveTripScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsUpcomingScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.upcoming),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsAssignedScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.assigned),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsEnRouteScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.enRoute),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsArrivedScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.arrived),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsStartedScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.started),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsInProgressScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.inProgress),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsCompletedScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.completed),
    ),
    GoRoute(
      path: AppRoutes.vendorTripDetailsCancelledScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.cancelled),
    ),
    GoRoute(
      path: AppRoutes.vendorPassengerNoShowScreen,
      builder: (context, state) => const VendorTripDetailsScreen(initialStatus: TripStatusState.noShow),
    ),
    GoRoute(
      path: AppRoutes.vendorTripTimelineActivityScreen,
      builder: (context, state) => const VendorTripTimelineActivityScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorTripHistoryScreen,
      builder: (context, state) => const VendorTripHistoryScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorHistoricalTripDetailsScreen,
      builder: (context, state) => const VendorHistoricalTripDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentsScreen,
      builder: (context, state) => const VendorPaymentsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentHistoryScreen,
      builder: (context, state) => const VendorPaymentHistoryScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentDetailsScreen,
      builder: (context, state) => const VendorPaymentDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentPendingScreen,
      builder: (context, state) => const VendorPaymentStatusScreen(initialState: PaymentResultState.pending),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentProcessingScreen,
      builder: (context, state) => const VendorPaymentStatusScreen(initialState: PaymentResultState.processing),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentSuccessfulScreen,
      builder: (context, state) => const VendorPaymentStatusScreen(initialState: PaymentResultState.successful),
    ),
    GoRoute(
      path: AppRoutes.vendorPaymentFailedScreen,
      builder: (context, state) => const VendorPaymentStatusScreen(initialState: PaymentResultState.failed),
    ),
    GoRoute(
      path: AppRoutes.vendorProfileScreen,
      builder: (context, state) => const VendorProfileScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorProfileExtendedScreen,
      builder: (context, state) => const VendorProfileExtendedScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorCompanyInformationScreen,
      builder: (context, state) => const VendorCompanyInformationScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorContactInformationScreen,
      builder: (context, state) => const VendorContactInformationScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorAccountStatusScreen,
      builder: (context, state) => const VendorAccountStatusScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorNotificationSettingsScreen,
      builder: (context, state) => const VendorNotificationSettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorSupportCenterScreen,
      builder: (context, state) => const VendorSupportCenterScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorHelpFaqScreen,
      builder: (context, state) => const VendorHelpFaqScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorRaiseIssueScreen,
      builder: (context, state) => const VendorRaiseIssueScreen(),
    ),
    GoRoute(
      path: AppRoutes.vendorTicketDetailsOpenScreen,
      builder: (context, state) => const VendorTicketDetailsScreen(initialState: TicketStatusState.open),
    ),
    GoRoute(
      path: AppRoutes.vendorTicketDetailsInProgressScreen,
      builder: (context, state) => const VendorTicketDetailsScreen(initialState: TicketStatusState.inProgress),
    ),
    GoRoute(
      path: AppRoutes.vendorTicketDetailsResolvedScreen,
      builder: (context, state) => const VendorTicketDetailsScreen(initialState: TicketStatusState.resolved),
    ),
    GoRoute(
      path: AppRoutes.vendorAppSettingsScreen,
      builder: (context, state) => const VendorAppSettingsScreen(),
    ),

    // ── 10 Global States Gallery Route ───────────────────────────────────────
    GoRoute(
      path: AppRoutes.globalStateGalleryScreen,
      builder: (context, state) => const GlobalStateGalleryScreen(),
    ),

    // ── Core Operations Shell (Home, Opportunities, Trips, Earnings, Profile) 
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppScaffold(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.homeScreen,
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.opportunitiesScreen,
              builder: (context, state) => const OpportunitiesScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.tripsScreen,
              builder: (context, state) => const TripsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.walletScreen,
              builder: (context, state) => const EarningsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.profileScreen,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);