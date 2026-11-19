import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class DriverVehicleDetailsScreen extends StatelessWidget {
  const DriverVehicleDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final vehicle = (tracking['vehicle'] ?? next['vehicle']) as Map?;

        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final rating = driver?['rating'] != null
            ? '${driver!['rating']} ★'
            : 'Verified Driver';
        final model = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            'Vehicle pending assignment';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Not yet assigned';
        final subtitleParts = [
          if (vehicle?['color'] != null &&
              vehicle!['color'].toString().isNotEmpty)
            vehicle['color'].toString(),
          if (vehicle?['category'] != null &&
              vehicle!['category'].toString().isNotEmpty)
            vehicle['category'].toString(),
          if (vehicle?['vehicleType'] != null &&
              vehicle!['vehicleType'].toString().isNotEmpty)
            vehicle['vehicleType'].toString(),
        ];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.pageHorizontal,
                AppSpacing.sm,
                AppSpacing.pageHorizontal,
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
                      name: driverName,
                      rating: rating,
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
                            model,
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
                              plate,
                              style: AppTypography.bodyMedium(
                                color: p.accent,
                                fontWeight: FontWeight.w800,
                              ).copyWith(letterSpacing: 1.0),
                            ),
                          ),
                          if (subtitleParts.isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              subtitleParts.join(' • '),
                              style: AppTypography.small(
                                color: p.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
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
