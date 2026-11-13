import 'package:adhocx_employee/features/home/home.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class _FakeAuthRepository implements EmployeeAuthRepository {
  @override
  Future<void> sendOtp(String mobileNumber) async {}
  @override
  Future<EmployeeUser?> getCurrentUser() async => null;
  @override
  Future<void> signOut() async {}
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

Widget _app(Widget home, {bool dark = false}) => ChangeNotifierProvider(
      create: (_) => EmployeeAuthProvider(repository: _FakeAuthRepository()),
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
        await tester.runAsync(MockDataService.loadData);

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
            path: AppRoutes.scheduleToday, builder: (_, __) => page('SCHEDULE')),
        GoRoute(
            path: AppRoutes.historyOverview, builder: (_, __) => page('TRIPS')),
        GoRoute(
            path: AppRoutes.profileDetails, builder: (_, __) => page('PROFILE')),
      ],
    );
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));

    await tester.tap(find.text('Schedule'));
    await tester.pumpAndSettle();
    expect(find.text('SCHEDULE'), findsOneWidget);

    router.go('/start');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('PROFILE'), findsOneWidget);
  });
}
