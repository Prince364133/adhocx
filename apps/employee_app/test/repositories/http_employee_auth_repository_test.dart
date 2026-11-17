import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/repositories/http_employee_auth_repository.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('does not accept profile fallback after role denial during sign-in',
      () async {
    final client = EmployeeApiClient(
      baseUrl: 'http://localhost:7001/api/v1',
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/auth/otp/verify')) {
          return http.Response(
            '{"data":{"accessToken":"access","refreshToken":"refresh","user":{"id":"user-1","role":"DRIVER"}}}',
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          '{"error":{"message":"Access denied: required role (EMPLOYEE)"}}',
          403,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    final repository = HttpEmployeeAuthRepository(client: client);

    await expectLater(
      repository.verifyOtp(mobileNumber: '5550100', otp: '123456'),
      throwsA(isA<TransportIneligibleException>()),
    );
    expect(await client.getAccessToken(), isNull);
    expect(await client.getCachedUser(), isNull);
  });

  test('clears cached session after profile authorization failure', () async {
    final client = EmployeeApiClient(
      baseUrl: 'http://localhost:7001/api/v1',
      httpClient: MockClient(
        (_) async => http.Response(
          '{"error":{"message":"Access denied: required role (EMPLOYEE)"}}',
          403,
          headers: {'content-type': 'application/json'},
        ),
      ),
    );
    await client.saveTokens(accessToken: 'access');
    await client.saveCachedUser({'id': 'user-1', 'fullName': 'Commuter'});
    final repository = HttpEmployeeAuthRepository(client: client);

    expect(await repository.getCurrentUser(), isNull);
    expect(await client.getAccessToken(), isNull);
    expect(await client.getCachedUser(), isNull);
  });
}
