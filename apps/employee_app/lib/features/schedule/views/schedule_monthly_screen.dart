import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import '../widgets/schedule_widgets.dart';

class ScheduleMonthlyScreen extends StatefulWidget {
  const ScheduleMonthlyScreen({super.key});

  @override
  State<ScheduleMonthlyScreen> createState() => _ScheduleMonthlyScreenState();
}

class _ScheduleMonthlyScreenState extends State<ScheduleMonthlyScreen> {
  late DateTime _focusedMonth;
  late int _selectedDay;
  bool _loading = false;
  Map<int, List<Map<String, dynamic>>> _tripsByDay = const {};

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _focusedMonth = DateTime(now.year, now.month, 1);
    _selectedDay = now.day;
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchMonth());
  }

  int get _daysInMonth =>
      DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;

  int get _leadingEmptyCells => _focusedMonth.weekday - 1;

  Future<void> _fetchMonth() async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data == null) return;
    setState(() => _loading = true);
    final start = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final end = DateTime(_focusedMonth.year, _focusedMonth.month, _daysInMonth);
    await data.loadSchedule(startDate: start, endDate: end, force: true);
    final grouped = <int, List<Map<String, dynamic>>>{};
    for (final item in data.scheduleItems) {
      final dt = DateTime.tryParse(item['date']?.toString() ?? '');
      if (dt != null &&
          dt.year == _focusedMonth.year &&
          dt.month == _focusedMonth.month) {
        grouped.putIfAbsent(dt.day, () => []).add(item);
      }
    }
    if (mounted) {
      setState(() {
        _tripsByDay = grouped;
        _loading = false;
      });
    }
  }

  void _shiftMonth(int deltaMonths) {
    final next = DateTime(_focusedMonth.year, _focusedMonth.month + deltaMonths, 1);
    final maxDay = DateTime(next.year, next.month + 1, 0).day;
    setState(() {
      _focusedMonth = next;
      if (_selectedDay > maxDay) _selectedDay = maxDay;
    });
    _fetchMonth();
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final monthLabel = formatScheduleMonthYear(_focusedMonth);
    final selectedTrips = _tripsByDay[_selectedDay] ?? const [];

    Widget legend(Color color, String label) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: AppSpacing.xs + 2),
            Text(
              label,
              style: AppTypography.micro(color: p.textSecondary),
            ),
          ],
        );

    return ScheduleViewScaffold(
      activeTab: ScheduleTab.month,
      periodLabel: monthLabel,
      onPreviousPeriod: () => _shiftMonth(-1),
      onNextPeriod: () => _shiftMonth(1),
      onRefresh: _fetchMonth,
      children: [
        Row(
          children: [
            for (final day in const [
              'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
            ])
              Expanded(
                child: Text(
                  day,
                  textAlign: TextAlign.center,
                  style: AppTypography.micro(
                    color: p.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (_loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
            child: Center(child: CircularProgressIndicator()),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.xs + 2,
            ),
            itemCount: _leadingEmptyCells + _daysInMonth,
            itemBuilder: (context, index) {
              if (index < _leadingEmptyCells) return const SizedBox.shrink();
              final day = index - _leadingEmptyCells + 1;
              final isSelected = day == _selectedDay;
              final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
              final isWeekend = date.weekday == DateTime.saturday ||
                  date.weekday == DateTime.sunday;
              final dayTrips = _tripsByDay[day] ?? const [];
              final hasBoth = dayTrips.length >= 2;
              final hasOne = dayTrips.length == 1;

              return Semantics(
                button: true,
                selected: isSelected,
                label:
                    '$monthLabel $day${dayTrips.isEmpty ? ', no trip' : ', ${dayTrips.length} trips scheduled'}',
                excludeSemantics: true,
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () {
                    setState(() => _selectedDay = day);
                    if (dayTrips.isNotEmpty) {
                      context.push(
                        AppRoutes.shiftDetailsLogin,
                        extra: dayTrips.first,
                      );
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.transparent,
                      shape: BoxShape.circle,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$day',
                          style: AppTypography.small(
                            color: isSelected
                                ? Colors.white
                                : (isWeekend ? p.textMuted : p.textPrimary),
                            fontWeight:
                                isSelected ? FontWeight.w800 : FontWeight.w500,
                          ),
                        ),
                        if ((hasBoth || hasOne) && !isSelected) ...[
                          const SizedBox(height: 2),
                          Container(
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color:
                                  hasBoth ? p.accent : AppColors.brandOrange,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        const SizedBox(height: AppSpacing.xl),
        if (selectedTrips.isNotEmpty) ...[
          for (final item in selectedTrips)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: AppCard(
                onTap: () => context.push(
                  AppRoutes.shiftDetailsLogin,
                  extra: item,
                ),
                child: ScheduleLegRow(
                  isDrop: (item['direction'] ?? '').toString().toUpperCase() ==
                      'LOGOUT',
                  time: EmployeeDataProvider.formatDisplayTime(
                    item['pickupTime']?.toString() ??
                        item['shiftTime']?.toString(),
                  ),
                  route:
                      '${item['pickupAddress'] ?? 'Pickup'} → ${item['officeAddress'] ?? 'Office'}',
                ),
              ),
            ),
          const SizedBox(height: AppSpacing.md),
        ],
        Container(
          padding: AppSpacing.paddingLg,
          decoration: BoxDecoration(
            color: p.surfaceElevated,
            borderRadius: AppRadius.borderLg,
            border: Border.all(color: p.border),
          ),
          child: Wrap(
            alignment: WrapAlignment.spaceAround,
            spacing: AppSpacing.lg,
            runSpacing: AppSpacing.sm,
            children: [
              legend(p.accent, 'Pickup + Drop'),
              legend(AppColors.brandOrange, 'Single Trip'),
              legend(p.border, 'No Trip'),
            ],
          ),
        ),
      ],
    );
  }
}
