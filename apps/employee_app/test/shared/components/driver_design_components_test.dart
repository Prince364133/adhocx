import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  bool dark = false,
  Size size = const Size(360, 800),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: child,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

ButtonStyle _styleOf(WidgetTester tester, Type buttonType) {
  final widget = tester.widget(find.byType(buttonType).first);
  return (widget as ButtonStyleButton).style!;
}

double _radiusOf(ButtonStyle style) {
  final shape = style.shape!.resolve({}) as RoundedRectangleBorder;
  return (shape.borderRadius as BorderRadius).topLeft.x;
}

void main() {
  group('Buttons follow the Driver app spec', () {
    testWidgets('primary: 48px tall, 8px radius, flat, brand primary',
        (tester) async {
      await _pump(tester, EmployeePrimaryButton(label: 'Go', onPressed: () {}));

      expect(tester.getSize(find.byType(ElevatedButton)).height, 48);
      final style = _styleOf(tester, ElevatedButton);
      expect(_radiusOf(style), 8);
      expect(style.elevation!.resolve({}), 0);
      expect(style.backgroundColor!.resolve({}), AppColors.primary);
    });

    testWidgets('secondary: 48px tall, 8px radius, 1.2px border',
        (tester) async {
      await _pump(
          tester, EmployeeSecondaryButton(label: 'Back', onPressed: () {}));

      expect(tester.getSize(find.byType(OutlinedButton)).height, 48);
      final style = _styleOf(tester, OutlinedButton);
      expect(_radiusOf(style), 8);
      expect(style.side!.resolve({})!.width, 1.2);
    });

    testWidgets('danger: filled uses the error colour', (tester) async {
      await _pump(tester, EmployeeDangerButton(label: 'SOS', onPressed: () {}));

      expect(_styleOf(tester, ElevatedButton).backgroundColor!.resolve({}),
          AppColors.error);
    });
  });

  group('Status badge maps onto Driver semantic colours', () {
    Color fillOf(WidgetTester tester) {
      final box = tester.widget<Container>(find.descendant(
        of: find.byType(EmployeeStatusBadge),
        matching: find.byType(Container),
      ).first);
      return (box.decoration! as BoxDecoration).color!;
    }

    final cases = <String, Color>{
      'Completed': AppColors.successContainer,
      'Cancelled': AppColors.errorContainer,
      'Pending': AppColors.warningContainer,
      'Cab Assigned': AppColors.infoContainer,
    };
    cases.forEach((status, expected) {
      testWidgets('"$status"', (tester) async {
        await _pump(tester, EmployeeStatusBadge.fromString(status));
        expect(fillOf(tester), expected);
      });
    });
  });

  testWidgets('bottom nav reports taps and marks the selected tab',
      (tester) async {
    final taps = <int>[];
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(
        bottomNavigationBar:
            EmployeeBottomNavBar(currentIndex: 1, onTap: taps.add),
      ),
    ));

    await tester.tap(find.text('Trips'));
    expect(taps, [2]);
    expect(find.byIcon(Icons.calendar_month), findsOneWidget); // filled = active
    expect(find.byIcon(Icons.home_outlined), findsOneWidget); // outlined = idle
  });

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets('all components render without errors in $mode mode at 360dp',
        (tester) async {
      await _pump(
        tester,
        dark: dark,
        Column(
          children: [
            const EmployeeBrandLogo(subtitle: 'Employee Commute'),
            EmployeeGreetingHeader(
              name: 'Ravi Kumar',
              onSosTap: () {},
              onNotificationTap: () {},
            ),
            EmployeeSectionHeader(
                title: 'Upcoming', actionLabel: 'View all', onActionTap: () {}),
            EmployeeHeroTripCard(
              title: 'Home → Office',
              date: 'Mon, 16 Nov',
              time: '08:45 AM',
              primaryActionLabel: 'Track Cab',
              onPrimaryAction: () {},
              secondaryActionLabel: 'Details',
              onSecondaryAction: () {},
            ),
            EmployeeTripCard(
              title: 'Office drop with a long title that must ellipsize',
              date: 'Today',
              time: '07:30 PM',
              status: 'Cab Assigned',
              route: 'HITEC City → Kondapur',
              isDrop: true,
              onTap: () {},
            ),
            EmployeeDriverCard(
              name: 'Suresh R',
              vehicleNumber: 'TS09UB7845',
              vehicleModel: 'Toyota Etios',
              experience: '6 yrs experience',
              onCall: () {},
              onChat: () {},
              onViewDetails: () {},
            ),
            EmployeePillFilter(
              options: const ['All', 'Pickup', 'Drop'],
              selectedIndex: 0,
              counts: const {0: 12},
              onSelected: (_) {},
            ),
            ScheduleTabBar(activeTab: ScheduleTab.week, onTabChanged: (_) {}),
            const EmployeeStepTracker(currentStep: 2),
            EmployeeEmptyState(
              icon: Icons.event_busy,
              title: 'No trips today',
              description: 'Your schedule is clear.',
              actionLabel: 'View schedule',
              onActionPressed: () {},
            ),
            EmployeeConfirmationSheet(
              title: 'Sign out?',
              description: 'You will need an OTP to sign in again.',
              onConfirm: () {},
            ),
            EmployeeDriverContactSheet(
              driverName: 'Suresh R',
              vehicleNumber: 'TS09UB7845',
              phone: '+91 98765 00111',
              onCall: () {},
              onChat: () {},
            ),
            EmployeeOtpInput(onCompleted: (_) {}, autofocus: false),
          ],
        ),
      );

      expect(tester.takeException(), isNull);
    });

    testWidgets('app bar uses the page background in $mode mode',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        home: const Scaffold(appBar: EmployeeAppBar(title: 'Trip Details')),
      ));

      final bar = tester.widget<AppBar>(find.byType(AppBar));
      expect(bar.backgroundColor, dark ? AppColors.bgDark : AppColors.bgLight);
      expect(find.byIcon(Icons.arrow_back), findsOneWidget);
    });
  }
}
