import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 2: Cab Assigned Overview
class CabAssignedOverviewScreen extends StatelessWidget {
  const CabAssignedOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: MockDataService.getDriverAssignment,
      builder: (context, assignment) {
        final p = EmployeePalette.of(context);
        final driver = assignment['driver'] as Map<String, dynamic>?;
        final vehicle = assignment['vehicle'] as Map<String, dynamic>?;

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
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(
                    child: EmployeeStatusBadge(
                      label: 'Assigned',
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
                                '8:15 AM • Login Trip',
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
                                'Home → HITEC City Office',
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
                  // Driver (tap row → details; phone → contact sheet)
                  InkWell(
                    onTap: () => context.push(AppRoutes.driverDetails),
                    child: TripDriverRow(
                      name: driver?['name'] ?? 'Suresh R',
                      rating: '${(driver?['rating'] ?? 4.8).toDouble()}',
                      avatarRadius: 26,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  InkWell(
                    onTap: () => context.push(AppRoutes.vehicleDetails),
                    child: TripVehicleCard(
                      model: vehicle?['model'] ?? 'Maruti Ertiga',
                      plate: vehicle?['plateNumber'] ?? 'TS09UB7845',
                      details:
                          '${vehicle?['color'] ?? 'White'} • ${vehicle?['seating'] ?? '7 Seater'}',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppCard(
                    backgroundColor: p.surfaceElevated,
                    onTap: () => context.push(AppRoutes.pickupSequence),
                    child: Row(
                      children: [
                        Icon(Icons.alt_route_rounded, size: 20, color: p.accent),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            'View Pickup Sequence (4 stops)',
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
                    onPressed: () => context.push(AppRoutes.tripApproaching),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Pickup in 25 min  •  ETA 8:15 AM',
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
