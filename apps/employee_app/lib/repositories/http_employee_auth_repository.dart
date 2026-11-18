import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/employee_user.dart';
import '../services/employee_api_client.dart';
import 'employee_auth_repository.dart';

class HttpEmployeeAuthRepository implements EmployeeAuthRepository {
  final EmployeeApiClient _client;
  EmployeeUser? _cachedUser;

  HttpEmployeeAuthRepository({EmployeeApiClient? client})
      : _client = client ?? EmployeeApiClient();

  @override
  Future<void> sendOtp(String mobileNumber) async {
    final sanitized = mobileNumber.trim();
    final isEmail = sanitized.contains('@');
    final cleanPhone = sanitized.replaceAll(RegExp(r'\s+'), '');
    try {
      await _client.post('/auth/otp/request', body: {
        if (isEmail) 'email': sanitized.toLowerCase() else 'phone': cleanPhone,
        'channel': isEmail ? 'EMAIL' : 'SMS',
        if (!isEmail) 'countryCode': '+91',
        'role': 'EMPLOYEE',
        'isRegister': false,
      });
    } on ApiException catch (e) {
      debugPrint('[HttpEmployeeAuthRepository] sendOtp error: ${e.message}');
      throw Exception(e.message);
    } catch (e) {
      debugPrint('[HttpEmployeeAuthRepository] sendOtp error: $e');
      throw Exception(
          'Unable to reach authentication service. Please check connection.');
    }
  }

  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    final clean = mobileNumber.trim();
    final isEmail = clean.contains('@');
    final cleanPhone = clean.replaceAll(RegExp(r'\s+'), '');
    final cleanOtp = otp.trim();

