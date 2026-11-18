import 'dart:convert';
import 'package:adhocx_employee/features/home/home.dart';
import 'package:adhocx_employee/features/schedule/requests/request_change_options_screen.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAuthRepository implements EmployeeAuthRepository {
  @override
  Future<void> sendOtp(String mobileNumber) async {}
  @override
  Future<EmployeeUser?> getCurrentUser() async => null;
  @override
  Future<void> signOut() async {}
  @override
  Future<void> deleteAccount() async {}
  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) =>
      throw UnimplementedError();
  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) =>
      throw UnimplementedError();
}

final _screens = <String, Widget Function()>{
  'Home dashboard': () => const HomeScreenPlaceholder(),
  'Home upcoming pickup': () => const HomeUpcomingPickupScreen(),
  'Home upcoming drop': () => const HomeUpcomingDropScreen(),
  'Home no upcoming trip': () => const HomeNoUpcomingTripScreen(),
};

EmployeeDataProvider _seededDataProvider() {
  SharedPreferences.setMockInitialValues({});
  final mockHttp = MockClient((req) async {
    final path = req.url.path;
    if (path.endsWith('/corporate/me')) {
      return http.Response(
        jsonEncode({
          'data': {
            'employeeId': 'emp-1',
            'employeeCode': 'EMP001',
            'fullName': 'Ananya Sharma',
            'tenant': {'name': 'Acme Corp'},
            'office': {'name': 'HITEC City Campus'},
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
            'routeNumber': 'RT-101',
            'direction': 'LOGIN',
            'shiftDate': '2026-11-18',
            'shiftTime': '09:00',
            'plannedEta': '08:15',
            'stopStatus': 'ASSIGNED',
            'boardingOtp': '4829',
            'pickupLocation': {'addressText': 'Madhapur Main Rd'},
            'officeDestination': {'name': 'HITEC City Campus'},
            'driver': {'name': 'Arjun Reddy', 'rating': 4.9},
            'vehicle': {
              'registrationNumber': 'TS09UB7845',
              'model': 'Toyota Innova',
            },
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response(
      jsonEncode({'data': []}),
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

Widget _app(
  Widget home, {
  bool dark = false,
  EmployeeDataProvider? dataProvider,
}) =>
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => EmployeeAuthProvider(repository: _FakeAuthRepository()),
        ),
        if (dataProvider != null)
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
          ),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        home: home,
      ),
    );

void main() {
  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    _screens.forEach((name, build) {
      testWidgets('$name renders on a 360x640 phone in $mode mode',
          (tester) async {
        tester.view.physicalSize = const Size(360, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(_app(build(), dark: dark));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
        expect(scaffold.backgroundColor,
            dark ? AppColors.bgDark : AppColors.bgLight);
        // Exactly one SOS shortcut and one bottom navigation bar.
        expect(find.byType(EmployeeSosButton), findsOneWidget);
        expect(find.byType(EmployeeBottomNavBar), findsOneWidget);
      });
    });
  }

  testWidgets('home trip labels fit at a narrow mobile width', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final dataProvider = _seededDataProvider();
    await tester.pumpWidget(
      _app(const HomeUpcomingPickupScreen(), dataProvider: dataProvider),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    for (final label in [
      'Details',
      'Request Change',
      'Cancel Trip',
      'TS09UB7845',
    ]) {
      final text = find.text(label);
      expect(text, findsOneWidget);
      expect(
        tester.renderObject<RenderParagraph>(text).didExceedMaxLines,
        isFalse,
        reason: '$label should remain readable on a narrow phone',
      );
    }
  });

  testWidgets('Request Change opens options from home trip screens',
      (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final dataProvider = _seededDataProvider();
    final router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        GoRoute(
          path: AppRoutes.home,
          builder: (_, __) => const HomeScreenPlaceholder(),
        ),
        GoRoute(
          path: AppRoutes.homeUpcomingPickup,
          builder: (_, __) => const HomeUpcomingPickupScreen(),
        ),
        GoRoute(
          path: AppRoutes.requestChangeOptions,
          builder: (_, __) => const RequestChangeOptionsScreen(),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(
            create: (_) =>
                EmployeeAuthProvider(repository: _FakeAuthRepository()),
          ),
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
          ),
        ],
        child: MaterialApp.router(
          theme: AppTheme.lightTheme,
          routerConfig: router,
        ),
      ),
    );

    for (final route in [AppRoutes.home, AppRoutes.homeUpcomingPickup]) {
      router.go(route);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Request Change').last);
      await tester.tap(find.text('Request Change').last);
      await tester.pumpAndSettle();

      expect(find.text('What do you want to change?'), findsOneWidget);
    }
  });

  testWidgets('bottom nav tabs navigate without per-screen wiring',
      (tester) async {
    Widget page(String label) => Scaffold(body: Text(label));
    final router = GoRouter(
      initialLocation: '/start',
      routes: [
        GoRoute(
          path: '/start',
          builder: (_, __) => const Scaffold(
            bottomNavigationBar: EmployeeBottomNavBar(currentIndex: 0),
          ),
        ),
        GoRoute(
            path: AppRoutes.homeUpcomingPickup,
            builder: (_, __) => page('HOME')),
        GoRoute(
            path: AppRoutes.scheduleToday,
            builder: (_, __) => page('SCHEDULE')),
        GoRoute(
            path: AppRoutes.historyOverview, builder: (_, __) => page('TRIPS')),
        GoRoute(
            path: AppRoutes.profileDetails,
            builder: (_, __) => page('PROFILE')),
      ],
    );
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));

    await tester.tap(find.byIcon(Icons.calendar_month_outlined));
    await tester.pumpAndSettle();
    expect(find.text('SCHEDULE'), findsOneWidget);

    router.go('/start');
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();
    expect(find.text('PROFILE'), findsOneWidget);
  });
}
