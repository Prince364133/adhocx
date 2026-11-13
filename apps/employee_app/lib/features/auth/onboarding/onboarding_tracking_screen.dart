import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'onboarding_step_layout.dart';

class OnboardingTrackingScreen extends StatelessWidget {
  const OnboardingTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingStepLayout(
      step: 1,
      illustration: const RouteMapIllustration(),
      title: 'Track Your Trip',
      message: 'See real-time vehicle location, arrival time and trip progress.',
      onNext: () => context.push(AppRoutes.onboardingSafety),
    );
  }
}
