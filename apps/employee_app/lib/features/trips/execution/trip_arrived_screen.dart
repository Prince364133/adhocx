import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/trip_widgets.dart';

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
                    horizontal: AppSpacing.xxl,
                    vertical: AppSpacing.md + 2,
                  ),
                  decoration: BoxDecoration(
                    color: p.accentTint,
                    borderRadius: AppRadius.borderXxl,
                    border: Border.all(color: p.accent.withAlpha(77)),
                  ),
                  child: Semantics(
                    label: 'Boarding code ${otp.split('').join(' ')}',
                    excludeSemantics: true,
                    child: Text(
                      otp,
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
      load: () => MockDataService.getTrip('arrived'),
      builder: (context, trip) {
        final driver = trip['driver'] as Map<String, dynamic>?;
        final otp = trip['boardingOtp']?.toString() ?? '583271';

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
              name: driver?['name'] ?? 'Suresh R',
              rating: (driver?['rating'] ?? 4.8).toString(),
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
