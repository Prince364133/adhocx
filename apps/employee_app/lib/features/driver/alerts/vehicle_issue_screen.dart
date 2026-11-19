import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// Vehicle Issue alert screen.
class VehicleIssueScreen extends StatelessWidget {
  const VehicleIssueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmployeeCenteredLayout(
      appBar: EmployeeAppBar(),
      illustration: VehicleIssueBadge(),
      illustrationGap: AppSpacing.xl,
      title: 'Vehicle Issue',
      message:
          "The assigned cab reported a vehicle issue. Our operations desk is arranging an alternate cab for your trip.",
      content: WarningNotice(
        icon: Icons.access_time_filled_rounded,
        text: 'Alternate vehicle dispatch in progress',
      ),
      actions: [ContactSupportButton()],
    );
  }
}
