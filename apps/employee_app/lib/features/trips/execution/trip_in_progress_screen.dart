import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/trip_widgets.dart';

class TripInProgressScreen extends StatelessWidget {
  const TripInProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('in_progress'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final etaMinutes = trip['etaMinutes'] ?? 24;
        final distanceKm = (trip['distanceKm'] ?? 12.4).toString();

        return TripStageScaffold(
          title: "Today's Trip",
          statusLabel: 'In Progress',
          statusVariant: BadgeVariant.inProgress,
          children: [
            const InProgressMapIllustration(),
            const SizedBox(height: AppSpacing.xxl),
            AppCard(
              width: double.infinity,
              padding: AppSpacing.paddingXl,
              child: Column(
                children: [
                  TripDestinationTile(
                    label: 'To Office',
                    value: trip['destination'] ?? 'HITEC City Office',
                  ),
                  Divider(color: p.border, height: AppSpacing.xxl + 4),
                  Row(
                    children: [
                      Icon(Icons.access_time_filled, color: p.accent, size: 18),
                      const SizedBox(width: AppSpacing.xs + 2),
                      Expanded(
                        child: Text(
                          'ETA ~ $etaMinutes min',
                          style: AppTypography.h4(
                            color: p.accent,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Icon(Icons.route_outlined, color: p.textMuted, size: 18),
                      const SizedBox(width: AppSpacing.xs + 2),
                      Text(
                        '$distanceKm km',
                        style: AppTypography.bodyMedium(
                          color: p.textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
