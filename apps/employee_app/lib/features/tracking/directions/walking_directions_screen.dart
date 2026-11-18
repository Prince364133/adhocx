import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/map_overlay.dart';

/// Walking Directions backed by live nextTrip pickupLocation.
class WalkingDirectionsScreen extends StatelessWidget {
  const WalkingDirectionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final pickupLoc = next['pickupLocation'] as Map?;
        final address =
            pickupLoc?['addressText']?.toString() ?? 'Designated pickup point';
        final distMeters = tracking['distanceToPickupMeters'];
        final distanceText = distMeters is num
            ? '${distMeters.round()} m'
            : 'Head to your pickup bay';

        return Scaffold(
          backgroundColor: p.background,
          body: Stack(
            children: [
              const Positioned.fill(child: WalkingPathGraphic()),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  child: Row(
                    children: [
                      MapOverlayButton(
                        icon: Icons.arrow_back,
                        tooltip: 'Back',
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.lg,
                            vertical: AppSpacing.md,
                          ),
                          decoration: BoxDecoration(
                            color: p.isDark
                                ? AppColors.surfaceElevatedDark
                                : AppColors.slate900,
                            borderRadius: AppRadius.borderXxl,
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.directions_walk_rounded,
                                  color: Colors.white, size: 28),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Proceed to Pickup Point',
                                      style: AppTypography.bodyMedium(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      address,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.caption(
                                        color: Colors.white.withAlpha(179),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
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
                          padding: const EdgeInsets.all(AppSpacing.sm + 2),
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.directions_walk_rounded,
                              color: p.accent, size: 22),
                        ),
                        const SizedBox(width: AppSpacing.md + 2),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                distanceText,
                                style: AppTypography.h4(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                'To your pickup point',
                                style: AppTypography.caption(
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Back to map',
                          icon: Icon(Icons.map_rounded, color: p.accent),
                          onPressed: () => Navigator.of(context).maybePop(),
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
