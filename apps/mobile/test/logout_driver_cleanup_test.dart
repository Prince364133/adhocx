import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:adhocx/core/networking/api_client.dart';
import 'package:adhocx/core/utils/app_toast.dart';
import 'package:adhocx/services/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppToast.cleanErrorMessage Digio 502/503 handling', () {
    test('surfaces clear message for unconfigured Digio 503 instead of generic fallback', () {
      final err = ApiException(
        statusCode: 503,
        message: 'Digio verification service is not configured on this server',
      );
      final msg = AppToast.cleanErrorMessage(err);
      expect(msg, isNot('Something went wrong. Please try again shortly.'));
      expect(msg.toLowerCase(), contains('digilocker / instant kyc'));
      expect(msg.toLowerCase(), isNot(contains('digio')));
    });

    test('surfaces clean 502 upstream message while masking 500 internal DB errors', () {
      final upstream404 = ApiException(
        statusCode: 502,
        message: 'Digio upstream error (404): unable to fetch details',
      );
      expect(
        AppToast.cleanErrorMessage(upstream404),
        'KYC verification error (404): unable to fetch details',
      );
      expect(AppToast.cleanErrorMessage(upstream404).toLowerCase(), isNot(contains('digio')));

      final upstream401 = ApiException(
        statusCode: 502,
        message: 'Digio upstream error (401): invalid client',
      );
      expect(
        AppToast.cleanErrorMessage(upstream401).toLowerCase(),
        contains('authentication failed'),
      );

      final internal500 = ApiException(
        statusCode: 500,
        message: 'PrismaClientKnownRequestError at line 12',
      );
      expect(
        AppToast.cleanErrorMessage(internal500),
        'Something went wrong. Please try again shortly.',
      );
    });
  });

  group('AuthService driver logout teardown', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
      AuthService.instance.debugOnDriverSignOutOffline = null;
    });

    tearDown(() {
      AuthService.instance.debugOnDriverSignOutOffline = null;
      AuthService.instance.setCurrentUser(null);
    });

    test('logging out as DRIVER triggers offline teardown before clearing session', () async {
      int offlineCalls = 0;
      AuthService.instance.setCurrentUser(
        UserModel(
          id: 'drv-user-1',
          phone: '+919876543210',
          role: 'DRIVER',
          fullName: 'Ravi Kumar',
        ),
      );
      AuthService.instance.debugOnDriverSignOutOffline = () async {
        offlineCalls++;
      };

      await AuthService.instance.logout();

      expect(offlineCalls, 1);
      expect(AuthService.instance.currentUser, isNull);
    });

    test('logging out as non-DRIVER skips driver availability offline PATCH', () async {
      int offlineCalls = 0;
      AuthService.instance.setCurrentUser(
        UserModel(
          id: 'cust-user-1',
          phone: '+919876543211',
          role: 'USER',
          fullName: 'Asha Sharma',
        ),
      );
      AuthService.instance.debugOnDriverSignOutOffline = () async {
        offlineCalls++;
      };

      await AuthService.instance.logout();

      expect(offlineCalls, 0);
      expect(AuthService.instance.currentUser, isNull);
    });
  });
}
