import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripBoardedScreen extends StatelessWidget {
  const TripBoardedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final officeDest = next['officeDestination'] as Map?;
        final destination = officeDest?['name']?.toString() ??
            officeDest?['addressText']?.toString() ??
            'Destination';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Boarded',
          statusVariant: BadgeVariant.completed,
          children: [
            const BoardedSeatIllustration(),
            const SizedBox(height: AppSpacing.xxl),
            const TripHeadline(
              title: "You're on board!",
              subtitle: 'Trip is in progress to your destination.',
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.boarded),
            const SizedBox(height: AppSpacing.xxl + 4),
            AppCard(
              width: double.infinity,
              backgroundColor: p.surfaceElevated,
              child: TripDestinationTile(
                label: 'Drop at',
                value: destination,
              ),
            ),
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
