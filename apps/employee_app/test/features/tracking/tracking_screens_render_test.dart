import 'package:adhocx_employee/features/tracking/tracking.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

final _screens = <String, Widget Function()>{
  'Live tracking overview': () => const LiveTrackingOverviewScreen(),
  'Live map full': () => const TripLiveMapFullScreen(),
  'Pickup point details': () => const PickupPointDetailsScreen(),
  'Walking directions': () => const WalkingDirectionsScreen(),
  'Cab approaching': () => const CabApproachingScreen(),
  'Cab arrived': () => const CabArrivedScreen(),
  'Trip progress on trip': () => const TripProgressOnTripScreen(),
  'Route and stops': () => const RouteAndStopsScreen(),
  'GPS unavailable': () => const GpsUnavailableScreen(),
  'Stale location': () => const StaleLocationScreen(),
  'Poor network': () => const PoorNetworkScreen(),
  'Reconnecting': () => const ReconnectingScreen(),
};

Future<void> _pump(WidgetTester tester, Widget screen, {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.runAsync(MockDataService.loadData);
  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.lightTheme,
    darkTheme: AppTheme.darkTheme,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    home: screen,
  ));
  // Some screens animate forever (live map, reconnect spinner), so step time
  // forward instead of pumpAndSettle.
  for (var i = 0; i < 10; i++) {
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
        expect(scaffold.backgroundColor,
            dark ? AppColors.bgDark : AppColors.bgLight);

        await tester.pumpWidget(const SizedBox.shrink());
      });
    });
  }

  Future<String?> trackerLabel(WidgetTester tester) async {
    final handle = tester.ensureSemantics();
    final node = tester.getSemantics(find.bySemanticsLabel(
      RegExp(r'^Trip progress: '),
    ));
    handle.dispose();
    return node.label;
  }

  testWidgets('Cab approaching highlights the Approaching step', (tester) async {
    await _pump(tester, const CabApproachingScreen());
    expect(await trackerLabel(tester), contains('Approaching, step 3 of 5'));
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('Cab arrived highlights the Arrived step', (tester) async {
    await _pump(tester, const CabArrivedScreen());
    expect(await trackerLabel(tester), contains('Arrived, step 4 of 5'));
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
