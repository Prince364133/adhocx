import 'package:adhocx_employee/features/auth/login/mobile_number_screen.dart';
import 'package:adhocx_employee/features/auth/login/otp_verification_screen.dart';
import 'package:adhocx_employee/features/auth/onboarding/welcome_screen.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  const viewports = [
    Size(320, 568),
    Size(360, 640),
    Size(393, 852),
  ];

  for (final viewport in viewports) {
    testWidgets(
        'welcome layout fits ${viewport.width.toInt()}x${viewport.height.toInt()}',
        (tester) async {
      await _setViewport(tester, viewport);
      await tester.pumpWidget(_responsiveApp(const WelcomeScreen()));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });

    testWidgets(
        'mobile number layout fits ${viewport.width.toInt()}x${viewport.height.toInt()}',
        (tester) async {
      await _setViewport(tester, viewport);
      final provider = EmployeeAuthProvider(
        repository: _FakeEmployeeAuthRepository(),
      );
      addTearDown(provider.dispose);

      await tester.pumpWidget(
        ChangeNotifierProvider<EmployeeAuthProvider>.value(
          value: provider,
          child: _responsiveApp(const MobileNumberScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });

    testWidgets(
        'OTP layout fits ${viewport.width.toInt()}x${viewport.height.toInt()}',
        (tester) async {
      await _setViewport(tester, viewport);
      final provider = EmployeeAuthProvider(
        repository: _FakeEmployeeAuthRepository(),
      );
      addTearDown(provider.dispose);

      await tester.pumpWidget(
        ChangeNotifierProvider<EmployeeAuthProvider>.value(
          value: provider,
          child: _responsiveApp(const OtpVerificationScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  }
}

Future<void> _setViewport(WidgetTester tester, Size size) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

MaterialApp _responsiveApp(Widget home) {
  return MaterialApp(
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(
        textScaler: const TextScaler.linear(1.15),
      ),
      child: child ?? const SizedBox.shrink(),
    ),
    home: home,
  );
}

class _FakeEmployeeAuthRepository implements EmployeeAuthRepository {
  @override
  Future<void> sendOtp(String mobileNumber) async {}

  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) async =>
      throw UnimplementedError();

  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) async =>
      throw UnimplementedError();

  @override
  Future<EmployeeUser?> getCurrentUser() async => null;

  @override
  Future<void> signOut() async {}
}
