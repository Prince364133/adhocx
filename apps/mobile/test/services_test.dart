import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/services/api_client.dart';
import 'package:adhocx/services/auth_service.dart';

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
  });
}
