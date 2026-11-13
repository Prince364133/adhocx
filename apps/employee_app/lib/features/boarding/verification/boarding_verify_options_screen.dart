import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 1: Boarding - Verify Options
class BoardingVerifyOptionsScreen extends StatelessWidget {
  const BoardingVerifyOptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('verification_options'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustrationGap: AppSpacing.xxl,
          illustration: Container(
            width: double.infinity,
            height: 180,
            decoration: BoxDecoration(
              color: p.accentTint,
              borderRadius: AppRadius.borderXxl,
              border: Border.all(color: p.border),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.directions_car_filled_rounded,
                    size: 68, color: p.accent),
                const SizedBox(height: AppSpacing.sm + 2),
                const Icon(Icons.qr_code_scanner_rounded,
                    size: 32, color: AppColors.brandOrange),
              ],
            ),
          ),
          title: data['title'] ?? 'Board Your Cab',
          message: data['subtitle'] ??
              'Verify your boarding with a 6-digit OTP from the driver.',
          content: BoardingTripPreviewCard(
            tripType: data['tripType'] ?? 'Login (Pickup)',
            driverLine:
                'Driver: ${data['driverName'] ?? 'Suresh R'} • ${data['vehicleNumber'] ?? 'TS09UB7845'}',
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Enter OTP',
              icon: Icons.pin_rounded,
              onPressed: () => context.push(AppRoutes.boardingOtpInput),
            ),
            EmployeeSecondaryButton(
              label: 'Scan QR Code',
              icon: Icons.qr_code_scanner_rounded,
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => context.push(AppRoutes.scanBoardingQr),
            ),
          ],
        );
      },
    );
  }
}
