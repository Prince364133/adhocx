import 'dart:async';
import '../models/employee_user.dart';
import '../services/mock_data_service.dart';
import 'employee_auth_repository.dart';

/// Mock authentication repository for AdhocX Employee Mobile App.
/// Uses JSON mock data loaded via MockDataService instead of hardcoded inline data.
class MockEmployeeAuthRepository implements EmployeeAuthRepository {
  EmployeeUser? _currentUser;

  @override
  Future<void> sendOtp(String mobileNumber) async {
    await Future.delayed(const Duration(milliseconds: 300));
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
    await Future.delayed(const Duration(milliseconds: 500));

    final cleanOtp = otp.trim();
    final cleanPhone = mobileNumber.replaceAll(RegExp(r'\D'), '');

    if (cleanOtp == '999999') {
      throw const ExpiredOtpException();
    }

    if (cleanOtp == '888888' || cleanPhone.endsWith('8888888888')) {
      throw const TransportIneligibleException();
    }

    // Valid OTP codes: 528471 (from UI mockup) or 123456
    if (cleanOtp == '528471' || cleanOtp == '123456') {
      final profile = await MockDataService.getEmployeeProfile();
      final user = EmployeeUser(
        id: profile['id'] as String? ?? 'usr_emp_10294',
        employeeId: profile['employeeId'] as String? ?? 'EMP10294',
        fullName: profile['name'] as String? ?? 'Ravi Kumar',
        organization: profile['organization'] as String? ?? 'Estemporaneo Tech Pvt. Ltd.',
        office: profile['office'] as String? ?? 'HITEC City Office, Hyderabad',
        email: profile['email'] as String? ?? 'ravi.kumar@estemporaneo.com',
        phone: mobileNumber.startsWith('+91') ? mobileNumber : '+91 $mobileNumber',
        isTransportEligible: true,
        createdAt: DateTime.now(),
      );
      _currentUser = user;
      return user;
    }

    throw const InvalidOtpException();
  }

  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final email = companyEmail.trim().toLowerCase();
    if (!email.contains('@') || !email.contains('.')) {
      throw Exception('Please enter a valid company email address.');
    }

    if (email.contains('ineligible') || email.endsWith('@unmapped.com')) {
      throw const TransportIneligibleException();
    }

    final profile = await MockDataService.getEmployeeProfile();
    final user = EmployeeUser(
      id: profile['id'] as String? ?? 'usr_sso_10294',
      employeeId: profile['employeeId'] as String? ?? 'EMP10294',
      fullName: profile['name'] as String? ?? 'Ravi Kumar',
      organization: profile['organization'] as String? ?? 'Estemporaneo Tech Pvt. Ltd.',
      office: profile['office'] as String? ?? 'HITEC City Office, Hyderabad',
      email: companyEmail,
      phone: profile['phone'] as String? ?? '+91 98765 43210',
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
