import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/01_splash_screen/splash_screen.dart';
import 'package:adhocx/presentation/02_language_selection_screen/language_selection_screen.dart';
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

      expect(find.text('AdhocX'), findsOneWidget);
      expect(find.text('Your ride. Your way.'), findsOneWidget);
      expect(find.text('Get Started'), findsOneWidget);
      expect(find.text('Continue as Guest'), findsOneWidget);
    });

    testWidgets('Screen 2: Language Selection renders all language options',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const LanguageSelectionScreen()));

      expect(find.text('Choose Language'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('हिंदी (Hindi)'), findsOneWidget);
      expect(find.text('தமிழ் (Tamil)'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('Screen 3: Sign In Screen renders phone input and social buttons',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SignInScreen()));

      expect(find.text('Welcome back!'), findsOneWidget);
      expect(find.text('Sign in to continue'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
      expect(find.text('Continue with Apple'), findsOneWidget);
      expect(find.text("Don't have an account? "), findsOneWidget);
    });

    testWidgets('Screen 6: Set Password Screen renders strength meter',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const SetPasswordScreen()));

      expect(find.text('Set your password'), findsOneWidget);
      expect(find.text('Create a strong password'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('Screen 10: Choose Role Screen renders Driver and Vendor cards',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const ChooseRoleScreen()));

      expect(find.text('Choose your role'), findsOneWidget);
      expect(find.text('Driver'), findsOneWidget);
      expect(find.text('I want to drive and earn'), findsOneWidget);
      expect(find.text('Vendor'), findsOneWidget);
      expect(find.text('I want to create trip requirements'), findsOneWidget);
    });

    testWidgets('Screen 11: Personal Details Step 1 renders stepper & DOB',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingPersonalScreen()));

      expect(find.text("Let's get started"), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Date of Birth'), findsOneWidget);
      expect(find.text('Male'), findsOneWidget);
      expect(find.text('Female'), findsOneWidget);
    });

    testWidgets('Screen 12: Vehicle Step 2 renders vehicle type dropdown',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const OnboardingVehicleScreen()));

      expect(find.text('Vehicle Information'), findsOneWidget);
      expect(find.text('Vehicle Type'), findsOneWidget);
      expect(find.text('Car Model'), findsOneWidget);
      expect(find.text('Color'), findsOneWidget);
      expect(find.text('Registration Number'), findsOneWidget);
    });

    testWidgets('Screen 15: Welcome Celebration Screen renders benefits',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const WelcomeSuccessScreen()));

      expect(find.text('Welcome to AdhocX!'), findsOneWidget);
      expect(find.text('You are all set to start earning'), findsOneWidget);
      expect(find.text('Go to Home'), findsOneWidget);
    });
  });
}
