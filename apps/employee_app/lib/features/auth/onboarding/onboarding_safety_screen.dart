import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'onboarding_step_layout.dart';

class OnboardingSafetyScreen extends StatelessWidget {
  const OnboardingSafetyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingStepLayout(
      step: 2,
      illustration: const SosShieldIllustration(),
      title: 'Stay Safe, Always',
      message: 'Use the SOS button for immediate assistance during your trip.',
      onNext: () => context.push(AppRoutes.onboardingComplete),
    );
  }
}
