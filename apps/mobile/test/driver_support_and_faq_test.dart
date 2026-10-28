import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:adhocx/presentation/profile_screen/help_support_screen.dart';
import 'package:adhocx/presentation/profile_screen/driver_faq_screen.dart';
import 'package:adhocx/presentation/profile_screen/driver_report_issue_screen.dart';
import 'package:adhocx/services/language_service.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/onboarding_provider.dart';

Widget createTestWidget(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<LanguageProvider>(create: (_) => LanguageProvider()),
      ChangeNotifierProvider<AuthProvider>(create: (_) => AuthProvider()),
      ChangeNotifierProvider<OnboardingProvider>(create: (_) => OnboardingProvider()),
    ],
    child: MaterialApp(
      home: child,
    ),
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Help & Support Screen Tests', () {
    testWidgets('HelpSupportScreen renders essential support options without logout or app feedback', (tester) async {
      await tester.pumpWidget(createTestWidget(const HelpSupportScreen()));
      await tester.pumpAndSettle();

      // Check Header & Hero Banner
      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('How can we help you?'), findsOneWidget);

      // Check Options
      expect(find.text('Help Center'), findsOneWidget);
      expect(find.text('Contact Support'), findsOneWidget);
      expect(find.text('Call Support'), findsOneWidget);
      expect(find.text('Report an Issue'), findsOneWidget);

      // Verify Logout button is REMOVED
      expect(find.text('Logout'), findsNothing);

      // Verify App Feedback option is REMOVED
      expect(find.text('App Feedback'), findsNothing);
    });
  });

  group('Driver FAQ Screen Tests', () {
    testWidgets('DriverFaqScreen renders search, category chips, and expandable questions', (tester) async {
      await tester.pumpWidget(createTestWidget(const DriverFaqScreen()));
      await tester.pumpAndSettle();

      // Header & Search
      expect(find.text('Frequently Asked Questions'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);

      // Category chips
      expect(find.text('All Topics'), findsOneWidget);
      expect(find.text('Trips & Bidding'), findsOneWidget);
      expect(find.text('Earnings & Payouts'), findsOneWidget);

      // Verify FAQ item presence
      final questionFinder = find.text('How do I accept incoming trip requirements?');
      expect(questionFinder, findsOneWidget);

      // Initially, the answer should not be visible
      expect(find.textContaining('incoming ride requirements appear automatically'), findsNothing);

      // Tap to expand
      await tester.tap(questionFinder);
      await tester.pumpAndSettle();

      // Answer should now be visible
      expect(find.textContaining('incoming ride requirements appear automatically'), findsOneWidget);
    });
  });

  group('Driver Report Issue Screen Tests', () {
    testWidgets('DriverReportIssueScreen renders form and switches tabs', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(const DriverReportIssueScreen(initialIssues: [])));
      await tester.pumpAndSettle();

      // Header & Tabs
      expect(find.text('Report an Issue'), findsWidgets);
      expect(find.textContaining('My Issues'), findsOneWidget);

      // Form elements
      expect(find.text('Issue Category'), findsOneWidget);
      expect(find.text('Urgency / Priority'), findsOneWidget);
      expect(find.text('Subject / Short Summary'), findsOneWidget);
      expect(find.text('Detailed Description'), findsOneWidget);
      expect(find.text('Submit Issue to Admin Desk'), findsOneWidget);

      // Switch to My Issues Tab
      await tester.tap(find.textContaining('My Issues'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Shows empty state or history
      expect(find.text('No Reported Issues Yet'), findsOneWidget);
    });
  });
}
