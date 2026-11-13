import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 11: Safe Reach Confirmation
class SafeReachConfirmationScreen extends StatelessWidget {
  const SafeReachConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('safe_reach'),
      builder: (context, data) {
        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const SafeReachShieldBadge(),
          illustrationGap: AppSpacing.xxl,
          title: data['title'] ?? 'Did You Reach Safely?',
          message: data['subtitle'] ??
              "Please confirm that you've reached your destination safely.",
          actions: [
            EmployeePrimaryButton(
              label: data['primary'] ?? "Yes, I'm Safe",
              icon: Icons.shield_rounded,
              onPressed: () {
                final stopId = data['stop_id']?.toString() ?? 'active';
                HttpEmployeeRiderRepository()
                    .submitSafeReach(stopId, confirmed: true)
                    .catchError((_) => <String, dynamic>{});
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                        'Safe arrival confirmed with AdhocX Command Center. Thank you!'),
                    backgroundColor: AppColors.success,
                  ),
                );
                context.push(AppRoutes.postTripFeedback);
              },
            ),
            EmployeeSecondaryButton(
              label: data['secondary'] ?? 'I Need Help',
              icon: Icons.sos_rounded,
              textColor: AppColors.error,
              borderColor: AppColors.error.withAlpha(110),
              onPressed: () => context.push(AppRoutes.safetySos),
            ),
            EmployeeTextLink(
              label: 'Skip for Now',
              emphasised: false,
              onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
            ),
          ],
        );
      },
    );
  }
}
