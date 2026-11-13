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
import '../widgets/driver_widgets.dart';

/// Screen 8: Driver Replaced
class DriverReplacedScreen extends StatelessWidget {
  const DriverReplacedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('reassigned_cab'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final rating = (data['driverRating'] ?? 4.7).toDouble();

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const DriverReplacedBadge(),
          illustrationGap: AppSpacing.xl,
          title: 'Driver Replaced',
          message: 'Your cab has been replaced due to an operational reason.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                // Previous driver
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
                            data['previousDriver'] ?? 'Suresh R',
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
                // New driver
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
                            'New Driver',
                            style: AppTypography.caption(
                              color: p.accent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            data['driverName'] ?? 'Amit Kumar',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.star_rounded,
                        size: 16, color: AppColors.starAmber),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      '$rating',
                      style: AppTypography.small(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
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
