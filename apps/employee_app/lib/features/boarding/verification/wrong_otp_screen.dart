import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Wrong OTP / Invalid OTP State.
class WrongOtpScreen extends StatelessWidget {
  const WrongOtpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const InvalidOtpBadge(),
      illustrationGap: AppSpacing.xxl,
      title: 'Invalid OTP',
      message:
          'The OTP you entered is incorrect. Please check and try again.',
      actions: [
        EmployeePrimaryButton(
          label: 'Try Again',
          icon: Icons.refresh_rounded,
          onPressed: () => context.pushReplacement(AppRoutes.boardingOtpInput),
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
  }
}
