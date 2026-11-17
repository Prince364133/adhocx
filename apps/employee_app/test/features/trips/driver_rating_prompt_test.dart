import 'dart:convert';

import 'package:adhocx_employee/features/boarding/completion/trip_completed_summary_screen.dart';
import 'package:adhocx_employee/features/profile_settings/history/trip_history_details_screen.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/features/trips/summary/trip_completed_screen.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> _trip({
  String routeStatus = 'COMPLETED',
  bool hasFeedback = false,
}) =>
    {
      'stopId': 'stop-123',
      'routeId': 'route-456',
      'routeStatus': routeStatus,
      'status': 'DROPPED',
      'shiftDate': '2026-11-16',
      'shiftTime': '08:15',
      'direction': 'LOGIN',
      'pickupAddress': 'Home',
      'destinationAddress': 'Office',
      'driver': {'id': 'driver-789', 'fullName': 'Asha', 'rating': 4.8},
      'vehicle': {'model': 'Ertiga', 'plateNumber': 'TS09UB7845'},
      'hasFeedback': hasFeedback,
    };

HttpEmployeeRiderRepository _repository({
  required String routeStatus,
  required bool hasFeedback,
  void Function()? onHistoryRead,
}) =>
    HttpEmployeeRiderRepository(
      client: EmployeeApiClient(
        baseUrl: 'http://localhost:7001/api/v1',
        httpClient: MockClient((request) async {
          if (request.method == 'GET') {
            onHistoryRead?.call();
            return http.Response(
              jsonEncode({
                'data': [
                  _trip(routeStatus: routeStatus, hasFeedback: hasFeedback)
                ]
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('{}', 200);
        }),
      ),
    );

Widget _app(HttpEmployeeRiderRepository repository, Widget home) =>
    Provider<HttpEmployeeRiderRepository>.value(
      value: repository,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: home,
      ),
    );

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('auto-prompts only on backend completion and persists dismissal',
      (tester) async {
    await tester.runAsync(MockDataService.loadData);
    var historyReads = 0;
    final repository = _repository(
      routeStatus: 'COMPLETED',
      hasFeedback: false,
      onHistoryRead: () => historyReads++,
    );

    await tester.pumpWidget(
      _app(repository, TripCompletedSummaryScreen(key: UniqueKey())),
    );
    await tester.pumpAndSettle();
    expect(find.text('Did this driver make you feel safe?'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(
      (await SharedPreferences.getInstance()).getStringList(
        'employee_driver_rating_prompted_trip_ids',
      ),
      contains('stop-123'),
    );

    await tester.pumpWidget(
      _app(repository, TripCompletedSummaryScreen(key: UniqueKey())),
    );
    await tester.pumpAndSettle();
    expect(find.text('Did this driver make you feel safe?'), findsNothing);
    expect(historyReads, 2);
  });

  testWidgets('does not auto-prompt while backend trip is ongoing',
      (tester) async {
    await tester.runAsync(MockDataService.loadData);
    final repository = _repository(
      routeStatus: 'IN_TRANSIT',
      hasFeedback: false,
    );

    await tester.pumpWidget(
      _app(repository, const TripCompletedSummaryScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Did this driver make you feel safe?'), findsNothing);
  });

  testWidgets('also prompts automatically on the completed-trip screen',
      (tester) async {
    await tester.runAsync(MockDataService.loadData);
    final repository = _repository(
      routeStatus: 'COMPLETED',
      hasFeedback: false,
    );

    await tester.pumpWidget(
      _app(repository, const TripCompletedScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Did this driver make you feel safe?'), findsOneWidget);
  });

  testWidgets('dismissed trip can still be rated from Trip History',
      (tester) async {
    final repository = _repository(
      routeStatus: 'COMPLETED',
      hasFeedback: false,
    );
    final trip = DriverRatingTrip.tryParse(_trip())!;

    await tester.pumpWidget(
      _app(repository, TripHistoryDetailsScreen(trip: trip)),
    );
    await tester.ensureVisible(find.text('Rate Driver'));
    await tester.tap(find.text('Rate Driver'));
    await tester.pumpAndSettle();

    expect(find.text('Did this driver make you feel safe?'), findsOneWidget);
  });
}
