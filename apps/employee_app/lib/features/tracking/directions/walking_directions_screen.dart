import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/map_overlay.dart';

/// Screen 4: Walking Directions
class WalkingDirectionsScreen extends StatelessWidget {
  const WalkingDirectionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['walkingDirections']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return Scaffold(
          backgroundColor: p.background,
          body: Stack(
            children: [
              const Positioned.fill(child: WalkingPathGraphic()),

              // Turn-by-turn banner (high-contrast, as in navigation apps)
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
                              const Icon(Icons.turn_right_rounded,
                                  color: Colors.white, size: 28),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      data['instruction'] ??
                                          'Turn right in 100 m',
                                      style: AppTypography.bodyMedium(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      data['subInstruction'] ??
                                          'Green Meadows Main Road',
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

              // Bottom distance card
              Positioned(
                left: AppSpacing.xl,
                right: AppSpacing.xl,
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
                                data['distance'] ?? '220 m (3 min)',
                                style: AppTypography.h4(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                data['target'] ?? 'To your pickup point',
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
