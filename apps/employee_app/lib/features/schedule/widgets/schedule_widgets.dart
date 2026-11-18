import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

const List<String> _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const List<String> _monthsShort = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const List<String> _monthsFull = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

String formatScheduleDayLabel(DateTime date) {
  final wd = _weekdays[date.weekday - 1];
  final day = date.day.toString().padLeft(2, '0');
  final mon = _monthsShort[date.month - 1];
  return '$wd, $day $mon ${date.year}';
}

String formatScheduleWeekRange(DateTime start, DateTime end) {
  final sDay = start.day.toString().padLeft(2, '0');
  final eDay = end.day.toString().padLeft(2, '0');
  final sMon = _monthsShort[start.month - 1];
  final eMon = _monthsShort[end.month - 1];
  if (start.month == end.month && start.year == end.year) {
    return '$sDay - $eDay $eMon ${end.year}';
  }
  return '$sDay $sMon - $eDay $eMon ${end.year}';
}

String formatScheduleMonthYear(DateTime date) {
  return '${_monthsFull[date.month - 1]} ${date.year}';
}

/// Shared frame for the Day / Week / Month views: title, segmented tabs,
/// ‹ period › selector, then [children]. Switching tabs replaces the route.
class ScheduleViewScaffold extends StatelessWidget {
  final ScheduleTab activeTab;
  final String periodLabel;
  final List<Widget> children;
  final VoidCallback? onPreviousPeriod;
  final VoidCallback? onNextPeriod;
  final Future<void> Function()? onRefresh;

  const ScheduleViewScaffold({
    super.key,
    required this.activeTab,
    required this.periodLabel,
    required this.children,
    this.onPreviousPeriod,
    this.onNextPeriod,
    this.onRefresh,
  });

  static const _routes = {
    ScheduleTab.day: AppRoutes.scheduleDaily,
    ScheduleTab.week: AppRoutes.scheduleWeekly,
    ScheduleTab.month: AppRoutes.scheduleMonthly,
  };

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    final scrollView = SingleChildScrollView(
      physics: onRefresh != null ? const AlwaysScrollableScrollPhysics() : null,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.pageHorizontal,
        AppSpacing.sm,
        AppSpacing.pageHorizontal,
        AppSpacing.xxl,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'My Schedule',
            textAlign: TextAlign.center,
            style: AppTypography.h2(color: p.textPrimary),
          ),
          const SizedBox(height: AppSpacing.lg + 2),
          ScheduleTabBar(
            activeTab: activeTab,
            onTabChanged: (tab) {
              if (tab != activeTab) {
                context.pushReplacement(_routes[tab]!);
              }
            },
          ),
          const SizedBox(height: AppSpacing.xxl),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xs,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: p.surfaceElevated,
              borderRadius: AppRadius.borderLg,
              border: Border.all(color: p.border),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: onPreviousPeriod,
                  visualDensity: VisualDensity.compact,
                  icon: Icon(Icons.chevron_left_rounded, color: p.textSecondary),
                ),
                Expanded(
                  child: Text(
                    periodLabel,
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onNextPeriod,
                  visualDensity: VisualDensity.compact,
                  icon:
                      Icon(Icons.chevron_right_rounded, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          ...children,
        ],
      ),
    );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: onRefresh != null
            ? RefreshIndicator(onRefresh: onRefresh!, child: scrollView)
            : scrollView,
      ),
    );
  }
}

/// Login (pickup) = success green, logout (drop) = warning amber.
Color scheduleLegColor(bool isDrop) =>
    isDrop ? AppColors.warning : AppColors.success;

/// One pickup / drop leg: tinted icon, leg label + time, route.
class ScheduleLegRow extends StatelessWidget {
  final bool isDrop;
  final String time;
  final String route;
  final String? label;

  /// Draw on its own surface tile (e.g. on top of the brand gradient card).
  final bool tiled;

  const ScheduleLegRow({
    super.key,
    required this.isDrop,
    required this.time,
    required this.route,
    this.label,
    this.tiled = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final color = scheduleLegColor(isDrop);

    final row = Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: color.withAlpha(p.isDark ? 46 : 31),
            borderRadius: AppRadius.borderLg,
          ),
          child: Icon(
            isDrop ? Icons.apartment_rounded : Icons.directions_car_filled_rounded,
            color: color,
            size: 20,
          ),
        ),
        const SizedBox(width: AppSpacing.md + 2),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      label ?? (isDrop ? 'Logout (Drop)' : 'Login (Pickup)'),
                      style: AppTypography.caption(
                        color: isDrop ? AppColors.warningText : AppColors.successText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    time,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(route, style: AppTypography.micro(color: p.textSecondary)),
            ],
          ),
        ),
      ],
    );

    if (!tiled) return row;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md + 2),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.borderLg,
      ),
      child: row,
    );
  }
}
