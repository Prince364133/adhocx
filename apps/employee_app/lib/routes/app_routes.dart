import 'package:go_router/go_router.dart';

// Unified Feature-Sliced Screen Architecture
import '../features/features.dart';

class AppRoutes {
  AppRoutes._();

  // Batch 01 Routes
  static const String splash = '/';
  static const String welcome = '/welcome';
  static const String loginOptions = '/login-options';
  static const String mobileNumber = '/mobile-number';
  static const String otpVerify = '/otp-verify';
  static const String companySso = '/company-sso';
  static const String employeeVerified = '/employee-verified';
  static const String permissionLocation = '/permission-location';
  static const String permissionNotification = '/permission-notification';
  static const String onboardingSchedule = '/onboarding/schedule';
  static const String onboardingTracking = '/onboarding/tracking';
  static const String onboardingSafety = '/onboarding/safety';
  static const String onboardingComplete = '/onboarding/complete';
  static const String invalidOtp = '/error/invalid-otp';
  static const String transportUnavailable = '/error/transport-unavailable';
  static const String home = '/home';

  // Batch 02 Routes
  static const String homeUpcomingPickup = '/home/upcoming-pickup';
  static const String homeUpcomingDrop = '/home/upcoming-drop';
  static const String homeNoTrips = '/home/no-trips';
  static const String tripPlanning = '/trips/planning';
  static const String tripAssigned = '/trips/assigned';
  static const String tripApproaching = '/trips/approaching';
  static const String tripArrived = '/trips/arrived';
  static const String tripBoarded = '/trips/boarded';
  static const String tripInProgress = '/trips/in-progress';
  static const String tripCompleted = '/trips/completed';
  static const String tripCancelled = '/trips/cancelled';
  static const String tripUnserved = '/trips/unserved';
  static const String tripDetails = '/trips/details';
  static const String tripDriverVehicle = '/trips/driver-vehicle';

  // Batch 03 Routes
  static const String scheduleToday = '/schedule/today';
  static const String scheduleDaily = '/schedule/daily';
  static const String scheduleWeekly = '/schedule/weekly';
  static const String scheduleMonthly = '/schedule/monthly';
  static const String shiftDetailsLogin = '/schedule/shift-details';
  static const String shiftDetailsOvernight = '/schedule/overnight-shift';
  static const String scheduleNoTrips = '/schedule/no-trips';
  static const String requestChangeOptions = '/schedule/request-change';
  static const String changeDetails = '/schedule/change-details';
  static const String changeSubmitted = '/schedule/change-submitted';
  static const String requestPending = '/schedule/request-pending';
  static const String requestApproved = '/schedule/request-approved';
  static const String requestRejected = '/schedule/request-rejected';
  static const String cancelTrip = '/schedule/cancel-trip';

  // Batch 04 Routes
  static const String assignmentNotification = '/driver/assignment-notification';
  static const String cabAssignedOverview = '/driver/assigned-overview';
  static const String driverDetails = '/driver/details';
  static const String vehicleDetails = '/driver/vehicle-details';
  static const String pickupSequence = '/driver/pickup-sequence';
  static const String cabReassigned = '/driver/cab-reassigned';
  static const String assignmentDelayed = '/driver/assignment-delayed';
  static const String driverReplaced = '/driver/driver-replaced';
  static const String driverDelay = '/driver/driver-delay';
  static const String vehicleIssue = '/driver/vehicle-issue';
  static const String contactDriverSheet = '/driver/contact';
  static const String assignmentHistory = '/driver/assignment-history';
  static const String noCabAvailable = '/driver/no-cab-available';

  // Batch 05 Routes
  static const String liveTrackingOverview = '/tracking/overview';
  static const String tripLiveMapFull = '/tracking/map-full';
  static const String pickupPointDetails = '/tracking/pickup-point';
  static const String walkingDirections = '/tracking/walking-directions';
  static const String cabApproaching = '/tracking/cab-approaching';
  static const String cabArrived = '/tracking/cab-arrived';
  static const String tripProgressOnTrip = '/tracking/trip-progress';
  static const String routeAndStops = '/tracking/route-stops';
  static const String gpsUnavailable = '/tracking/gps-unavailable';
  static const String staleLocation = '/tracking/stale-location';
  static const String poorNetwork = '/tracking/poor-network';
  static const String reconnecting = '/tracking/reconnecting';

  // Batch 06 Routes
  static const String boardingVerifyOptions = '/boarding/verify-options';
  static const String boardingOtpInput = '/boarding/otp-input';
  static const String scanBoardingQr = '/boarding/scan-qr';
  static const String verifyingBoarding = '/boarding/verifying';
  static const String boardingSuccessful = '/boarding/success';
  static const String wrongOtp = '/boarding/wrong-otp';
  static const String boardingIssue = '/boarding/issue';
  static const String tripInProgressEnRoute = '/boarding/trip-in-progress';
  static const String dropReached = '/boarding/drop-reached';
  static const String tripCompletedSummary = '/boarding/trip-completed';
  static const String safeReachConfirmation = '/boarding/safe-reach';
  static const String postTripFeedback = '/boarding/feedback';

