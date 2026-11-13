import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 4: Vehicle Details
class VehicleDetailsScreen extends StatelessWidget {
  const VehicleDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getDriverAssignment())['vehicle']
          as Map<String, dynamic>?,
      builder: (context, vehicle) {
        final p = EmployeePalette.of(context);

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
                horizontal: AppSpacing.xxl,
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
                    vehicle['model'] ?? 'Maruti Ertiga',
                    style: AppTypography.h2(color: p.textPrimary),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Number plate (Indian commercial plates are yellow)
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
                      vehicle['plateNumber'] ?? 'TS09UB7845',
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
                      specPill(Icons.palette_outlined,
                          '${vehicle['color'] ?? 'White'} Color'),
                      specPill(Icons.airline_seat_recline_normal_rounded,
                          vehicle['seating'] ?? '7 Seater'),
                      specPill(Icons.local_gas_station_rounded,
                          '${vehicle['fuel'] ?? 'CNG'} Fuel'),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  AppCard(
                    width: double.infinity,
                    child: Column(
                      children: [
                        verification('Registration (RC)',
                            vehicle['registrationRc'] ?? 'Verified'),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        verification(
                            'Insurance', vehicle['insurance'] ?? 'Valid'),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        verification('Fitness / Permit',
                            vehicle['fitnessPermit'] ?? 'Valid'),
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
