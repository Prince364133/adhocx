import 'package:adhocx_employee/features/boarding/boarding.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _screens = <String, Widget Function()>{
  'Verify options': () => const BoardingVerifyOptionsScreen(),
  'OTP input': () => const BoardingOtpInputScreen(),
  'Scan QR': () => const ScanBoardingQrScreen(),
  'Verifying': () => const VerifyingBoardingScreen(),
  'Boarding successful': () => const BoardingSuccessfulScreen(),
  'Wrong OTP': () => const WrongOtpScreen(),
  'Boarding issue': () => const BoardingIssueScreen(),
  'Trip in progress en route': () => const TripInProgressEnRouteScreen(),
  'Drop reached': () => const DropReachedScreen(),
  'Trip completed summary': () => const TripCompletedSummaryScreen(),
  'Safe reach': () => const SafeReachConfirmationScreen(),
  'Post-trip feedback': () => const PostTripFeedbackScreen(),
};

GoRouter _router(Widget screen) {
  Widget landed(String route) => Scaffold(body: Text('LANDED $route'));
  return GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      for (final route in [
        AppRoutes.verifyingBoarding,
        AppRoutes.wrongOtp,
        AppRoutes.boardingSuccessful,
      ])
        GoRoute(path: route, builder: (_, __) => landed(route)),
    ],
  );
}

Future<void> _pump(WidgetTester tester, Widget screen, {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.runAsync(MockDataService.loadData);
  await tester.pumpWidget(MaterialApp.router(
    theme: AppTheme.lightTheme,
    darkTheme: AppTheme.darkTheme,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    routerConfig: _router(screen),
  ));
  // Spinners animate forever, so step time instead of pumpAndSettle.
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    _screens.forEach((name, build) {
      testWidgets('$name renders on a 360x640 phone in $mode mode',
          (tester) async {
        await _pump(tester, build(), dark: dark);

        expect(tester.takeException(), isNull);
        final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
        // QR scanner is a camera surface: black in both modes.
        final expected = name == 'Scan QR'
            ? AppColors.bgDark
            : (dark ? AppColors.bgDark : AppColors.bgLight);
        expect(scaffold.backgroundColor, expected);

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 2)); // drain timers
      });
    });
  }

  testWidgets('boarding OTP input accepts typed digits; right code verifies',
      (tester) async {
    await _pump(tester, const BoardingOtpInputScreen());
    await tester.enterText(find.byType(TextField), '583271');
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.text('LANDED ${AppRoutes.verifyingBoarding}'), findsOneWidget);
  });

  testWidgets('a wrong boarding OTP opens the Invalid OTP state',
      (tester) async {
    await _pump(tester, const BoardingOtpInputScreen());
    await tester.enterText(find.byType(TextField), '111111');
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.text('LANDED ${AppRoutes.wrongOtp}'), findsOneWidget);
  });

  testWidgets('feedback character counter updates while typing',
      (tester) async {
    await _pump(tester, const PostTripFeedbackScreen());
    expect(find.text('0/200'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Great ride');
    await tester.pump();
    expect(find.text('10/200'), findsOneWidget);
  });
}
