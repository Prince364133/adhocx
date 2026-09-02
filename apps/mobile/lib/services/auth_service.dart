import './api_client.dart';

class UserModel {
  final String id;
  final String phone;
  final String role;
  final String status;
  final Map<String, dynamic>? driverProfile;
  final Map<String, dynamic>? vendorProfile;

  UserModel({
    required this.id,
    required this.phone,
    required this.role,
    required this.status,
    this.driverProfile,
    this.vendorProfile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'DRIVER',
      status: json['status'] ?? 'ACTIVE',
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

class AuthService {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();

  AuthService._();

  final ApiClient _api = ApiClient.instance;
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;

  Future<void> requestOtp(String phone) async {
    await _api.post('/auth/otp/request', body: {'phone': phone});
  }

  Future<UserModel> verifyOtp({
    required String phone,
    required String otp,
    String role = 'DRIVER',
  }) async {
    final response = await _api.post(
      '/auth/otp/verify',
      body: {'phone': phone, 'otp': otp, 'role': role},
    );

    if (response is Map && response['accessToken'] != null) {
      final token = response['accessToken'] as String;
      await _api.setToken(token);
    }

    return await fetchCurrentUser();
  }

  Future<UserModel> fetchCurrentUser() async {
    final response = await _api.get('/auth/me');
    _currentUser = UserModel.fromJson(response);
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
