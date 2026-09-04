import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/01_splash_screen/splash_screen.dart';
import 'package:adhocx/presentation/03_sign_in_screen/sign_in_screen.dart';
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

Widget createTestApp(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => OnboardingProvider()),
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

    testWidgets('Screen 3: Sign In Screen renders password login form and Driver CTA',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SignInScreen()));

      expect(find.text('Welcome back!'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
      expect(find.text("Don't have an account? "), findsOneWidget);
      expect(find.text('Drive & Earn with AdhocX'), findsOneWidget);
    });

    testWidgets('Screen 6: Set Password Screen renders password fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SetPasswordScreen()));

      expect(find.text('Set your password'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('Screen 10: Choose Role Screen renders Booker and Driver Partner cards',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const ChooseRoleScreen()));

      expect(find.text('Choose your role'), findsOneWidget);
      expect(find.text('Book Rides & Bulk Fleets'), findsOneWidget);
      expect(find.text('Driver Partner'), findsOneWidget);
    });

    testWidgets('Screen 11: Personal Details Screen renders profile fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingPersonalScreen()));

      expect(find.text('Complete your profile'), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Date of Birth (Optional)'), findsOneWidget);
      expect(find.text('Male'), findsOneWidget);
      expect(find.text('Female'), findsOneWidget);
      expect(find.text('Booking for Company / Event?'), findsOneWidget);
    });

    testWidgets('Screen 12: Vehicle Step 2 renders vehicle options for drivers',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingVehicleScreen()));

      expect(find.text('Vehicle Information'), findsOneWidget);
      expect(find.text('Vehicle Type'), findsOneWidget);
      expect(find.text('Color (Optional)'), findsOneWidget);
      expect(find.text('Registration Number (Optional)'), findsOneWidget);
    });

    testWidgets('Screen 15: Welcome Celebration Screen renders tailored celebration',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const WelcomeSuccessScreen()));

      expect(find.text('Welcome to AdhocX!'), findsOneWidget);
      expect(find.text('Start Booking & Posting Trips'), findsOneWidget);
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
