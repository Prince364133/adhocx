import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 10: Stale Location / Location May Be Outdated
class StaleLocationScreen extends StatelessWidget {
  const StaleLocationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ConnectivityIssueView(
      exceptionKey: 'stale_location',
      illustration: const StaleLocationBadge(),
      fallbackTitle: 'Location May Be Outdated',
      fallbackMessage:
          "The cab's last known location was 2 min ago. We're attempting to get a fresh update.",
      actions: [
        EmployeePrimaryButton(
          label: 'Refresh',
          icon: Icons.sync_rounded,
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Polling latest cab coordinates...')),
          ),
        ),
      ],
    );
  }
}
