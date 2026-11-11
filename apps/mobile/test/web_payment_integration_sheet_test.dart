import 'package:adhocx/services/language_service.dart';
import 'package:adhocx/user/payments/user_payment_details_screen.dart';
import 'package:adhocx/user/payments/user_payment_history_screen.dart';
import 'package:adhocx/user/payments/user_payments_screen.dart';
import 'package:adhocx/user/payments/widgets/payment_integration_pending_sheet.dart';
import 'package:adhocx/user/requirements/models/cab_cart_item.dart';
import 'package:adhocx/user/requirements/requirement_draft_provider.dart';
import 'package:adhocx/user/requirements/user_create_requirement_screen.dart';
import 'package:adhocx/user/requirements/user_review_requirement_screen.dart';
import 'package:adhocx/user/widgets/user_app_scaffold.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

CabCartItem _buildSampleCab() {
  return CabCartItem(
    id: 'cab-1',
    vehicleType: 'SEDAN',
    vehicleLabel: 'Prime Sedan',
    passengers: 4,
    pickupAddress: 'Hitech City, Hyderabad',
    pickupLat: 17.4435,
    pickupLng: 78.3772,
    dropAddress: 'RGIA Airport, Hyderabad',
    dropLat: 17.2403,
    dropLng: 78.4294,
    pickupDate: '2026-11-12',
    pickupTime: '09:00 AM',
    reportingDateTime: DateTime(2026, 11, 12, 9, 0),
    estimatedFare: 1250.0,
    quoteId: 'quote-123',
    quoteExpiresAt: DateTime.now().add(const Duration(minutes: 15)),
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    setDebugForceWebPaymentModeForTesting(false);
  });

  tearDown(() {
    setDebugForceWebPaymentModeForTesting(false);
  });

  group('Web Portal Payment Integration Pending Behavior', () {
    testWidgets(
        'PaymentIntegrationPendingSheet displays clear message and closes on Got It',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => PaymentIntegrationPendingSheet.show(context),
                child: const Text('Open Sheet'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Sheet'));
      await tester.pumpAndSettle();

      expect(find.text('Waiting for Payment Integration'), findsOneWidget);
      expect(
        find.textContaining('waiting for payment integration'),
        findsOneWidget,
      );
      expect(find.text('Got It'), findsOneWidget);

      await tester.tap(find.text('Got It'));
      await tester.pumpAndSettle();

      expect(find.text('Waiting for Payment Integration'), findsNothing);
    });

    testWidgets(
        'Tapping Payments tab on Web Portal opens bottom sheet without switching to Wallet screen',
        (tester) async {
      setDebugForceWebPaymentModeForTesting(true);
      tester.view.physicalSize = const Size(430, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final router = GoRouter(
        initialLocation: '/home',
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                UserAppScaffold(navigationShell: navigationShell),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/home',
                    builder: (_, __) => const Center(child: Text('Home Body')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/reqs',
                    builder: (_, __) => const Center(child: Text('Reqs Body')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/trips',
                    builder: (_, __) => const Center(child: Text('Trips Body')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/payments',
                    builder: (_, __) => const UserPaymentsScreen(),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/profile',
                    builder: (_, __) =>
                        const Center(child: Text('Profile Body')),
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ChangeNotifierProvider<LanguageProvider>(
          create: (_) => LanguageProvider(),
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Home Body'), findsOneWidget);

      await tester.tap(find.text('Payments'));
      await tester.pumpAndSettle();

      expect(find.text('Waiting for Payment Integration'), findsOneWidget);
      expect(find.text('Home Body'), findsOneWidget);
      expect(find.text('AdhocX Wallet'), findsNothing);
    });

    testWidgets(
        'Direct visit to UserPaymentsScreen, UserPaymentHistoryScreen, and UserPaymentDetailsScreen on Web shows placeholder + sheet and no Wallet UI',
        (tester) async {
      setDebugForceWebPaymentModeForTesting(true);

      await tester.pumpWidget(
        const MaterialApp(home: UserPaymentsScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Payments'), findsOneWidget);
      expect(find.text('AdhocX Wallet'), findsNothing);
      expect(find.text('Available AdhocX Balance'), findsNothing);
      expect(find.text('Top Up'), findsNothing);
      expect(find.text('Waiting for Payment Integration'), findsNWidgets(2));

      await tester.tap(find.text('Got It'));
      await tester.pumpAndSettle();

      await tester.pumpWidget(
        const MaterialApp(home: UserPaymentHistoryScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Payment History'), findsOneWidget);
      expect(find.text('Waiting for Payment Integration'), findsNWidgets(2));

      await tester.tap(find.text('Got It'));
      await tester.pumpAndSettle();

      await tester.pumpWidget(
        const MaterialApp(home: UserPaymentDetailsScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Payment Details'), findsOneWidget);
      expect(find.text('Waiting for Payment Integration'), findsNWidgets(2));
    });

    testWidgets(
        'Mobile mode keeps AdhocX Wallet screen intact when not on Web Portal',
        (tester) async {
      setDebugForceWebPaymentModeForTesting(false);

      await tester.pumpWidget(
        const MaterialApp(home: UserPaymentsScreen()),
      );
      await tester.pump();

      expect(find.text('AdhocX Wallet'), findsOneWidget);
      expect(find.text('Waiting for Payment Integration'), findsNothing);
    });

    testWidgets(
        'UserCreateRequirementScreen hides Wallet UI on Web and shows bottom sheet when deploying',
        (tester) async {
      setDebugForceWebPaymentModeForTesting(true);
      tester.view.physicalSize = const Size(430, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final draft = RequirementDraftProvider();
      draft.addCab(_buildSampleCab());

      await tester.pumpWidget(
        ChangeNotifierProvider<RequirementDraftProvider>.value(
          value: draft,
          child: const MaterialApp(home: UserCreateRequirementScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Wallet:'), findsNothing);
      expect(find.text('+ Top Up'), findsNothing);
      expect(find.text('Waiting for payment integration'), findsOneWidget);

      await tester.tap(find.text('Review & Deploy (1)'));
      await tester.pumpAndSettle();

      expect(find.text('Waiting for Payment Integration'), findsOneWidget);
    });

    testWidgets(
        'UserReviewRequirementScreen hides Wallet card on Web and shows bottom sheet when deploying',
        (tester) async {
      setDebugForceWebPaymentModeForTesting(true);
      tester.view.physicalSize = const Size(600, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final draft = RequirementDraftProvider();

      await tester.pumpWidget(
        ChangeNotifierProvider<RequirementDraftProvider>.value(
          value: draft,
          child: const MaterialApp(home: UserReviewRequirementScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('AdhocX Wallet (Platform Deductions)'),
        findsNothing,
      );
      expect(find.text('Top Up'), findsNothing);
      expect(find.byType(WebPaymentIntegrationPendingBanner), findsOneWidget);
      expect(find.byType(PaymentIntegrationPendingSheet), findsNothing);

      final deployButton = find.text('Deploy Fleet Dispatch');
      await tester.ensureVisible(deployButton);
      await tester.pumpAndSettle();
      await tester.tap(deployButton);
      await tester.pumpAndSettle();

      expect(find.byType(PaymentIntegrationPendingSheet), findsOneWidget);
      expect(find.text('Got It'), findsOneWidget);
    });
  });
}

