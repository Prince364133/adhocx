import 'dart:convert';
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
      expect(exception.toString(), 'Invalid OTP provided');
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

      // 6. Withdrawal API exception stripping
      const withdrawalRaw = 'Withdrawal: ApiException(400): Insufficient balance. Available: ₹0.00, Requested: ₹2000.00';
      expect(
        AppToast.cleanErrorMessage(withdrawalRaw),
        'Insufficient balance. Available: ₹0.00, Requested: ₹2000.00',
      );

      // 7. Prisma/database internal error masking
      final dbError = ApiException(
        statusCode: 500,
        message: 'PrismaClientKnownRequestError: Invalid `prisma.user.findUnique()` invocation',
      );
      expect(
        AppToast.cleanErrorMessage(dbError),
        'Something went wrong. Please try again shortly.',
      );
    });

    test('UserModel toJson serializes and round-trips correctly', () {
      final user = UserModel(
        id: 'usr-3',
        phone: '+919123456789',
        email: 'test@example.com',
        role: 'DRIVER',
        fullName: 'Test Driver',
        hasPassword: true,
        isOnboarded: true,
        driverProfile: {'verificationStatus': 'VERIFIED'},
      );

      final json = user.toJson();
      expect(json['id'], 'usr-3');
      expect(json['phone'], '+919123456789');
      expect(json['email'], 'test@example.com');
      expect(json['role'], 'DRIVER');
      expect(json['fullName'], 'Test Driver');
      expect(json['hasPassword'], true);
      expect(json['isOnboarded'], true);

      final restored = UserModel.fromJson(json);
      expect(restored.id, 'usr-3');
      expect(restored.phone, '+919123456789');
      expect(restored.email, 'test@example.com');
      expect(restored.role, 'DRIVER');
      expect(restored.fullName, 'Test Driver');
      expect(restored.isVerified, true);
    });

    test('ApiClient.isTokenExpiring correctly identifies valid vs expired JWTs', () {
      final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;

      // Future token (valid for next 2 hours)
      final validPayload = '{"id":"usr-1","exp":${nowSec + 7200}}';
      final validEncoded = base64Url.encode(utf8.encode(validPayload)).replaceAll('=', '');
      final validToken = 'eyJhbGciOiJIUzI1NiJ9.$validEncoded.mock_sig';
      expect(ApiClient.isTokenExpiring(validToken), false);

      // Expired token (expired 1 hour ago)
      final expiredPayload = '{"id":"usr-1","exp":${nowSec - 3600}}';
      final expiredEncoded = base64Url.encode(utf8.encode(expiredPayload)).replaceAll('=', '');
      final expiredToken = 'eyJhbGciOiJIUzI1NiJ9.$expiredEncoded.mock_sig';
      expect(ApiClient.isTokenExpiring(expiredToken), true);

      // Token expiring in 2 minutes (within default 5 minute buffer)
      final soonPayload = '{"id":"usr-1","exp":${nowSec + 120}}';
      final soonEncoded = base64Url.encode(utf8.encode(soonPayload)).replaceAll('=', '');
      final soonToken = 'eyJhbGciOiJIUzI1NiJ9.$soonEncoded.mock_sig';
      expect(ApiClient.isTokenExpiring(soonToken), true);

      // Malformed token returns false gracefully
      expect(ApiClient.isTokenExpiring('invalid_token'), false);
    });

    test('UserModel.copyWith correctly updates fullName, phone, email and profiles', () {
      final initialUser = UserModel(
        id: 'usr-google',
        role: 'DRIVER',
        fullName: 'RJ SPORTS',
        email: 'rjsports.store@gmail.com',
        driverProfile: {'fullName': 'RJ SPORTS'},
      );

      final updatedUser = initialUser.copyWith(
        fullName: 'Rahul Sharma',
        phone: '+919876543210',
      );

      expect(updatedUser.id, 'usr-google');
      expect(updatedUser.fullName, 'Rahul Sharma');
      expect(updatedUser.phone, '+919876543210');
      expect(updatedUser.email, 'rjsports.store@gmail.com');
      expect(updatedUser.role, 'DRIVER');
    });

    test('AuthService.updateCurrentUser immediately updates session and notifies listeners', () {
      final auth = AuthService.instance;
      auth.setCurrentUser(UserModel(
        id: 'usr-test-1',
        role: 'DRIVER',
        fullName: 'Google Preload Name',
        email: 'test@gmail.com',
      ));

      expect(auth.currentUser?.fullName, 'Google Preload Name');

      var notified = false;
      auth.authStateListenable.addListener(() {
        notified = true;
      });

      auth.updateCurrentUser(
        fullName: 'Edited Real Name',
        phone: '+919811122233',
      );

      expect(auth.currentUser?.fullName, 'Edited Real Name');
      expect(auth.currentUser?.phone, '+919811122233');
      expect(notified, true);
    });
  });
}
