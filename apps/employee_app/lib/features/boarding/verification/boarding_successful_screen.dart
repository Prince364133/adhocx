import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Boarding Successful screen backed by live nextTrip data.
class BoardingSuccessfulScreen extends StatelessWidget {
  const BoardingSuccessfulScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final planned = EmployeeDataProvider.formatDisplayTime(
          next['plannedEta']?.toString() ?? next['shiftTime']?.toString(),
        );
        final boardedAt = EmployeeDataProvider.formatDisplayTime(
          next['actualArrivalTime']?.toString() ??
              DateTime.now().toIso8601String(),
        );
        final destName = next['officeDestination'] is Map
            ? (next['officeDestination'] as Map)['name']?.toString()
            : null;

        return EmployeeCenteredLayout(
          illustration: const BoardingSuccessBadge(),
          illustrationGap: AppSpacing.xxl,
          title: 'Boarding Confirmed!',
          message: "You're now on board.",
          content: AppCard(
            width: double.infinity,
            padding: AppSpacing.paddingXl,
            child: Column(
              children: [
                BoardingTimelineRow(
                  title: 'Picked Up',
                  time: planned.isNotEmpty ? planned : 'Scheduled',
                  isDone: true,
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                BoardingTimelineRow(
                  title: 'Boarded',
                  time: boardedAt.isNotEmpty ? boardedAt : 'Confirmed',
                  isDone: true,
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                BoardingTimelineRow(
                  title: 'In Progress',
                  time: destName != null
                      ? 'En route to $destName'
                      : 'On the way to destination',
                  isDone: false,
                ),
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Track Trip',
              icon: Icons.my_location_rounded,
              onPressed: () => context.push(AppRoutes.tripInProgressEnRoute),
            ),
          ],
        );
      },
    );
  }
}
