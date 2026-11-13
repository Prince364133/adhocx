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

/// Screen 3: Pickup Point Details
class PickupPointDetailsScreen extends StatelessWidget {
  const PickupPointDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['pickupPoint']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Pickup Point'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.xl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pickup bay banner
                  Container(
                    width: double.infinity,
                    height: 180,
                    decoration: BoxDecoration(
                      color: p.surfaceElevated,
                      borderRadius: AppRadius.borderXxl,
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: AppSpacing.paddingLg,
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.apartment_rounded,
                              size: 54, color: p.accent),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Designated Corporate Pickup Bay',
                          style: AppTypography.caption(
                            color: p.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.location_on_rounded, size: 22, color: p.accent),
                      const SizedBox(width: AppSpacing.sm + 2),
                      Expanded(
                        child: Text(
                          data['title'] ??
                              'Home - Green Meadows, Kondapur, Hyderabad',
                          style: AppTypography.h4(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  EmployeeSecondaryButton(
                    label: 'Get Directions',
                    icon: Icons.directions_walk_rounded,
                    textColor: p.accent,
                    borderColor: p.accent,
                    onPressed: () => context.push(AppRoutes.walkingDirections),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    width: double.infinity,
                    child: Column(
                      children: [
                        TripMetricRow(
                          icon: Icons.directions_walk_rounded,
                          label: 'Walk to Pickup',
                          value: data['walkingTime'] ?? '3 min (220 m)',
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        TripMetricRow(
                          icon: Icons.access_time_rounded,
                          label: 'Pickup Time',
                          value: data['scheduledTime'] ?? '8:15 AM',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  // Advisory (Driver info semantic colours)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md + 2),
                    decoration: BoxDecoration(
                      color: AppColors.infoContainer,
                      borderRadius: AppRadius.borderLg,
                      border: Border.all(color: AppColors.info.withAlpha(77)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded,
                            color: AppColors.infoText, size: 20),
                        const SizedBox(width: AppSpacing.sm + 2),
                        Expanded(
                          child: Text(
                            data['advisory'] ??
                                'Be at the pickup point 5 minutes early.',
                            style: AppTypography.small(
                              color: AppColors.infoText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
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
