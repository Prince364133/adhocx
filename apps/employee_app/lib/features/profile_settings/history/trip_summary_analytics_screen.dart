import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

enum _Period { week, month, year }

class TripSummaryAnalyticsScreen extends StatefulWidget {
  const TripSummaryAnalyticsScreen({super.key});

  @override
  State<TripSummaryAnalyticsScreen> createState() =>
      _TripSummaryAnalyticsScreenState();
}

class _TripSummaryAnalyticsScreenState
    extends State<TripSummaryAnalyticsScreen> {
  _Period _period = _Period.week;

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getHistoryProfileData())[
          'analytics'] as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        Widget stat(String label, Object? value, Color color, IconData icon) =>
            Expanded(
              child: Semantics(
                label: '$label: ${value ?? 0}',
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
                        '${value ?? 0}',
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
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
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
                    data['dateRange'] ?? '08 - 14 Dec 2026',
                    textAlign: TextAlign.center,
                    style: AppTypography.small(color: p.textMuted),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Row(
                    children: [
                      stat('Total Trips', data['totalTrips'] ?? 10,
                          AppColors.primary, Icons.directions_car_filled_rounded),
                      const SizedBox(width: AppSpacing.md + 2),
                      stat('Completed', data['completed'] ?? 8,
                          AppColors.success, Icons.check_circle_rounded),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md + 2),
                  Row(
                    children: [
                      stat('Cancelled', data['cancelled'] ?? 1, AppColors.error,
                          Icons.cancel_rounded),
                      const SizedBox(width: AppSpacing.md + 2),
                      stat('Unserved', data['unserved'] ?? 1, AppColors.warning,
                          Icons.error_outline_rounded),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    child: Column(
                      children: [
                        TripMetricRow(
                          icon: Icons.alt_route_rounded,
                          label: 'Total Distance',
                          value: data['totalDistance'] ?? '124.6 km',
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        TripMetricRow(
                          icon: Icons.access_time_rounded,
                          label: 'Total Time',
                          value: data['totalTime'] ?? '5 hr 42 min',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
