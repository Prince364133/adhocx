import 'package:adhocx_employee/features/profile_settings/history/trip_history_overview_screen.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('offers employee sign-in for trip-history authorization errors',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final repository = HttpEmployeeRiderRepository(
      client: EmployeeApiClient(
        baseUrl: 'http://localhost:7001/api/v1',
        httpClient: MockClient(
          (_) async => http.Response(
            '{"error":{"message":"Access denied: required role (EMPLOYEE)"}}',
            403,
            headers: {'content-type': 'application/json'},
          ),
        ),
      ),
    );
    final router = GoRouter(
      initialLocation: AppRoutes.historyOverview,
      routes: [
        GoRoute(
          path: AppRoutes.historyOverview,
          builder: (_, __) => const TripHistoryOverviewScreen(),
        ),
        GoRoute(
          path: AppRoutes.mobileNumber,
          builder: (_, __) => const Scaffold(body: Text('Employee sign-in')),
        ),
      ],
    );

    await tester.pumpWidget(
      Provider<HttpEmployeeRiderRepository>.value(
        value: repository,
        child: MaterialApp.router(
          theme: AppTheme.lightTheme,
          routerConfig: router,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Sign in with an employee account to view trip history.'),
      findsOneWidget,
    );
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(find.text('Employee sign-in'), findsOneWidget);
  });
}
