import 'dart:convert';
import 'package:adhocx_employee/features/schedule/schedule.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

EmployeeDataProvider _seededScheduleProvider() {
  SharedPreferences.setMockInitialValues({});
  final mockHttp = MockClient((req) async {
    final path = req.url.path;
    if (path.endsWith('/corporate/me')) {
      return http.Response(
        jsonEncode({
          'data': {
            'employeeId': 'emp-1',
            'fullName': 'Ananya Sharma',
            'defaultPickupLocation': {'addressText': 'Madhapur Main Rd'},
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path.endsWith('/corporate/me/schedule')) {
      return http.Response(
        jsonEncode({
          'data': {
            'schedule': [
              {
                'requestId': 'req-1',
                'stopId': 'stop-1',
                'date': '2026-11-18',
                'direction': 'LOGOUT',
                'shiftTime': '6:30 PM',
                'canReschedule': true,
                'canCancel': true,
              },
            ],
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path.endsWith('/corporate/me/trips/next')) {
      return http.Response(
        jsonEncode({
          'data': {
            'hasActiveTrip': true,
            'stopId': 'stop-1',
            'routeId': 'route-1',
            'direction': 'LOGOUT',
            'shiftDate': '2026-11-18',
            'shiftTime': '18:30',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path.endsWith('/reschedule') || path.endsWith('/cancel')) {
      return http.Response(
        jsonEncode({'data': {'status': 'OK'}}),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response(
      jsonEncode({'data': {}}),
      200,
      headers: {'content-type': 'application/json'},
    );
  });
  return EmployeeDataProvider(
    repository: HttpEmployeeRiderRepository(
      client: EmployeeApiClient(httpClient: mockHttp),
    ),
  );
}

Future<GoRouter> _pump(
  WidgetTester tester,
  Widget screen, {
  bool dark = false,
  EmployeeDataProvider? dataProvider,
}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      GoRoute(
        path: AppRoutes.changeDetails,
        builder: (_, __) => const ChangeRequestDetailsScreen(),
      ),
      GoRoute(
        path: AppRoutes.changeSubmitted,
        builder: (_, state) {
          final extra = state.extra;
          return ChangeRequestSubmittedScreen(
            request: extra is Map<String, dynamic> ? extra : null,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.requestPending,
        builder: (_, state) {
          final extra = state.extra;
          return RequestStatusPendingScreen(
            request: extra is Map<String, dynamic> ? extra : null,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.tripCancelled,
        builder: (_, __) => const Scaffold(body: Text('LANDED cancelled')),
      ),
    ],
  );
  final app = MaterialApp.router(
    theme: AppTheme.lightTheme,
    darkTheme: AppTheme.darkTheme,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    routerConfig: router,
  );
  await tester.pumpWidget(
    dataProvider != null
        ? ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
            child: app,
          )
        : app,
  );
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

  testWidgets('change request proceeds through submitted and pending screens',
      (tester) async {
    final provider = _seededScheduleProvider();
    await _pump(
      tester,
      const RequestChangeOptionsScreen(),
      dataProvider: provider,
    );
    await tester.tap(find.text('Change Drop Time'));
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Submit Request'));
    await tester.tap(find.text('Submit Request'));
    await tester.pumpAndSettle();

    expect(find.text('Change Request\nSubmitted'), findsOneWidget);
    expect(find.text('New Drop Time'), findsOneWidget);
    expect(find.text('6:30 PM'), findsOneWidget);

    await tester.tap(find.text('View Request Status'));
    await tester.pumpAndSettle();

    expect(find.text('Request Status'), findsOneWidget);
    expect(find.text('Change Drop Time'), findsOneWidget);
    expect(find.text('6:30 PM'), findsOneWidget);
  });

  testWidgets('request change screen uses compact page gutters',
      (tester) async {
    await _pump(tester, const RequestChangeOptionsScreen());
    final scroll = tester.widget<SingleChildScrollView>(
      find.byType(SingleChildScrollView).first,
    );

    expect(
      scroll.padding,
      const EdgeInsets.symmetric(
        horizontal: AppSpacing.pageHorizontal,
        vertical: AppSpacing.sm,
      ),
    );
  });

  testWidgets('Cancel Trip asks for confirmation before cancelling',
      (tester) async {
    final provider = _seededScheduleProvider();
    await _pump(
      tester,
      const CancelTripRequestScreen(),
      dataProvider: provider,
    );
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
