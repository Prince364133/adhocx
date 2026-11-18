import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripApproachingScreen extends StatelessWidget {
  const TripApproachingScreen({super.key});

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

        final etaMins = tracking['estimatedArrivalMinutes'];
        final arrivingIn =
            etaMins != null ? '~ $etaMins min' : 'Live ETA updating';
        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final driverRating = driver?['rating']?.toString() ?? 'Verified';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString();

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
              etaMins != null ? 'Arriving in $arrivingIn' : arrivingIn,
              textAlign: TextAlign.center,
              style: AppTypography.h1(
                color: p.accent,
                fontWeight: FontWeight.w800,
                overflow: null,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            TripDriverRow(
              name: driverName,
              rating: driverRating,
              vehicleNumber: plate,
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
