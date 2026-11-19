import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 10: Stale Location — displays real lastFixAgeSec and refreshes via loadTracking(force: true).
class StaleLocationScreen extends StatefulWidget {
  const StaleLocationScreen({super.key});

  @override
  State<StaleLocationScreen> createState() => _StaleLocationScreenState();
}

class _StaleLocationScreenState extends State<StaleLocationScreen> {
  bool _refreshing = false;

  static String _formatAge(int seconds) {
    if (seconds < 60) return '$seconds sec';
    final mins = seconds ~/ 60;
    if (mins < 60) return '$mins min';
    final hrs = mins ~/ 60;
    final remMins = mins % 60;
    return remMins > 0 ? '${hrs}h ${remMins}m' : '${hrs}h';
  }

  int? _resolveFixAgeSec(EmployeeDataProvider? data) {
    final tracking = data?.activeTracking;
    if (tracking == null) return null;
    final top = tracking['lastFixAgeSec'];
    if (top is num) return top.toInt();
    final loc = tracking['driverLocation'];
    if (loc is Map && loc['lastFixAgeSec'] is num) {
      return (loc['lastFixAgeSec'] as num).toInt();
    }
    return null;
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    final data = maybeEmployeeData(context);
    try {
      final tracking = await data?.loadTracking(force: true);
      if (!mounted) return;
      final age = _resolveFixAgeSec(data);
      final isFresh = tracking != null && (age == null || age < 60);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isFresh
                ? 'Cab location updated.'
                : (age != null
                    ? 'Last cab location fix is still ${_formatAge(age)} old.'
                    : 'Cab location is still outdated.'),
          ),
        ),
      );
      if (isFresh && tracking['driverLocation'] != null) {
        Navigator.of(context).maybePop();
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    EmployeeDataProvider? data;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    final ageSec = _resolveFixAgeSec(data);
    final message = ageSec != null && ageSec >= 0
        ? "The cab's last known location was ${_formatAge(ageSec)} ago. Tap Refresh to check for a newer update."
        : "The cab's last known location may be outdated. Tap Refresh to check for a newer update.";

    return ConnectivityIssueView(
      exceptionKey: 'stale_location',
      illustration: const StaleLocationBadge(),
      fallbackTitle: 'Location May Be Outdated',
      fallbackMessage: message,
      actions: [
        EmployeePrimaryButton(
          label: 'Refresh',
          icon: Icons.sync_rounded,
          isLoading: _refreshing,
          onPressed: _refreshing ? null : _refresh,
        ),
      ],
    );
  }
}
