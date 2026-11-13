import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 7: Boarding Issue / Dispute
class BoardingIssueScreen extends StatelessWidget {
  const BoardingIssueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingError('boarding_issue'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const BoardingIssueBadge(),
          illustrationGap: AppSpacing.xxl,
          title: data['title'] ?? 'Boarding Issue',
          message: data['message'] ??
              "We couldn't verify your boarding. Please try again or contact support if the issue persists.",
          content: BoardingTripPreviewCard(
            tripType: data['tripType'] ?? 'Login (Pickup)',
            driverLine: 'Driver: ${data['driverName'] ?? 'Suresh R'}',
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
              // Was a "Connecting to helpdesk..." snackbar that went nowhere.
              onPressed: () => context.push(AppRoutes.safetyLiveChat),
            ),
          ],
        );
      },
    );
  }
}
