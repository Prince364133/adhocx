import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Cab Arrived screen backed by live tracking / nextTrip boardingOtp.
class CabArrivedScreen extends StatelessWidget {
  const CabArrivedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final otp = tracking['boardingOtp']?.toString() ??
            next['boardingOtp']?.toString() ??
            '';
        final dwellSecs = tracking['dwellRemainingSeconds'];

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Arrived',
          statusVariant: BadgeVariant.completed,
          children: [
            Container(
              width: 140,
              height: 90,
              decoration: BoxDecoration(
                color: p.accentTint,
                borderRadius: AppRadius.borderXxl,
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(Icons.directions_car_filled_rounded,
                      size: 60, color: p.accent),
                  const Positioned(
                    top: 8,
                    right: 28,
                    child: Icon(Icons.location_on_rounded,
                        size: 26, color: AppColors.brandOrange),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            TripHeadline(
              title: 'Your cab has arrived! Please board now.',
              subtitle: dwellSecs is num && dwellSecs > 0
                  ? 'Waiting timer: ${(dwellSecs / 60).ceil()} min remaining'
                  : null,
            ),
            const SizedBox(height: AppSpacing.xxl),
            AppCard(
              width: double.infinity,
              padding: AppSpacing.paddingXl,
              child: Column(
                children: [
                  Text(
                    'OTP for Boarding',
                    style: AppTypography.small(
                      color: p.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md + 2),
                  otp.isNotEmpty
                      ? TripOtpDigits(otp: otp)
                      : Text(
                          'OTP will appear when your trip is active',
                          style: AppTypography.small(color: p.textMuted),
                        ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.arrived),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'Verify Boarding',
              icon: Icons.qr_code_scanner_rounded,
              onPressed: () => context.push(AppRoutes.boardingVerifyOptions),
            ),
          ],
        );
      },
    );
  }
}
