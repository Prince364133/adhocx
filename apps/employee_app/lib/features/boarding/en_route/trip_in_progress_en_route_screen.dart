import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 8: Trip In Progress (En Route Office)
class TripInProgressEnRouteScreen extends StatelessWidget {
  const TripInProgressEnRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('trip_in_progress'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final eta = data['eta'] ?? '24 min';
        final distance = data['distance'] ?? '12.4 km';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xxl,
                      vertical: AppSpacing.lg,
                    ),
                    child: Column(
                      children: [
                        EmployeeStatusBadge(
                          label: data['title'] ?? 'Trip In Progress',
                          variant: BadgeVariant.inProgress,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        Text(
                          data['subtitle'] ?? "You're on your way to the office.",
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
                                value: data['destination'] ?? 'HITEC City Office',
                                icon: Icons.business_rounded,
                              ),
                              Divider(color: p.border, height: AppSpacing.xxl),
                              TripMetricRow(
                                icon: Icons.access_time_rounded,
                                label: 'ETA to Office',
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
                    AppSpacing.xxl,
                    AppSpacing.sm,
                    AppSpacing.xxl,
                    AppSpacing.sm,
                  ),
                  child: Column(
                    children: [
                      EmployeePrimaryButton(
                        label: 'View Live Tracking',
                        icon: Icons.my_location_rounded,
                        onPressed: () => context.push(AppRoutes.tripLiveMapFull),
                      ),
                      // DEMO ONLY: advances the mock flow; remove before release
                      // when real trip events drive navigation.
                      EmployeeTextLink(
                        label: 'Simulate Arrival at Office',
                        emphasised: false,
                        onPressed: () => context.push(AppRoutes.dropReached),
                      ),
                    ],
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
