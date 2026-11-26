import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import '../widgets/schedule_widgets.dart';

class ScheduleWeeklyScreen extends StatefulWidget {
  const ScheduleWeeklyScreen({super.key});

  @override
  State<ScheduleWeeklyScreen> createState() => _ScheduleWeeklyScreenState();
}

class _ScheduleWeeklyScreenState extends State<ScheduleWeeklyScreen> {
  late DateTime _weekStart;
  bool _loading = false;
  List<Map<String, dynamic>> _weekItems = const [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    _weekStart = today.subtract(Duration(days: today.weekday - 1));
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchWeek());
  }

  DateTime get _weekEnd => _weekStart.add(const Duration(days: 6));

  Future<void> _fetchWeek() async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data == null) return;
    setState(() => _loading = true);
    await data.loadSchedule(
      startDate: _weekStart,
      endDate: _weekEnd,
      force: true,
    );
    if (mounted) {
      setState(() {
        _weekItems = data!.scheduleItems;
        _loading = false;
      });
    }
  }

  void _shiftWeek(int deltaWeeks) {
    setState(() {
      _weekStart = _weekStart.add(Duration(days: 7 * deltaWeeks));
    });
    _fetchWeek();
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget statusBadge(List<Map<String, dynamic>> dayTrips) {
      if (dayTrips.isEmpty) {
        return const EmployeeStatusBadge(label: 'No Trip');
      }
      final allCompleted = dayTrips.every(
        (t) => (t['status'] ?? '').toString().toUpperCase() == 'COMPLETED',
      );
      if (allCompleted) {
        return const EmployeeStatusBadge(
          label: 'Completed',
          variant: BadgeVariant.completed,
        );
      }
      return EmployeeStatusBadge(
        label: '${dayTrips.length} Trip${dayTrips.length == 1 ? '' : 's'}',
        variant: BadgeVariant.upcoming,
      );
    }

    return ScheduleViewScaffold(
      activeTab: ScheduleTab.week,
      periodLabel: formatScheduleWeekRange(_weekStart, _weekEnd),
      onPreviousPeriod: () => _shiftWeek(-1),
      onNextPeriod: () => _shiftWeek(1),
      onRefresh: _fetchWeek,
      children: [
        if (_loading)
          const Column(
            children: [
              SkeletonListItem(height: 76),
              SizedBox(height: AppSpacing.sm),
              SkeletonListItem(height: 76),
              SizedBox(height: AppSpacing.sm),
              SkeletonListItem(height: 76),
            ],
          )
        else
          for (var offset = 0; offset < 7; offset++)
            () {
              final dayDate = _weekStart.add(Duration(days: offset));
              final iso = EmployeeDataProvider.formatIsoDate(dayDate);
              final dayTrips =
                  _weekItems.where((e) => e['date'] == iso).toList();
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm + 2),
                child: AppCard(
                  onTap: dayTrips.isNotEmpty
                      ? () => context.push(
                            AppRoutes.shiftDetailsLogin,
                            extra: dayTrips.first,
                          )
                      : null,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md + 2,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatScheduleDayLabel(dayDate),
                          style: AppTypography.bodyMedium(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      statusBadge(dayTrips),
                    ],
                  ),
                ),
              );
            }(),
      ],
    );
  }
}
