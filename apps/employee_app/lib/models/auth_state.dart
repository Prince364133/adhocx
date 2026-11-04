import 'employee_user.dart';

enum AuthStatus {
  initial,
  otpSent,
  authenticating,
  authenticated,
  notEligible,
  invalidOtp,
  error,
}

enum LoginMethod {
  mobileOtp,
  companySso,
}

class AuthState {
  final AuthStatus status;
  final EmployeeUser? user;
  final String? phoneNumber;
  final String? email;
  final String? errorMessage;
  final int resendCountdown;
  final LoginMethod? lastLoginMethod;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.phoneNumber,
    this.email,
    this.errorMessage,
    this.resendCountdown = 30,
    this.lastLoginMethod,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.authenticating;
  bool get isNotEligible => status == AuthStatus.notEligible;
  bool get hasOtpError => status == AuthStatus.invalidOtp;

  AuthState copyWith({
    AuthStatus? status,
    EmployeeUser? user,
    String? phoneNumber,
    String? email,
    String? errorMessage,
    int? resendCountdown,
    LoginMethod? lastLoginMethod,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      email: email ?? this.email,
      errorMessage: errorMessage ?? this.errorMessage,
      resendCountdown: resendCountdown ?? this.resendCountdown,
      lastLoginMethod: lastLoginMethod ?? this.lastLoginMethod,
    );
  }
}

