import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Pickup Point Details backed by live nextTrip & profile APIs.
class PickupPointDetailsScreen extends StatelessWidget {
  const PickupPointDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {};
        final results = await Future.wait([
          data.loadNextTrip(),
          data.loadProfile(),
        ]);
        return {
          'nextTrip': results[0] ?? const <String, dynamic>{},
          'profile': results[1] ?? const <String, dynamic>{},
        };
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final next = (data['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final profile = (data['profile'] as Map<String, dynamic>?) ?? const {};
        final pickupLoc = next['pickupLocation'] as Map? ??
            profile['defaultPickupLocation'] as Map?;
        final address = pickupLoc?['addressText']?.toString() ??
            'No pickup location configured yet';
        final landmark = pickupLoc?['landmark']?.toString();
        final scheduledTime = EmployeeDataProvider.formatDisplayTime(
          next['plannedEta']?.toString() ?? next['shiftTime']?.toString(),
        );

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Pickup Point'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.pageHorizontal,
                vertical: AppSpacing.xl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                          address,
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
                          icon: Icons.place_outlined,
                          label: 'Landmark',
                          value: landmark?.isNotEmpty == true
                              ? landmark!
                              : 'Designated Pickup Node',
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        TripMetricRow(
                          icon: Icons.access_time_rounded,
                          label: 'Pickup Time',
                          value: scheduledTime.isNotEmpty
                              ? scheduledTime
                              : 'Pending schedule',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
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
                            'Be at the pickup point 5 minutes before scheduled arrival.',
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
