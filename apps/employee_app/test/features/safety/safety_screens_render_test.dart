import 'package:adhocx_employee/features/safety_support/safety_support.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _screens = <String, Widget Function()>{
  'Safety center': () => const SafetyCenterOverviewScreen(),
  'Safety tips': () => const SafetyTipsGuidelinesScreen(),
  'SOS activate': () => const SosActivateScreen(),
  'SOS confirmed': () => const SosAlertConfirmedScreen(),
  'Safety team call': () => const SafetyTeamCallScreen(),
  'Emergency contacts': () => const EmergencyContactsScreen(),
  'Report incident': () => const ReportIncidentScreen(),
  'Raise complaint': () => const RaiseComplaintScreen(),
  'Lost property': () => const LostPropertyScreen(),
  'Live chat': () => const LiveSupportChatScreen(),
  'My requests': () => const MyRequestsTicketsScreen(),
  'Request details': () => const RequestDetailsTrackingScreen(),
  'Request resolved': () => const RequestResolvedScreen(),
};

/// Emergency surfaces keep a fixed backdrop in both modes.
const _fixedBackdrop = {'SOS activate', 'SOS confirmed', 'Safety team call'};

int _sosPushes = 0;

Future<void> _pump(WidgetTester tester, Widget screen,
    {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.runAsync(MockDataService.loadData);
  final router = GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      GoRoute(
        path: AppRoutes.sosAlertConfirmed,
        builder: (_, __) {
          _sosPushes++;
          return const Scaffold(body: Text('SOS SENT'));
        },
      ),
      GoRoute(
        path: AppRoutes.myRequestsTickets,
        builder: (_, __) => const Scaffold(body: Text('TICKETS')),
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
          final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
          expect(scaffold.backgroundColor,
              dark ? AppColors.bgDark : AppColors.bgLight);
        }
        await tester.pumpWidget(const SizedBox.shrink());
      });
    });
  }

  testWidgets('SOS screen keeps hold action and cancel without the slider',
      (tester) async {
    await _pump(tester, const SosActivateScreen());

    expect(find.byType(Slider), findsNothing);
    expect(
      find.text('Press and hold for 3 seconds\nto send an emergency alert.'),
      findsOneWidget,
    );
    expect(find.text('Cancel'), findsOneWidget);
  });

  testWidgets('a 3-second SOS hold sends exactly one alert', (tester) async {
    _sosPushes = 0;
    await _pump(tester, const SosActivateScreen());
    final siren = find.byType(SosSirenBadge);
    final gesture = await tester.startGesture(tester.getCenter(siren));
    await tester.pump(const Duration(seconds: 3));
    await gesture.up();
    await tester.pumpAndSettle();

    expect(_sosPushes, 1);
    expect(find.text('SOS SENT'), findsOneWidget);
  });

  testWidgets('incident submit is disabled until a description is entered',
      (tester) async {
    await _pump(tester, const ReportIncidentScreen());
    ElevatedButton submit() => tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, 'Submit Report'));

    expect(submit().onPressed, isNull);
    await tester.enterText(find.byType(TextField), 'Driver skipped my stop');
    await tester.pump();
    expect(submit().onPressed, isNotNull);
    expect(find.text('22/200'), findsOneWidget);
  });
}
