import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/services/api_client.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/core/utils/app_toast.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mobile Data Layer Tests', () {
    test('UserModel parses driver profile correctly', () {
      final json = {
        'id': 'usr-1',
        'phone': '+919876543210',
        'role': 'DRIVER',
        'status': 'ACTIVE',
        'driverProfile': {
          'id': 'drv-1',
          'fullName': 'Rajesh Kumar',
          'verificationStatus': 'VERIFIED',
          'availabilityStatus': 'AVAILABLE',
          'walletBalance': 1500,
        },
      };

      final user = UserModel.fromJson(json);

      expect(user.id, 'usr-1');
      expect(user.phone, '+919876543210');
      expect(user.isDriver, true);
      expect(user.isVendor, false);
      expect(user.verificationStatus, 'VERIFIED');
      expect(user.isVerified, true);
      expect(user.isPending, false);
    });

    test('UserModel parses vendor profile correctly', () {
      final json = {
        'id': 'usr-2',
        'phone': '+919988776655',
        'role': 'VENDOR',
        'status': 'ACTIVE',
        'vendorProfile': {
          'id': 'vnd-1',
          'companyName': 'Acme Corporate Logistics',
          'verificationStatus': 'UNDER_REVIEW',
        },
      };

      final user = UserModel.fromJson(json);

      expect(user.id, 'usr-2');
      expect(user.isVendor, true);
      expect(user.isDriver, false);
      expect(user.verificationStatus, 'UNDER_REVIEW');
      expect(user.isUnderReview, true);
    });

    test('ApiException formats error message properly', () {
      final exception = ApiException(
        statusCode: 400,
        message: 'Invalid OTP provided',
      );

      expect(exception.statusCode, 400);
      expect(exception.message, 'Invalid OTP provided');
      expect(exception.toString(), 'ApiException(400): Invalid OTP provided');
    });

    test('ApiClient singleton returns consistent instance', () {
      final client1 = ApiClient.instance;
      final client2 = ApiClient.instance;

      expect(client1, isNotNull);
      expect(identical(client1, client2), true);
      expect(client1.baseUrl.contains('api/v1'), true);
    });

    test('AppToast.cleanErrorMessage formats user friendly messages properly', () {
      // 1. User does not exist error
      final nonExistentUserException = ApiException(
        statusCode: 401,
        message: 'No account found with this email or mobile number. Please check your credentials or sign up.',
      );
      expect(
        AppToast.cleanErrorMessage(nonExistentUserException),
        'No account found with this email or mobile number. Please check your details or sign up.',
      );

      // 2. Generic invalid credentials
      final invalidCredentialsException = ApiException(
        statusCode: 401,
        message: 'Invalid mobile number/email or password',
      );
      expect(
        AppToast.cleanErrorMessage(invalidCredentialsException),
        'Invalid email/phone or password. Please verify your details.',
      );

      // 3. Incorrect password
      final wrongPasswordException = ApiException(
        statusCode: 401,
        message: 'Incorrect password. Please try again or reset your password.',
      );
      expect(
        AppToast.cleanErrorMessage(wrongPasswordException),
        'Incorrect password. Please try again or reset your password.',
      );

      // 4. Raw exception prefix stripping
      final rawException = Exception('Please enter your mobile number or email address');
      expect(
        AppToast.cleanErrorMessage(rawException),
        'Please enter your mobile number or email address',
      );

      // 5. Network error mapping
      const networkError = 'ClientException with SocketException: Failed host lookup';
      expect(
        AppToast.cleanErrorMessage(networkError),
        'Unable to connect to the server. Please check your internet connection.',
      );
    });
  });
}
