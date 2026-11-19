import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trip In Progress (En Route) backed by live tracking + nextTrip APIs.
class TripInProgressEnRouteScreen extends StatelessWidget {
  const TripInProgressEnRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final officeDest = next['officeDestination'] as Map?;
        final destination = officeDest?['name']?.toString() ??
            officeDest?['addressText']?.toString() ??
            'Destination';
        final etaMins = tracking['estimatedArrivalMinutes'];
        final distMeters = tracking['distanceToPickupMeters'];
        final eta = etaMins != null ? '$etaMins min' : 'Updating';
        final distance = distMeters is num
            ? '${(distMeters / 1000).toStringAsFixed(1)} km'
            : 'Live';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.pageHorizontal,
                      vertical: AppSpacing.lg,
                    ),
                    child: Column(
                      children: [
                        const EmployeeStatusBadge(
                          label: 'Trip In Progress',
                          variant: BadgeVariant.inProgress,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        Text(
                          "You're on your way to $destination.",
                          textAlign: TextAlign.center,
                          style: AppTypography.h4(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xxl),
                        VectorLiveMapCanvas(height: 200, etaBadge: 'ETA $eta'),
                        const SizedBox(height: AppSpacing.xxl),
                        AppCard(
                          width: double.infinity,
                          child: Column(
                            children: [
                              TripDestinationTile(
                                label: 'Destination',
                                value: destination,
                                icon: Icons.business_rounded,
                              ),
                              Divider(color: p.border, height: AppSpacing.xxl),
                              TripMetricRow(
                                icon: Icons.access_time_rounded,
                                label: 'ETA',
                                value: '$eta • $distance',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.pageHorizontal,
                    AppSpacing.sm,
                    AppSpacing.pageHorizontal,
                    AppSpacing.sm,
                  ),
                  child: EmployeePrimaryButton(
                    label: 'View Live Tracking',
                    icon: Icons.my_location_rounded,
                    onPressed: () => context.push(AppRoutes.tripLiveMapFull),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
