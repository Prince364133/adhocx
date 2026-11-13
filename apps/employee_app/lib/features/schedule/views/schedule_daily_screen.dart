import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import '../widgets/schedule_widgets.dart';

class ScheduleDailyScreen extends StatelessWidget {
  const ScheduleDailyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadScheduleSection('today'),
      builder: (context, today) {
        final p = EmployeePalette.of(context);
        final pickup = today['pickup'] as Map<String, dynamic>?;
        final drop = today['drop'] as Map<String, dynamic>?;

        Widget shiftCard(Widget row, VoidCallback onTap) => AppCard(
              onTap: onTap,
              child: Row(
                children: [
                  Expanded(child: row),
                  const SizedBox(width: AppSpacing.sm),
                  Icon(Icons.chevron_right_rounded,
                      color: p.textMuted, size: 20),
                ],
              ),
            );

        return ScheduleViewScaffold(
          activeTab: ScheduleTab.day,
          periodLabel: today['date'] ?? 'Tue, 09 Dec 2026',
          children: [
            EmployeeEntrance(
              child: shiftCard(
                ScheduleLegRow(
                  isDrop: false,
                  time: pickup?['time'] ?? '8:15 AM',
                  route: pickup?['route'] ?? 'Home → Office',
                ),
                () => context.push(AppRoutes.shiftDetailsLogin),
              ),
            ),
            const SizedBox(height: AppSpacing.md + 2),
            EmployeeEntrance(
              delay: const Duration(milliseconds: 90),
              child: shiftCard(
                ScheduleLegRow(
                  isDrop: true,
                  label: 'Logout - Drop',
                  time: drop?['time'] ?? '6:30 PM',
                  route: drop?['route'] ?? 'Office → Home',
                ),
                () => context.push(AppRoutes.shiftDetailsOvernight),
              ),
            ),
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
      },
    );
  }
}
