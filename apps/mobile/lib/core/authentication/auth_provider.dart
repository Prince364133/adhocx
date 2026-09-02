import 'package:flutter/material.dart';
import './auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService.instance;

  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user ?? _authService.currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => user != null;

  String get role => user?.role ?? 'DRIVER';
  bool get isDriver => user?.isDriver ?? true;
  bool get isVendor => user?.isVendor ?? false;
  String get verificationStatus => user?.verificationStatus ?? 'PENDING';

  Future<bool> checkSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final hasSession = await _authService.checkAuthSession();
      if (hasSession) {
        _user = _authService.currentUser;
      }
      _isLoading = false;
      notifyListeners();
      return hasSession;
    } catch (_) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> requestOtp({
    required String phone,
    String role = 'DRIVER',
    bool isRegister = false,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.requestOtp(
        phone: phone,
        role: role,
        isRegister: isRegister,
      );
    } catch (e) {
      _errorMessage = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<UserModel> verifyOtp({
    required String phone,
    required String otp,
    String role = 'DRIVER',
    bool isRegister = false,
    String? fullName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _authService.verifyOtp(
        phone: phone,
        otp: otp,
        role: role,
        isRegister: isRegister,
        fullName: fullName,
      );
      _user = result.user;
      return result.user;
    } catch (e) {
      _errorMessage = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    try {
      _user = await _authService.fetchCurrentUser();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _authService.logout();
    _user = null;
    _isLoading = false;
    notifyListeners();
  }
}
