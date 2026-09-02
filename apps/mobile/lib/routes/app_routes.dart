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
import '../presentation/kyc_upload_screen/kyc_upload_screen.dart';
import '../presentation/profile_screen/profile_screen.dart';
import '../presentation/trips_screen/trips_screen.dart';
import '../presentation/waitlist_gate_screen/waitlist_gate_screen.dart';
import '../presentation/wallet_screen/wallet_screen.dart';
import '../services/auth_service.dart';
import '../widgets/app_scaffold.dart';

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
  static const String tripsScreen = '/trips-screen';
  static const String walletScreen = '/wallet-screen';
  static const String profileScreen = '/profile-screen';
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.splashScreen,
  redirect: (BuildContext context, GoRouterState state) async {
    final user = AuthService.instance.currentUser;
    final isLoggedIn = user != null;
    final currentPath = state.matchedLocation;

    // Public onboarding routes that don't require an active session
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
    // ── 01. Splash / Onboarding Hero ─────────────────────────────────────────
    GoRoute(
      path: AppRoutes.splashScreen,
      builder: (context, state) => const SplashScreen(),
    ),

    // ── 02. Choose Language ──────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.languageSelectionScreen,
      builder: (context, state) => const LanguageSelectionScreen(),
    ),

    // ── 03. Welcome back! Sign In ────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.signInScreen,
      builder: (context, state) => const SignInScreen(),
    ),

    // ── 04. Enter OTP (Login Verification) ───────────────────────────────────
    GoRoute(
      path: AppRoutes.loginOtpScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return LoginOtpScreen(
          phone: extra['phone'] ?? '+919876543210',
          role: extra['role'] ?? 'DRIVER',
          isRegister: extra['isRegister'] ?? false,
        );
      },
    ),

    // ── 05. Create Your Account (Sign Up) ────────────────────────────────────
    GoRoute(
      path: AppRoutes.signUpScreen,
      builder: (context, state) => const SignUpScreen(),
    ),

    // ── 06. Set Your Password ────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.setPasswordScreen,
      builder: (context, state) => const SetPasswordScreen(),
    ),

    // ── 07. Forgot Password? ─────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.forgotPasswordScreen,
      builder: (context, state) => const ForgotPasswordScreen(),
    ),

    // ── 08. Forgot Password OTP ──────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.forgotPasswordOtpScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ForgotPasswordOtpScreen(
          phone: extra['phone'] ?? '+919876543210',
        );
      },
    ),

    // ── 09. Reset Password ───────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.resetPasswordScreen,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ResetPasswordScreen(
          phone: extra['phone'] ?? '+919876543210',
          otp: extra['otp'],
        );
      },
    ),

    // ── 10. Choose Your Role ─────────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.chooseRoleScreen,
      builder: (context, state) => const ChooseRoleScreen(),
    ),

    // ── 11. Onboarding Step 1: Personal Details ──────────────────────────────
    GoRoute(
      path: AppRoutes.onboardingPersonalScreen,
      builder: (context, state) => const OnboardingPersonalScreen(),
    ),

    // ── 12. Onboarding Step 2: Vehicle Information ───────────────────────────
    GoRoute(
      path: AppRoutes.onboardingVehicleScreen,
      builder: (context, state) => const OnboardingVehicleScreen(),
    ),

    // ── 13. Onboarding Step 3: Upload Documents ──────────────────────────────
    GoRoute(
      path: AppRoutes.onboardingDocumentsScreen,
      builder: (context, state) => const OnboardingDocumentsScreen(),
    ),

    // ── 14. Onboarding Step 4: Review & Confirm ──────────────────────────────
    GoRoute(
      path: AppRoutes.onboardingReviewScreen,
      builder: (context, state) => const OnboardingReviewScreen(),
    ),

    // ── 15. Welcome Success Celebration ──────────────────────────────────────
    GoRoute(
      path: AppRoutes.welcomeSuccessScreen,
      builder: (context, state) => const WelcomeSuccessScreen(),
    ),

    // ── 16. Verification Pending / Waitlist Gate ─────────────────────────────
    GoRoute(
      path: AppRoutes.waitlistGateScreen,
      builder: (context, state) => const WaitlistGateScreen(),
    ),

    GoRoute(
      path: AppRoutes.kycUploadScreen,
      builder: (context, state) => const KycUploadScreen(),
    ),

    // ── Core Operations Shell (Trips, Wallet, Profile) ───────────────────────
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppScaffold(navigationShell: navigationShell),
      branches: [
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
              builder: (context, state) => const WalletScreen(),
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