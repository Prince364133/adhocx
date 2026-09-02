import './api_client.dart';

class UserModel {
  final String id;
  final String phone;
  final String role; // 'DRIVER', 'VENDOR', 'ADMIN'
  final String? fullName;
  final Map<String, dynamic>? driverProfile;
  final Map<String, dynamic>? vendorProfile;

  UserModel({
    required this.id,
    required this.phone,
    required this.role,
    this.fullName,
    this.driverProfile,
    this.vendorProfile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      role: (json['role'] ?? 'DRIVER').toString().toUpperCase(),
      fullName: json['fullName'] ?? json['name'],
      driverProfile: json['driverProfile'],
      vendorProfile: json['vendorProfile'],
    );
  }

  bool get isDriver => role == 'DRIVER';
  bool get isVendor => role == 'VENDOR';

  String get verificationStatus {
    if (isDriver && driverProfile != null) {
      return driverProfile!['verificationStatus'] ?? 'PENDING';
    }
    if (isVendor && vendorProfile != null) {
      return vendorProfile!['verificationStatus'] ?? 'PENDING';
    }
    return 'PENDING';
  }

  bool get isVerified => verificationStatus == 'VERIFIED';
  bool get isUnderReview => verificationStatus == 'UNDER_REVIEW';
  bool get isPending => verificationStatus == 'PENDING';
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

  Future<dynamic> requestOtp({
    required String phone,
    String role = 'DRIVER',
    bool isRegister = false,
    String? fullName,
    String? companyName,
  }) async {
    final response = await _api.post(
      '/auth/otp/request',
      body: {
        'phone': phone,
        'role': role,
        'isRegister': isRegister,
        if (fullName != null) 'fullName': fullName,
        if (companyName != null) 'companyName': companyName,
      },
    );
    return response is Map ? response : {'message': 'OTP sent successfully'};
  }

  Future<AuthResult> verifyOtp({
    required String phone,
    required String otp,
    String role = 'DRIVER',
    bool isRegister = false,
    String? fullName,
  }) async {
    final response = await _api.post(
      '/auth/otp/verify',
      body: {
        'phone': phone,
        'otp': otp,
        'role': role,
        'isRegister': isRegister,
        if (fullName != null) 'fullName': fullName,
      },
    );

    String? token;
    if (response is Map) {
      if (response['accessToken'] != null) {
        token = response['accessToken'] as String;
        await _api.setToken(token);
      } else if (response['token'] != null) {
        token = response['token'] as String;
        await _api.setToken(token);
      }
    }

    final user = await fetchCurrentUser();
    return AuthResult(user: user, accessToken: token);
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
    } catch (_) {
      // Ignore network failures on logout
    } finally {
      await _api.clearToken();
      _currentUser = null;
    }
  }
}
