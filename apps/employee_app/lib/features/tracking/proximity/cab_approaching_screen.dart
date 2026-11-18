import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Cab Approaching screen backed by live tracking API.
class CabApproachingScreen extends StatelessWidget {
  const CabApproachingScreen({super.key});

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

        final eta = etaMins != null
            ? 'Arriving in ~ $etaMins min'
            : 'Live ETA updating';
        final distance = distMeters is num
            ? '${(distMeters / 1000).toStringAsFixed(1)} km away'
            : 'En route';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Approaching',
          statusVariant: BadgeVariant.approaching,
          children: [
            Container(
              width: 140,
              height: 90,
              decoration: BoxDecoration(
                color: p.accentTint,
                borderRadius: AppRadius.borderXxl,
              ),
              child: Icon(
                Icons.directions_car_filled_rounded,
                size: 60,
                color: p.accent,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const TripHeadline(title: 'Your cab is on the way!'),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              width: double.infinity,
              child: Wrap(
                alignment: WrapAlignment.spaceAround,
                spacing: AppSpacing.lg,
                runSpacing: AppSpacing.sm,
                children: [
                  _Metric(icon: Icons.access_time_rounded, text: eta, strong: true),
                  _Metric(icon: Icons.location_on_rounded, text: distance),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.approaching),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'Track on Map',
              icon: Icons.map_rounded,
              onPressed: () => context.push(AppRoutes.tripLiveMapFull),
            ),
          ],
        );
      },
    );
  }
}

class _Metric extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool strong;

  const _Metric({required this.icon, required this.text, this.strong = false});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: p.accent),
        const SizedBox(width: AppSpacing.sm),
        Flexible(
          child: Text(
            text,
            style: AppTypography.small(
              color: strong ? p.textPrimary : p.textSecondary,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
