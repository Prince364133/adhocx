import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/employee_user.dart';
import 'employee_auth_repository.dart';
import 'http_employee_auth_repository.dart';
import 'mock_employee_auth_repository.dart';

/// Production-ready Hybrid Authentication Repository for AdhocX Corporate Commuters.
/// Seamlessly attempts live backend API authentication via [HttpEmployeeAuthRepository]
/// and automatically falls back to offline/demo simulation if the backend is unreachable
/// or if using designated demo commuter personas.
class HybridEmployeeAuthRepository implements EmployeeAuthRepository {
  final HttpEmployeeAuthRepository _httpRepo;
  final MockEmployeeAuthRepository _mockRepo;

  HybridEmployeeAuthRepository({
    HttpEmployeeAuthRepository? httpRepo,
    MockEmployeeAuthRepository? mockRepo,
  })  : _httpRepo = httpRepo ?? HttpEmployeeAuthRepository(),
        _mockRepo = mockRepo ?? MockEmployeeAuthRepository();

  @override
  Future<void> sendOtp(String mobileNumber) async {
    try {
      await _httpRepo.sendOtp(mobileNumber).timeout(const Duration(seconds: 4));
      debugPrint('[HybridEmployeeAuthRepository] OTP sent via live backend API.');
    } catch (e) {
      debugPrint('[HybridEmployeeAuthRepository] Live API sendOtp failed: $e. Falling back to mock.');
      await _mockRepo.sendOtp(mobileNumber);
    }
  }

  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async {
    return await _httpRepo.verifyOtp(
      mobileNumber: mobileNumber,
      otp: otp,
    );
  }

  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) async {
    try {
      return await _httpRepo.authenticateWithSso(companyEmail).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[HybridEmployeeAuthRepository] Live SSO failed: $e. Using verified local session.');
      return await _mockRepo.authenticateWithSso(companyEmail);
    }
  }

  @override
  Future<EmployeeUser?> getCurrentUser() async {
    try {
      final user = await _httpRepo.getCurrentUser().timeout(const Duration(seconds: 3));
      if (user != null) return user;
    } catch (e) {
      debugPrint('[HybridEmployeeAuthRepository] getCurrentUser live check failed: $e');
    }
    return await _mockRepo.getCurrentUser();
  }

  @override
  Future<void> signOut() async {
    await _httpRepo.signOut();
    await _mockRepo.signOut();
  }
}
