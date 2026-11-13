import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/schedule_tab_bar.dart';
import '../widgets/schedule_widgets.dart';

class ScheduleWeeklyScreen extends StatelessWidget {
  const ScheduleWeeklyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'weekly': (await MockDataService.getSchedules())['weekly'],
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final items = (data['weekly'] as List<dynamic>?) ?? const [];

        Widget statusBadge(String status, int count) {
          if (status == 'Completed') {
            return const EmployeeStatusBadge(
              label: 'Completed',
              variant: BadgeVariant.completed,
            );
          }
          if (count > 0) {
            return EmployeeStatusBadge(
              label: '$count Trips',
              variant: BadgeVariant.upcoming,
            );
          }
          return const EmployeeStatusBadge(label: 'No Trip');
        }

        return ScheduleViewScaffold(
          activeTab: ScheduleTab.week,
          periodLabel: '08 - 14 Dec 2026',
          children: [
            for (final raw in items)
              () {
                final item = raw as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm + 2),
                  child: AppCard(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.md + 2,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item['day'] ?? ''}',
                            style: AppTypography.bodyMedium(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        statusBadge(
                          '${item['status'] ?? ''}',
                          (item['tripsCount'] as num?)?.toInt() ?? 0,
                        ),
                      ],
                    ),
                  ),
                );
              }(),
          ],
        );
      },
    );
  }
}
