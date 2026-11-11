import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:adhocx/core/config/feature_flags.dart';
import 'package:adhocx/routes/app_routes.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/language_service.dart';
import 'package:adhocx/theme/theme_provider.dart';
import 'package:adhocx/user/requirements/models/cab_cart_item.dart';
import 'package:adhocx/user/requirements/requirement_draft_provider.dart';
import 'package:adhocx/user/requirements/user_create_requirement_screen.dart';
import 'package:adhocx/user/requirements/user_review_requirement_screen.dart';
import 'package:adhocx/user/widgets/user_app_scaffold.dart';
import 'package:adhocx/widgets/app_navigation.dart';

UserModel _verifiedVendor({String role = 'VENDOR'}) => UserModel(
      id: 'vendor-1',
      phone: '+919876543210',
      fullName: 'Acme Corp',
      role: role,
      hasPassword: true,
      isOnboarded: true,
      vendorProfile: const {'verificationStatus': 'VERIFIED'},
    );

UserModel _verifiedDriver() => UserModel(
      id: 'driver-1',
      phone: '+919876543211',
      fullName: 'Ramesh Driver',
      role: 'DRIVER',
      hasPassword: true,
      isOnboarded: true,
      driverProfile: const {'verificationStatus': 'VERIFIED'},
    );

