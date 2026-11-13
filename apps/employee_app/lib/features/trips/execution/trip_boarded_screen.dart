import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/trip_widgets.dart';

class TripBoardedScreen extends StatelessWidget {
  const TripBoardedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('boarded'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Boarded',
          statusVariant: BadgeVariant.completed,
          children: [
            const BoardedSeatIllustration(),
            const SizedBox(height: AppSpacing.xxl),
            const TripHeadline(
              title: "You're on board!",
              subtitle: 'Trip is in progress to your office.',
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.boarded),
            const SizedBox(height: AppSpacing.xxl + 4),
            AppCard(
              width: double.infinity,
              backgroundColor: p.surfaceElevated,
              child: TripDestinationTile(
                label: 'Drop at',
                value: trip['drop'] ?? 'HITEC City Office',
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
