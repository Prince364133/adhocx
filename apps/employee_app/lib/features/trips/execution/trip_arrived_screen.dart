import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripArrivedScreen extends StatelessWidget {
  const TripArrivedScreen({super.key});

  void _showBoardingOtp(BuildContext context, String otp) {
    AppBottomSheet.show<void>(
      context: context,
      title: 'Boarding Verification OTP',
      subtitle: 'Share this code with your driver upon boarding',
      child: Builder(
        builder: (sheetContext) {
          final p = EmployeePalette.of(sheetContext);
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.pageHorizontal,
                    vertical: AppSpacing.md + 2,
                  ),
                  decoration: BoxDecoration(
                    color: p.accentTint,
                    borderRadius: AppRadius.borderXxl,
                    border: Border.all(color: p.accent.withAlpha(77)),
                  ),
                  child: Semantics(
                    label: otp.isNotEmpty
                        ? 'Boarding code ${otp.split('').join(' ')}'
                        : 'Boarding code unavailable',
                    excludeSemantics: true,
                    child: Text(
                      otp.isNotEmpty ? otp : '------',
                      style: AppTypography.display(
                        color: p.accent,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        overflow: null,
                      ).copyWith(letterSpacing: 8),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              EmployeePrimaryButton(
                label: 'Confirm Boarding',
                onPressed: () {
                  Navigator.pop(sheetContext);
                  context.push(AppRoutes.tripBoarded);
                },
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final otp = tracking['boardingOtp']?.toString() ??
            next['boardingOtp']?.toString() ??
            '';
        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final driverRating = driver?['rating']?.toString() ?? 'Verified';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Arrived',
          statusVariant: BadgeVariant.completed,
          children: [
            const CarArrivedIllustration(),
            const SizedBox(height: AppSpacing.xl),
            const TripHeadline(
              title: 'Your cab has arrived!',
              subtitle: 'Please board now.',
            ),
            const SizedBox(height: AppSpacing.xxl),
            TripDriverRow(
              name: driverName,
              rating: driverRating,
              avatarRadius: 20,
            ),
            const SizedBox(height: AppSpacing.xxl),
            const EmployeeStepTracker(currentStep: TripStep.arrived),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'View Boarding OTP',
              icon: Icons.qr_code_rounded,
              onPressed: () => _showBoardingOtp(context, otp),
            ),
          ],
        );
      },
    );
  }
}
