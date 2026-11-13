import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 11: Assignment History
class AssignmentHistoryScreen extends StatelessWidget {
  const AssignmentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'history': (await MockDataService.getDriverAssignment())['history'],
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final history = (data['history'] as List<dynamic>?) ?? const [];

        Color dotColor(String status) {
          switch (status.toLowerCase()) {
            case 'assigned':
              return AppColors.success;
            case 'updated':
              return p.textSecondary;
            default:
              return AppColors.primary;
          }
        }

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Assignment History'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: TripSectionCard(
                title: 'Assignment Logs',
                description:
                    'Real-time automated vehicle & driver allocation updates.',
                child: TripTimeline(
                  dotSize: 16,
                  entries: [
                    for (final raw in history)
                      () {
                        final item = raw as Map<String, dynamic>;
                        final status = '${item['status'] ?? ''}';
                        return TripTimelineEntry(
                          dotColor: dotColor(status),
                          dotChild: const Icon(Icons.check,
                              size: 10, color: Colors.white),
                          title: status,
                          titleTrailing: Text(
                            '${item['time'] ?? ''}',
                            style: AppTypography.caption(
                              color: p.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          subtitle: '${item['details'] ?? ''}',
                        );
                      }(),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
