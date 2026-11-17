import 'package:adhocx_employee/features/driver/profiles/contact_driver_sheet_screen.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('contact sheet preserves the screen and drags from its handle',
      (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(MockDataService.loadData);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Stack(
          children: [
            ColoredBox(
              key: ValueKey('underlying-screen'),
              color: Colors.blue,
            ),
            ContactDriverSheetScreen(),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Contact Driver'), findsOneWidget);
    expect(find.byType(DraggableScrollableSheet), findsOneWidget);

    final handle = find.byKey(const ValueKey('app-bottom-sheet-handle'));
    final initialTop = tester.getTopLeft(handle).dy;
    final handleRect = tester.getRect(handle);
    await tester.dragFrom(
      Offset(handleRect.center.dx, handleRect.center.dy),
      const Offset(0, -120),
    );
    await tester.pumpAndSettle();

    expect(tester.getTopLeft(handle).dy, lessThan(initialTop));
    expect(tester.takeException(), isNull);
  });
}
