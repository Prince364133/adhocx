import 'package:adhocx_employee/features/auth/auth.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_permission_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

class _FakeAuthRepository implements EmployeeAuthRepository {
  @override
  Future<void> sendOtp(String mobileNumber) async {}
  @override
  Future<EmployeeUser?> getCurrentUser() async => null;
  @override
  Future<void> signOut() async {}
  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) =>
      throw UnimplementedError();
  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) =>
      throw UnimplementedError();
}

final _screens = <String, Widget Function()>{
  'Splash': () => const SplashScreen(),
  'Welcome': () => const WelcomeScreen(),
  'Mobile number': () => const MobileNumberScreen(),
  'OTP verification': () => const OtpVerificationScreen(),
  'Invalid OTP': () => const InvalidOtpScreen(),
  'Location permission': () => const LocationPermissionScreen(),
  'Notification permission': () => const NotificationPermissionScreen(),
  'Onboarding schedule': () => const OnboardingScheduleScreen(),
  'Onboarding tracking': () => const OnboardingTrackingScreen(),
  'Onboarding safety': () => const OnboardingSafetyScreen(),
  'Onboarding complete': () => const OnboardingCompleteScreen(),
  'Employee verified': () => const EmployeeVerificationScreen(),
  'Transport unavailable': () => const TransportUnavailableScreen(),
};

void main() {
  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    _screens.forEach((name, build) {
      testWidgets('$name renders on a 360x640 phone in $mode mode',
          (tester) async {
        tester.view.physicalSize = const Size(360, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(
          MultiProvider(
            providers: [
              ChangeNotifierProvider(
                create: (_) =>
                    EmployeeAuthProvider(repository: _FakeAuthRepository()),
              ),
              ChangeNotifierProvider(
                  create: (_) => EmployeePermissionProvider()),
            ],
            child: MaterialApp(
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: dark ? ThemeMode.dark : ThemeMode.light,
              home: build(),
            ),
          ),
        );
        await tester.pump(const Duration(seconds: 1));

        expect(tester.takeException(), isNull);

        // Page background follows the Driver token for the active mode
        // (splash keeps its brand gradient surface).
        if (name != 'Splash') {
          final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
          expect(scaffold.backgroundColor,
              dark ? AppColors.bgDark : AppColors.bgLight);
        }

        // Dispose (cancels splash timer / entrance animations).
        await tester.pumpWidget(const SizedBox.shrink());
      });
    });
  }
}
