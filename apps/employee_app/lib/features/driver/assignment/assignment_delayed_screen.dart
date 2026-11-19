import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Assignment Delayed screen backed by live nextTrip data.
class AssignmentDelayedScreen extends StatefulWidget {
  const AssignmentDelayedScreen({super.key});

  @override
  State<AssignmentDelayedScreen> createState() =>
      _AssignmentDelayedScreenState();
}

class _AssignmentDelayedScreenState extends State<AssignmentDelayedScreen> {
  bool _refreshing = false;
  Map<String, dynamic> _snapshot = const {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool force = false}) async {
    final snapshot = await loadLiveTripSnapshot(context, force: force);
    if (mounted) {
      setState(() {
        _snapshot = snapshot;
        _loading = false;
      });
    }
  }

  Future<void> _refreshStatus() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      await _load(force: true);
      if (!mounted) return;
      final next = (_snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
      final hasDriver = next['driver'] is Map &&
          ((next['driver'] as Map)['name']?.toString().isNotEmpty == true ||
              (next['driver'] as Map)['fullName']?.toString().isNotEmpty ==
                  true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            hasDriver
                ? 'A cab has been assigned! Returning to trip details.'
                : 'Cab assignment is still pending. Please check back shortly.',
          ),
        ),
      );
      if (hasDriver) {
        Navigator.of(context).maybePop();
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
    }
    final next = (_snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
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
          label: 'Refresh Status',
          icon: Icons.refresh_rounded,
          isLoading: _refreshing,
          onPressed: _refreshing ? null : _refreshStatus,
        ),
      ],
    );
  }
}