  // Batch 07 Routes
  static const String safetyOverview = '/safety/overview';
  static const String safetySos = '/safety/sos';
  static const String safetySosConfirmed = '/safety/sos-confirmed';
  static const String safetyTeamCall = '/safety/team-call';
  static const String safetyReportIncident = '/safety/report-incident';
  static const String safetyRaiseComplaint = '/safety/raise-complaint';
  static const String safetyLostProperty = '/safety/lost-property';
  static const String safetyMyRequests = '/safety/my-requests';
  static const String safetyRequestDetails = '/safety/request-details';
  static const String safetyRequestResolved = '/safety/request-resolved';
  static const String safetyEmergencyContacts = '/safety/emergency-contacts';
  static const String safetyTips = '/safety/tips';
  static const String safetyLiveChat = '/safety/live-chat';

  // Batch 08 Routes
  static const String historyOverview = '/history/overview';
  static const String historyDetails = '/history/details';
  static const String historyAnalytics = '/history/analytics';
  static const String historyFeedback = '/history/feedback';
  static const String notificationsCenter = '/notifications';
  static const String profileDetails = '/profile/details';
  static const String profileEdit = '/profile/edit';
  static const String settingsOverview = '/settings';
  static const String settingsLanguage = '/settings/language';
  static const String settingsNotifications = '/settings/notifications';
  static const String settingsPrivacy = '/settings/privacy';
  static const String aboutAdhocx = '/about';
  static const String logoutConfirm = '/logout-confirm';
  static const String deleteAccount = '/delete-account';

