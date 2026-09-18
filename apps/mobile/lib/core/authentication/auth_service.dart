import '../networking/api_client.dart';

class UserModel {
  final String id;
  final String? phone;
  final String? email;
  final String role; // 'DRIVER', 'VENDOR', 'ADMIN'
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
    this.hasPassword = true,
    this.isOnboarded = true,
    this.driverProfile,
    this.vendorProfile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final bool hasPass = json['hasPassword'] == true || json['passwordSet'] == true;
    final bool isOb = json['isOnboarded'] == true;

    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'],
      email: json['email'],
      role: (json['role'] ?? 'DRIVER').toString().toUpperCase(),
      fullName: json['fullName'] ?? json['name'],
      photoUrl: json['photoUrl'],
      hasPassword: json.containsKey('hasPassword') ? hasPass : true,
      isOnboarded: json.containsKey('isOnboarded') ? isOb : true,
      driverProfile: json['driverProfile'],
      vendorProfile: json['vendorProfile'],
    );
  }

  bool get isDriver => role == 'DRIVER';
  bool get isUser => role == 'USER' || role == 'VENDOR';
  bool get isVendor => isUser;

  String get verificationStatus {
    if (isDriver && driverProfile != null) {
      return driverProfile!['verificationStatus'] ?? 'PENDING';
    }
    if (vendorProfile != null) {
      return vendorProfile!['verificationStatus'] ?? 'PENDING';
    }
    return 'PENDING';
  }

  bool get isVerified => verificationStatus == 'VERIFIED';
  bool get isUnderReview => verificationStatus == 'UNDER_REVIEW';
  bool get isRejected => verificationStatus == 'REJECTED';
  bool get isPending => verificationStatus == 'PENDING';

  String? get rejectionReason {
    if (isDriver && driverProfile != null) {
      return driverProfile!['rejectionReason'];
    }
    if (vendorProfile != null) {
      return vendorProfile!['rejectionReason'];
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
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;

  void setCurrentUser(UserModel? user) {
    _currentUser = user;
  }

  /**
   * Request OTP via SMS (Phone) or Email
   */
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

  /**
   * Verify OTP with Phone or Email
   */
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

    String? token;
    if (response is Map) {
      // API wraps responses in { success, data }, unwrap if needed
      final payload = response['data'] is Map ? response['data'] as Map : response;
      if (payload['accessToken'] != null) {
        token = payload['accessToken'] as String;
        await _api.setToken(token);
      } else if (payload['token'] != null) {
        token = payload['token'] as String;
        await _api.setToken(token);
      }
    }

    final user = await fetchCurrentUser();
    return AuthResult(user: user, accessToken: token);
  }

  /**
   * Google Sign-In / Sign-Up (Pre-verified email, skips OTP)
   */
  Future<AuthResult> signInWithGoogle({
    String? email,
    String? fullName,
    String? idToken,
    String role = 'DRIVER',
  }) async {
    final userEmail = email ?? 'google.user@gmail.com';
    final userName = fullName ?? 'Google User';

    final response = await _api.post(
      '/auth/social',
      body: {
        'provider': 'GOOGLE',
        'email': userEmail,
        'fullName': userName,
        if (idToken != null) 'idToken': idToken,
        'role': role,
      },
    );

    String? token;
    if (response is Map) {
      // API wraps responses in { success, data }, unwrap if needed
      final payload = response['data'] is Map ? response['data'] as Map : response;
      if (payload['accessToken'] != null) {
        token = payload['accessToken'] as String;
        await _api.setToken(token);
      } else if (payload['token'] != null) {
        token = payload['token'] as String;
        await _api.setToken(token);
      }
    }

    final user = await fetchCurrentUser();
    return AuthResult(user: user, accessToken: token);
  }

  /**
   * Apple Sign-In / Sign-Up (Pre-verified email, skips OTP)
   */
  Future<AuthResult> signInWithApple({
    String? email,
    String? fullName,
    String role = 'DRIVER',
  }) async {
    final userEmail = email ?? 'apple.user@privaterelay.appleid.com';
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

    String? token;
    if (response is Map) {
      // API wraps responses in { success, data }, unwrap if needed
      final payload = response['data'] is Map ? response['data'] as Map : response;
      if (payload['accessToken'] != null) {
        token = payload['accessToken'] as String;
        await _api.setToken(token);
      } else if (payload['token'] != null) {
        token = payload['token'] as String;
        await _api.setToken(token);
      }
    }

    final user = await fetchCurrentUser();
    return AuthResult(user: user, accessToken: token);
  }

  /**
   * Set User Password
   */
  Future<dynamic> setPassword({required String password}) async {
    final response = await _api.post(
      '/auth/password',
      body: {'password': password},
    );
    return response;
  }

  Future<UserModel> fetchCurrentUser() async {
    final response = await _api.get('/auth/me');
    if (response is Map<String, dynamic>) {
      _currentUser = UserModel.fromJson(response);
      return _currentUser!;
    }
    throw Exception('Failed to load user profile: Invalid response');
  }

  Future<bool> checkAuthSession() async {
    final token = await _api.getToken();
    if (token == null || token.isEmpty) return false;

    try {
      await fetchCurrentUser();
      return true;
    } catch (_) {
      await _api.clearToken();
      _currentUser = null;
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {}
    await _api.clearToken();
    _currentUser = null;
  }
}
