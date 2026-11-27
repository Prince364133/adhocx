import 'dart:async';
import 'dart:convert';

import 'package:adhocx_employee/features/boarding/completion/driver_safety_rating_sheet.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('only completed trips with a driver and no feedback can be rated', () {
    DriverRatingTrip tripWithStatus(String status) => DriverRatingTrip(
          stopId: 'stop-1',
          routeId: 'route-1',
          routeStatus: status,
          stopStatus: 'DROPPED',
          shiftDate: '2026-11-16',
          shiftTime: '08:15',
          direction: 'LOGIN',
          pickupAddress: 'Home',
          destinationAddress: 'Office',
          driverId: 'driver-1',
          driverName: 'Asha',
          driverRating: 4.8,
          driverPhotoUrl: null,
          vehicleModel: '',
          vehiclePlate: '',
          hasFeedback: false,
          feedbackRating: null,
        );

    expect(tripWithStatus('COMPLETED').canRate, isTrue);
    expect(tripWithStatus('IN_TRANSIT').canRate, isFalse);
    expect(tripWithStatus('CANCELLED').canRate, isFalse);
  });

  testWidgets('submits safety and star rating for the selected trip once',
      (tester) async {
    http.Request? submittedRequest;
    var postCount = 0;
    final response = Completer<http.Response>();
    final repository = HttpEmployeeRiderRepository(
      client: EmployeeApiClient(
        baseUrl: 'http://localhost:7001/api/v1',
        httpClient: MockClient((request) async {
          if (request.method == 'POST') {
            postCount++;
            submittedRequest = request;
            return response.future;
          }
          return http.Response('{}', 200);
        }),
      ),
    );
    const trip = DriverRatingTrip(
      stopId: 'stop-123',
      routeId: 'route-456',
      routeStatus: 'COMPLETED',
      stopStatus: 'DROPPED',
      shiftDate: '2026-11-16',
      shiftTime: '08:15',
      direction: 'LOGIN',
      pickupAddress: 'Home',
      destinationAddress: 'Office',
      driverId: 'driver-789',
      driverName: 'Asha',
      driverRating: 4.8,
      driverPhotoUrl: null,
      vehicleModel: 'Ertiga',
      vehiclePlate: 'TS09UB7845',
      hasFeedback: false,
      feedbackRating: null,
    );
    bool? submitted;

    await tester.pumpWidget(
      Provider<HttpEmployeeRiderRepository>.value(
        value: repository,
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  submitted = await showDriverSafetyRatingSheet(context, trip);
                },
                child: const Text('Open rating'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open rating'));
    await tester.pumpAndSettle();
    expect(find.text('Did this driver make you feel safe?'), findsOneWidget);
    expect(find.text('How was your ride?'), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);

    await tester.tap(find.text('No'));
    await tester.pump();
    await tester.ensureVisible(find.byTooltip('Rate 4 stars'));
    await tester.tap(find.byTooltip('Rate 4 stars'));
    await tester.pump();
    final submitFinder = find.widgetWithText(ElevatedButton, 'Submit');
    await tester.ensureVisible(submitFinder);
    await tester.tap(submitFinder);
    await tester.pump();

    expect(postCount, 1);
    final submitButton = tester.widget<ElevatedButton>(
      find.byType(ElevatedButton).last,
    );
    expect(submitButton.onPressed, isNull);

    response.complete(
      http.Response(
        '{"data":{"id":"feedback-1"}}',
        201,
        headers: {'content-type': 'application/json'},
      ),
    );
    await tester.pumpAndSettle();
    expect(submitted, isTrue);
    expect(postCount, 1);
    expect(
      submittedRequest?.url.path,
      '/api/v1/corporate/me/trips/stop-123/feedback',
    );
    expect(
      jsonDecode(submittedRequest!.body),
      {'rating': 4, 'feltSafe': false},
    );
  });
}