  // Route Aliases
  static const String safetyCenterOverview = safetyOverview;
  static const String sosActivate = safetySos;
  static const String sosAlertConfirmed = safetySosConfirmed;
  static const String reportIncident = safetyReportIncident;
  static const String raiseComplaint = safetyRaiseComplaint;
  static const String lostProperty = safetyLostProperty;
  static const String myRequestsTickets = safetyMyRequests;
  static const String requestDetailsTracking = safetyRequestDetails;
  static const String requestResolved = safetyRequestResolved;
  static const String emergencyContacts = safetyEmergencyContacts;
  static const String safetyTipsGuidelines = safetyTips;
  static const String liveSupportChat = safetyLiveChat;
  static const String tripHistoryOverview = historyOverview;
  static const String tripHistoryDetails = historyDetails;
  static const String tripSummaryAnalytics = historyAnalytics;
  static const String tripFeedbackForm = historyFeedback;
  static const String profileMyDetails = profileDetails;
  static const String editProfile = profileEdit;
  static const String notificationPreferences = settingsNotifications;
  static const String selectLanguage = settingsLanguage;
  static const String privacyData = settingsPrivacy;

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    routes: [
      // Batch 01
      GoRoute(path: splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: welcome, builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: loginOptions, redirect: (context, state) => mobileNumber),
      GoRoute(path: mobileNumber, builder: (context, state) => const MobileNumberScreen()),
      GoRoute(path: otpVerify, builder: (context, state) => const OtpVerificationScreen()),
      GoRoute(path: companySso, builder: (context, state) => const CompanySsoScreen()),
      GoRoute(path: employeeVerified, builder: (context, state) => const EmployeeVerificationScreen()),
      GoRoute(path: permissionLocation, builder: (context, state) => const LocationPermissionScreen()),
      GoRoute(path: permissionNotification, builder: (context, state) => const NotificationPermissionScreen()),
      GoRoute(path: onboardingSchedule, builder: (context, state) => const OnboardingScheduleScreen()),
      GoRoute(path: onboardingTracking, builder: (context, state) => const OnboardingTrackingScreen()),
      GoRoute(path: onboardingSafety, builder: (context, state) => const OnboardingSafetyScreen()),
      GoRoute(path: onboardingComplete, builder: (context, state) => const OnboardingCompleteScreen()),
      GoRoute(path: invalidOtp, builder: (context, state) => const InvalidOtpScreen()),
      GoRoute(path: transportUnavailable, builder: (context, state) => const TransportUnavailableScreen()),
      GoRoute(path: home, builder: (context, state) => const HomeScreenPlaceholder()),

      // Batch 02
      GoRoute(path: homeUpcomingPickup, builder: (context, state) => const HomeUpcomingPickupScreen()),
      GoRoute(path: homeUpcomingDrop, builder: (context, state) => const HomeUpcomingDropScreen()),
      GoRoute(path: homeNoTrips, builder: (context, state) => const HomeNoUpcomingTripScreen()),
      GoRoute(path: tripPlanning, builder: (context, state) => const TripPlanningScreen()),
      GoRoute(path: tripAssigned, builder: (context, state) => const TripAssignedScreen()),
      GoRoute(path: tripApproaching, builder: (context, state) => const TripApproachingScreen()),
      GoRoute(path: tripArrived, builder: (context, state) => const TripArrivedScreen()),
      GoRoute(path: tripBoarded, builder: (context, state) => const TripBoardedScreen()),
      GoRoute(path: tripInProgress, builder: (context, state) => const TripInProgressScreen()),
      GoRoute(path: tripCompleted, builder: (context, state) => const TripCompletedScreen()),
      GoRoute(path: tripCancelled, builder: (context, state) => const TripCancelledScreen()),
      GoRoute(path: tripUnserved, builder: (context, state) => const TripUnservedScreen()),
      GoRoute(path: tripDetails, builder: (context, state) => const TripDetailsCompletedScreen()),
      GoRoute(path: tripDriverVehicle, builder: (context, state) => const DriverVehicleDetailsScreen()),

      // Batch 03
      GoRoute(path: scheduleToday, builder: (context, state) => const ScheduleTodayOverviewScreen()),
      GoRoute(path: scheduleDaily, builder: (context, state) => const ScheduleDailyScreen()),
      GoRoute(path: scheduleWeekly, builder: (context, state) => const ScheduleWeeklyScreen()),
      GoRoute(path: scheduleMonthly, builder: (context, state) => const ScheduleMonthlyScreen()),
      GoRoute(path: shiftDetailsLogin, builder: (context, state) => const ShiftDetailsLoginScreen()),
      GoRoute(path: shiftDetailsOvernight, builder: (context, state) => const ShiftDetailsOvernightScreen()),
      GoRoute(path: scheduleNoTrips, builder: (context, state) => const ScheduleNoTripsScreen()),
      GoRoute(path: requestChangeOptions, builder: (context, state) => const RequestChangeOptionsScreen()),
      GoRoute(path: changeDetails, builder: (context, state) => const ChangeRequestDetailsScreen()),
      GoRoute(path: changeSubmitted, builder: (context, state) => const ChangeRequestSubmittedScreen()),
      GoRoute(path: requestPending, builder: (context, state) => const RequestStatusPendingScreen()),
      GoRoute(path: requestApproved, builder: (context, state) => const RequestStatusApprovedScreen()),
      GoRoute(path: requestRejected, builder: (context, state) => const RequestStatusRejectedScreen()),
      GoRoute(path: cancelTrip, builder: (context, state) => const CancelTripRequestScreen()),

      // Batch 04
      GoRoute(path: assignmentNotification, builder: (context, state) => const AssignmentNotificationScreen()),
      GoRoute(path: cabAssignedOverview, builder: (context, state) => const CabAssignedOverviewScreen()),
      GoRoute(path: driverDetails, builder: (context, state) => const DriverDetailsScreen()),
      GoRoute(path: vehicleDetails, builder: (context, state) => const VehicleDetailsScreen()),
      GoRoute(path: pickupSequence, builder: (context, state) => const PickupSequenceScreen()),
      GoRoute(path: cabReassigned, builder: (context, state) => const CabReassignedScreen()),
      GoRoute(path: assignmentDelayed, builder: (context, state) => const AssignmentDelayedScreen()),
      GoRoute(path: driverReplaced, builder: (context, state) => const DriverReplacedScreen()),
      GoRoute(path: driverDelay, builder: (context, state) => const DriverDelayScreen()),
      GoRoute(path: vehicleIssue, builder: (context, state) => const VehicleIssueScreen()),
      GoRoute(path: contactDriverSheet, builder: (context, state) => const ContactDriverSheetScreen()),
      GoRoute(path: assignmentHistory, builder: (context, state) => const AssignmentHistoryScreen()),
      GoRoute(path: noCabAvailable, builder: (context, state) => const NoCabAvailableScreen()),

      // Batch 05
      GoRoute(path: liveTrackingOverview, builder: (context, state) => const LiveTrackingOverviewScreen()),
      GoRoute(path: tripLiveMapFull, builder: (context, state) => const TripLiveMapFullScreen()),
      GoRoute(path: pickupPointDetails, builder: (context, state) => const PickupPointDetailsScreen()),
      GoRoute(path: walkingDirections, builder: (context, state) => const WalkingDirectionsScreen()),
      GoRoute(path: cabApproaching, builder: (context, state) => const CabApproachingScreen()),
      GoRoute(path: cabArrived, builder: (context, state) => const CabArrivedScreen()),
      GoRoute(path: tripProgressOnTrip, builder: (context, state) => const TripProgressOnTripScreen()),
      GoRoute(path: routeAndStops, builder: (context, state) => const RouteAndStopsScreen()),
      GoRoute(path: gpsUnavailable, builder: (context, state) => const GpsUnavailableScreen()),
      GoRoute(path: staleLocation, builder: (context, state) => const StaleLocationScreen()),
      GoRoute(path: poorNetwork, builder: (context, state) => const PoorNetworkScreen()),
      GoRoute(path: reconnecting, builder: (context, state) => const ReconnectingScreen()),

      // Batch 06
      GoRoute(path: boardingVerifyOptions, builder: (context, state) => const BoardingVerifyOptionsScreen()),
      GoRoute(path: boardingOtpInput, builder: (context, state) => const BoardingOtpInputScreen()),
      GoRoute(path: scanBoardingQr, builder: (context, state) => const ScanBoardingQrScreen()),
      GoRoute(path: verifyingBoarding, builder: (context, state) => const VerifyingBoardingScreen()),
      GoRoute(path: boardingSuccessful, builder: (context, state) => const BoardingSuccessfulScreen()),
      GoRoute(path: wrongOtp, builder: (context, state) => const WrongOtpScreen()),
      GoRoute(path: boardingIssue, builder: (context, state) => const BoardingIssueScreen()),
      GoRoute(path: tripInProgressEnRoute, builder: (context, state) => const TripInProgressEnRouteScreen()),
      GoRoute(path: dropReached, builder: (context, state) => const DropReachedScreen()),
      GoRoute(path: tripCompletedSummary, builder: (context, state) => const TripCompletedSummaryScreen()),
      GoRoute(path: safeReachConfirmation, builder: (context, state) => const SafeReachConfirmationScreen()),
      GoRoute(path: postTripFeedback, builder: (context, state) => const PostTripFeedbackScreen()),

      // Batch 07
      GoRoute(path: safetyOverview, builder: (context, state) => const SafetyCenterOverviewScreen()),
      GoRoute(path: safetySos, builder: (context, state) => const SosActivateScreen()),
      GoRoute(path: safetySosConfirmed, builder: (context, state) => const SosAlertConfirmedScreen()),
      GoRoute(path: safetyTeamCall, builder: (context, state) => const SafetyTeamCallScreen()),
      GoRoute(path: safetyReportIncident, builder: (context, state) => const ReportIncidentScreen()),
      GoRoute(path: safetyRaiseComplaint, builder: (context, state) => const RaiseComplaintScreen()),
      GoRoute(path: safetyLostProperty, builder: (context, state) => const LostPropertyScreen()),
      GoRoute(path: safetyMyRequests, builder: (context, state) => const MyRequestsTicketsScreen()),
      GoRoute(path: safetyRequestDetails, builder: (context, state) => const RequestDetailsTrackingScreen()),
      GoRoute(path: safetyRequestResolved, builder: (context, state) => const RequestResolvedScreen()),
      GoRoute(path: safetyEmergencyContacts, builder: (context, state) => const EmergencyContactsScreen()),
      GoRoute(path: safetyTips, builder: (context, state) => const SafetyTipsGuidelinesScreen()),
      GoRoute(path: safetyLiveChat, builder: (context, state) => const LiveSupportChatScreen()),

      // Batch 08
      GoRoute(path: historyOverview, builder: (context, state) => const TripHistoryOverviewScreen()),
      GoRoute(path: historyDetails, builder: (context, state) => const TripHistoryDetailsScreen()),
      GoRoute(path: historyAnalytics, builder: (context, state) => const TripSummaryAnalyticsScreen()),
      GoRoute(path: historyFeedback, builder: (context, state) => const TripFeedbackFormScreen()),
      GoRoute(path: notificationsCenter, builder: (context, state) => const NotificationsCenterScreen()),
      GoRoute(path: profileDetails, builder: (context, state) => const ProfileMyDetailsScreen()),
      GoRoute(path: profileEdit, builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: settingsOverview, builder: (context, state) => const SettingsOverviewScreen()),
      GoRoute(path: settingsLanguage, builder: (context, state) => const SelectLanguageScreen()),
      GoRoute(path: settingsNotifications, builder: (context, state) => const NotificationPreferencesScreen()),
      GoRoute(path: settingsPrivacy, builder: (context, state) => const PrivacyDataScreen()),
      GoRoute(path: aboutAdhocx, builder: (context, state) => const AboutAdhocxScreen()),
      GoRoute(path: logoutConfirm, builder: (context, state) => const LogoutConfirmScreen()),
      GoRoute(path: deleteAccount, builder: (context, state) => const DeleteAccountScreen()),
    ],
  );
}
