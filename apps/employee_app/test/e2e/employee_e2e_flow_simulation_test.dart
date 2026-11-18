import 'dart:convert';
import 'package:adhocx_employee/features/home/home.dart';
import 'package:adhocx_employee/features/safety_support/safety_support.dart';
import 'package:adhocx_employee/features/schedule/requests/change_request_details_screen.dart';
import 'package:adhocx_employee/features/tracking/directions/route_and_stops_screen.dart';
import 'package:adhocx_employee/models/auth_state.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/repositories/http_employee_auth_repository.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _RecordedCall {
  final String method;
  final String path;
  final Map<String, dynamic>? body;

  const _RecordedCall(this.method, this.path, this.body);
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Employee App End-to-End Flow Simulation', () {
    test(
      '1) OTP request -> verify -> /corporate/me hydration & 404 TransportIneligibleException',
      () async {
        final calls = <_RecordedCall>[];
        var profileStatus = 200;

        final mockHttp = MockClient((req) async {
          final parsedBody = req.body.isNotEmpty
              ? jsonDecode(req.body) as Map<String, dynamic>
              : null;
          calls.add(_RecordedCall(req.method, req.url.path, parsedBody));

          if (req.url.path.endsWith('/auth/otp/request')) {
            return http.Response(
              jsonEncode({'data': {'sent': true}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (req.url.path.endsWith('/auth/otp/verify')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'accessToken': 'jwt-access-token-123',
                  'refreshToken': 'jwt-refresh-token-456',
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (req.url.path.endsWith('/corporate/me')) {
            if (profileStatus == 404) {
              return http.Response(
                jsonEncode({'message': 'Employee profile not found'}),
                404,
                headers: {'content-type': 'application/json'},
              );
            }
            return http.Response(
              jsonEncode({
                'data': {
                  'employeeId': 'emp-uuid-01',
                  'employeeCode': 'ACME-204',
                  'fullName': 'Priya Menon',
                  'email': 'priya.menon@acme.example',
                  'phoneNumber': '9876543210',
                  'tenant': {'name': 'Acme Mobility Corp'},
                  'office': {'name': 'Cyber Towers SEZ'},
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('{}', 404);
        });

        final client = EmployeeApiClient(
          baseUrl: 'https://api.test.adhocx.local/api/v1',
          httpClient: mockHttp,
        );
        final authRepo = HttpEmployeeAuthRepository(client: client);
        final authProvider = EmployeeAuthProvider(repository: authRepo);
        addTearDown(authProvider.dispose);
        await authProvider.ensureSessionChecked();

        // Step 1a: Request OTP with role=EMPLOYEE, isRegister=false
        final sent = await authProvider.sendOtp('9876543210');
        expect(sent, isTrue);
        final otpReq = calls.firstWhere(
          (c) => c.path.endsWith('/auth/otp/request'),
        );
        expect(otpReq.method, 'POST');
        expect(otpReq.body?['role'], 'EMPLOYEE');
        expect(otpReq.body?['isRegister'], isFalse);
        expect(otpReq.body?['phone'], '9876543210');

        // Step 1b: Verify OTP -> hydrates profile from GET /corporate/me
        final status = await authProvider.verifyOtp('123456');
        expect(status, AuthStatus.authenticated);
        expect(authProvider.currentUser?.fullName, 'Priya Menon');
        expect(authProvider.currentUser?.organization, 'Acme Mobility Corp');
        expect(authProvider.currentUser?.office, 'Cyber Towers SEZ');
        expect(await client.getAccessToken(), 'jwt-access-token-123');

        // Step 1c: 404 on /corporate/me throws TransportIneligibleException & clears session
        profileStatus = 404;
        await expectLater(
          authRepo.verifyOtp(mobileNumber: '9876543210', otp: '123456'),
          throwsA(isA<TransportIneligibleException>()),
        );
        expect(await client.getAccessToken(), isNull);
      },
    );

    testWidgets(
      '2-3) Live route hydration, HomeUpcomingPickupScreen & RouteAndStopsScreen rendering (zero mock names)',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        final mockHttp = MockClient((req) async {
          final path = req.url.path;
          if (path.endsWith('/corporate/me')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'employeeId': 'emp-uuid-01',
                  'employeeCode': 'ACME-204',
                  'fullName': 'Priya Menon',
                  'tenant': {'name': 'Acme Mobility Corp'},
                  'office': {'name': 'Cyber Towers SEZ'},
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips/next')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'hasActiveTrip': true,
                  'stopId': 'stop-101',
                  'routeId': 'route-901',
                  'routeNumber': 'RT-901',
                  'direction': 'LOGIN',
                  'shiftDate': '2026-11-18',
                  'shiftTime': '09:00',
                  'plannedEta': '08:20',
                  'stopStatus': 'APPROACHING',
                  'boardingOtp': '4829',
                  'pickupLocation': {'addressText': 'Kondapur Junction'},
                  'officeDestination': {'name': 'Cyber Towers SEZ'},
                  'driver': {'name': 'Vikram Naik', 'rating': 4.8},
                  'vehicle': {
                    'registrationNumber': 'TS07EX9090',
                    'model': 'Maruti Ertiga',
                  },
                  'routeStops': [
                    {
                      'stopSequence': 1,
                      'stopType': 'PICKUP',
                      'isCurrentUser': true,
                      'plannedEta': '08:20',
                      'addressText': 'Kondapur Junction',
                      'status': 'APPROACHING',
                    },
                    {
                      'stopSequence': 2,
                      'stopType': 'DROPOFF',
                      'isCurrentUser': false,
                      'plannedEta': '08:55',
                      'addressText': 'Cyber Towers SEZ',
                      'status': 'PENDING',
                    },
                  ],
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/schedule')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'schedule': [
                    {
                      'requestId': 'req-501',
                      'stopId': 'stop-101',
                      'date': '2026-11-18',
                      'direction': 'LOGIN',
                      'shiftTime': '09:00',
                      'canReschedule': true,
                      'canCancel': true,
                    },
                  ],
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips')) {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'stopId': 'stop-099',
                    'routeStatus': 'COMPLETED',
                    'shiftDate': '2026-11-17',
                    'destinationAddress': 'Cyber Towers SEZ',
                  },
                ],
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips/stop-101/tracking')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'stopId': 'stop-101',
                  'routeId': 'route-901',
                  'stopStatus': 'APPROACHING',
                  'boardingOtp': '4829',
                  'dynamicQrToken': 'QR-LIVE-901-4829',
                  'lastFixAgeSec': 12,
                  'driverLocation': {'latitude': 17.456, 'longitude': 78.371},
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/routes/route-901')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'id': 'route-901',
                  'stops': [
                    {
                      'stopSequence': 1,
                      'stopType': 'PICKUP',
                      'isCurrentUserStop': true,
                      'addressText': 'Kondapur Junction',
                    },
                    {
                      'stopSequence': 2,
                      'stopType': 'DROPOFF',
                      'isCurrentUserStop': false,
                      'addressText': 'Cyber Towers SEZ',
                    },
                  ],
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/notifications')) {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'notif-1',
                    'title': 'Cab Assigned',
                    'message': 'TS07EX9090 is on the way',
                    'isRead': false,
                  },
                ],
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(jsonEncode({'data': []}), 200);
        });

        final client = EmployeeApiClient(
          baseUrl: 'https://api.test.adhocx.local/api/v1',
          httpClient: mockHttp,
        );
        final riderRepo = HttpEmployeeRiderRepository(client: client);
        final dataProvider = EmployeeDataProvider(repository: riderRepo);

        // Fetch all live endpoints and verify contract shapes
        final next = await dataProvider.loadNextTrip(force: true);
        final schedule = await dataProvider.loadSchedule(force: true);
        final history = await dataProvider.loadTripsHistory(force: true);
        final tracking = await dataProvider.loadTracking(force: true);
        final routeDetails = await dataProvider.loadRouteDetails('route-901');

        expect(next?['boardingOtp'], '4829');
        expect((next?['boardingOtp'] as String).length, 4);
        expect((next?['routeStops'] as List).length, 2);
        expect((next?['routeStops'][0])['isCurrentUser'], isTrue);
        expect((next?['routeStops'][1])['stopType'], 'DROPOFF');
        expect((schedule?['schedule'] as List).length, 1);
        expect(history.length, 1);
        expect(tracking?['dynamicQrToken'], 'QR-LIVE-901-4829');
        expect((routeDetails?['stops'][0])['isCurrentUserStop'], isTrue);
        expect((routeDetails?['stops'][1])['stopType'], 'DROPOFF');

        // Render HomeUpcomingPickupScreen and verify live values + zero mock names
        await tester.pumpWidget(
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
            child: MaterialApp(
              theme: AppTheme.lightTheme,
              home: const HomeUpcomingPickupScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.textContaining('Priya Menon'), findsOneWidget);
        expect(find.text('Vikram Naik'), findsWidgets);
        expect(find.text('TS07EX9090'), findsWidgets);
        expect(find.textContaining('4829'), findsOneWidget);
        expect(find.textContaining('Ravi Kumar'), findsNothing);
        expect(find.textContaining('Suresh R'), findsNothing);

        // Render RouteAndStopsScreen and verify user stop + DROPOFF office stop labels
        await tester.pumpWidget(
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
            child: MaterialApp(
              theme: AppTheme.lightTheme,
              home: const RouteAndStopsScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Your Stop (Stop 1)'), findsOneWidget);
        expect(find.text('Office Destination'), findsOneWidget);
      },
    );

    testWidgets(
      '4) Reschedule (action: RESCHEDULE), cancel stop, SOS (triggerReason + error guard), safe-reach, ticket+chat, profile PATCH, & deleteAccount 500 safety',
      (tester) async {
        final calls = <_RecordedCall>[];
        var failSos = false;
        var failDeleteAccount = true;

        final mockHttp = MockClient((req) async {
          final parsedBody = req.body.isNotEmpty
              ? jsonDecode(req.body) as Map<String, dynamic>
              : null;
          calls.add(_RecordedCall(req.method, req.url.path, parsedBody));

          final path = req.url.path;
          if (path.endsWith('/corporate/me/schedule')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'schedule': [
                    {
                      'requestId': 'req-501',
                      'stopId': 'stop-101',
                      'date': '2026-11-18',
                      'shiftTime': '18:30',
                      'canReschedule': true,
                      'canCancel': true,
                    },
                  ],
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips/next')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'hasActiveTrip': true,
                  'stopId': 'stop-101',
                  'routeId': 'route-901',
                  'pickupLocation': {'latitude': 17.456, 'longitude': 78.371},
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/trips/requests/req-501/reschedule')) {
            return http.Response(
              jsonEncode({'data': {'status': 'RESCHEDULED'}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips/stop-101/cancel')) {
            return http.Response(
              jsonEncode({'data': {'status': 'CANCELLED'}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/safety/sos')) {
            if (failSos) {
              return http.Response(
                jsonEncode({'message': 'Command center unreachable'}),
                503,
                headers: {'content-type': 'application/json'},
              );
            }
            return http.Response(
              jsonEncode({'data': {'id': 'sos-99', 'status': 'ACTIVE'}}),
              201,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/trips/stop-101/safe-reach')) {
            return http.Response(
              jsonEncode({'data': {'confirmed': true}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me/tickets') && req.method == 'POST') {
            return http.Response(
              jsonEncode({'data': {'id': 'ticket-77', 'status': 'OPEN'}}),
              201,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/support/tickets/ticket-77/messages')) {
            return http.Response(
              jsonEncode({'data': {'id': 'msg-1', 'message': 'Driver delayed'}}),
              201,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me') && req.method == 'PATCH') {
            return http.Response(
              jsonEncode({
                'data': {
                  'employeeId': 'emp-uuid-01',
                  'fullName': 'Priya Menon',
                  'defaultPickupLocation': {
                    'addressText': 'Gachibowli Circle, Tower B',
                  },
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/corporate/me') && req.method == 'GET') {
            return http.Response(
              jsonEncode({
                'data': {
                  'employeeId': 'emp-uuid-01',
                  'fullName': 'Priya Menon',
                  'defaultPickupLocation': {'addressText': 'Kondapur Junction'},
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/notifications/in-app/notif-1/read')) {
            return http.Response(
              jsonEncode({'data': {'isRead': true}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (path.endsWith('/auth/account') && req.method == 'DELETE') {
            if (failDeleteAccount) {
              return http.Response(
                jsonEncode({'message': 'Internal server error'}),
                500,
                headers: {'content-type': 'application/json'},
              );
            }
            return http.Response(
              jsonEncode({'data': {'deleted': true}}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final client = EmployeeApiClient(
          baseUrl: 'https://api.test.adhocx.local/api/v1',
          httpClient: mockHttp,
        );
        await client.saveTokens(
          accessToken: 'live-access-token',
          refreshToken: 'live-refresh-token',
        );
        final authRepo = HttpEmployeeAuthRepository(client: client);
        final riderRepo = HttpEmployeeRiderRepository(client: client);
        final dataProvider = EmployeeDataProvider(repository: riderRepo);

        // 4a. Reschedule shift via ChangeRequestDetailsScreen -> verifies 'action': 'RESCHEDULE'
        final rescheduleRouter = GoRouter(
          initialLocation: '/change',
          routes: [
            GoRoute(
              path: '/change',
              builder: (_, __) => const ChangeRequestDetailsScreen(
                changeType: 'Change Drop Time',
              ),
            ),
            GoRoute(
              path: AppRoutes.changeSubmitted,
              builder: (_, __) => const Scaffold(body: Text('SUBMITTED')),
            ),
          ],
        );
        addTearDown(rescheduleRouter.dispose);

        await tester.pumpWidget(
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
            child: MaterialApp.router(
              theme: AppTheme.lightTheme,
              routerConfig: rescheduleRouter,
            ),
          ),
        );
        await tester.pumpAndSettle();

        await tester.ensureVisible(find.text('Submit Request'));
        await tester.tap(find.text('Submit Request'));
        await tester.pumpAndSettle();

        expect(find.text('SUBMITTED'), findsOneWidget);
        final rescheduleCall = calls.firstWhere(
          (c) => c.path.endsWith('/corporate/trips/requests/req-501/reschedule'),
        );
        expect(rescheduleCall.body?['action'], 'RESCHEDULE');
        expect(rescheduleCall.body?['newShiftTime'], '18:30');
        expect(rescheduleCall.body?['newShiftDate'], '2026-11-18');

        // 4b. Cancel stop
        await dataProvider.cancelStop('stop-101', reason: 'Work from home');
        final cancelCall = calls.firstWhere(
          (c) => c.path.endsWith('/corporate/me/trips/stop-101/cancel'),
        );
        expect(cancelCall.method, 'POST');
        expect(cancelCall.body?['reason'], 'Work from home');

        // 4c. Trigger SOS via repository -> verifies 'triggerReason'
        await riderRepo.triggerSos(
          routeId: 'route-901',
          latitude: 17.456,
          longitude: 78.371,
          reason: 'Emergency assistance requested',
        );
        final sosCall = calls.firstWhere(
          (c) => c.path.endsWith('/corporate/safety/sos'),
        );
        expect(sosCall.body?['triggerReason'], 'Emergency assistance requested');
        expect(sosCall.body?.containsKey('reason'), isFalse);

        // 4d. SOS failure guard in SosActivateScreen: never pushes sosAlertConfirmed on 503
        failSos = true;
        var sosConfirmedCount = 0;
        final sosRouter = GoRouter(
          initialLocation: '/sos',
          routes: [
            GoRoute(
              path: '/sos',
              builder: (_, __) => const SosActivateScreen(),
            ),
            GoRoute(
              path: AppRoutes.sosAlertConfirmed,
              builder: (_, __) {
                sosConfirmedCount++;
                return const Scaffold(body: Text('SOS CONFIRMED'));
              },
            ),
          ],
        );
        addTearDown(sosRouter.dispose);

        await tester.pumpWidget(
          ChangeNotifierProvider<EmployeeDataProvider>.value(
            value: dataProvider,
            child: MaterialApp.router(
              theme: AppTheme.lightTheme,
              routerConfig: sosRouter,
            ),
          ),
        );
        await tester.pumpAndSettle();

        final siren = find.byType(SosSirenBadge);
        final gesture = await tester.startGesture(tester.getCenter(siren));
        await tester.pump(const Duration(seconds: 3));
        await gesture.up();
        await tester.pumpAndSettle();

        expect(sosConfirmedCount, 0);
        expect(find.text('SOS Alert Not Sent'), findsOneWidget);

        // 4e. Safe reach confirmation -> verifies 'confirmedResidenceEntry'
        await riderRepo.submitSafeReach('stop-101', confirmed: true);
        final safeReachCall = calls.firstWhere(
          (c) => c.path.endsWith('/corporate/me/trips/stop-101/safe-reach'),
        );
        expect(safeReachCall.body?['confirmedResidenceEntry'], isTrue);
        expect(safeReachCall.body?.containsKey('confirmed'), isFalse);

        // 4f. Create ticket + post chat message
        final ticket = await riderRepo.createTicket(
          category: 'CAB_DELAY',
          subject: 'Cab running late',
          description: 'Driver delayed by 15 minutes',
        );
        expect(ticket['id'], 'ticket-77');
        await riderRepo.sendTicketMessage('ticket-77', 'Driver delayed');
        expect(
          calls.any((c) =>
              c.method == 'POST' &&
              c.path.endsWith('/corporate/support/tickets/ticket-77/messages')),
          isTrue,
        );

        // 4g. Update profile (PATCH /corporate/me) & mark notification read
        final updatedProfile = await dataProvider.updateProfile(
          homeAddress: 'Gachibowli Circle, Tower B',
        );
        expect(
          (updatedProfile['defaultPickupLocation'] as Map)['addressText'],
          'Gachibowli Circle, Tower B',
        );
        await dataProvider.markNotificationRead('notif-1');
        expect(
          calls.any((c) =>
              c.method == 'PATCH' &&
              c.path.endsWith('/notifications/in-app/notif-1/read')),
          isTrue,
        );

        // 4h. deleteAccount() MUST NOT wipe local session tokens on 500 error
        await expectLater(authRepo.deleteAccount(), throwsA(isA<ApiException>()));
        expect(await client.getAccessToken(), 'live-access-token');

        // And DOES wipe local session tokens when DELETE /auth/account returns 200
        failDeleteAccount = false;
        await authRepo.deleteAccount();
        expect(await client.getAccessToken(), isNull);
      },
    );
  });
}
