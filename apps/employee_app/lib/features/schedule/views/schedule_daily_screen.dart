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

class ScheduleDailyScreen extends StatefulWidget {
  const ScheduleDailyScreen({super.key});

  @override
  State<ScheduleDailyScreen> createState() => _ScheduleDailyScreenState();
}

class _ScheduleDailyScreenState extends State<ScheduleDailyScreen> {
  late DateTime _selectedDate;
  bool _loading = false;
  List<Map<String, dynamic>> _dayItems = const [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchDay());
  }

  Future<void> _fetchDay() async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data == null) return;
    setState(() => _loading = true);
    await data.loadSchedule(
      startDate: _selectedDate,
      endDate: _selectedDate,
      force: true,
    );
    final iso = EmployeeDataProvider.formatIsoDate(_selectedDate);
    if (mounted) {
      setState(() {
        _dayItems = data!.scheduleItems
            .where((item) => item['date'] == iso)
            .toList();
        _loading = false;
      });
    }
  }

  void _shiftDay(int delta) {
    setState(() {
      _selectedDate = _selectedDate.add(Duration(days: delta));
    });
    _fetchDay();
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget shiftCard(Widget row, VoidCallback onTap) => AppCard(
          onTap: onTap,
          child: Row(
            children: [
              Expanded(child: row),
              const SizedBox(width: AppSpacing.sm),
              Icon(Icons.chevron_right_rounded, color: p.textMuted, size: 20),
            ],
          ),
        );

    return ScheduleViewScaffold(
      activeTab: ScheduleTab.day,
      periodLabel: formatScheduleDayLabel(_selectedDate),
      onPreviousPeriod: () => _shiftDay(-1),
      onNextPeriod: () => _shiftDay(1),
      onRefresh: _fetchDay,
      children: [
        if (_loading)
          const Column(
            children: [
              SkeletonListItem(height: 84),
              SizedBox(height: AppSpacing.sm),
              SkeletonListItem(height: 84),
            ],
          )
        else if (_dayItems.isEmpty)
          AppCard(
            padding: AppSpacing.paddingXl,
            child: Column(
              children: [
                Icon(Icons.event_busy_rounded, size: 36, color: p.textMuted),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'No trips scheduled for this date',
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Use the arrows above to inspect other days.',
                  style: AppTypography.caption(color: p.textSecondary),
                ),
              ],
            ),
          )
        else
          for (var i = 0; i < _dayItems.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.md + 2),
            EmployeeEntrance(
              delay: Duration(milliseconds: 80 * i),
              child: Builder(
                builder: (_) {
                  final item = _dayItems[i];
                  final dir = (item['direction'] ?? '').toString().toUpperCase();
                  final isDrop = dir == 'LOGOUT' || dir == 'DROP';
                  final time = EmployeeDataProvider.formatDisplayTime(
                    item['pickupTime']?.toString() ??
                        item['shiftTime']?.toString(),
                  );
                  final pickup = item['pickupAddress']?.toString() ?? 'Pickup';
                  final office = item['officeAddress']?.toString() ?? 'Office';
                  return shiftCard(
                    ScheduleLegRow(
                      isDrop: isDrop,
                      label: isDrop ? 'Logout (Drop)' : 'Login (Pickup)',
                      time: time.isNotEmpty ? time : 'Scheduled',
                      route: isDrop ? '$office → $pickup' : '$pickup → $office',
                    ),
                    () => context.push(
                      isDrop
                          ? AppRoutes.shiftDetailsOvernight
                          : AppRoutes.shiftDetailsLogin,
                      extra: item,
                    ),
                  );
                },
              ),
            ),
          ],
        const SizedBox(height: AppSpacing.xxxl),
        EmployeeSecondaryButton(
          label: 'Request Change',
          icon: Icons.edit_calendar_outlined,
          textColor: p.accent,
          borderColor: p.accent,
          onPressed: () => context.push(AppRoutes.requestChangeOptions),
        ),
      ],
    );
  }
}
