import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 9: GPS Unavailable — calls real loadTracking(force: true) on retry.
class GpsUnavailableScreen extends StatefulWidget {
  const GpsUnavailableScreen({super.key});

  @override
  State<GpsUnavailableScreen> createState() => _GpsUnavailableScreenState();
}

class _GpsUnavailableScreenState extends State<GpsUnavailableScreen> {
  bool _retrying = false;

  Future<void> _retry() async {
    if (_retrying) return;
    setState(() => _retrying = true);
    final data = maybeEmployeeData(context);
    try {
      final tracking = await data?.loadTracking(force: true);
      if (!mounted) return;
      final hasFix = tracking?['driverLocation'] != null;
      if (hasFix) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cab GPS signal restored.')),
        );
        Navigator.of(context).maybePop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text('Cab GPS is still unavailable. Please try again shortly.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _retrying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ConnectivityIssueView(
      exceptionKey: 'gps_unavailable',
      illustration: const SatelliteGpsBadge(),
      fallbackTitle: 'GPS Unavailable',
      fallbackMessage:
          "We couldn't get the latest location from your cab. Tap Retry to request a fresh GPS update.",
      actions: [
        EmployeePrimaryButton(
          label: 'Retry',
          icon: Icons.refresh_rounded,
          isLoading: _retrying,
          onPressed: _retrying ? null : _retry,
        ),
      ],
    );
  }
}
