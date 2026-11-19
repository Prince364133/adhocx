import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Assignment History backed by live tripsHistory & notifications.
class AssignmentHistoryScreen extends StatelessWidget {
  const AssignmentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {'history': []};
        final trips = await data.loadTripsHistory(limit: 20);
        return {'history': trips};
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final history = (data['history'] as List<dynamic>?) ?? const [];

        Color dotColor(String status) {
          switch (status.toUpperCase()) {
            case 'ASSIGNED':
            case 'COMPLETED':
            case 'BOARDED':
              return AppColors.success;
            case 'CANCELLED':
            case 'NO_SHOW':
              return AppColors.error;
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
                child: history.isEmpty
                    ? Text(
                        'No assignment history recorded yet.',
                        style: AppTypography.small(color: p.textSecondary),
                      )
                    : TripTimeline(
                        dotSize: 16,
                        entries: [
                          for (final raw in history)
                            () {
                              final item = Map<String, dynamic>.from(raw as Map);
                              final status =
                                  (item['routeStatus'] ?? item['status'] ?? 'ASSIGNED')
                                      .toString();
                              final driver = item['driver'] as Map?;
                              final vehicle = item['vehicle'] as Map?;
                              final driverName =
                                  driver?['fullName']?.toString() ??
                                      'Driver pending';
                              final plate =
                                  vehicle?['plateNumber']?.toString() ?? '';
                              final dateStr =
                                  EmployeeDataProvider.formatDisplayDate(
                                item['shiftDate']?.toString(),
                              );
                              final timeStr =
                                  EmployeeDataProvider.formatDisplayTime(
                                item['shiftTime']?.toString(),
                              );
                              return TripTimelineEntry(
                                dotColor: dotColor(status),
                                dotChild: const Icon(Icons.check,
                                    size: 10, color: Colors.white),
                                title: status,
                                titleTrailing: Text(
                                  [dateStr, timeStr]
                                      .where((s) => s.isNotEmpty)
                                      .join(' • '),
                                  style: AppTypography.caption(
                                    color: p.textMuted,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                subtitle: plate.isNotEmpty
                                    ? '$driverName • $plate'
                                    : driverName,
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
