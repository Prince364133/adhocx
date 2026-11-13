import 'package:adhocx_employee/features/trips/trips.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _screens = <String, Widget Function()>{
  'Planning': () => const TripPlanningScreen(),
  'Assigned': () => const TripAssignedScreen(),
  'Approaching': () => const TripApproachingScreen(),
  'Arrived': () => const TripArrivedScreen(),
  'Boarded': () => const TripBoardedScreen(),
  'In progress': () => const TripInProgressScreen(),
  'Completed': () => const TripCompletedScreen(),
  'Completed details': () => const TripDetailsCompletedScreen(),
  'Cancelled': () => const TripCancelledScreen(),
  'Unserved': () => const TripUnservedScreen(),
  'Driver & vehicle': () => const DriverVehicleDetailsScreen(),
};

/// Router that records which route a screen navigates to.
GoRouter _router(Widget screen) {
  Widget landed(String route) => Scaffold(body: Text('LANDED $route'));
  return GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      for (final route in [
        AppRoutes.contactDriverSheet,
        AppRoutes.postTripFeedback,
        AppRoutes.tripDetails,
        AppRoutes.tripInProgress,
        AppRoutes.scheduleToday,
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
  await tester.pumpAndSettle();
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

  testWidgets('driver call button opens the contact-driver sheet',
      (tester) async {
    await _pump(tester, const TripAssignedScreen());
    await tester.tap(find.byTooltip('Call driver'));
    await tester.pumpAndSettle();
    expect(find.text('LANDED ${AppRoutes.contactDriverSheet}'), findsOneWidget);
  });

  testWidgets('"Provide Feedback" opens the post-trip feedback form',
      (tester) async {
    await _pump(tester, const TripCompletedScreen());
    await tester.ensureVisible(find.text('Provide Feedback'));
    await tester.tap(find.text('Provide Feedback'));
    await tester.pumpAndSettle();
    expect(find.text('LANDED ${AppRoutes.postTripFeedback}'), findsOneWidget);
  });

  testWidgets('unserved "View Schedule" opens the schedule', (tester) async {
    await _pump(tester, const TripUnservedScreen());
    await tester.ensureVisible(find.text('View Schedule'));
    await tester.tap(find.text('View Schedule'));
    await tester.pumpAndSettle();
    expect(find.text('LANDED ${AppRoutes.scheduleToday}'), findsOneWidget);
  });
}
