import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trip Progress (On Trip) backed by live tracking + nextTrip APIs.
class TripProgressOnTripScreen extends StatelessWidget {
  const TripProgressOnTripScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final etaMins = tracking['estimatedArrivalMinutes'];
        final distMeters = tracking['distanceToPickupMeters'];
        final officeDest = next['officeDestination'] as Map?;
        final destName =
            officeDest?['name']?.toString() ?? 'Destination';

        final eta = etaMins != null ? '$etaMins min' : 'Updating';
        final distance = distMeters is num
            ? '${(distMeters / 1000).toStringAsFixed(1)} km'
            : 'Tracking live';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Trip in Progress'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.pageHorizontal,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                children: [
                  VectorLiveMapCanvas(
                    height: 240,
                    etaBadge: 'ETA $eta',
                    showControls: true,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppCard(
                    width: double.infinity,
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'En Route to $destName',
                          style: AppTypography.h3(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'ETA $eta • $distance',
                          style: AppTypography.bodyMedium(
                            color: p.accent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xxl),
                        const EmployeeStepTracker(
                          currentStep: 2,
                          labels: ['Pickup', 'Boarded', 'In Progress', 'Drop'],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
