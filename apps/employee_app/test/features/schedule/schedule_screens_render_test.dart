import 'package:adhocx_employee/features/schedule/schedule.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _screens = <String, Widget Function()>{
  'Today overview': () => const ScheduleTodayOverviewScreen(),
  'Daily': () => const ScheduleDailyScreen(),
  'Weekly': () => const ScheduleWeeklyScreen(),
  'Monthly': () => const ScheduleMonthlyScreen(),
  'No trips': () => const ScheduleNoTripsScreen(),
  'Shift login': () => const ShiftDetailsLoginScreen(),
  'Shift overnight': () => const ShiftDetailsOvernightScreen(),
  'Request change options': () => const RequestChangeOptionsScreen(),
  'Change details': () => const ChangeRequestDetailsScreen(),
  'Change submitted': () => const ChangeRequestSubmittedScreen(),
  'Request pending': () => const RequestStatusPendingScreen(),
  'Request approved': () => const RequestStatusApprovedScreen(),
  'Request rejected': () => const RequestStatusRejectedScreen(),
  'Cancel trip': () => const CancelTripRequestScreen(),
};

Future<GoRouter> _pump(WidgetTester tester, Widget screen,
    {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.runAsync(MockDataService.loadData);
  final router = GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      GoRoute(
        path: AppRoutes.changeDetails,
        builder: (_, __) => const ChangeRequestDetailsScreen(),
      ),
      GoRoute(
        path: AppRoutes.tripCancelled,
        builder: (_, __) => const Scaffold(body: Text('LANDED cancelled')),
      ),
    ],
  );
  await tester.pumpWidget(MaterialApp.router(
    theme: AppTheme.lightTheme,
    darkTheme: AppTheme.darkTheme,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    routerConfig: router,
  ));
  await tester.pumpAndSettle();
  return router;
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
        expect(scaffold.backgroundColor,
            dark ? AppColors.bgDark : AppColors.bgLight);
      });
    });
  }

  testWidgets('the chosen change type carries to the details screen',
      (tester) async {
    await _pump(tester, const RequestChangeOptionsScreen());
    await tester.tap(find.text('Change Drop Time'));
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Change Drop Time'), findsOneWidget);
    expect(find.text('New Drop Time'), findsOneWidget);
  });

  testWidgets('Cancel Trip asks for confirmation before cancelling',
      (tester) async {
    await _pump(tester, const CancelTripRequestScreen());
    await tester.ensureVisible(find.text('Cancel Trip').last);
    await tester.tap(find.text('Cancel Trip').last);
    await tester.pumpAndSettle();

    expect(find.text('Cancel this trip?'), findsOneWidget);
    expect(find.text('LANDED cancelled'), findsNothing);

    await tester.tap(find.text('Yes, Cancel Trip'));
    await tester.pumpAndSettle();
    expect(find.text('LANDED cancelled'), findsOneWidget);
  });
}
