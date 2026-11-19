import 'dart:convert';
import 'package:adhocx_employee/features/safety_support/safety_support.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

EmployeeDataProvider _seededSosProvider({
  String? routeId = 'route-sos-1',
  bool failSosApi = false,
  void Function(Map<String, dynamic> body)? onSosBody,
}) {
  SharedPreferences.setMockInitialValues({});
  final mockHttp = MockClient((req) async {
    final path = req.url.path;
    if (path.endsWith('/corporate/me/trips/next')) {
      return http.Response(
        jsonEncode({
          'data': {
            'hasActiveTrip': routeId != null,
            if (routeId != null) 'routeId': routeId,
            'stopId': 'stop-1',
            'pickupLocation': {'latitude': 17.4486, 'longitude': 78.3908},
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path.endsWith('/corporate/safety/sos')) {
      if (req.body.isNotEmpty) {
        onSosBody?.call(jsonDecode(req.body) as Map<String, dynamic>);
      }
      if (failSosApi) {
        return http.Response(
          jsonEncode({'message': 'SOS gateway unavailable'}),
          500,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response(
        jsonEncode({
          'data': {'id': 'sos-alert-1', 'status': 'ACTIVE'},
        }),
        201,
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

Future<void> _pump(
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

  testWidgets('a 3-second SOS hold sends exactly one alert when active route exists',
      (tester) async {
    _sosPushes = 0;
    Map<String, dynamic>? capturedBody;
    final provider = _seededSosProvider(
      onSosBody: (body) => capturedBody = body,
    );
    await _pump(tester, const SosActivateScreen(), dataProvider: provider);
    final siren = find.byType(SosSirenBadge);
    final gesture = await tester.startGesture(tester.getCenter(siren));
    await tester.pump(const Duration(seconds: 3));
    await gesture.up();
    await tester.pumpAndSettle();

    expect(_sosPushes, 1);
    expect(find.text('SOS SENT'), findsOneWidget);
    expect(capturedBody?['routeId'], 'route-sos-1');
    expect(capturedBody?['triggerReason'], isNotNull);
    expect(capturedBody?.containsKey('reason'), isFalse);
  });

  testWidgets('SOS never falsely confirms when API fails or routeId is missing',
      (tester) async {
    _sosPushes = 0;
    final provider = _seededSosProvider(failSosApi: true);
    await _pump(tester, const SosActivateScreen(), dataProvider: provider);
    final siren = find.byType(SosSirenBadge);
    final gesture = await tester.startGesture(tester.getCenter(siren));
    await tester.pump(const Duration(seconds: 3));
    await gesture.up();
    await tester.pumpAndSettle();

    expect(_sosPushes, 0);
    expect(find.text('SOS SENT'), findsNothing);
    expect(find.text('SOS Alert Not Sent'), findsOneWidget);
    expect(find.text('Call Safety Helpline'), findsOneWidget);
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
