import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/map_overlay.dart';

/// Trip Live Map (Full) backed by live tracking API.
class TripLiveMapFullScreen extends StatelessWidget {
  const TripLiveMapFullScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final etaMins = tracking['estimatedArrivalMinutes'];
        final distMeters = tracking['distanceToPickupMeters'];
        final gpsState = tracking['gpsState']?.toString();

        final headline = etaMins != null
            ? 'Arriving in $etaMins min'
            : (tracking['isDriverArrived'] == true
                ? 'Cab has arrived'
                : 'Tracking live location');
        final distance = distMeters is num
            ? '${(distMeters / 1000).toStringAsFixed(1)} km from your pickup'
            : (gpsState != null
                ? 'GPS status: $gpsState'
                : 'Waiting for live vehicle telemetry');

        return Scaffold(
          backgroundColor: p.background,
          body: Stack(
            fit: StackFit.expand,
            children: [
              const Positioned.fill(
                child: VectorLiveMapCanvas(
                  height: double.infinity,
                  showControls: false,
                  fullScreen: true,
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.sm,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      MapOverlayButton(
                        icon: Icons.arrow_back,
                        tooltip: 'Back',
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                      const MapOverlayTitle(title: 'Live Tracking'),
                      const MapOverlayButton(
                        icon: Icons.layers_rounded,
                        tooltip: 'Map layers (coming soon)',
                        onPressed: null,
                        accent: true,
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: AppSpacing.pageHorizontal,
                right: AppSpacing.pageHorizontal,
                bottom: AppSpacing.xxxl,
                child: SafeArea(
                  child: MapFloatingCard(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.directions_car_filled_rounded,
                              color: p.accent, size: 24),
                        ),
                        const SizedBox(width: AppSpacing.lg),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                headline,
                                style: AppTypography.h3(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                distance,
                                style: AppTypography.small(
                                  color: p.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
