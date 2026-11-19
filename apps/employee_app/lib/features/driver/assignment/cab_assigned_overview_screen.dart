import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Cab Assigned Overview backed by live nextTrip + tracking APIs.
class CabAssignedOverviewScreen extends StatelessWidget {
  const CabAssignedOverviewScreen({super.key});

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
        final stops = next['routeStops'] is List ? next['routeStops'] as List : const [];

        final pickupTime = EmployeeDataProvider.formatDisplayTime(
          next['plannedEta']?.toString() ?? next['shiftTime']?.toString(),
        );
        final directionLabel = EmployeeDataProvider.formatDirectionLabel(
          next['direction']?.toString(),
        );
        final pickupLoc = next['pickupLocation'] is Map
            ? (next['pickupLocation'] as Map)['addressText']?.toString() ?? 'Pickup'
            : 'Pickup';
        final officeDest = next['officeDestination'] is Map
            ? (next['officeDestination'] as Map)['name']?.toString() ?? 'Office'
            : 'Office';

        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final driverRating = driver?['rating']?.toString() ?? 'Verified';
        final vehicleModel = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            'Vehicle pending';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Pending';
        final etaMins = tracking['estimatedArrivalMinutes'];

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: "Today's Pickup",
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.homeUpcomingPickup),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.pageHorizontal,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: EmployeeStatusBadge(
                      label: (next['routeStatus'] ?? 'Assigned').toString(),
                      variant: BadgeVariant.approved,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.schedule_rounded,
                                size: 18, color: p.accent),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                pickupTime.isNotEmpty
                                    ? '$pickupTime • $directionLabel'
                                    : directionLabel,
                                style: AppTypography.bodyMedium(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: AppColors.success,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm + 2),
                            Expanded(
                              child: Text(
                                '$pickupLoc → $officeDest',
                                style: AppTypography.small(
                                  color: p.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  InkWell(
                    onTap: () => context.push(AppRoutes.driverDetails),
                    child: TripDriverRow(
                      name: driverName,
                      rating: driverRating,
                      avatarRadius: 26,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  InkWell(
                    onTap: () => context.push(AppRoutes.vehicleDetails),
                    child: TripVehicleCard(
                      model: vehicleModel,
                      plate: plate,
                      details: vehicle?['category']?.toString() ??
                          vehicle?['vehicleType']?.toString() ??
                          'Corporate Cab',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppCard(
                    backgroundColor: p.surfaceElevated,
                    onTap: () => context.push(AppRoutes.pickupSequence),
                    child: Row(
                      children: [
                        Icon(Icons.alt_route_rounded,
                            size: 20, color: p.accent),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            stops.isNotEmpty
                                ? 'View Pickup Sequence (${stops.length} stop${stops.length == 1 ? '' : 's'})'
                                : 'View Pickup Sequence',
                            style: AppTypography.small(
                              color: p.accent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: p.accent),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  EmployeePrimaryButton(
                    label: 'Track Live Trip',
                    icon: Icons.my_location_rounded,
                    onPressed: () =>
                        context.push(AppRoutes.liveTrackingOverview),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    etaMins != null
                        ? 'Pickup in ~$etaMins min${pickupTime.isNotEmpty ? '  •  ETA $pickupTime' : ''}'
                        : (pickupTime.isNotEmpty
                            ? 'Scheduled ETA $pickupTime'
                            : 'Live ETA will appear when cab starts'),
                    textAlign: TextAlign.center,
                    style: AppTypography.caption(
                      color: p.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
        );
      },
    );
  }
}
