import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'onboarding_step_layout.dart';

class OnboardingScheduleScreen extends StatelessWidget {
  const OnboardingScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingStepLayout(
      step: 0,
      illustration: const CalendarScheduleIllustration(),
      title: 'View Your Schedule',
      message: 'Check your approved pickup drop schedules for all shifts.',
      onNext: () => context.push(AppRoutes.onboardingTracking),
    );
  }
}
