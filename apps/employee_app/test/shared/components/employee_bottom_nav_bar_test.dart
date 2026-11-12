import 'package:adhocx_employee/shared/components/navigation/employee_bottom_nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('employee navigation is edge-to-edge and selects the tapped tab',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var selectedIndex = -1;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: EmployeeBottomNavBar(
            currentIndex: 0,
            onTap: (index) => selectedIndex = index,
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    final navBounds = tester.getRect(find.byType(EmployeeBottomNavBar));
    expect(navBounds.left, 0);
    expect(navBounds.right, 320);
    expect(navBounds.bottom, 640);

    await tester.tap(find.text('Schedule'));
    expect(selectedIndex, 1);
  });
}
