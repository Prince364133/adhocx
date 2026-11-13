import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

class TripApproachingScreen extends StatelessWidget {
  const TripApproachingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('approaching'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final driver = trip['driver'] as Map<String, dynamic>?;
        final arrivingIn = trip['arrivingIn'] ?? '~ 6 min';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Approaching',
          statusVariant: BadgeVariant.approaching,
          children: [
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Your cab is on the way!',
              textAlign: TextAlign.center,
              style: AppTypography.bodyLarge(
                color: p.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: AppSpacing.xs + 2),
            Text(
              'Arriving in $arrivingIn',
              textAlign: TextAlign.center,
              style: AppTypography.h1(
                color: p.accent,
                fontWeight: FontWeight.w800,
                overflow: null,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            TripDriverRow(
              name: driver?['name'] ?? 'Suresh R',
              rating: (driver?['rating'] ?? 4.8).toString(),
              vehicleNumber: driver?['vehicleNumber'] ?? 'TS09UB7845',
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.approaching),
            const SizedBox(height: AppSpacing.xxxl + 4),
            EmployeePrimaryButton(
              label: 'Live Tracking',
              icon: Icons.navigation_rounded,
              onPressed: () => context.push(AppRoutes.tripInProgress),
            ),
          ],
        );
      },
    );
  }
}
