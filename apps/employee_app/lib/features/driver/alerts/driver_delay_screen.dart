import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/driver_widgets.dart';

/// Screen 9: Driver Delay
class DriverDelayScreen extends StatelessWidget {
  const DriverDelayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('delay'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const DriverDelayGraphic(),
          illustrationGap: AppSpacing.xl,
          title: data['title'] ?? 'Driver Delay',
          message: data['subtitle'] ?? 'Your cab is running late',
          content: Column(
            children: [
              AppCard(
                width: double.infinity,
                padding: AppSpacing.paddingXl,
                child: Column(
                  children: [
                    Text(
                      'Estimated arrival',
                      style: AppTypography.small(color: p.textMuted),
                    ),
                    const SizedBox(height: AppSpacing.xs + 2),
                    Text(
                      data['estimatedArrival'] ?? '8:25 AM',
                      style: AppTypography.h1(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs + 2),
                    EmployeeStatusBadge(
                      label: '+ ${data['delayMinutes'] ?? 10} min delay',
                      variant: BadgeVariant.cancelled,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              LabelledPanel(
                label: 'Reason',
                value: data['reason'] ?? 'Traffic congestion on route.',
              ),
            ],
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Track Live Location',
              icon: Icons.my_location_rounded,
              onPressed: () => context.push(AppRoutes.tripApproaching),
            ),
          ],
        );
      },
    );
  }
}
