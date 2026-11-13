import 'package:adhocx_employee/features/driver/driver.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _screens = <String, Widget Function()>{
  'Assignment notification': () => const AssignmentNotificationScreen(),
  'Cab assigned overview': () => const CabAssignedOverviewScreen(),
  'Driver details': () => const DriverDetailsScreen(),
  'Vehicle details': () => const VehicleDetailsScreen(),
  'Contact driver sheet': () => const ContactDriverSheetScreen(),
  'Cab reassigned': () => const CabReassignedScreen(),
  'Assignment delayed': () => const AssignmentDelayedScreen(),
  'Driver replaced': () => const DriverReplacedScreen(),
  'Driver delay': () => const DriverDelayScreen(),
  'Vehicle issue': () => const VehicleIssueScreen(),
  'Assignment history': () => const AssignmentHistoryScreen(),
  'Pickup sequence': () => const PickupSequenceScreen(),
  'No cab available': () => const NoCabAvailableScreen(),
};

/// Screens with an intentionally fixed backdrop (lock screen / sheet scrim).
const _fixedBackdrop = {'Assignment notification', 'Contact driver sheet'};

Future<void> _pump(WidgetTester tester, Widget screen, {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.runAsync(MockDataService.loadData);
  final router = GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      GoRoute(
        path: AppRoutes.safetyLiveChat,
        builder: (_, __) => const Scaffold(body: Text('LANDED chat')),
      ),
    ],
  );
  await tester.pumpWidget(MaterialApp.router(
    theme: AppTheme.lightTheme,
    darkTheme: AppTheme.darkTheme,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    routerConfig: router,
  ));
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
        if (!_fixedBackdrop.contains(name)) {
          final scaffold =
              tester.widget<Scaffold>(find.byType(Scaffold).first);
          expect(scaffold.backgroundColor,
              dark ? AppColors.bgDark : AppColors.bgLight);
        }
        await tester.pumpWidget(const SizedBox.shrink());
      });
    });
  }

  testWidgets('"Contact Support" opens live support chat', (tester) async {
    await _pump(tester, const NoCabAvailableScreen());
    await tester.ensureVisible(find.text('Contact Support'));
    await tester.tap(find.text('Contact Support'));
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.text('LANDED chat'), findsOneWidget);
  });
}
