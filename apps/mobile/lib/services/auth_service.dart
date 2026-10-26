import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/networking/api_client.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../core/utils/app_logger.dart';
import '../core/utils/name_utils.dart';
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

  UserModel copyWith({
    String? id,
    String? phone,
    String? email,
    String? role,
    String? fullName,
    String? photoUrl,
    bool? hasPassword,
    bool? isOnboarded,
    Map<String, dynamic>? driverProfile,
    Map<String, dynamic>? vendorProfile,
  }) {
    return UserModel(
      id: id ?? this.id,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      photoUrl: photoUrl ?? this.photoUrl,
      hasPassword: hasPassword ?? this.hasPassword,
      isOnboarded: isOnboarded ?? this.isOnboarded,
      driverProfile: driverProfile ?? this.driverProfile,
      vendorProfile: vendorProfile ?? this.vendorProfile,
    );
  }

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

    final String? vAddress = vendorProf?['address']?.toString().trim();
    final String? vOrg = vendorProf?['organizationName']?.toString().trim();
    final bool hasValidOrg = vOrg != null && vOrg.isNotEmpty && !isPlaceholderName(vOrg);
    final bool hasValidAddress = vAddress != null && vAddress.isNotEmpty;

    final bool hasVendorSubmission = vendorProf != null &&
        (vStatus == 'UNDER_REVIEW' ||
         vStatus == 'VERIFIED' ||
         (vStatus == 'REJECTED' && hasValidAddress) ||
         (hasValidAddress && hasValidOrg));

    final bool hasDriverSubmission = driverProf != null &&
        (dStatus == 'UNDER_REVIEW' ||
         dStatus == 'VERIFIED' ||
         dStatus == 'REJECTED' ||
         (driverProf['vehiclePlate'] != null && driverProf['vehiclePlate'].toString().trim().isNotEmpty) ||
         driverProf['dlFrontUrl'] != null);

    final bool isOb = (data['isOnboarded'] == true || root['isOnboarded'] == true) &&
        (data['role'] == 'DRIVER' || root['role'] == 'DRIVER'
            ? (hasDriverSubmission || dStatus == 'UNDER_REVIEW' || dStatus == 'VERIFIED')
            : (hasVendorSubmission || vStatus == 'UNDER_REVIEW' || vStatus == 'VERIFIED')) ||
        hasVendorSubmission ||
        hasDriverSubmission ||
        dStatus == 'UNDER_REVIEW' ||
        dStatus == 'VERIFIED' ||
        vStatus == 'UNDER_REVIEW' ||
        vStatus == 'VERIFIED';

    final rawPhone = data['phone']?.toString() ??
        root['phone']?.toString() ??
        driverProf?['phone']?.toString() ??
        vendorProf?['phone']?.toString();
    final cleanPhone = (rawPhone != null && rawPhone.trim().isNotEmpty && rawPhone.trim() != '—')
        ? rawPhone.trim()
        : null;

    final rawName = data['fullName'] ?? data['name'] ?? root['fullName'] ?? driverProf?['fullName'] ?? vendorProf?['fullName'];
    final cleanName = (rawName != null && rawName.toString().trim().isNotEmpty)
        ? rawName.toString().trim()
        : null;

    String? resolvePhoto(dynamic val) {
      if (val == null) return null;
      final str = val.toString().trim();
      if (str.isEmpty || str == 'null' || str == 'undefined') return null;
      return str;
    }

    final cleanPhoto = resolvePhoto(data['photoUrl']) ??
        resolvePhoto(root['photoUrl']) ??
        resolvePhoto(data['profilePhotoUrl']) ??
        resolvePhoto(root['profilePhotoUrl']) ??
        resolvePhoto(data['avatarUrl']) ??
        resolvePhoto(root['avatarUrl']) ??
        resolvePhoto(data['selfieUrl']) ??
        resolvePhoto(root['selfieUrl']) ??
        resolvePhoto(data['profilePic']) ??
        resolvePhoto(driverProf?['profilePhotoUrl']) ??
        resolvePhoto(driverProf?['photoUrl']) ??
        resolvePhoto(driverProf?['kycDocuments'] is Map ? driverProf?['kycDocuments']?['profilePhotoUrl'] : null) ??
        resolvePhoto(vendorProf?['logoUrl']) ??
        resolvePhoto(vendorProf?['photoUrl']);

    return UserModel(
      id: (data['id'] ?? root['id'] ?? '').toString(),
      phone: cleanPhone,
      email: data['email']?.toString() ?? root['email']?.toString(),
      role: roleStr,
      fullName: cleanName,
      photoUrl: cleanPhoto,
      hasPassword: hasPass,
      isOnboarded: isOb,
      driverProfile: driverProf,
      vendorProfile: vendorProf,
    );
  }

  String? get effectivePhotoUrl {
    if (photoUrl != null && photoUrl!.trim().isNotEmpty && photoUrl != 'null' && photoUrl != 'undefined') {
      return photoUrl!.trim();
    }
    final dPhoto = driverProfile?['profilePhotoUrl']?.toString() ?? driverProfile?['photoUrl']?.toString();
    if (dPhoto != null && dPhoto.trim().isNotEmpty && dPhoto != 'null' && dPhoto != 'undefined') {
      return dPhoto.trim();
    }
    final kycPhoto = (driverProfile?['kycDocuments'] is Map ? driverProfile?['kycDocuments']?['profilePhotoUrl']?.toString() : null);
    if (kycPhoto != null && kycPhoto.trim().isNotEmpty && kycPhoto != 'null' && kycPhoto != 'undefined') {
      return kycPhoto.trim();
    }
    final vPhoto = vendorProfile?['logoUrl']?.toString() ?? vendorProfile?['photoUrl']?.toString();
    if (vPhoto != null && vPhoto.trim().isNotEmpty && vPhoto != 'null' && vPhoto != 'undefined') {
      return vPhoto.trim();
    }
    return null;
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
      (isOnboarded && !isVerified && !isRejected && verificationStatus != 'PENDING');
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

  void updateCurrentUserProfilePhoto(String photoUrl) {
    if (_currentUser == null) return;
    final updated = UserModel(
      id: _currentUser!.id,
      phone: _currentUser!.phone,
      email: _currentUser!.email,
      role: _currentUser!.role,
      fullName: _currentUser!.fullName,
      photoUrl: photoUrl,
      hasPassword: _currentUser!.hasPassword,
      isOnboarded: _currentUser!.isOnboarded,
      driverProfile: {
        ...?_currentUser!.driverProfile,
        'profilePhotoUrl': photoUrl,
      },
      vendorProfile: _currentUser!.vendorProfile,
    );
    _persistCurrentUser(updated);
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

  void updateCurrentUser({
    String? fullName,
    String? phone,
    String? email,
    String? photoUrl,
    bool? isOnboarded,
    Map<String, dynamic>? driverProfile,
    Map<String, dynamic>? vendorProfile,
  }) {
    if (_currentUser == null) return;
    final validName = (fullName != null && !isPlaceholderName(fullName)) ? fullName.trim() : null;
    final updated = _currentUser!.copyWith(
      fullName: validName ?? _currentUser!.fullName,
      phone: (phone != null && phone.trim().isNotEmpty) ? phone.trim() : _currentUser!.phone,
      email: (email != null && email.trim().isNotEmpty) ? email.trim() : _currentUser!.email,
      photoUrl: photoUrl ?? _currentUser!.photoUrl,
      isOnboarded: isOnboarded ?? _currentUser!.isOnboarded,
      driverProfile: driverProfile != null
          ? { ...?_currentUser!.driverProfile, ...driverProfile }
          : (validName != null
              ? { ...?_currentUser!.driverProfile, 'fullName': validName }
              : _currentUser!.driverProfile),
      vendorProfile: vendorProfile != null
          ? { ...?_currentUser!.vendorProfile, ...vendorProfile }
          : (validName != null
              ? { ...?_currentUser!.vendorProfile, 'fullName': validName }
              : _currentUser!.vendorProfile),
    );
    _currentUser = updated;
    authStateListenable.value = updated;
    _persistCurrentUser(updated);
  }

  /// Check if a mobile number is available and unique across all accounts
  Future<Map<String, dynamic>> checkPhoneAvailability(String phone) async {
    final cleanPhone = phone.trim();
    if (cleanPhone.isEmpty) {
      return {'available': false, 'message': 'Please enter a valid mobile number.'};
    }
    try {
      final res = await _api.post('/auth/check-phone', body: {'phone': cleanPhone});
      if (res is Map<String, dynamic>) {
        return res;
      }
      return {'available': true};
    } catch (e) {
      final str = e.toString();
      final msg = str.replaceFirst(RegExp(r'^(Exception|ConflictException):\s*'), '');
      return {'available': false, 'message': msg};
    }
  }

  Future<UserModel> updateUserProfile({
    String? fullName,
    String? phone,
    String? email,
  }) async {
    final payload = <String, dynamic>{};
    if (fullName != null && fullName.trim().isNotEmpty) {
      payload['fullName'] = fullName.trim();
    }
    if (phone != null && phone.trim().isNotEmpty) {
      payload['phone'] = phone.trim();
    }
    if (email != null && email.trim().isNotEmpty) {
      payload['email'] = email.trim();
    }

    try {
      final response = await _api.patch('/auth/profile', body: payload);
      if (response != null && response is Map<String, dynamic>) {
        final data = response['data'] is Map<String, dynamic> ? response['data'] as Map<String, dynamic> : response;
        final updated = UserModel.fromJson(data);
        setCurrentUser(updated);
        return updated;
      }
    } catch (e) {
      AppLogger.warn('updateUserProfile API error: $e');
      rethrow;
    }

    updateCurrentUser(fullName: fullName, phone: phone, email: email);
    return _currentUser!;
  }

  /// Password Authentication (Mobile Number / Email + Password)
  Future<AuthResult> loginWithPassword({
    required String identifier,
    required String password,
    String? role,
  }) async {
    final response = await _api.post(
      '/auth/login',
      body: {
        'identifier': identifier,
        'password': password,
        if (role != null && role.isNotEmpty) 'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role ?? 'DRIVER');
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Request OTP via SMS (Phone) or Email
  Future<dynamic> requestOtp({
    String? phone,
    String? email,
    String? channel,
    String? role,
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
        if (role != null && role.isNotEmpty) 'role': role,
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
    String? role,
    bool isRegister = false,
    String? fullName,
  }) async {
    final response = await _api.post(
      '/auth/otp/verify',
      body: {
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'otp': otp,
        if (role != null && role.isNotEmpty) 'role': role,
        'isRegister': isRegister,
        if (fullName != null) 'fullName': fullName,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(id: 'usr_auth', role: role ?? 'DRIVER', phone: phone, email: email, fullName: fullName);
    return AuthResult(user: effectiveUser, accessToken: token);
  }

  /// Google Sign-In / Sign-Up (Pre-verified email, skips OTP)
  Future<AuthResult> signInWithGoogle({
    String? role,
  }) async {
    const defaultWebClientId = '886573696369-84dnfvb9jaegbqp8deosr3ucf8tq93ms.apps.googleusercontent.com';
    const envClientId = String.fromEnvironment('GOOGLE_CLIENT_ID', defaultValue: '');
    final googleClientId = envClientId.isNotEmpty ? envClientId : defaultWebClientId;

    String? email;
    String? displayName;
    String? idToken;
    String? signInError;

    try {
      GoogleSignIn googleSignIn = GoogleSignIn(
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

      GoogleSignInAccount? googleUser;
      try {
        googleUser = await googleSignIn.signIn();
      } catch (e) {
        if (!kIsWeb && (e.toString().contains('10') || e.toString().contains('DEVELOPER_ERROR'))) {
          debugPrint('GoogleSignIn code 10 encountered. Attempting direct profile fallback...');
          googleSignIn = GoogleSignIn(
            scopes: ['email', 'profile'],
          );
          googleUser = await googleSignIn.signIn();
        } else {
          rethrow;
        }
      }

      if (googleUser != null) {
        email = googleUser.email;
        displayName = googleUser.displayName;
        try {
          final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
          idToken = googleAuth.idToken;
        } catch (_) {}
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
        if (displayName != null && !isPlaceholderName(displayName))
          'fullName': displayName.trim(),
        if (idToken != null) 'idToken': idToken,
        if (role != null && role.isNotEmpty) 'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(
      id: 'usr_auth',
      role: role ?? 'DRIVER',
      email: email,
      fullName: isPlaceholderName(displayName) ? null : displayName,
    );
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
    final cleanFullName = isPlaceholderName(fullName) ? null : fullName?.trim();

    final response = await _api.post(
      '/auth/social',
      body: {
        'provider': 'APPLE',
        'email': userEmail,
        if (cleanFullName != null && cleanFullName.isNotEmpty)
          'fullName': cleanFullName,
        'role': role,
      },
    );

    final token = await _saveTokens(response);
    final user = await fetchCurrentUser(forceRefresh: true);
    final effectiveUser = user ?? _currentUser ?? UserModel(
      id: 'usr_auth',
      role: role,
      email: userEmail,
      fullName: cleanFullName,
    );
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
