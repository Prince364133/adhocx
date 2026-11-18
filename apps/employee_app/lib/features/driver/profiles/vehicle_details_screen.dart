import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Vehicle Details backed by live nextTrip + tracking APIs.
class VehicleDetailsScreen extends StatelessWidget {
  const VehicleDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final vehicle = (tracking['vehicle'] ?? next['vehicle']) as Map?;

        final model = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            'Not yet assigned';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Pending assignment';
        final color = vehicle?['color']?.toString();
        final category =
            vehicle?['category']?.toString() ?? vehicle?['vehicleType']?.toString();

        Widget specPill(IconData icon, String text) => Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm + 2,
                vertical: AppSpacing.xs + 2,
              ),
              decoration: BoxDecoration(
                color: p.surfaceElevated,
                borderRadius: AppRadius.borderLg,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 14, color: p.textSecondary),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    text,
                    style: AppTypography.caption(
                      color: p.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );

        Widget verification(String title, String status) => Row(
              children: [
                const Icon(Icons.check_circle_rounded,
                    size: 20, color: AppColors.success),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    title,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  status,
                  style: AppTypography.small(
                    color: AppColors.successText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            );

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Vehicle Details'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.pageHorizontal,
                vertical: AppSpacing.xl,
              ),
              child: Column(
                children: [
                  AppCard(
                    width: double.infinity,
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.lg + 2),
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.directions_car_filled_rounded,
                              size: 56, color: p.accent),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Verified Commercial Fleet',
                          style: AppTypography.micro(color: p.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg + 2),
                  Text(
                    model,
                    style: AppTypography.h2(color: p.textPrimary),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md + 2,
                      vertical: AppSpacing.xs + 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.warningContainer,
                      borderRadius: AppRadius.borderMd,
                      border: Border.all(color: AppColors.starAmber, width: 1.5),
                    ),
                    child: Text(
                      plate,
                      style: AppTypography.bodyMedium(
                        color: AppColors.warningText,
                        fontWeight: FontWeight.w800,
                      ).copyWith(letterSpacing: 1.0),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg + 2),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      if (color != null && color.isNotEmpty)
                        specPill(Icons.palette_outlined, '$color Color'),
                      if (category != null && category.isNotEmpty)
                        specPill(Icons.directions_car_outlined, category),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  AppCard(
                    width: double.infinity,
                    child: Column(
                      children: [
                        verification('Registration (RC)',
                            vehicle != null ? 'Verified' : 'Pending'),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        verification('Insurance',
                            vehicle != null ? 'Valid' : 'Pending'),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        verification('Fitness / Permit',
                            vehicle != null ? 'Valid' : 'Pending'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
