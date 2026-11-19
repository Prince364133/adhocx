import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Boarding Issue / Dispute backed by live nextTrip data.
class BoardingIssueScreen extends StatelessWidget {
  const BoardingIssueScreen({super.key});

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
        final tripType = EmployeeDataProvider.formatDirectionLabel(
          next['direction']?.toString(),
        );
        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const BoardingIssueBadge(),
          illustrationGap: AppSpacing.xxl,
          title: 'Boarding Issue',
          message:
              "We couldn't verify your boarding. Please try again or contact support if the issue persists.",
          content: BoardingTripPreviewCard(
            tripType: tripType,
            driverLine: 'Driver: $driverName',
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Retry Verification',
              icon: Icons.refresh_rounded,
              onPressed: () => context.push(AppRoutes.boardingVerifyOptions),
            ),
            EmployeeSecondaryButton(
              label: 'Contact Support',
              icon: Icons.headset_mic_rounded,
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => context.push(AppRoutes.safetyLiveChat),
            ),
          ],
        );
      },
    );
  }
}
