import 'package:go_router/go_router.dart';
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

class AppRoutes {
  AppRoutes._();

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

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    routes: [
      GoRoute(
        path: splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: loginOptions,
        builder: (context, state) => const LoginOptionsScreen(),
      ),
      GoRoute(
        path: mobileNumber,
        builder: (context, state) => const MobileNumberScreen(),
      ),
      GoRoute(
        path: otpVerify,
        builder: (context, state) => const OtpVerificationScreen(),
      ),
      GoRoute(
        path: companySso,
        builder: (context, state) => const CompanySsoScreen(),
      ),
      GoRoute(
        path: employeeVerified,
        builder: (context, state) => const EmployeeVerificationScreen(),
      ),
      GoRoute(
        path: permissionLocation,
        builder: (context, state) => const LocationPermissionScreen(),
      ),
      GoRoute(
        path: permissionNotification,
        builder: (context, state) => const NotificationPermissionScreen(),
      ),
      GoRoute(
        path: onboardingSchedule,
        builder: (context, state) => const OnboardingScheduleScreen(),
      ),
      GoRoute(
        path: onboardingTracking,
        builder: (context, state) => const OnboardingTrackingScreen(),
      ),
      GoRoute(
        path: onboardingSafety,
        builder: (context, state) => const OnboardingSafetyScreen(),
      ),
      GoRoute(
        path: onboardingComplete,
        builder: (context, state) => const OnboardingCompleteScreen(),
      ),
      GoRoute(
        path: invalidOtp,
        builder: (context, state) => const InvalidOtpScreen(),
      ),
      GoRoute(
        path: transportUnavailable,
        builder: (context, state) => const TransportUnavailableScreen(),
      ),
      GoRoute(
        path: home,
        builder: (context, state) => const HomeScreenPlaceholder(),
      ),
    ],
  );
}

