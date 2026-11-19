import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Driver Replaced screen backed by live nextTrip + tracking APIs.
class DriverReplacedScreen extends StatelessWidget {
  const DriverReplacedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final newDriverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final rating = driver?['rating']?.toString();

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const DriverReplacedBadge(),
          illustrationGap: AppSpacing.xl,
          title: 'Driver Replaced',
          message: 'Your cab has been reassigned due to an operational update.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: p.surfaceElevated,
                      child: Icon(Icons.person, color: p.textMuted, size: 22),
                    ),
                    const SizedBox(width: AppSpacing.md + 2),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Previous Driver',
                              style: AppTypography.caption(color: p.textMuted)),
                          Text(
                            'Reassigned by Dispatch',
                            style: AppTypography.h4(
                              color: p.textSecondary,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const EmployeeStatusBadge(label: 'Replaced'),
                  ],
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: p.accentTint,
                      child: Icon(Icons.person, color: p.accent, size: 26),
                    ),
                    const SizedBox(width: AppSpacing.md + 2),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Assigned Driver',
                            style: AppTypography.caption(
                              color: p.accent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            newDriverName,
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (rating != null) ...[
                      const Icon(Icons.star_rounded,
                          size: 16, color: AppColors.starAmber),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        rating,
                        style: AppTypography.small(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Continue',
              onPressed: () => context.push(AppRoutes.cabAssignedOverview),
            ),
          ],
        );
      },
    );
  }
}
