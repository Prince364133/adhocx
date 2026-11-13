import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
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
  int _selectedDay = 9;

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

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
      periodLabel: 'December 2026',
      children: [
        Row(
          children: [
            for (final day in const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
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
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.xs + 2,
          ),
          itemCount: 31,
          itemBuilder: (context, index) {
            final day = index + 1;
            final isSelected = day == _selectedDay;
            final isWeekend = day % 7 == 5 || day % 7 == 6;

            return Semantics(
              button: true,
              selected: isSelected,
              label: 'December $day${isWeekend ? ', no trip' : ', trips scheduled'}',
              excludeSemantics: true,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () {
                  setState(() => _selectedDay = day);
                  if (day == 9) context.push(AppRoutes.shiftDetailsLogin);
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
                      if (!isWeekend && !isSelected) ...[
                        const SizedBox(height: 2),
                        Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: p.accent,
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
        const SizedBox(height: AppSpacing.xxl + 4),
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
              legend(AppColors.brandOrange, 'Pickup Only'),
              legend(p.border, 'No Trip'),
            ],
          ),
        ),
      ],
    );
  }
}
