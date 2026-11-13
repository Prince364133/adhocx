import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// Screen 7: Assignment Delayed
class AssignmentDelayedScreen extends StatelessWidget {
  const AssignmentDelayedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('assignment_delayed'),
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const AssignmentDelayedBadge(),
        illustrationGap: AppSpacing.xl,
        title: data['title'] ?? 'Assignment Delayed',
        message: data['message'] ??
            "We are facing a slight delay in assigning a cab for your trip. We're working on it and will update you shortly.",
        content: TripSummaryCard(
          title: data['tripType'] ?? 'Login Trip',
          subtitle:
              '${data['time'] ?? '8:15 AM'} • ${data['route'] ?? 'Home → Office'}',
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
      ),
    );
  }
}
