import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../presentation/01_splash_screen/splash_screen.dart';
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
import '../user/home/user_home_screen.dart';
import '../user/requirements/user_requirements_list_screen.dart';
import '../user/requirements/user_create_requirement_screen.dart';
import '../user/requirements/user_create_requirement_step2_screen.dart';
import '../user/requirements/user_create_requirement_step3_screen.dart';
import '../user/requirements/user_create_requirement_step4_screen.dart';
import '../user/requirements/user_review_requirement_screen.dart';
import '../user/requirements/user_requirement_posted_confirmation_screen.dart';
import '../user/requirements/user_draft_requirements_screen.dart';
import '../user/requirements/user_edit_requirement_screen.dart';
import '../user/requirements/user_bulk_posting_screen.dart';
import '../user/requirements/user_review_bulk_posting_screen.dart';
import '../user/requirements/user_requirement_details_screen.dart';
import '../user/fulfillment/user_fulfillment_status_screen.dart';
import '../user/fulfillment/user_fulfillment_overview_screen.dart';
import '../user/fulfillment/user_driver_matching_screen.dart';
import '../user/fulfillment/user_requirement_status_screen.dart';
import '../user/fulfillment/user_driver_assignments_list_screen.dart';
import '../user/fulfillment/user_driver_details_screen.dart';
import '../user/fulfillment/user_vehicle_details_screen.dart';
import '../user/fulfillment/user_assignment_timeline_screen.dart';
import '../user/fulfillment/user_cancel_assignment_screen.dart';
import '../user/trips/user_trips_list_screen.dart';
import '../user/trips/user_active_trip_screen.dart';
import '../user/trips/user_trip_details_screen.dart';
import '../user/trips/user_trip_timeline_activity_screen.dart';
import '../user/trips/user_trip_history_screen.dart';
import '../user/trips/user_historical_trip_details_screen.dart';
import '../user/payments/user_payments_screen.dart';
import '../user/payments/user_payment_history_screen.dart';
import '../user/payments/user_payment_details_screen.dart';
import '../user/payments/user_payment_status_screen.dart';
import '../user/profile/user_profile_screen.dart';
import '../user/profile/user_profile_extended_screen.dart';
import '../user/profile/user_company_information_screen.dart';
import '../user/profile/user_contact_information_screen.dart';
import '../user/profile/user_account_status_screen.dart';
import '../user/profile/user_notification_settings_screen.dart';
import '../user/profile/user_app_settings_screen.dart';
import '../user/support/user_support_center_screen.dart';
import '../user/support/user_help_faq_screen.dart';
import '../user/support/user_raise_issue_screen.dart';
import '../user/support/user_ticket_details_screen.dart';

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

  // ── 60 User / Booker Screen Routes (Outstation & Bulk Travel) ─────────────
  static const String userHomeScreen = '/user/home';
  static const String userRequirementsScreen = '/user/requirements';
  static const String userCreateRequirementScreen = '/user/requirements/create';
  static const String userCreateRequirementStep2Screen = '/user/requirements/create-step2';
  static const String userCreateRequirementStep3Screen = '/user/requirements/create-step3';
  static const String userCreateRequirementStep4Screen = '/user/requirements/create-step4';
  static const String userReviewRequirementScreen = '/user/requirements/review';
  static const String userRequirementPostedConfirmationScreen = '/user/requirements/posted-confirmation';
  static const String userDraftRequirementsScreen = '/user/requirements/drafts';
  static const String userEditRequirementScreen = '/user/requirements/edit';
  static const String userBulkPostingScreen = '/user/requirements/bulk-posting';
  static const String userReviewBulkPostingScreen = '/user/requirements/review-bulk';
  static const String userRequirementDetailsScreen = '/user/requirements/details';
  static const String userFulfillmentStatusScreen = '/user/fulfillment/status';
  static const String userFulfillmentOverviewScreen = '/user/fulfillment/overview';
  static const String userDriverMatchingScreen = '/user/fulfillment/driver-matching';
  static const String userRequirementStatusSearchingScreen = '/user/fulfillment/status-searching';
  static const String userRequirementStatusFulfilledScreen = '/user/fulfillment/status-fulfilled';
  static const String userRequirementStatusFailedScreen = '/user/fulfillment/status-failed';
  static const String userDriverAssignmentsListScreen = '/user/fulfillment/driver-assignments';
  static const String userDriverDetailsScreen = '/user/fulfillment/driver-details';
  static const String userVehicleDetailsScreen = '/user/fulfillment/vehicle-details';
  static const String userAssignmentTimelineScreen = '/user/fulfillment/assignment-timeline';
  static const String userCancelAssignmentScreen = '/user/fulfillment/cancel-assignment';
  static const String userTripsScreen = '/user/trips';
  static const String userActiveTripScreen = '/user/trips/active';
  static const String userTripDetailsUpcomingScreen = '/user/trips/details-upcoming';
  static const String userTripDetailsAssignedScreen = '/user/trips/details-assigned';
  static const String userTripDetailsEnRouteScreen = '/user/trips/details-enroute';
  static const String userTripDetailsArrivedScreen = '/user/trips/details-arrived';
  static const String userTripDetailsStartedScreen = '/user/trips/details-started';
  static const String userTripDetailsInProgressScreen = '/user/trips/details-inprogress';
  static const String userTripDetailsCompletedScreen = '/user/trips/details-completed';
  static const String userTripDetailsCancelledScreen = '/user/trips/details-cancelled';
  static const String userPassengerNoShowScreen = '/user/trips/details-noshow';
  static const String userTripTimelineActivityScreen = '/user/trips/timeline-activity';
  static const String userTripHistoryScreen = '/user/trips/history';
  static const String userHistoricalTripDetailsScreen = '/user/trips/historical-details';
  static const String userPaymentsScreen = '/user/payments';
  static const String userPaymentHistoryScreen = '/user/payments/history';
  static const String userPaymentDetailsScreen = '/user/payments/details';
  static const String userPaymentPendingScreen = '/user/payments/pending';
  static const String userPaymentProcessingScreen = '/user/payments/processing';
  static const String userPaymentSuccessfulScreen = '/user/payments/successful';
  static const String userPaymentFailedScreen = '/user/payments/failed';
  static const String userProfileScreen = '/user/profile';
  static const String userProfileExtendedScreen = '/user/profile/extended';
  static const String userCompanyInformationScreen = '/user/profile/company-info';
  static const String userContactInformationScreen = '/user/profile/contact-info';
  static const String userAccountStatusScreen = '/user/profile/account-status';
  static const String userNotificationSettingsScreen = '/user/profile/notifications-settings';
  static const String userSupportCenterScreen = '/user/support/center';
  static const String userHelpFaqScreen = '/user/support/faq';
  static const String userRaiseIssueScreen = '/user/support/raise-issue';
  static const String userTicketDetailsOpenScreen = '/user/support/ticket-open';
  static const String userTicketDetailsInProgressScreen = '/user/support/ticket-inprogress';
  static const String userTicketDetailsResolvedScreen = '/user/support/ticket-resolved';
  static const String userAppSettingsScreen = '/user/profile/settings';

  // Backward compatibility aliases
  static const String vendorHomeScreen = userHomeScreen;
  static const String vendorRequirementsScreen = userRequirementsScreen;
  static const String vendorCreateRequirementScreen = userCreateRequirementScreen;
  static const String vendorCreateRequirementStep2Screen = userCreateRequirementStep2Screen;
  static const String vendorCreateRequirementStep3Screen = userCreateRequirementStep3Screen;
  static const String vendorCreateRequirementStep4Screen = userCreateRequirementStep4Screen;
  static const String vendorReviewRequirementScreen = userReviewRequirementScreen;
  static const String vendorRequirementPostedConfirmationScreen = userRequirementPostedConfirmationScreen;
  static const String vendorDraftRequirementsScreen = userDraftRequirementsScreen;
  static const String vendorEditRequirementScreen = userEditRequirementScreen;
  static const String vendorBulkPostingScreen = userBulkPostingScreen;
  static const String vendorReviewBulkPostingScreen = userReviewBulkPostingScreen;
  static const String vendorRequirementDetailsScreen = userRequirementDetailsScreen;
  static const String vendorFulfillmentStatusScreen = userFulfillmentStatusScreen;
  static const String vendorFulfillmentOverviewScreen = userFulfillmentOverviewScreen;
  static const String vendorDriverMatchingScreen = userDriverMatchingScreen;
  static const String vendorRequirementStatusSearchingScreen = userRequirementStatusSearchingScreen;
  static const String vendorRequirementStatusFulfilledScreen = userRequirementStatusFulfilledScreen;
  static const String vendorRequirementStatusFailedScreen = userRequirementStatusFailedScreen;
  static const String vendorDriverAssignmentsListScreen = userDriverAssignmentsListScreen;
  static const String vendorDriverDetailsScreen = userDriverDetailsScreen;
  static const String vendorVehicleDetailsScreen = userVehicleDetailsScreen;
  static const String vendorAssignmentTimelineScreen = userAssignmentTimelineScreen;
  static const String vendorCancelAssignmentScreen = userCancelAssignmentScreen;
  static const String vendorTripsScreen = userTripsScreen;
  static const String vendorActiveTripScreen = userActiveTripScreen;
  static const String vendorTripDetailsUpcomingScreen = userTripDetailsUpcomingScreen;
  static const String vendorTripDetailsAssignedScreen = userTripDetailsAssignedScreen;
  static const String vendorTripDetailsEnRouteScreen = userTripDetailsEnRouteScreen;
  static const String vendorTripDetailsArrivedScreen = userTripDetailsArrivedScreen;
  static const String vendorTripDetailsStartedScreen = userTripDetailsStartedScreen;
  static const String vendorTripDetailsInProgressScreen = userTripDetailsInProgressScreen;
  static const String vendorTripDetailsCompletedScreen = userTripDetailsCompletedScreen;
  static const String vendorTripDetailsCancelledScreen = userTripDetailsCancelledScreen;
  static const String vendorPassengerNoShowScreen = userPassengerNoShowScreen;
  static const String vendorTripTimelineActivityScreen = userTripTimelineActivityScreen;
  static const String vendorTripHistoryScreen = userTripHistoryScreen;
  static const String vendorHistoricalTripDetailsScreen = userHistoricalTripDetailsScreen;
  static const String vendorPaymentsScreen = userPaymentsScreen;
  static const String vendorPaymentHistoryScreen = userPaymentHistoryScreen;
  static const String vendorPaymentDetailsScreen = userPaymentDetailsScreen;
  static const String vendorPaymentPendingScreen = userPaymentPendingScreen;
  static const String vendorPaymentProcessingScreen = userPaymentProcessingScreen;
  static const String vendorPaymentSuccessfulScreen = userPaymentSuccessfulScreen;
  static const String vendorPaymentFailedScreen = userPaymentFailedScreen;
  static const String vendorProfileScreen = userProfileScreen;
  static const String vendorProfileExtendedScreen = userProfileExtendedScreen;
  static const String vendorCompanyInformationScreen = userCompanyInformationScreen;
  static const String vendorContactInformationScreen = userContactInformationScreen;
  static const String vendorAccountStatusScreen = userAccountStatusScreen;
  static const String vendorNotificationSettingsScreen = userNotificationSettingsScreen;
  static const String vendorSupportCenterScreen = userSupportCenterScreen;
  static const String vendorHelpFaqScreen = userHelpFaqScreen;
  static const String vendorRaiseIssueScreen = userRaiseIssueScreen;
  static const String vendorTicketDetailsOpenScreen = userTicketDetailsOpenScreen;
  static const String vendorTicketDetailsInProgressScreen = userTicketDetailsInProgressScreen;
  static const String vendorTicketDetailsResolvedScreen = userTicketDetailsResolvedScreen;
  static const String vendorAppSettingsScreen = userAppSettingsScreen;
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.splashScreen,
  redirect: (BuildContext context, GoRouterState state) async {
    final user = AuthService.instance.currentUser;
    final isLoggedIn = user != null;
    final currentPath = state.matchedLocation;

    // Automatic redirect from legacy /vendor/* paths to /user/*
    if (currentPath.startsWith('/vendor/')) {
      return currentPath.replaceFirst('/vendor/', '/user/');
    }

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
      AppRoutes.userHomeScreen,
      AppRoutes.userRequirementsScreen,
      AppRoutes.userCreateRequirementScreen,
      AppRoutes.userCreateRequirementStep2Screen,
      AppRoutes.userCreateRequirementStep3Screen,
      AppRoutes.userCreateRequirementStep4Screen,
      AppRoutes.userReviewRequirementScreen,
      AppRoutes.userRequirementPostedConfirmationScreen,
      AppRoutes.userDraftRequirementsScreen,
      AppRoutes.userEditRequirementScreen,
      AppRoutes.userBulkPostingScreen,
      AppRoutes.userReviewBulkPostingScreen,
      AppRoutes.userRequirementDetailsScreen,
      AppRoutes.userFulfillmentStatusScreen,
      AppRoutes.userFulfillmentOverviewScreen,
      AppRoutes.userDriverMatchingScreen,
      AppRoutes.userRequirementStatusSearchingScreen,
      AppRoutes.userRequirementStatusFulfilledScreen,
      AppRoutes.userRequirementStatusFailedScreen,
      AppRoutes.userDriverAssignmentsListScreen,
      AppRoutes.userDriverDetailsScreen,
      AppRoutes.userVehicleDetailsScreen,
      AppRoutes.userAssignmentTimelineScreen,
      AppRoutes.userCancelAssignmentScreen,
      AppRoutes.userTripsScreen,
      AppRoutes.userActiveTripScreen,
      AppRoutes.userTripDetailsUpcomingScreen,
      AppRoutes.userTripDetailsAssignedScreen,
      AppRoutes.userTripDetailsEnRouteScreen,
      AppRoutes.userTripDetailsArrivedScreen,
      AppRoutes.userTripDetailsStartedScreen,
      AppRoutes.userTripDetailsInProgressScreen,
      AppRoutes.userTripDetailsCompletedScreen,
      AppRoutes.userTripDetailsCancelledScreen,
      AppRoutes.userPassengerNoShowScreen,
      AppRoutes.userTripTimelineActivityScreen,
      AppRoutes.userTripHistoryScreen,
      AppRoutes.userHistoricalTripDetailsScreen,
      AppRoutes.userPaymentsScreen,
      AppRoutes.userPaymentHistoryScreen,
      AppRoutes.userPaymentDetailsScreen,
      AppRoutes.userPaymentPendingScreen,
      AppRoutes.userPaymentProcessingScreen,
      AppRoutes.userPaymentSuccessfulScreen,
      AppRoutes.userPaymentFailedScreen,
      AppRoutes.userProfileScreen,
      AppRoutes.userProfileExtendedScreen,
      AppRoutes.userCompanyInformationScreen,
      AppRoutes.userContactInformationScreen,
      AppRoutes.userAccountStatusScreen,
      AppRoutes.userNotificationSettingsScreen,
      AppRoutes.userSupportCenterScreen,
      AppRoutes.userHelpFaqScreen,
      AppRoutes.userRaiseIssueScreen,
      AppRoutes.userTicketDetailsOpenScreen,
      AppRoutes.userTicketDetailsInProgressScreen,
      AppRoutes.userTicketDetailsResolvedScreen,
      AppRoutes.userAppSettingsScreen,
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
      redirect: (context, state) => AppRoutes.signInScreen,
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
      path: AppRoutes.kycUploadScreen,
      builder: (context, state) => const KycUploadScreen(),
    ),
    GoRoute(
      path: AppRoutes.waitlistGateScreen,
      builder: (context, state) => const WaitlistGateScreen(),
    ),
    GoRoute(
      path: AppRoutes.notificationsFeedScreen,
      builder: (context, state) => const NotificationsFeedScreen(),
    ),

    // ── Profile & Settings Detail Routes ─────────────────────────────────────
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

    // ── 60 User / Booker Screen Routes ───────────────────────────────────────
    GoRoute(
      path: AppRoutes.userHomeScreen,
      builder: (context, state) => const UserHomeScreen(),
    ),
    GoRoute(
      path: AppRoutes.userRequirementsScreen,
      builder: (context, state) => const UserRequirementsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.userCreateRequirementScreen,
      builder: (context, state) => const UserCreateRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.userCreateRequirementStep2Screen,
      builder: (context, state) => const UserCreateRequirementStep2Screen(),
    ),
    GoRoute(
      path: AppRoutes.userCreateRequirementStep3Screen,
      builder: (context, state) => const UserCreateRequirementStep3Screen(),
    ),
    GoRoute(
      path: AppRoutes.userCreateRequirementStep4Screen,
      builder: (context, state) => const UserCreateRequirementStep4Screen(),
    ),
    GoRoute(
      path: AppRoutes.userReviewRequirementScreen,
      builder: (context, state) => const UserReviewRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.userRequirementPostedConfirmationScreen,
      builder: (context, state) => const UserRequirementPostedConfirmationScreen(),
    ),
    GoRoute(
      path: AppRoutes.userDraftRequirementsScreen,
      builder: (context, state) => const UserDraftRequirementsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userEditRequirementScreen,
      builder: (context, state) => const UserEditRequirementScreen(),
    ),
    GoRoute(
      path: AppRoutes.userBulkPostingScreen,
      builder: (context, state) => const UserBulkPostingScreen(),
    ),
    GoRoute(
      path: AppRoutes.userReviewBulkPostingScreen,
      builder: (context, state) => const UserReviewBulkPostingScreen(),
    ),
    GoRoute(
      path: AppRoutes.userRequirementDetailsScreen,
      builder: (context, state) => const UserRequirementDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userFulfillmentStatusScreen,
      builder: (context, state) => const UserFulfillmentStatusScreen(),
    ),
    GoRoute(
      path: AppRoutes.userFulfillmentOverviewScreen,
      builder: (context, state) => const UserFulfillmentOverviewScreen(),
    ),
    GoRoute(
      path: AppRoutes.userDriverMatchingScreen,
      builder: (context, state) => const UserDriverMatchingScreen(),
    ),
    GoRoute(
      path: AppRoutes.userRequirementStatusSearchingScreen,
      builder: (context, state) => const UserRequirementStatusScreen(initialState: RequirementFulfillmentState.searching),
    ),
    GoRoute(
      path: AppRoutes.userRequirementStatusFulfilledScreen,
      builder: (context, state) => const UserRequirementStatusScreen(initialState: RequirementFulfillmentState.fulfilled),
    ),
    GoRoute(
      path: AppRoutes.userRequirementStatusFailedScreen,
      builder: (context, state) => const UserRequirementStatusScreen(initialState: RequirementFulfillmentState.failed),
    ),
    GoRoute(
      path: AppRoutes.userDriverAssignmentsListScreen,
      builder: (context, state) => const UserDriverAssignmentsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.userDriverDetailsScreen,
      builder: (context, state) => const UserDriverDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userVehicleDetailsScreen,
      builder: (context, state) => const UserVehicleDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userAssignmentTimelineScreen,
      builder: (context, state) => const UserAssignmentTimelineScreen(),
    ),
    GoRoute(
      path: AppRoutes.userCancelAssignmentScreen,
      builder: (context, state) => const UserCancelAssignmentScreen(),
    ),
    GoRoute(
      path: AppRoutes.userTripsScreen,
      builder: (context, state) => const UserTripsListScreen(),
    ),
    GoRoute(
      path: AppRoutes.userActiveTripScreen,
      builder: (context, state) => const UserActiveTripScreen(),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsUpcomingScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.upcoming),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsAssignedScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.assigned),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsEnRouteScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.enRoute),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsArrivedScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.arrived),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsStartedScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.started),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsInProgressScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.inProgress),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsCompletedScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.completed),
    ),
    GoRoute(
      path: AppRoutes.userTripDetailsCancelledScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.cancelled),
    ),
    GoRoute(
      path: AppRoutes.userPassengerNoShowScreen,
      builder: (context, state) => const UserTripDetailsScreen(initialStatus: TripStatusState.noShow),
    ),
    GoRoute(
      path: AppRoutes.userTripTimelineActivityScreen,
      builder: (context, state) => const UserTripTimelineActivityScreen(),
    ),
    GoRoute(
      path: AppRoutes.userTripHistoryScreen,
      builder: (context, state) => const UserTripHistoryScreen(),
    ),
    GoRoute(
      path: AppRoutes.userHistoricalTripDetailsScreen,
      builder: (context, state) => const UserHistoricalTripDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userPaymentsScreen,
      builder: (context, state) => const UserPaymentsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userPaymentHistoryScreen,
      builder: (context, state) => const UserPaymentHistoryScreen(),
    ),
    GoRoute(
      path: AppRoutes.userPaymentDetailsScreen,
      builder: (context, state) => const UserPaymentDetailsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userPaymentPendingScreen,
      builder: (context, state) => const UserPaymentStatusScreen(initialState: PaymentResultState.pending),
    ),
    GoRoute(
      path: AppRoutes.userPaymentProcessingScreen,
      builder: (context, state) => const UserPaymentStatusScreen(initialState: PaymentResultState.processing),
    ),
    GoRoute(
      path: AppRoutes.userPaymentSuccessfulScreen,
      builder: (context, state) => const UserPaymentStatusScreen(initialState: PaymentResultState.successful),
    ),
    GoRoute(
      path: AppRoutes.userPaymentFailedScreen,
      builder: (context, state) => const UserPaymentStatusScreen(initialState: PaymentResultState.failed),
    ),
    GoRoute(
      path: AppRoutes.userProfileScreen,
      builder: (context, state) => const UserProfileScreen(),
    ),
    GoRoute(
      path: AppRoutes.userProfileExtendedScreen,
      builder: (context, state) => const UserProfileExtendedScreen(),
    ),
    GoRoute(
      path: AppRoutes.userCompanyInformationScreen,
      builder: (context, state) => const UserCompanyInformationScreen(),
    ),
    GoRoute(
      path: AppRoutes.userContactInformationScreen,
      builder: (context, state) => const UserContactInformationScreen(),
    ),
    GoRoute(
      path: AppRoutes.userAccountStatusScreen,
      builder: (context, state) => const UserAccountStatusScreen(),
    ),
    GoRoute(
      path: AppRoutes.userNotificationSettingsScreen,
      builder: (context, state) => const UserNotificationSettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.userSupportCenterScreen,
      builder: (context, state) => const UserSupportCenterScreen(),
    ),
    GoRoute(
      path: AppRoutes.userHelpFaqScreen,
      builder: (context, state) => const UserHelpFaqScreen(),
    ),
    GoRoute(
      path: AppRoutes.userRaiseIssueScreen,
      builder: (context, state) => const UserRaiseIssueScreen(),
    ),
    GoRoute(
      path: AppRoutes.userTicketDetailsOpenScreen,
      builder: (context, state) => const UserTicketDetailsScreen(initialState: TicketStatusState.open),
    ),
    GoRoute(
      path: AppRoutes.userTicketDetailsInProgressScreen,
      builder: (context, state) => const UserTicketDetailsScreen(initialState: TicketStatusState.inProgress),
    ),
    GoRoute(
      path: AppRoutes.userTicketDetailsResolvedScreen,
      builder: (context, state) => const UserTicketDetailsScreen(initialState: TicketStatusState.resolved),
    ),
    GoRoute(
      path: AppRoutes.userAppSettingsScreen,
      builder: (context, state) => const UserAppSettingsScreen(),
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