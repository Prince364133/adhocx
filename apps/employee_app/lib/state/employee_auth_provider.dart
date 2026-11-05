import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/auth_state.dart';
import '../models/employee_user.dart';
import '../repositories/employee_auth_repository.dart';
import '../repositories/http_employee_auth_repository.dart';

class EmployeeAuthProvider extends ChangeNotifier {
  final EmployeeAuthRepository _repository;
  AuthState _state = const AuthState();
  Timer? _countdownTimer;

  EmployeeAuthProvider({required EmployeeAuthRepository repository})
      : _repository = repository {
    checkExistingSession();
  }

  AuthState get state => _state;
  EmployeeUser? get currentUser => _state.user;
  bool get isLoading => _state.isLoading;
  bool get isAuthenticated => _state.isAuthenticated;
  String? get errorMessage => _state.errorMessage;
  int get resendCountdown => _state.resendCountdown;
  String? get currentPhone => _state.phoneNumber;

  Future<void> checkExistingSession() async {
    try {
      final cached = await _repository.getCurrentUser();
      if (cached != null) {
        _state = _state.copyWith(
          status: AuthStatus.authenticated,
          user: cached,
        );
        notifyListeners();
      }
    } catch (_) {}
  }

  void setPhoneNumber(String phone) {
    _state = _state.copyWith(phoneNumber: phone);
    notifyListeners();
  }

  void setEmail(String email) {
    _state = _state.copyWith(email: email);
    notifyListeners();
  }

  void clearError() {
    if (_state.errorMessage != null || _state.status == AuthStatus.invalidOtp) {
      _state = _state.copyWith(
        errorMessage: null,
        status: _state.user != null ? AuthStatus.authenticated : AuthStatus.otpSent,
      );
      notifyListeners();
    }
  }

  Future<AuthStatus> loginWithPassword({
    required String identifier,
    required String password,
  }) async {
    _state = _state.copyWith(
      status: AuthStatus.authenticating,
      errorMessage: null,
      phoneNumber: identifier,
    );
    notifyListeners();

    try {
      EmployeeUser user;
      final repo = _repository;
      if (repo is HttpEmployeeAuthRepository) {
        user = await repo.loginWithPassword(
          identifier: identifier,
          password: password,
        );
      } else {
        user = await _repository.authenticateWithSso(identifier);
      }

      _countdownTimer?.cancel();
      _state = _state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        errorMessage: null,
      );
      notifyListeners();
      return AuthStatus.authenticated;
    } catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      notifyListeners();
      return AuthStatus.error;
    }
  }

  Future<bool> sendOtp(String mobileNumber) async {
    _state = _state.copyWith(
      status: AuthStatus.authenticating,
      phoneNumber: mobileNumber,
      errorMessage: null,
      lastLoginMethod: LoginMethod.mobileOtp,
    );
    notifyListeners();

    try {
      await _repository.sendOtp(mobileNumber);
      _startResendCountdown();
      _state = _state.copyWith(
        status: AuthStatus.otpSent,
        errorMessage: null,
      );
      notifyListeners();
      return true;
    } catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      notifyListeners();
      return false;
    }
  }

  Future<AuthStatus> verifyOtp(String otp) async {
    final phone = _state.phoneNumber ?? '';
    _state = _state.copyWith(
      status: AuthStatus.authenticating,
      errorMessage: null,
    );
    notifyListeners();

    try {
      final user = await _repository.verifyOtp(
        mobileNumber: phone,
        otp: otp,
      );
      _countdownTimer?.cancel();
      _state = _state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        errorMessage: null,
      );
      notifyListeners();
      return AuthStatus.authenticated;
    } on InvalidOtpException catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.invalidOtp,
        errorMessage: e.message,
      );
      notifyListeners();
      return AuthStatus.invalidOtp;
    } on ExpiredOtpException catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.invalidOtp,
        errorMessage: e.message,
      );
      notifyListeners();
      return AuthStatus.invalidOtp;
    } on TransportIneligibleException catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.notEligible,
        errorMessage: e.message,
      );
      notifyListeners();
      return AuthStatus.notEligible;
    } catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      notifyListeners();
      return AuthStatus.error;
    }
  }

  Future<AuthStatus> authenticateWithSso(String email) async {
    _state = _state.copyWith(
      status: AuthStatus.authenticating,
      email: email,
      errorMessage: null,
      lastLoginMethod: LoginMethod.companySso,
    );
    notifyListeners();

    try {
      final user = await _repository.authenticateWithSso(email);
      _state = _state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        errorMessage: null,
      );
      notifyListeners();
      return AuthStatus.authenticated;
    } on TransportIneligibleException catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.notEligible,
        errorMessage: e.message,
      );
      notifyListeners();
      return AuthStatus.notEligible;
    } catch (e) {
      _state = _state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      notifyListeners();
      return AuthStatus.error;
    }
  }

  void resendOtp() {
    if (_state.resendCountdown > 0) return;
    if (_state.phoneNumber != null) {
      sendOtp(_state.phoneNumber!);
    }
  }

  void _startResendCountdown() {
    _countdownTimer?.cancel();
    _state = _state.copyWith(resendCountdown: 24);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_state.resendCountdown > 0) {
        _state = _state.copyWith(resendCountdown: _state.resendCountdown - 1);
        notifyListeners();
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> signOut() async {
    _countdownTimer?.cancel();
    await _repository.signOut();
    _state = const AuthState();
    notifyListeners();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }
}
