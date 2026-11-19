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

/// Drop Reached / Reached Destination backed by live trip data.
class DropReachedScreen extends StatelessWidget {
  final Map<String, dynamic>? tripData;

  const DropReachedScreen({super.key, this.tripData});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => tripData ?? await loadLiveLatestTrip(context),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final location = data['destinationAddress']?.toString() ??
            (data['officeDestination'] is Map
                ? (data['officeDestination'] as Map)['name']?.toString()
                : null) ??
            'Drop Location';
        final arrivedAt = EmployeeDataProvider.formatDisplayTime(
          data['actualDepartureTime']?.toString() ??
              data['actualArrivalTime']?.toString() ??
              DateTime.now().toIso8601String(),
        );

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustrationGap: AppSpacing.xxl,
          illustration: Container(
            width: 150,
            height: 100,
            decoration: BoxDecoration(
              color: p.accentTint,
              borderRadius: AppRadius.borderXxl,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(Icons.apartment_rounded, size: 64, color: p.accent),
                const Positioned(
                  right: 28,
                  top: 10,
                  child: Icon(Icons.location_on_rounded,
                      size: 28, color: AppColors.brandOrange),
                ),
              ],
            ),
          ),
          title: 'Reached Destination',
          message: 'You have arrived at your drop location.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.location_on_rounded, color: p.accent, size: 22),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        location,
                        style: AppTypography.h4(
                          color: p.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                TripMetricRow(
                  icon: Icons.access_time_rounded,
                  label: 'Arrived at',
                  value: arrivedAt.isNotEmpty ? arrivedAt : 'Just now',
                ),
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Confirm Drop',
              icon: Icons.check_circle_outline_rounded,
              onPressed: () => context.push(
                AppRoutes.tripCompletedSummary,
                extra: tripData ?? data,
              ),
            ),
          ],
        );
      },
    );
  }
}
