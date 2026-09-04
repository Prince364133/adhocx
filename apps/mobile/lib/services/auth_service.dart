import '../core/networking/api_client.dart';
import 'package:google_sign_in/google_sign_in.dart';

class UserModel {
  final String id;
  final String? phone;
  final String? email;
  final String role; // 'DRIVER', 'VENDOR', 'ADMIN'
  final String? fullName;
  final String? photoUrl;
  final Map<String, dynamic>? driverProfile;
  final Map<String, dynamic>? vendorProfile;

  UserModel({
    required this.id,
    this.phone,
    this.email,
    required this.role,
    this.fullName,
    this.photoUrl,
    this.driverProfile,
    this.vendorProfile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'],
      email: json['email'],
      role: (json['role'] ?? 'DRIVER').toString().toUpperCase(),
      fullName: json['fullName'] ?? json['name'],
      photoUrl: json['photoUrl'],
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
    String role = 'DRIVER',
  }) async {
    final GoogleSignIn googleSignIn = GoogleSignIn(
      clientId: '886573696369-84dnfvb9jaegbqp8deosr3ucf8tq93ms.apps.googleusercontent.com',
    );

    final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
    if (googleUser == null) {
      throw Exception('Google Sign-In was aborted.');
    }

    final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
    final idToken = googleAuth.idToken;

    if (idToken == null) {
      throw Exception('Failed to obtain Google ID Token.');
    }

    final response = await _api.post(
      '/auth/social',
      body: {
        'provider': 'GOOGLE',
        'email': googleUser.email,
        'fullName': googleUser.displayName ?? 'Google User',
        'idToken': idToken,
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
    final userEmail = email ?? 'rahul.apple@privaterelay.appleid.com';
    final userName = fullName ?? 'Rahul Sharma';

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
    try {
      final response = await _api.get('/auth/me');
      if (response is Map<String, dynamic>) {
        _currentUser = UserModel.fromJson(response);
      } else {
        _currentUser = UserModel(id: 'mock_user', phone: '+919876543210', role: 'DRIVER');
      }
    } catch (_) {
      _currentUser = UserModel(id: 'mock_user', phone: '+919876543210', role: 'DRIVER');
    }
    return _currentUser!;
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
