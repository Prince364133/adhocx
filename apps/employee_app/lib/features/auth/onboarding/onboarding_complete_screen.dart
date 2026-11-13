import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';

class OnboardingCompleteScreen extends StatelessWidget {
  const OnboardingCompleteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      // Celebratory sunburst checkmark badge
      illustration: const AllSetIllustration(),
      title: "You're All Set!",
      message: 'Your AdhocX employee account is ready to use.',
      actions: [
        EmployeePrimaryButton(
          label: 'Go to Home',
          onPressed: () => context.go(AppRoutes.home),
        ),
      ],
    );
  }
}
