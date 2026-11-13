import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 9: GPS Unavailable
class GpsUnavailableScreen extends StatelessWidget {
  const GpsUnavailableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ConnectivityIssueView(
      exceptionKey: 'gps_unavailable',
      illustration: const SatelliteGpsBadge(),
      fallbackTitle: 'GPS Unavailable',
      fallbackMessage:
          "We couldn't get the latest location from your cab. We're trying to reconnect and will update you shortly.",
      actions: [
        EmployeePrimaryButton(
          label: 'Retry',
          icon: Icons.refresh_rounded,
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Retrying satellite GPS connection...')),
          ),
        ),
      ],
    );
  }
}