    try {
      final res = await _client.post('/auth/otp/verify', body: {
        if (isEmail) 'email': clean.toLowerCase() else 'phone': cleanPhone,
        'otp': cleanOtp,
        if (!isEmail) 'countryCode': '+91',
        'role': 'EMPLOYEE',
      });

      final payload = res['data'] ?? res;
      final accessToken = payload['accessToken'] as String?;
      final refreshToken = payload['refreshToken'] as String?;

      if (accessToken == null) {
        throw const InvalidOtpException(
            'No session tokens received from authentication.');
      }

      await _client.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      return await _fetchAndCacheProfile(fallbackUser: payload['user']);
    } on ApiException catch (e) {
      final msg = e.message.toLowerCase();
      if (msg.contains('expired')) {
        throw ExpiredOtpException(e.message);
      } else if (msg.contains('ineligible') || e.statusCode == 403) {
        throw TransportIneligibleException(e.message);
      }
      throw InvalidOtpException(e.message);
    }
  }

  /// Direct credentials authentication (supports phone or email + password)
  Future<EmployeeUser> loginWithPassword({
    required String identifier,
    required String password,
  }) async {
    try {
      final res = await _client.post('/auth/login', body: {
        'identifier': identifier.trim(),
        'password': password,
      });

      final payload = res['data'] ?? res;
      final accessToken = payload['accessToken'] as String?;
      final refreshToken = payload['refreshToken'] as String?;

      if (accessToken == null) {
        throw Exception('No session token returned.');
      }

      await _client.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      return await _fetchAndCacheProfile(fallbackUser: payload['user']);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        throw Exception(
            'Invalid credentials. Please verify your details or password.');
      }
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Unable to sign in. Please verify your connection.');
    }
  }

  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) async {
    final email = companyEmail.trim().toLowerCase();
    if (!email.contains('@') || !email.contains('.')) {
      throw Exception('Please enter a valid company email address.');
    }

    // Dispatches verification OTP to company email
    await sendOtp(email);
    throw Exception(
        'A single-sign-on verification code has been dispatched to $email. Please enter the OTP to complete login.');
  }

  @override
  Future<EmployeeUser?> getCurrentUser() async {
    final token = await _client.getAccessToken();
    if (token == null || token.isEmpty) {
      _cachedUser = null;
      await _client.clearSession();
      return null;
    }

    final cachedJson =
        _cachedUser == null ? await _client.getCachedUser() : null;
    if (_cachedUser == null && cachedJson != null) {
      _cachedUser = EmployeeUser.fromJson(cachedJson);
    }

    try {
      _cachedUser = await _fetchAndCacheProfile();
    } catch (e) {
      if (_isAuthorizationFailure(e) || e is TransportIneligibleException) {
        _cachedUser = null;
        return null;
      }
      debugPrint(
          '[HttpEmployeeAuthRepository] Background profile sync failed: $e');
    }

    return _cachedUser;
  }

  @override
  Future<void> signOut() async {
    try {
      final refreshToken = await _client.getRefreshToken();
      await _client.post(
        '/auth/logout',
        body: refreshToken != null && refreshToken.isNotEmpty
            ? {'refreshToken': refreshToken}
            : null,
      );
    } catch (e) {
      debugPrint('[HttpEmployeeAuthRepository] Logout request failed: $e');
    } finally {
      _cachedUser = null;
      await _client.clearSession();
    }
  }

  @override
  Future<void> deleteAccount() async {
    await _client.delete('/auth/account');
    _cachedUser = null;
    await _client.clearSession();
  }

  Future<EmployeeUser> _fetchAndCacheProfile(
      {Map<String, dynamic>? fallbackUser}) async {
    try {
      final res = await _client.get('/corporate/me');
      final data = (res['data'] ?? res) as Map<String, dynamic>;

      final user = EmployeeUser(
        id: data['employeeId']?.toString() ??
            fallbackUser?['id']?.toString() ??
            '',
        employeeId: data['employeeCode']?.toString() ??
            fallbackUser?['employeeCode']?.toString() ??
            '',
        fullName: data['fullName']?.toString() ??
            fallbackUser?['fullName']?.toString() ??
            '',
        organization: data['tenant']?['name']?.toString() ??
            fallbackUser?['tenantName']?.toString() ??
            '',
        office: data['office']?['name']?.toString() ??
            fallbackUser?['officeName']?.toString() ??
            '',
        email: data['email']?.toString() ??
            fallbackUser?['email']?.toString() ??
            '',
        phone: data['phoneNumber']?.toString() ??
            fallbackUser?['phone']?.toString() ??
            '',
        isTransportEligible: true,
        createdAt: DateTime.now(),
      );

      _cachedUser = user;
      await _client.saveCachedUser(user.toJson());
      return user;
    } catch (e) {
      debugPrint(
          '[HttpEmployeeAuthRepository] Error fetching /corporate/me: $e');
      if (e is ApiException && e.statusCode == 404) {
        _cachedUser = null;
        await _client.clearSession();
        throw const TransportIneligibleException(
          'Your phone number is not linked to an active company transport profile.',
        );
      }
      if (_isAuthorizationFailure(e)) {
        _cachedUser = null;
        await _client.clearSession();
        if (e is ApiException && e.statusCode == 403) {
          throw TransportIneligibleException(e.message);
        }
        rethrow;
      }
      if (fallbackUser != null) {
        final user = EmployeeUser(
          id: fallbackUser['id']?.toString() ?? '',
          employeeId: fallbackUser['employeeCode']?.toString() ?? '',
          fullName: fallbackUser['fullName']?.toString() ?? '',
          organization: fallbackUser['tenantName']?.toString() ?? '',
          office: fallbackUser['officeName']?.toString() ?? '',
          email: fallbackUser['email']?.toString() ?? '',
          phone: fallbackUser['phone']?.toString() ?? '',
          isTransportEligible: true,
          createdAt: DateTime.now(),
        );
        _cachedUser = user;
        await _client.saveCachedUser(user.toJson());
        return user;
      }
      rethrow;
    }
  }

  bool _isAuthorizationFailure(Object error) =>
      error is ApiException &&
      (error.statusCode == 401 || error.statusCode == 403);
}
