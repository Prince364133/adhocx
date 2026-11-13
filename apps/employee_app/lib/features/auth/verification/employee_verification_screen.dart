import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

class EmployeeVerificationScreen extends StatelessWidget {
  const EmployeeVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      illustration: const EmployeeEntrance(child: VerifiedAccountBadge()),
      illustrationGap: AppSpacing.xxl + 4,
      title: "You're All Set!",
      message: 'Your AdhocX employee account is ready to use.',
      actions: [
        EmployeeEntrance(
          delay: const Duration(milliseconds: 120),
          child: EmployeePrimaryButton(
            label: 'Go to Home',
            onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
          ),
        ),
      ],
    );
  }
}
