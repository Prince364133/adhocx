import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:adhocx/presentation/waitlist_gate_screen/waitlist_gate_screen.dart';
import 'package:adhocx/presentation/waitlist_gate_screen/widgets/waitlist_rejected_widget.dart';
import 'package:adhocx/routes/app_routes.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';

class _TrackingAuthProvider extends AuthProvider {
  bool logoutCalled = false;

  _TrackingAuthProvider();

  @override
  Future<void> logout() async {
    logoutCalled = true;
    await Future<void>.delayed(const Duration(milliseconds: 5));
    // Triggers GoRouter's redirect to /splash and unmounts WaitlistGateScreen mid-logout.
    AuthService.instance.authStateListenable.value = null;
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

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
    AuthService.instance.authStateListenable.value = UserModel(
      id: 'driver-1',
      phone: '+919876543210',
      fullName: 'Test Driver',
      role: 'DRIVER',
      isOnboarded: true,
      driverProfile: const {'verificationStatus': 'UNDER_REVIEW'},
    );
  });

  tearDown(() {
    AuthService.instance.authStateListenable.value = null;
  });

  testWidgets(
      'WaitlistGateScreen Sign Out navigates to SignInScreen even when GoRouter redirects to Splash during logout',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()
      ..setRole('DRIVER')
      ..setKycIdentifiers(panNumber: 'ABCDE1234F');
    final authProvider = _TrackingAuthProvider();

    final router = GoRouter(
      initialLocation: AppRoutes.waitlistGateScreen,
      refreshListenable: AuthService.instance.authStateListenable,
      redirect: (context, state) {
        final authed = AuthService.instance.authStateListenable.value != null;
        final loc = state.matchedLocation;
        if (!authed &&
            loc != AppRoutes.signInScreen &&
            loc != AppRoutes.splashScreen) {
          return AppRoutes.splashScreen;
        }
        return null;
      },
      routes: [
        GoRoute(
          path: AppRoutes.waitlistGateScreen,
          builder: (_, __) => const WaitlistGateScreen(),
        ),
        GoRoute(
          path: AppRoutes.splashScreen,
          builder: (_, __) => const Scaffold(body: Text('SplashPlaceholder')),
        ),
        GoRoute(
          path: AppRoutes.signInScreen,
          builder: (_, __) => const Scaffold(body: Text('SignInPlaceholder')),
        ),
      ],
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider<OnboardingProvider>.value(value: onboarding),
        ],
        child: MaterialApp.router(
          theme: AppTheme.lightTheme,
          routerConfig: router,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Sign Out'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign Out'));
    await tester.tap(find.text('Sign Out'));
    await tester.pumpAndSettle();

    expect(authProvider.logoutCalled, isTrue);
    expect(onboarding.panNumber, isEmpty);
    expect(find.text('SignInPlaceholder'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path,
        AppRoutes.signInScreen);
  });

  testWidgets('WaitlistRejectedWidget exposes Sign Out action when provided',
      (WidgetTester tester) async {
    bool signedOut = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(
          body: SingleChildScrollView(
            child: WaitlistRejectedWidget(
              reason: 'Blurry RC back image',
              onReApply: () {},
              onSignOut: () => signedOut = true,
            ),
          ),
        ),
      ),
    );

    expect(find.text('Sign Out'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign Out'));
    await tester.tap(find.text('Sign Out'));
    await tester.pump();
    expect(signedOut, isTrue);
  });

  test('AuthService.logout clears token and user quickly even when overlay/network plugins are unmocked',
      () async {
    final sw = Stopwatch()..start();
    await AuthService.instance.logout();
    sw.stop();

    expect(AuthService.instance.currentUser, isNull);
    expect(AuthService.instance.authStateListenable.value, isNull);
    expect(sw.elapsed.inSeconds, lessThan(8));
  });

  test('AppRoutes.resolveRedirect keeps KYC-rejected driver on waitlistGateScreen and permits document re-upload', () {
    final rejectedDriver = UserModel(
      id: 'driver-rejected-1',
      phone: '+919876543210',
      fullName: 'Rejected Driver',
      role: 'DRIVER',
      hasPassword: true,
      isOnboarded: false, // Even if isOnboarded is false, isRejected must prevent redirect to onboardingPersonalScreen
      driverProfile: const {
        'verificationStatus': 'REJECTED',
        'rejectionReason': 'Blurry or unreadable Driving License image',
      },
    );

    expect(rejectedDriver.isRejected, isTrue);
    expect(rejectedDriver.isVerified, isFalse);
    expect(rejectedDriver.isUnderReview, isFalse);

    // 1. Must stay on waitlistGateScreen without redirection
    expect(
      AppRoutes.resolveRedirect(rejectedDriver, AppRoutes.waitlistGateScreen),
      isNull,
    );

    // 2. Must allow re-upload documents screen
    expect(
      AppRoutes.resolveRedirect(rejectedDriver, AppRoutes.onboardingDocumentsScreen),
      isNull,
    );

    // 3. Must allow personal onboarding screen
    expect(
      AppRoutes.resolveRedirect(rejectedDriver, AppRoutes.onboardingPersonalScreen),
      isNull,
    );

    // 4. If trying to visit protected driver home while unverified, must lock to waitlistGateScreen
    expect(
      AppRoutes.resolveRedirect(rejectedDriver, AppRoutes.homeScreen),
      AppRoutes.waitlistGateScreen,
    );
  });

  testWidgets(
      'WaitlistGateScreen renders rejection reason for rejected driver and tapping re-apply navigates to onboardingDocumentsScreen',
      (WidgetTester tester) async {
    final rejectedDriver = UserModel(
      id: 'driver-rejected-2',
      phone: '+919876543210',
      fullName: 'Rejected Driver',
      role: 'DRIVER',
      hasPassword: true,
      isOnboarded: false,
      driverProfile: const {
        'verificationStatus': 'REJECTED',
        'rejectionReason': 'Blurry or unreadable Driving License image',
      },
    );
    AuthService.instance.authStateListenable.value = rejectedDriver;
    AuthService.instance.setCurrentUser(rejectedDriver);

    final onboarding = OnboardingProvider()..setRole('DRIVER');
    final authProvider = AuthProvider();

    final router = GoRouter(
      initialLocation: AppRoutes.waitlistGateScreen,
      refreshListenable: AuthService.instance.authStateListenable,
      redirect: (context, state) {
        return AppRoutes.resolveRedirect(
          AuthService.instance.currentUser,
          state.matchedLocation,
        );
      },
      routes: [
        GoRoute(
          path: AppRoutes.waitlistGateScreen,
          builder: (_, __) => const WaitlistGateScreen(),
        ),
        GoRoute(
          path: AppRoutes.onboardingDocumentsScreen,
          builder: (_, __) => const Scaffold(body: Text('DocumentsScreenPlaceholder')),
        ),
        GoRoute(
          path: AppRoutes.onboardingPersonalScreen,
          builder: (_, __) => const Scaffold(body: Text('PersonalScreenPlaceholder')),
        ),
      ],
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider<OnboardingProvider>.value(value: onboarding),
        ],
        child: MaterialApp.router(
          theme: AppTheme.lightTheme,
          routerConfig: router,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Must NOT have redirected to PersonalScreenPlaceholder!
    expect(find.text('PersonalScreenPlaceholder'), findsNothing);

    // Must show rejection reason
    expect(find.text('Blurry or unreadable Driving License image'), findsOneWidget);

    // Must show Re-Upload button
    final reApplyBtn = find.text('Re-Upload Documents & Re-Apply');
    expect(reApplyBtn, findsOneWidget);

    await tester.ensureVisible(reApplyBtn);
    await tester.tap(reApplyBtn);
    await tester.pumpAndSettle();

    // Must have navigated to DocumentsScreenPlaceholder!
    expect(find.text('DocumentsScreenPlaceholder'), findsOneWidget);
    expect(
      router.routeInformationProvider.value.uri.path,
      AppRoutes.onboardingDocumentsScreen,
    );
  });
}
