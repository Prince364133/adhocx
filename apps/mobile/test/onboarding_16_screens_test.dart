import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/01_splash_screen/splash_screen.dart';
import 'package:adhocx/presentation/03_sign_in_screen/sign_in_screen.dart';
import 'package:adhocx/presentation/05_sign_up_screen/sign_up_screen.dart';
import 'package:adhocx/presentation/06_set_password_screen/set_password_screen.dart';
import 'package:adhocx/presentation/10_choose_role_screen/choose_role_screen.dart';
import 'package:adhocx/presentation/11_onboarding_personal_screen/onboarding_personal_screen.dart';
import 'package:adhocx/presentation/12_onboarding_vehicle_screen/onboarding_vehicle_screen.dart';
import 'package:adhocx/presentation/15_welcome_success_screen/welcome_success_screen.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';

import 'package:adhocx/user/home/user_home_screen.dart';
import 'package:adhocx/user/profile/user_profile_screen.dart';

Widget createTestApp(Widget child, {String role = 'DRIVER'}) {
  final onboarding = OnboardingProvider();
  onboarding.setRole(role);
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider<OnboardingProvider>.value(value: onboarding),
      Provider<AuthService>(create: (_) => AuthService.instance),
      Provider<DriverService>(create: (_) => DriverService.instance),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: child,
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AdhocX 16-Screen Mobile Suite Tests', () {
    testWidgets('Screen 1: Splash Screen renders title and Get Started button',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SplashScreen()));

      expect(find.text('Your ride. Your way.'), findsOneWidget);
      expect(find.text('Get Started'), findsOneWidget);
    });

    testWidgets('Screen 3: Sign In Screen renders password login form by default',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SignInScreen()));

      expect(find.text('Welcome back!'), findsOneWidget);
      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Sign in with Email OTP instead'), findsOneWidget);
      expect(find.text('Forgot Password?'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
      expect(find.text("Don't have an account? "), findsOneWidget);
    });

    testWidgets('Screen 5: Sign Up Screen renders user registration and Driver CTA',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SignUpScreen(), role: 'VENDOR'));

      expect(find.text('Create your account'), findsOneWidget);
      expect(find.text('Continue with Email'), findsOneWidget);
      expect(find.text('Registering as a Commercial Driver?'), findsOneWidget);
      expect(find.text('Switch to Driver'), findsOneWidget);
    });

    testWidgets('Screen 6: Set Password Screen renders password fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SetPasswordScreen()));

      expect(find.text('Set your password'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('Screen 10: Choose Role Screen renders Booker and Driver cards',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const ChooseRoleScreen()));

      expect(find.text('Choose your role'), findsOneWidget);
      expect(find.text('Book Rides & Bulk Fleets'), findsOneWidget);
      expect(find.text('Driver'), findsOneWidget);
    });

    testWidgets('Screen 11: Personal Details Screen renders profile fields for drivers',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingPersonalScreen(), role: 'DRIVER'));

      expect(find.text('Basic Details'), findsOneWidget);
      expect(find.text('Full Legal Name *'), findsOneWidget);
      expect(find.text('Male'), findsOneWidget);
      expect(find.text('Female'), findsOneWidget);
    });

    testWidgets('Screen 11: Vendor Corporate Details Screen renders company fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingPersonalScreen(), role: 'VENDOR'));

      expect(find.text('Company Legal Name *'), findsOneWidget);
      expect(find.text('Brand / Trade Name (Optional)'), findsOneWidget);
      expect(find.text('Company PAN *'), findsOneWidget);
      expect(find.text('GSTIN Number'), findsOneWidget);
    });

    testWidgets('Screen 12: Vehicle Step 2 renders vehicle options for drivers',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingVehicleScreen(), role: 'DRIVER'));

      expect(find.text('Add Vehicle Details'), findsOneWidget);
      expect(find.text('Prime Sedan'), findsWidgets);
      expect(find.text('Vehicle Category *'), findsOneWidget);
    });

    testWidgets('Screen 15: Welcome Celebration Screen renders tailored celebration',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const WelcomeSuccessScreen(), role: 'VENDOR'));

      expect(find.text('Welcome to AdhocX!'), findsOneWidget);
      expect(find.text('Go to App & Verification Status'), findsOneWidget);
    });

    testWidgets('User Dashboard: Home Screen renders requirements summary and post CTA',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const UserHomeScreen()));

      expect(find.text('Good morning,'), findsOneWidget);
      expect(find.text('Active Requirements'), findsOneWidget);
      expect(find.text('+ Post New Requirement'), findsOneWidget);
      expect(find.text('Recent Requirements'), findsOneWidget);
    });

    testWidgets('User Profile: Screen renders User ID and Verified User badge',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const UserProfileScreen()));

      expect(find.text('Profile'), findsOneWidget);
      expect(find.text('User ID: USR-1001'), findsOneWidget);
      expect(find.text('Verified User'), findsOneWidget);
    });
  });
}
