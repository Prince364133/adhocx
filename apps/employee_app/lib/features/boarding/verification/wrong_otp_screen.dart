import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 6: Wrong OTP / Invalid OTP State
class WrongOtpScreen extends StatelessWidget {
  const WrongOtpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingError('invalid_otp'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const InvalidOtpBadge(),
          illustrationGap: AppSpacing.xxl,
          title: data['title'] ?? 'Invalid OTP',
          message: data['message'] ??
              'The OTP you entered is incorrect. Please check and try again.',
          actions: [
            EmployeePrimaryButton(
              label: 'Try Again',
              icon: Icons.refresh_rounded,
              // Replace this error screen with a fresh input instead of
              // stacking another input screen on top.
              onPressed: () =>
                  context.pushReplacement(AppRoutes.boardingOtpInput),
            ),
            EmployeeSecondaryButton(
              label: 'Scan QR Instead',
              icon: Icons.qr_code_scanner_rounded,
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => context.pushReplacement(AppRoutes.scanBoardingQr),
            ),
          ],
        );
      },
    );
  }
}
