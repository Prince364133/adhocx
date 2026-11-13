import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Loads one section of the mock schedules data.
Future<Map<String, dynamic>?> loadScheduleSection(String key) async =>
    (await MockDataService.getSchedules())[key] as Map<String, dynamic>?;

/// Shared frame for the Day / Week / Month views: title, segmented tabs,
/// ‹ period › selector, then [children]. Switching tabs replaces the route.
class ScheduleViewScaffold extends StatelessWidget {
  final ScheduleTab activeTab;
  final String periodLabel;
  final List<Widget> children;

  const ScheduleViewScaffold({
    super.key,
    required this.activeTab,
    required this.periodLabel,
    required this.children,
  });

  static const _routes = {
    ScheduleTab.day: AppRoutes.scheduleDaily,
    ScheduleTab.week: AppRoutes.scheduleWeekly,
    ScheduleTab.month: AppRoutes.scheduleMonthly,
  };

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.sm,
            AppSpacing.xl,
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
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: p.surfaceElevated,
                  borderRadius: AppRadius.borderLg,
                  border: Border.all(color: p.border),
                ),
                child: Row(
                  children: [
                    Icon(Icons.chevron_left_rounded, color: p.textSecondary),
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
                    Icon(Icons.chevron_right_rounded, color: p.textSecondary),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              ...children,
            ],
          ),
        ),
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
