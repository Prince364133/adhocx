import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripInProgressScreen extends StatelessWidget {
  const TripInProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final officeDest = next['officeDestination'] as Map?;
        final destination = officeDest?['name']?.toString() ??
            officeDest?['addressText']?.toString() ??
            'Corporate Office';
        final etaMinutes = tracking['estimatedArrivalMinutes'];
        final distMeters = tracking['distanceToPickupMeters'];
        final distanceLabel = distMeters is num
            ? '${(distMeters / 1000).toStringAsFixed(1)} km'
            : 'Updating';

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
                    value: destination,
                  ),
                  Divider(color: p.border, height: AppSpacing.xxl + 4),
                  Row(
                    children: [
                      Icon(Icons.access_time_filled, color: p.accent, size: 18),
                      const SizedBox(width: AppSpacing.xs + 2),
                      Expanded(
                        child: Text(
                          etaMinutes != null
                              ? 'ETA ~ $etaMinutes min'
                              : 'ETA updating',
                          style: AppTypography.h4(
                            color: p.accent,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Icon(Icons.route_outlined, color: p.textMuted, size: 18),
                      const SizedBox(width: AppSpacing.xs + 2),
                      Text(
                        distanceLabel,
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
