import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 10: Trip Completed
class TripCompletedSummaryScreen extends StatelessWidget {
  const TripCompletedSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('trip_completed'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final metrics = <(String, String)>[
          ('Trip Type', data['tripType'] ?? 'Login (Pickup)'),
          ('Pickup Time', data['pickupTime'] ?? '8:15 AM'),
          ('Drop Time', data['dropTime'] ?? '9:02 AM'),
          ('Duration', data['duration'] ?? '47 min'),
          ('Distance', data['distance'] ?? '12.4 km'),
        ];

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const BoardingSuccessBadge(),
          illustrationGap: AppSpacing.xl,
          title: data['title'] ?? 'Trip Completed!',
          message: data['subtitle'] ??
              'Your trip has been completed successfully.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                for (final (i, (label, value)) in metrics.indexed) ...[
                  if (i > 0) Divider(color: p.border, height: AppSpacing.xl),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          label,
                          style: AppTypography.small(
                            color: p.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        value,
                        style: AppTypography.bodyMedium(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              // Leads to the safe-reach check (was mislabelled
              // "View Trip Details").
              label: 'Continue',
              onPressed: () => context.push(AppRoutes.safeReachConfirmation),
            ),
          ],
        );
      },
    );
  }
}
