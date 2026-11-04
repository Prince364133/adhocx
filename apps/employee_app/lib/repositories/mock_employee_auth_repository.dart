import 'dart:async';
import '../models/employee_user.dart';
import 'employee_auth_repository.dart';

/// Mock authentication repository for AdhocX Employee Mobile App development.
/// Clearly identified as mock implementation to prevent fake authentication in production.
///
/// Supported Test Credentials:
/// - Valid OTP Codes: `528471` (from Figma/Mockup Screen 5) or `123456`
/// - Ineligible Transport Access: Code `888888` or phone `8888888888`
/// - Expired OTP: Code `999999`
/// - Invalid OTP: Any other 6-digit code triggers Screen 14 (Invalid OTP)
/// - SSO: any valid company email (@company.com, @estemporaneo.com); email containing 'ineligible' triggers Screen 15.
class MockEmployeeAuthRepository implements EmployeeAuthRepository {
  EmployeeUser? _currentUser;

  @override
  Future<void> sendOtp(String mobileNumber) async {
    // Simulate network latency (400ms)
    await Future.delayed(const Duration(milliseconds: 400));

    final sanitized = mobileNumber.replaceAll(RegExp(r'\D'), '');
    if (sanitized.length < 10) {
      throw Exception('Please enter a valid 10-digit mobile number.');
    }
  }

  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    await Future.delayed(const Duration(milliseconds: 600));

    final cleanOtp = otp.trim();
    final cleanPhone = mobileNumber.replaceAll(RegExp(r'\D'), '');

    // Check for expired OTP trigger
    if (cleanOtp == '999999') {
      throw const ExpiredOtpException();
    }

    // Check for transport ineligible trigger
    if (cleanOtp == '888888' || cleanPhone.endsWith('8888888888')) {
      throw const TransportIneligibleException();
    }

    // Valid OTP codes: 528471 (from UI mockup) or 123456
    if (cleanOtp == '528471' || cleanOtp == '123456') {
      final user = EmployeeUser(
        id: 'usr_emp_10294',
        employeeId: 'EMP10294',
        fullName: 'Arjun Sharma',
        organization: 'Estemporaneo Tech Pvt. Ltd.',
        office: 'HITEC City, Hyderabad',
        email: 'arjun.sharma@estemporaneo.com',
        phone: mobileNumber.startsWith('+91') ? mobileNumber : '+91 $mobileNumber',
        isTransportEligible: true,
        createdAt: DateTime.now(),
      );
      _currentUser = user;
      return user;
    }

    // Any other code is treated as invalid OTP (Screen 14)
    throw const InvalidOtpException();
  }

  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) async {
    await Future.delayed(const Duration(milliseconds: 700));

    final email = companyEmail.trim().toLowerCase();

    if (!email.contains('@') || !email.contains('.')) {
      throw Exception('Please enter a valid company email address.');
    }

    if (email.contains('ineligible') || email.endsWith('@unmapped.com')) {
      throw const TransportIneligibleException();
    }

    final prefix = email.split('@').first;
    final formattedName = prefix
        .split('.')
        .map((part) => part.isNotEmpty ? part[0].toUpperCase() + part.substring(1) : '')
        .join(' ');

    final user = EmployeeUser(
      id: 'usr_sso_10294',
      employeeId: 'EMP10294',
      fullName: formattedName.isNotEmpty ? formattedName : 'Arjun Sharma',
      organization: 'Estemporaneo Tech Pvt. Ltd.',
      office: 'HITEC City, Hyderabad',
      email: companyEmail,
      phone: '+91 98765 43210',
      isTransportEligible: true,
      createdAt: DateTime.now(),
    );
    _currentUser = user;
    return user;
  }

  @override
  Future<EmployeeUser?> getCurrentUser() async {
    return _currentUser;
  }

  @override
  Future<void> signOut() async {
    _currentUser = null;
  }
}
