import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/trip_widgets.dart';

class DriverVehicleDetailsScreen extends StatelessWidget {
  const DriverVehicleDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: MockDataService.getDriverAssignment,
      builder: (context, assignment) {
        final p = EmployeePalette.of(context);
        final driver = assignment['driver'] as Map<String, dynamic>?;
        final vehicle = assignment['vehicle'] as Map<String, dynamic>?;
        final rating = (driver?['rating'] ?? 4.8).toString();
        final tripsCount = (driver?['tripsCompleted'] ?? 412).toString();
        final color = vehicle?['color'] ?? 'White';
        final seating = vehicle?['seating'] ?? '7 Seater';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xxl,
                AppSpacing.sm,
                AppSpacing.xxl,
                AppSpacing.xxl,
              ),
              child: Column(
                children: [
                  Text(
                    'Driver & Vehicle',
                    style: AppTypography.h2(color: p.textPrimary),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  EmployeeEntrance(
                    child: TripDriverRow(
                      name: driver?['name'] ?? 'Suresh R',
                      rating: '$rating ($tripsCount trips)',
                      avatarRadius: 30,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  EmployeeEntrance(
                    delay: const Duration(milliseconds: 100),
                    child: AppCard(
                      width: double.infinity,
                      padding: AppSpacing.paddingXl,
                      backgroundColor: p.surfaceElevated,
                      child: Column(
                        children: [
                          Container(
                            width: 120,
                            height: 70,
                            decoration: BoxDecoration(
                              color: p.surface,
                              borderRadius: AppRadius.borderXxl,
                              border: Border.all(color: p.border),
                            ),
                            child: Icon(
                              Icons.directions_car_filled_rounded,
                              color: p.accent,
                              size: 48,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md + 2),
                          Text(
                            vehicle?['model'] ?? 'Maruti Ertiga',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.xs,
                            ),
                            decoration: BoxDecoration(
                              color: p.surface,
                              borderRadius: AppRadius.borderMd,
                              border: Border.all(color: p.border),
                            ),
                            child: Text(
                              vehicle?['plateNumber'] ?? 'TS09UB7845',
                              style: AppTypography.bodyMedium(
                                color: p.accent,
                                fontWeight: FontWeight.w800,
                              ).copyWith(letterSpacing: 1.0),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            '$color • $seating',
                            style: AppTypography.small(
                              color: p.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    width: double.infinity,
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      children: [
                        for (final (i, label) in const [
                          'Driver Verified',
                          'Vehicle Verified',
                          'Commercial Permit',
                        ].indexed) ...[
                          if (i > 0)
                            Divider(color: p.border, height: AppSpacing.xxl),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  label,
                                  style: AppTypography.bodyMedium(
                                    color: p.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xs),
                                decoration: const BoxDecoration(
                                  color: AppColors.successContainer,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.check,
                                  size: 16,
                                  color: AppColors.successText,
                                  semanticLabel: 'Verified',
                                ),
                              ),
                            ],
                          ),
                        ],
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
