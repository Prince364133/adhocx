import '../models/employee_user.dart';

abstract class EmployeeAuthRepository {
  /// Request a 6-digit OTP to be sent to the given 10-digit mobile number.
  Future<void> sendOtp(String mobileNumber);

  /// Verify 6-digit OTP and retrieve authenticated employee profile.
  /// Throws specific exceptions for invalid OTP, expired OTP, or ineligible transport access.
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  });

  /// Authenticate using Corporate Single Sign-On with company email.
  Future<EmployeeUser> authenticateWithSso(String companyEmail);

  /// Get the currently cached employee user if active session exists.
  Future<EmployeeUser?> getCurrentUser();

  /// Sign out current employee session.
  Future<void> signOut();
}

class InvalidOtpException implements Exception {
  final String message;
  const InvalidOtpException([this.message = 'Invalid OTP. Please check and try again.']);
  @override
  String toString() => message;
}

class ExpiredOtpException implements Exception {
  final String message;
  const ExpiredOtpException([this.message = 'OTP has expired. Please request a new code.']);
  @override
  String toString() => message;
}

class TransportIneligibleException implements Exception {
  final String message;
  const TransportIneligibleException([
    this.message = 'Your account is not mapped to an active employee transport program. Please contact your HR team for assistance.',
  ]);
  @override
  String toString() => message;
}

