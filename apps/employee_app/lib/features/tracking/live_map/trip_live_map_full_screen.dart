import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/map_overlay.dart';

/// Screen 2: Trip Live Map (Full)
class TripLiveMapFullScreen extends StatelessWidget {
  const TripLiveMapFullScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['liveState']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final arrivingIn = data['arrivingIn'] ?? '6 min';
        final distance = data['distance'] ?? '2.4 km towards your pickup';

        return Scaffold(
          backgroundColor: p.background,
          body: Stack(
            children: [
              const Positioned.fill(
                child: VectorLiveMapCanvas(
                  height: double.infinity,
                  showControls: false,
                ),
              ),

              // Floating top bar
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
                      // Map layer switching isn't implemented yet; shown
                      // disabled rather than as a dead tap target.
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

              // Floating status card
              Positioned(
                left: AppSpacing.xl,
                right: AppSpacing.xl,
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
                                'Arriving in $arrivingIn',
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
