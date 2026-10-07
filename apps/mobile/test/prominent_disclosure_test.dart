import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/edge_cases/location_permission_modal.dart';
import 'package:adhocx/services/edge_case_manager.dart';
import 'package:adhocx/theme/app_theme.dart';

Widget createTestApp(Widget child) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(body: child),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Google Play Prominent Disclosure & Consent Compliance Tests', () {
    test('EdgeCaseManager: Location disclosure state transitions correctly', () {
      final mgr = EdgeCaseManager.instance;

      // Simulate startup where location is not granted
      mgr.toggleLocationPermission(false);
      expect(mgr.isLocationPermissionGranted, isFalse);
      expect(mgr.shouldShowLocationDisclosureModal, isTrue);

      // User dismisses ("Not Now") without granting
      mgr.dismissLocationDisclosureModal();
      expect(mgr.shouldShowLocationDisclosureModal, isFalse);
      expect(mgr.isLocationPermissionGranted, isFalse);

      // User taps "GO ONLINE" -> Prominent disclosure re-opens
      mgr.showLocationDisclosureModal();
      expect(mgr.shouldShowLocationDisclosureModal, isTrue);

      // User gives affirmative consent and grants permission
      mgr.grantLocationPermission();
      expect(mgr.isLocationPermissionGranted, isTrue);
      expect(mgr.shouldShowLocationDisclosureModal, isFalse);
    });

    testWidgets('LocationPermissionModal: Renders mandatory Google Play prominent disclosure elements',
        (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const LocationPermissionModal()));

      // 1. Prominent Title
      expect(find.text('Location Access & Prominent Disclosure'), findsOneWidget);

      // 2. Core Feature Itemization
      expect(find.text('Real-Time Duty Dispatch Matching'), findsOneWidget);
      expect(find.text('Turn-by-Turn Road Navigation'), findsOneWidget);
      expect(find.text('Live Route Tracking & Passenger Safety'), findsOneWidget);

      // 3. Mandatory Google Play Background Location Disclosure Statement
      expect(find.text('Background Location Disclosure'), findsOneWidget);
      expect(
        find.textContaining('even when the app is closed or not in use'),
        findsOneWidget,
      );

      // 4. Affirmative and Negative Consent CTAs
      expect(find.text('AGREE & CONTINUE'), findsOneWidget);
      expect(find.text('Not Now'), findsOneWidget);
    });

    testWidgets('LocationPermissionModal: Tapping Not Now dismisses modal without OS runtime prompt',
        (WidgetTester tester) async {
      final mgr = EdgeCaseManager.instance;
      mgr.toggleLocationPermission(false);
      expect(mgr.shouldShowLocationDisclosureModal, isTrue);

      await tester.pumpWidget(createTestApp(const LocationPermissionModal()));

      // Ensure "Not Now" is scrolled into view in 800x600 test viewport
      await tester.ensureVisible(find.text('Not Now'));
      await tester.pumpAndSettle();

      // Tap "Not Now"
      await tester.tap(find.text('Not Now'));
      await tester.pumpAndSettle();

      // Modal is dismissed, but permission remains not granted (no crash, no force)
      expect(mgr.shouldShowLocationDisclosureModal, isFalse);
      expect(mgr.isLocationPermissionGranted, isFalse);
    });
  });
}
