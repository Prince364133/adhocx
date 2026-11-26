import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/features/schedule/widgets/schedule_widgets.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

enum _Period { week, month, year }

/// Trip Summary Analytics computed dynamically from GET /corporate/me/trips.
class TripSummaryAnalyticsScreen extends StatefulWidget {
  const TripSummaryAnalyticsScreen({super.key});

  @override
  State<TripSummaryAnalyticsScreen> createState() =>
      _TripSummaryAnalyticsScreenState();
}

class _TripSummaryAnalyticsScreenState
    extends State<TripSummaryAnalyticsScreen> {
  _Period _period = _Period.week;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool force = false}) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data != null) {
      await data.loadTripsHistory(limit: 100, force: force);
    }
    if (mounted) setState(() => _initialized = true);
  }

  (DateTime, DateTime, String) _periodWindow() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    switch (_period) {
      case _Period.week:
        final start = today.subtract(Duration(days: today.weekday - 1));
        final end = start.add(const Duration(days: 6));
        return (start, end, formatScheduleWeekRange(start, end));
      case _Period.month:
        final start = DateTime(now.year, now.month, 1);
        final end = DateTime(now.year, now.month + 1, 0);
        return (start, end, formatScheduleMonthYear(start));
      case _Period.year:
        final start = DateTime(now.year, 1, 1);
        final end = DateTime(now.year, 12, 31);
        return (start, end, '${now.year}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? data;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    if (!_initialized && (data?.loadingTripsHistory ?? false)) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'Trip Summary'),
        skeletonLayout: SkeletonLayout.analytics,
      );
    }

    final (start, end, rangeLabel) = _periodWindow();
    final allTrips = data?.tripsHistory ?? const <Map<String, dynamic>>[];
    final filtered = allTrips.where((t) {
      final dt = DateTime.tryParse(t['shiftDate']?.toString() ?? '');
      if (dt == null) return false;
      final d = DateTime(dt.year, dt.month, dt.day);
      return !d.isBefore(start) && !d.isAfter(end);
    }).toList();

    final total = filtered.length;
    final completed = filtered.where((t) {
      final r = (t['routeStatus'] ?? '').toString().toUpperCase();
      final s = (t['status'] ?? '').toString().toUpperCase();
      return r == 'COMPLETED' || s == 'DROPPED' || s == 'BOARDED';
    }).length;
    final cancelled = filtered.where((t) {
      final r = (t['routeStatus'] ?? '').toString().toUpperCase();
      final s = (t['status'] ?? '').toString().toUpperCase();
      return r == 'CANCELLED' || s == 'CANCELLED';
    }).length;
    final unserved = filtered.where((t) {
      final s = (t['status'] ?? '').toString().toUpperCase();
      return s == 'NO_SHOW' || s == 'UNSERVED';
    }).length;
    final ratings = filtered
        .map((t) => t['feedbackRating'])
        .whereType<num>()
        .map((n) => n.toDouble())
        .toList();
    final avgRating = ratings.isNotEmpty
        ? '${(ratings.reduce((a, b) => a + b) / ratings.length).toStringAsFixed(1)} ★'
        : 'No ratings yet';
    final completionRate = total > 0
        ? '${((completed / total) * 100).round()}%'
        : '—';

    Widget stat(String label, Object value, Color color, IconData icon) =>
        Expanded(
          child: Semantics(
            label: '$label: $value',
            excludeSemantics: true,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: color.withAlpha(p.isDark ? 46 : 26),
                      borderRadius: AppRadius.borderLg,
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    '$value',
                    style: AppTypography.h1(color: p.textPrimary),
                  ),
                  Text(
                    label,
                    style: AppTypography.caption(color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Trip Summary'),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _load(force: true),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppSegmentedControl<_Period>(
                  items: const [
                    SegmentItem(value: _Period.week, label: 'Week'),
                    SegmentItem(value: _Period.month, label: 'Month'),
                    SegmentItem(value: _Period.year, label: 'Year'),
                  ],
                  selectedValue: _period,
                  onValueChanged: (v) => setState(() => _period = v),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  rangeLabel,
                  textAlign: TextAlign.center,
                  style: AppTypography.small(color: p.textMuted),
                ),
                const SizedBox(height: AppSpacing.xl),
                Row(
                  children: [
                    stat('Total Trips', total, AppColors.primary,
                        Icons.directions_car_filled_rounded),
                    const SizedBox(width: AppSpacing.md + 2),
                    stat('Completed', completed, AppColors.success,
                        Icons.check_circle_rounded),
                  ],
                ),
                const SizedBox(height: AppSpacing.md + 2),
                Row(
                  children: [
                    stat('Cancelled', cancelled, AppColors.error,
                        Icons.cancel_rounded),
                    const SizedBox(width: AppSpacing.md + 2),
                    stat('Unserved', unserved, AppColors.warning,
                        Icons.error_outline_rounded),
                  ],
                ),
                const SizedBox(height: AppSpacing.xxl),
                AppCard(
                  child: Column(
                    children: [
                      TripMetricRow(
                        icon: Icons.verified_rounded,
                        label: 'Completion Rate',
                        value: completionRate,
                      ),
                      Divider(color: p.border, height: AppSpacing.xxl),
                      TripMetricRow(
                        icon: Icons.star_rounded,
                        label: 'Average Rating Given',
                        value: avgRating,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