CabCartItem _sampleCab() => CabCartItem(
      id: 'cab-1',
      vehicleType: 'SEDAN',
      vehicleLabel: 'Prime Sedan',
      passengers: 4,
      pickupIsOffice: true,
      pickupAddress: 'HITEC City, Hyderabad',
      pickupLat: 17.4435,
      pickupLng: 78.3772,
      dropAddress: 'RGIA Airport, Hyderabad',
      dropLat: 17.2403,
      dropLng: 78.4294,
      pickupDate: '2026-11-12',
      pickupTime: '09:00 AM',
      reportingDateTime: DateTime(2026, 11, 12, 9, 0),
      estimatedFare: 1200.0,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      const MethodChannel('PonnamKarthik/fluttertoast'),
      (MethodCall call) async => true,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (MethodCall call) async => null,
    );
  });

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    FeatureFlags.setVendorWalletEnabledForTesting(false);
    AuthService.instance.setCurrentUser(null);
  });

  tearDown(() {
    FeatureFlags.setVendorWalletEnabledForTesting(false);
    AuthService.instance.setCurrentUser(null);
  });

  group('Vendor wallet hidden by default', () {
    test('FeatureFlags.isVendorWalletEnabled defaults to false', () {
      expect(FeatureFlags.isVendorWalletEnabled, isFalse);
    });

    test('AppRoutes.resolveRedirect blocks all vendor payment routes for VENDOR and USER roles', () {
      for (final role in const ['VENDOR', 'USER']) {
        final vendor = _verifiedVendor(role: role);
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentsScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentHistoryScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentDetailsScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentPendingScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentProcessingScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentSuccessfulScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userPaymentFailedScreen),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, '/vendor/payments'),
          AppRoutes.userHomeScreen,
        );
        expect(
          AppRoutes.resolveRedirect(vendor, AppRoutes.userHomeScreen),
          isNull,
        );
      }
    });

    test('AppRoutes.resolveRedirect keeps Driver wallet and earnings routes accessible', () {
      final driver = _verifiedDriver();
      expect(AppRoutes.resolveRedirect(driver, AppRoutes.walletScreen), isNull);
      expect(
        AppRoutes.resolveRedirect(driver, AppRoutes.earningsTransactionsScreen),
        isNull,
      );
      expect(
        AppRoutes.resolveRedirect(driver, AppRoutes.earningsWithdrawScreen),
        isNull,
      );
      expect(
        AppRoutes.resolveRedirect(driver, AppRoutes.earningsWithdrawalDetailsScreen),
        isNull,
      );
    });

    testWidgets(
        'UserAppNavigation hides Payments tab for Vendor while keeping Home, Requirements, Trips, and Profile functional',
        (tester) async {
      final router = GoRouter(
        initialLocation: AppRoutes.userHomeScreen,
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                UserAppScaffold(navigationShell: navigationShell),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.userHomeScreen,
                    builder: (_, __) => const Center(child: Text('Vendor Home')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.userRequirementsScreen,
                    builder: (_, __) => const Center(child: Text('Vendor Reqs')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.userTripsScreen,
                    builder: (_, __) => const Center(child: Text('Vendor Trips')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.userPaymentsScreen,
                    builder: (_, __) => const Center(child: Text('AdhocX Wallet')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.userProfileScreen,
                    builder: (_, __) => const Center(child: Text('Vendor Profile')),
                  ),
                ],
              ),
            ],
          ),
        ],
      );

      await tester.pumpWidget(
        ChangeNotifierProvider<LanguageProvider>(
          create: (_) => LanguageProvider(),
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Requirements'), findsOneWidget);
      expect(find.text('Trips'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(find.text('Payments'), findsNothing);
      expect(find.text('Vendor Home'), findsOneWidget);

      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();

      expect(find.text('Vendor Profile'), findsOneWidget);
    });

    testWidgets('Driver AppNavigation still shows Earnings tab when Vendor wallet is hidden',
        (tester) async {
      final router = GoRouter(
        initialLocation: AppRoutes.homeScreen,
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) => Scaffold(
              body: navigationShell,
              bottomNavigationBar: AppNavigation(navigationShell: navigationShell),
            ),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.homeScreen,
                    builder: (_, __) => const Center(child: Text('Driver Home')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.tripsScreen,
                    builder: (_, __) => const Center(child: Text('Driver Trips')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.walletScreen,
                    builder: (_, __) => const Center(child: Text('Driver Earnings')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: AppRoutes.profileScreen,
                    builder: (_, __) => const Center(child: Text('Driver Profile')),
                  ),
                ],
              ),
            ],
          ),
        ],
      );

      await tester.pumpWidget(
        ChangeNotifierProvider<LanguageProvider>(
          create: (_) => LanguageProvider(),
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Earnings'), findsOneWidget);
      await tester.tap(find.text('Earnings'));
      await tester.pumpAndSettle();
      expect(find.text('Driver Earnings'), findsOneWidget);
    });

    testWidgets('UserCreateRequirementScreen hides inline Wallet balance and Top Up UI',
        (tester) async {
      tester.view.physicalSize = const Size(430, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final draft = RequirementDraftProvider()..addCab(_sampleCab());

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => ThemeProvider()),
            ChangeNotifierProvider<RequirementDraftProvider>.value(value: draft),
            ChangeNotifierProvider(create: (_) => AuthProvider()),
          ],
          child: const MaterialApp(home: UserCreateRequirementScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Wallet:'), findsNothing);
      expect(find.text('Checking Wallet...'), findsNothing);
      expect(find.text('+ Top Up'), findsNothing);
      expect(find.text('Review & Deploy (1)'), findsOneWidget);
    });

    testWidgets('UserReviewRequirementScreen hides AdhocX Wallet card and Top Up button',
        (tester) async {
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

      expect(find.text('AdhocX Wallet (Platform Deductions)'), findsNothing);
      expect(find.text('Top Up'), findsNothing);
      expect(find.text('Deploy Fleet Dispatch'), findsOneWidget);
    });

    testWidgets('/wallet and /coupons redirect Vendors to /user/home and Drivers to /wallet-screen',
        (tester) async {
      final router = GoRouter(
        initialLocation: AppRoutes.userHomeScreen,
        routes: [
          GoRoute(
            path: AppRoutes.userHomeScreen,
            builder: (_, __) => const Scaffold(body: Text('Vendor Home')),
          ),
          GoRoute(
            path: AppRoutes.walletScreen,
            builder: (_, __) => const Scaffold(body: Text('Driver Wallet')),
          ),
          GoRoute(
            path: '/wallet',
            redirect: (context, state) =>
                AuthService.instance.currentUser?.isDriver == false
                    ? (FeatureFlags.isVendorWalletEnabled
                        ? AppRoutes.userPaymentsScreen
                        : AppRoutes.userHomeScreen)
                    : AppRoutes.walletScreen,
          ),
          GoRoute(
            path: '/coupons',
            redirect: (context, state) =>
                AuthService.instance.currentUser?.isDriver == false
                    ? (FeatureFlags.isVendorWalletEnabled
                        ? AppRoutes.userPaymentsScreen
                        : AppRoutes.userHomeScreen)
                    : AppRoutes.walletScreen,
          ),
        ],
      );

      AuthService.instance.setCurrentUser(_verifiedVendor());

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      router.go('/wallet');
      await tester.pumpAndSettle();
      expect(find.text('Vendor Home'), findsOneWidget);

      router.go('/coupons');
      await tester.pumpAndSettle();
      expect(find.text('Vendor Home'), findsOneWidget);

      AuthService.instance.setCurrentUser(_verifiedDriver());
      router.go('/wallet');
      await tester.pumpAndSettle();
      expect(find.text('Driver Wallet'), findsOneWidget);
    });
  });
}

