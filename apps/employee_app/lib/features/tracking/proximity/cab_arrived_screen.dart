import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 6: Cab Arrived
class CabArrivedScreen extends StatelessWidget {
  const CabArrivedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['arrived']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final otp = data['otp']?.toString() ?? '583271';

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
              title: data['title'] ?? 'Your cab has arrived! Please board now.',
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
                  TripOtpDigits(otp: otp),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            // Was `currentStep: 2`, which highlighted "Approaching".
            const EmployeeStepTracker(currentStep: TripStep.arrived),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'Verify Boarding',
              icon: Icons.qr_code_scanner_rounded,
              onPressed: () => context.push(AppRoutes.tripBoarded),
            ),
          ],
        );
      },
    );
  }
}
