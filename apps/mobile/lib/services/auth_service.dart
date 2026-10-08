import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/networking/api_client.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../core/utils/app_logger.dart';
import './fcm_service.dart';

class UserModel {
  final String id;
  final String? phone;
  final String? email;
  final String role; // 'DRIVER', 'VENDOR', 'ADMIN', 'USER'
  final String? fullName;
  final String? photoUrl;
  final bool hasPassword;
  final bool isOnboarded;
  final Map<String, dynamic>? driverProfile;
  final Map<String, dynamic>? vendorProfile;

  UserModel({
    required this.id,
    this.phone,
    this.email,
    required this.role,
    this.fullName,
    this.photoUrl,
    this.hasPassword = false,
    this.isOnboarded = false,
    this.driverProfile,
    this.vendorProfile,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'email': email,
      'role': role,
      'fullName': fullName,
      'photoUrl': photoUrl,
      'hasPassword': hasPassword,
      'isOnboarded': isOnboarded,
      'driverProfile': driverProfile,
      'vendorProfile': vendorProfile,
    };
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Handle wrapped payloads { success, data } or { user: ... }
    final root = json['data'] is Map<String, dynamic> ? json['data'] as Map<String, dynamic> : json;
    final Map<String, dynamic> data = (root['user'] is Map<String, dynamic>)
        ? root['user'] as Map<String, dynamic>
        : root;

    final roleStr = (data['role'] ?? root['role'] ?? 'DRIVER').toString().toUpperCase();
    final bool hasPass = data['hasPassword'] == true || data['passwordSet'] == true || root['hasPassword'] == true;

    final driverProf = (data['driverProfile'] is Map)
        ? Map<String, dynamic>.from(data['driverProfile'])
        : (root['driverProfile'] is Map ? Map<String, dynamic>.from(root['driverProfile']) : null);
    final vendorProf = (data['vendorProfile'] is Map)
        ? Map<String, dynamic>.from(data['vendorProfile'])
        : (root['vendorProfile'] is Map ? Map<String, dynamic>.from(root['vendorProfile']) : null);

    final dStatus = driverProf?['verificationStatus']?.toString().toUpperCase();
    final vStatus = vendorProf?['verificationStatus']?.toString().toUpperCase();

    final bool hasVendorSubmission = vendorProf != null &&
        (vStatus == 'UNDER_REVIEW' ||
         vStatus == 'PENDING' ||
         vStatus == 'VERIFIED' ||
         vStatus == 'REJECTED' ||
         (vendorProf['address'] != null && vendorProf['address'].toString().trim().isNotEmpty) ||
         (vendorProf['organizationName'] != null &&
          vendorProf['organizationName'].toString().trim().isNotEmpty));

    final bool hasDriverSubmission = driverProf != null &&
        (dStatus == 'UNDER_REVIEW' ||
         dStatus == 'VERIFIED' ||
         dStatus == 'REJECTED' ||
         (driverProf['vehiclePlate'] != null && driverProf['vehiclePlate'].toString().trim().isNotEmpty) ||
         driverProf['dlFrontUrl'] != null);

    final bool isOb = data['isOnboarded'] == true ||
        root['isOnboarded'] == true ||
        hasVendorSubmission ||
        hasDriverSubmission ||
        dStatus == 'UNDER_REVIEW' ||
        dStatus == 'VERIFIED' ||
        vStatus == 'UNDER_REVIEW' ||
        vStatus == 'VERIFIED';

    return UserModel(
      id: (data['id'] ?? root['id'] ?? '').toString(),
      phone: data['phone']?.toString() ?? root['phone']?.toString(),
      email: data['email']?.toString() ?? root['email']?.toString(),
      role: roleStr,
      fullName: (data['fullName'] ?? data['name'] ?? root['fullName'])?.toString(),
      photoUrl: data['photoUrl']?.toString() ?? root['photoUrl']?.toString(),
      hasPassword: hasPass,
      isOnboarded: isOb,
      driverProfile: driverProf,
      vendorProfile: vendorProf,
    );
  }

