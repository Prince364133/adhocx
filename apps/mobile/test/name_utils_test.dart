import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/core/utils/name_utils.dart';
import 'package:adhocx/presentation/11_onboarding_personal_screen/onboarding_personal_screen.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';
import 'package:provider/provider.dart';

void main() {
  group('NameUtils Tests', () {
    test('isPlaceholderName identifies generic strings', () {
      expect(isPlaceholderName(null), isTrue);
      expect(isPlaceholderName(''), isTrue);
      expect(isPlaceholderName('   '), isTrue);
      expect(isPlaceholderName('Driver'), isTrue);
      expect(isPlaceholderName('driver'), isTrue);
      expect(isPlaceholderName('DRIVER'), isTrue);
      expect(isPlaceholderName('Driver Partner'), isTrue);
      expect(isPlaceholderName('User'), isTrue);
      expect(isPlaceholderName('Vendor'), isTrue);
      expect(isPlaceholderName('Google User'), isTrue);
      expect(isPlaceholderName('Apple User'), isTrue);
      expect(isPlaceholderName('Partner'), isTrue);
      expect(isPlaceholderName('Driver Applicant'), isTrue);
      expect(isPlaceholderName('Assigned Driver'), isTrue);
      expect(isPlaceholderName('Your Driver'), isTrue);

      // Real names must NOT be placeholders
      expect(isPlaceholderName('Ramesh Kumar'), isFalse);
      expect(isPlaceholderName('Prince Sharma'), isFalse);
      expect(isPlaceholderName('John Doe'), isFalse);
    });

    test('sanitizeRealName returns empty string for placeholders and clean name for real names', () {
      expect(sanitizeRealName('Driver'), equals(''));
      expect(sanitizeRealName('user'), equals(''));
      expect(sanitizeRealName('  Driver Partner  '), equals(''));
      expect(sanitizeRealName('Ramesh Kumar'), equals('Ramesh Kumar'));
      expect(sanitizeRealName('  Pooja Verma  '), equals('Pooja Verma'));
    });

    testWidgets('OnboardingPersonalScreen does NOT prefill "Driver" into Full Legal Name',
        (WidgetTester tester) async {
      final onboarding = OnboardingProvider();
      onboarding.setRole('DRIVER');
      // Even if onboarding had "Driver" set previously
      onboarding.setPersonalDetails(fullName: 'Driver');

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => AuthProvider()),
            ChangeNotifierProvider<OnboardingProvider>.value(value: onboarding),
            Provider<AuthService>(create: (_) => AuthService.instance),
            Provider<DriverService>(create: (_) => DriverService.instance),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const OnboardingPersonalScreen(),
          ),
        ),
      );

      // Verify screen renders
      expect(find.text('Basic Details'), findsOneWidget);
      expect(find.text('Full Legal Name *'), findsOneWidget);

      // Verify "Driver" is NOT prefilled in any field on the screen
      expect(find.text('Driver'), findsNothing);
    });
  });
}
