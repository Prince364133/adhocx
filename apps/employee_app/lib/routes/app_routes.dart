import 'package:go_router/go_router.dart';

// Batch 01 Screens
import '../screens/splash_screen.dart';
import '../screens/welcome_screen.dart';
import '../screens/login_options_screen.dart';
import '../screens/mobile_number_screen.dart';
import '../screens/otp_verification_screen.dart';
import '../screens/company_sso_screen.dart';
import '../screens/employee_verification_screen.dart';
import '../screens/location_permission_screen.dart';
import '../screens/notification_permission_screen.dart';
import '../screens/onboarding_schedule_screen.dart';
import '../screens/onboarding_tracking_screen.dart';
import '../screens/onboarding_safety_screen.dart';
import '../screens/onboarding_complete_screen.dart';
import '../screens/invalid_otp_screen.dart';
import '../screens/transport_unavailable_screen.dart';
import '../screens/home_screen_placeholder.dart';

// Batch 02 Screens
import '../screens/batch_02/home_upcoming_pickup_screen.dart';
import '../screens/batch_02/home_upcoming_drop_screen.dart';
import '../screens/batch_02/home_no_upcoming_trip_screen.dart';
import '../screens/batch_02/trip_planning_screen.dart';
import '../screens/batch_02/trip_assigned_screen.dart';
import '../screens/batch_02/trip_approaching_screen.dart';
import '../screens/batch_02/trip_arrived_screen.dart';
import '../screens/batch_02/trip_boarded_screen.dart';
import '../screens/batch_02/trip_in_progress_screen.dart';
import '../screens/batch_02/trip_completed_screen.dart';
import '../screens/batch_02/trip_cancelled_screen.dart';
import '../screens/batch_02/trip_unserved_screen.dart';
import '../screens/batch_02/trip_details_completed_screen.dart';
import '../screens/batch_02/driver_vehicle_details_screen.dart';

// Batch 03 Screens
import '../screens/batch_03/schedule_today_overview_screen.dart';
import '../screens/batch_03/schedule_daily_screen.dart';
import '../screens/batch_03/schedule_weekly_screen.dart';
import '../screens/batch_03/schedule_monthly_screen.dart';
import '../screens/batch_03/shift_details_login_screen.dart';
import '../screens/batch_03/shift_details_overnight_screen.dart';
import '../screens/batch_03/schedule_no_trips_screen.dart';
import '../screens/batch_03/request_change_options_screen.dart';
import '../screens/batch_03/change_request_details_screen.dart';
import '../screens/batch_03/change_request_submitted_screen.dart';
import '../screens/batch_03/request_status_pending_screen.dart';
import '../screens/batch_03/request_status_approved_screen.dart';
import '../screens/batch_03/request_status_rejected_screen.dart';
import '../screens/batch_03/cancel_trip_request_screen.dart';

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

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    routes: [
      // Batch 01
      GoRoute(path: splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: welcome, builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: loginOptions, builder: (context, state) => const LoginOptionsScreen()),
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
    ],
  );
}
