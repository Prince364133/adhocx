import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/user/requirements/widgets/select_route_sub_bottom_sheet.dart';
import 'package:adhocx/user/requirements/widgets/zonal_quote_panel.dart';

void main() {
  testWidgets('SelectRouteSubBottomSheet pick Office Hub and Locality', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SelectRouteSubBottomSheet(),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.byType(SelectRouteSubBottomSheet), findsOneWidget);

    // Pick office hub
    final officeFinder = find.text('HITEC / Nanakramguda');
    expect(officeFinder, findsOneWidget);
    await tester.tap(officeFinder);
    await tester.pumpAndSettle();

    expect(find.text('Select Approved Office Hub'), findsOneWidget);

    // Tap Kokapet Hub in the list
    await tester.tap(find.text('Kokapet Hub'));
    await tester.pumpAndSettle();

    // Now verify office updated to Kokapet Hub
    expect(find.text('Kokapet Hub'), findsOneWidget);

    // Now tap locality picker
    final localityFinder = find.text('Tap to select locality');
    expect(localityFinder, findsOneWidget);
    await tester.tap(localityFinder);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(ZonalLocalityPickerSheet), findsOneWidget);
  });
}
