import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Assignment Delayed screen backed by live nextTrip data.
class AssignmentDelayedScreen extends StatelessWidget {
  const AssignmentDelayedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final direction = EmployeeDataProvider.formatDirectionLabel(
          next['direction']?.toString(),
        );
        final time = EmployeeDataProvider.formatDisplayTime(
          next['plannedEta']?.toString() ?? next['shiftTime']?.toString(),
        );
        final pickup = next['pickupLocation'] is Map
            ? (next['pickupLocation'] as Map)['addressText']?.toString()
            : null;
        final office = next['officeDestination'] is Map
            ? (next['officeDestination'] as Map)['name']?.toString()
            : null;
        final routeStr = (pickup != null && office != null)
            ? '$pickup → $office'
            : 'Scheduled Commute';

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const AssignmentDelayedBadge(),
          illustrationGap: AppSpacing.xl,
          title: 'Assignment Delayed',
          message:
              "We are facing a slight delay in assigning a cab for your trip. We're working on it and will update you shortly.",
          content: TripSummaryCard(
            title: direction,
            subtitle: time.isNotEmpty ? '$time • $routeStr' : routeStr,
            icon: Icons.directions_car_filled_rounded,
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Notify Me',
              icon: Icons.notifications_active_outlined,
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                      'Notifications active! We will alert you the moment a cab is assigned.'),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
