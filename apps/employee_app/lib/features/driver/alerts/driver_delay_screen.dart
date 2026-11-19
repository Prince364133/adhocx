import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/driver_widgets.dart';

/// Driver Delay screen backed by live tracking / nextTrip data.
class DriverDelayScreen extends StatelessWidget {
  const DriverDelayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final etaTime = EmployeeDataProvider.formatDisplayTime(
          tracking['plannedEta']?.toString() ?? next['plannedEta']?.toString(),
        );
        final etaMins = tracking['estimatedArrivalMinutes'];

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const DriverDelayGraphic(),
          illustrationGap: AppSpacing.xl,
          title: 'Driver Delay',
          message: 'Your cab is experiencing a delay on the way to your stop.',
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
                      etaTime.isNotEmpty
                          ? etaTime
                          : (etaMins != null ? '~ $etaMins min' : 'Updating'),
                      style: AppTypography.h1(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs + 2),
                    EmployeeStatusBadge(
                      label: etaMins != null ? '~$etaMins min away' : 'Delayed',
                      variant: BadgeVariant.cancelled,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const LabelledPanel(
                label: 'Status',
                value:
                    'Operations is monitoring your route and updating live ETA.',
              ),
            ],
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Track Live Location',
              icon: Icons.my_location_rounded,
              onPressed: () => context.push(AppRoutes.liveTrackingOverview),
            ),
          ],
        );
      },
    );
  }
}