  bool get isDriver => role == 'DRIVER';
  bool get isUser => role == 'USER' || role == 'VENDOR';
  bool get isVendor => isUser;

  String get verificationStatus {
    if (isDriver && driverProfile != null) {
      return (driverProfile!['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
    }
    if (vendorProfile != null) {
      return (vendorProfile!['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
    }
    if (driverProfile != null) {
      return (driverProfile!['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
    }
    return 'PENDING';
  }

  bool get isVerified => verificationStatus == 'VERIFIED';
  bool get isRejected => verificationStatus == 'REJECTED';
  bool get isUnderReview =>
      verificationStatus == 'UNDER_REVIEW' ||
      (isOnboarded && !isVerified && !isRejected);
  bool get isPending => verificationStatus == 'PENDING' || isUnderReview;

  String? get rejectionReason {
    if (isDriver && driverProfile != null) {
      return driverProfile!['rejectionReason']?.toString();
    }
    if (vendorProfile != null) {
      return vendorProfile!['rejectionReason']?.toString();
    }
    return null;
  }
}

class AuthResult {
  final UserModel user;
  final String? accessToken;
  final String? refreshToken;

  AuthResult({
    required this.user,
    this.accessToken,
    this.refreshToken,
  });
}

class AuthService {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();

  AuthService._();

  final ApiClient _api = ApiClient.instance;
  static const String _userCacheKey = 'adhocx_cached_user';
  UserModel? _currentUser;
  final ValueNotifier<UserModel?> authStateListenable = ValueNotifier<UserModel?>(null);

  UserModel? get currentUser => _currentUser;

  Future<String?> getToken() => _api.getToken();

  Future<void> _persistCurrentUser(UserModel? user) async {
    _currentUser = user;
    authStateListenable.value = user;
    try {
      final prefs = await SharedPreferences.getInstance();
      if (user != null) {
        await prefs.setString(_userCacheKey, jsonEncode(user.toJson()));
      } else {
        await prefs.remove(_userCacheKey);
      }
    } catch (e) {
      debugPrint('Failed to persist user profile: $e');
    }
  }

  Future<UserModel?> loadCachedUser() async {
    if (_currentUser != null) return _currentUser;
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString(_userCacheKey);
      if (userJson != null && userJson.isNotEmpty) {
        final decoded = jsonDecode(userJson) as Map<String, dynamic>;
        _currentUser = UserModel.fromJson(decoded);
        authStateListenable.value = _currentUser;
        return _currentUser;
      }
    } catch (e) {
      debugPrint('Failed to load cached user: $e');
    }
    return null;
  }

  void setCurrentUser(UserModel? user) {
    _currentUser = user;
    authStateListenable.value = user;
    _persistCurrentUser(user);
  }

  /// Password Authentication (Mobile Number / Email + Password)
  Future<AuthResult> loginWithPassword({
    required String identifier,
    required String password,
    String role = 'DRIVER',
  }) async {
    final response = await _api.post(
      '/auth/login',
      body: {
        'identifier': identifier,
        'password': password,
        'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role);
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Request OTP via SMS (Phone) or Email
  Future<dynamic> requestOtp({
    String? phone,
    String? email,
    String? channel,
    String role = 'DRIVER',
    bool isRegister = false,
    String? fullName,
    String? companyName,
  }) async {
    final response = await _api.post(
      '/auth/otp/request',
      body: {
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'channel': channel ?? (email != null && email.isNotEmpty ? 'EMAIL' : 'SMS'),
        'role': role,
        'isRegister': isRegister,
        if (fullName != null) 'fullName': fullName,
        if (companyName != null) 'companyName': companyName,
      },
    );
    return response is Map ? response : {'message': 'OTP sent successfully'};
  }

  /// Verify OTP with Phone or Email
  Future<AuthResult> verifyOtp({
    String? phone,
    String? email,
    required String otp,
    String role = 'DRIVER',
    bool isRegister = false,
    String? fullName,
  }) async {
    final response = await _api.post(
      '/auth/otp/verify',
      body: {
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'otp': otp,
        'role': role,
        'isRegister': isRegister,
        if (fullName != null) 'fullName': fullName,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role, phone: phone, email: email, fullName: fullName);
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Google Sign-In / Sign-Up (Pre-verified email, skips OTP)
  Future<AuthResult> signInWithGoogle({
    String role = 'DRIVER',
  }) async {
    const defaultWebClientId = '886573696369-84dnfvb9jaegbqp8deosr3ucf8tq93ms.apps.googleusercontent.com';
    const envClientId = String.fromEnvironment('GOOGLE_CLIENT_ID', defaultValue: '');
    final googleClientId = envClientId.isNotEmpty ? envClientId : defaultWebClientId;

    String? email;
    String? displayName;
    String? idToken;
    String? signInError;

    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        // On Android, clientId MUST be null (Google Play Services resolves via package name + SHA-1).
        // On Web, clientId is required.
        clientId: kIsWeb ? googleClientId : null,
        // serverClientId is required on Android to generate an idToken for backend verification (not supported on Web).
        serverClientId: kIsWeb ? null : googleClientId,
        scopes: ['email', 'profile'],
      );

      // Attempt clean sign out so account chooser opens reliably
      try {
        await googleSignIn.signOut();
      } catch (_) {}

      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      if (googleUser != null) {
        email = googleUser.email;
        displayName = googleUser.displayName;
        final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
        idToken = googleAuth.idToken;
      }
    } catch (e) {
      debugPrint('GoogleSignIn native/web sign-in error: $e');
      signInError = e.toString();
    }

    // If popup was cancelled or failed to authenticate
    if (email == null || email.isEmpty) {
      if (signInError != null) {
        if (signInError.contains('ApiException: 10') || signInError.contains('DEVELOPER_ERROR')) {
          throw Exception(
            'Google Sign-In configuration error (Code 10: DEVELOPER_ERROR). Please ensure the Android OAuth client and SHA-1 fingerprint are registered in Google Cloud Console.',
          );
        } else if (signInError.contains('ApiException: 12500')) {
          throw Exception(
            'Google Sign-In failed (Code 12500). Please check your Google Play Services or network connection.',
          );
        } else if (signInError.contains('network_error') || signInError.contains('ApiException: 7')) {
          throw Exception(
            'Google Sign-In network error. Please check your internet connection and try again.',
          );
        } else {
          throw Exception('Google Sign-In error: $signInError');
        }
      }
      throw Exception('Google Sign-In was cancelled or not completed. Please try again or use your mobile number.');
    }

    final response = await _api.post(
      '/auth/social',
      body: {
        'provider': 'GOOGLE',
        'email': email,
        'fullName': displayName ?? 'User',
        if (idToken != null) 'idToken': idToken,
        'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role, email: email, fullName: displayName);
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Apple Sign-In / Sign-Up (Pre-verified email, skips OTP)
  Future<AuthResult> signInWithApple({
    String? email,
    String? fullName,
    String role = 'DRIVER',
  }) async {
    if (email == null || email.isEmpty) {
      throw Exception('Apple Sign-In was cancelled or not completed. Please try again or use your mobile number.');
    }
    final userEmail = email;
    final userName = fullName ?? 'Apple User';

    final response = await _api.post(
      '/auth/social',
      body: {
        'provider': 'APPLE',
        'email': userEmail,
        'fullName': userName,
        'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role, email: userEmail, fullName: userName);
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Set User Password for Authenticated User
  Future<dynamic> setPassword({required String password}) async {
    final response = await _api.post(
      '/auth/password',
      body: {'password': password},
    );
    return response;
  }

  /// Reset Password with Verified OTP
  Future<dynamic> resetPassword({
    required String identifier,
    required String otp,
    required String newPassword,
  }) async {
    final response = await _api.post(
      '/auth/reset-password',
      body: {
        'identifier': identifier,
        'otp': otp,
        'password': newPassword,
      },
    );
    return response;
  }

  Future<UserModel?>? _inFlightUserFetch;
  DateTime? _lastUserFetchTime;

  Future<UserModel?> ensureAuthenticatedSession({String? role, bool force = false}) async {
    if (!force && _currentUser != null) {
      return _currentUser;
    }

    final token = await _api.getToken();
    if (token != null && token.isNotEmpty) {
      try {
        final user = await fetchCurrentUser(forceRefresh: force);
        if (user != null) {
          return user;
        }
      } catch (_) {}
    }

    return _currentUser;
  }

  Future<UserModel?> ensureDriverSession() => ensureAuthenticatedSession(role: 'DRIVER');
  Future<UserModel?> ensureVendorSession() => ensureAuthenticatedSession(role: 'VENDOR');

  Future<UserModel?> fetchCurrentUser({bool forceRefresh = false}) async {
    // 1. Cache hit check (15s TTL)
    if (!forceRefresh &&
        _currentUser != null &&
        _lastUserFetchTime != null &&
        DateTime.now().difference(_lastUserFetchTime!) < const Duration(seconds: 15)) {
      return _currentUser;
    }

    // 2. In-flight promise deduplication
    if (_inFlightUserFetch != null) {
      return await _inFlightUserFetch!;
    }

    final token = await _api.getToken();
    if (token == null || token.isEmpty) {
      return null;
    }

    _inFlightUserFetch = _executeFetchCurrentUser();
    try {
      final result = await _inFlightUserFetch;
      return result;
    } finally {
      _inFlightUserFetch = null;
    }
  }

  Future<UserModel?> _executeFetchCurrentUser() async {
    try {
      final response = await _api.get('/auth/me');
      if (response is Map<String, dynamic>) {
        final data = response['data'] is Map<String, dynamic> ? response['data'] as Map<String, dynamic> : response;
        final user = UserModel.fromJson(data);
        _lastUserFetchTime = DateTime.now();
        await _persistCurrentUser(user);
        return user;
      }
    } catch (e) {
      debugPrint('fetchCurrentUser error: $e');
      if (e is ApiException && e.statusCode == 401) {
        // Attempt token refresh once before clearing session
        final refreshed = await _api.attemptTokenRefresh();
        if (refreshed) {
          try {
            final retryResponse = await _api.get('/auth/me');
            if (retryResponse is Map<String, dynamic>) {
              final data = retryResponse['data'] is Map<String, dynamic> ? retryResponse['data'] as Map<String, dynamic> : retryResponse;
              final user = UserModel.fromJson(data);
              _lastUserFetchTime = DateTime.now();
              await _persistCurrentUser(user);
              return user;
            }
          } catch (_) {}
        }
        // Only if refresh token is truly expired/rejected, clear user session
        await _api.clearToken();
        await _persistCurrentUser(null);
        _lastUserFetchTime = null;
        return null;
      }
      // On network errors or timeouts, DO NOT CLEAR TOKENS! Return current cached user
    }
    return _currentUser;
  }

  Future<bool> checkAuthSession({String? defaultRole}) async {
    // 1. Immediately hydrate cached user profile to prevent any UI flicker
    await loadCachedUser();

    final token = await _api.getToken();
    final refreshToken = await _api.getRefreshToken();

    // If both tokens are absent, user is definitely logged out
    if ((token == null || token.isEmpty) && (refreshToken == null || refreshToken.isEmpty)) {
      await _persistCurrentUser(null);
      return false;
    }

    // 2. Proactive refresh if access token is near expiry or missing
    if (token == null || token.isEmpty || ApiClient.isTokenExpiring(token)) {
      final refreshed = await _api.attemptTokenRefresh();
      if (!refreshed && (token == null || token.isEmpty)) {
        await _api.clearToken();
        await _persistCurrentUser(null);
        return false;
      }
    }

    // 3. Sync latest user profile with backend
    try {
      final user = await fetchCurrentUser(forceRefresh: true);
      if (user != null) {
        await _persistCurrentUser(user);
        try {
          final activeToken = await _api.getToken();
          if (activeToken != null) {
            FcmService.instance.registerTokenWithBackend(
              apiBaseUrl: _api.baseUrl,
              authToken: activeToken,
            );
          }
        } catch (_) {}
        return true;
      }
    } catch (e) {
      debugPrint('checkAuthSession fetch error: $e');
      if (e is ApiException && e.statusCode == 401) {
        final refreshed = await _api.attemptTokenRefresh();
        if (!refreshed) {
          await _api.clearToken();
          await _persistCurrentUser(null);
          return false;
        }
      }
    }

    // 4. Offline resilience: Retain session using cached profile
    if (_currentUser != null) {
      AppLogger.info('Retaining authenticated session using cached profile (network resilience)', tag: 'AUTH');
      authStateListenable.value = _currentUser;
      return true;
    }

    return false;
  }

  Future<void> logout() async {
    AppLogger.info('User sign out started for: ${_currentUser?.id ?? "session"}', tag: 'AUTH');
    try {
      final token = await _api.getToken();
      if (token != null && token.isNotEmpty) {
        await FcmService.instance.unregisterToken(
          apiBaseUrl: _api.baseUrl,
          authToken: token,
        );
      }
    } catch (e) {
      AppLogger.warn('FCM token unregister skipped: $e', tag: 'AUTH');
    }

    try {
      await _api.post('/auth/logout');
      AppLogger.info('Backend session invalidated via /auth/logout', tag: 'AUTH');
    } catch (e) {
      AppLogger.warn('Backend logout request note: $e', tag: 'AUTH');
    }

    try {
      final googleSignIn = GoogleSignIn();
      if (await googleSignIn.isSignedIn()) {
        await googleSignIn.signOut();
        AppLogger.info('Google SignIn session cleared', tag: 'AUTH');
      }
    } catch (e) {
      AppLogger.debug('Google sign-out cleanup note: $e', tag: 'AUTH');
    }

    await _api.clearToken();
    await _persistCurrentUser(null);
    _lastUserFetchTime = null;
    _inFlightUserFetch = null;
    AppLogger.info('User session and credentials completely cleared', tag: 'AUTH');
  }

  /// Permanently delete account and all data from database
  Future<void> deleteAccount() async {
    AppLogger.warn('Initiating permanent account deletion from database...', tag: 'AUTH');
    try {
      final token = await _api.getToken();
      if (token != null && token.isNotEmpty) {
        await FcmService.instance.unregisterToken(
          apiBaseUrl: _api.baseUrl,
          authToken: token,
        );
      }
    } catch (e) {
      AppLogger.warn('FCM token unregister before deletion skipped: $e', tag: 'AUTH');
    }

    try {
      await _api.delete('/auth/account');
      AppLogger.info('Account permanently erased from backend database', tag: 'AUTH');
    } catch (e) {
      AppLogger.error('Account deletion API call failed: $e', tag: 'AUTH', error: e);
      rethrow;
    }

    try {
      final googleSignIn = GoogleSignIn();
      if (await googleSignIn.isSignedIn()) {
        await googleSignIn.disconnect();
      }
    } catch (_) {}

    await _api.clearToken();
    await _persistCurrentUser(null);
    _lastUserFetchTime = null;
    _inFlightUserFetch = null;
    AppLogger.info('All local credentials and state cleared after account deletion', tag: 'AUTH');
  }

  Future<String?> _saveTokens(dynamic response) async {
    if (response is Map) {
      final payload = response['data'] is Map ? response['data'] as Map : response;
      final accessToken = payload['accessToken']?.toString() ?? payload['token']?.toString();
      final refreshToken = payload['refreshToken']?.toString();
      if (accessToken != null && accessToken.isNotEmpty) {
        await _api.setToken(accessToken, refreshToken: refreshToken);
        if (payload['user'] is Map) {
          final user = UserModel.fromJson(Map<String, dynamic>.from(payload['user'] as Map));
          await _persistCurrentUser(user);
        }
        try {
          FcmService.instance.registerTokenWithBackend(
            apiBaseUrl: _api.baseUrl,
            authToken: accessToken,
          );
        } catch (_) {}
        return accessToken;
      }
    }
    return null;
  }
}
