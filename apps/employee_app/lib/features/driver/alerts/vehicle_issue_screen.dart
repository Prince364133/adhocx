import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// Screen 10: Vehicle Issue
class VehicleIssueScreen extends StatelessWidget {
  const VehicleIssueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('vehicle_issue'),
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const VehicleIssueBadge(),
        illustrationGap: AppSpacing.xl,
        title: data['title'] ?? 'Vehicle Issue',
        message: data['message'] ??
            "The assigned cab has a vehicle issue. We're arranging an alternate cab for your trip.",
        content: WarningNotice(
          icon: Icons.access_time_filled_rounded,
          text: 'Expected Update in ${data['expectedUpdateIn'] ?? '~ 5 min'}',
        ),
        actions: const [ContactSupportButton()],
      ),
    );
  }
}
