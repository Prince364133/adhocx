import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class SafetyTipsGuidelinesScreen extends StatelessWidget {
  const SafetyTipsGuidelinesScreen({super.key});

  static const List<String> _safetyTips = [
    'Always verify the vehicle registration number and driver details in the app before boarding.',
    'Confirm your boarding using the 6-digit OTP or dynamic QR code so your trip is tracked live.',
    'Fasten your seatbelt for the entire duration of the commute, including rear seats.',
    'For late-night drops, confirm Safe Reach in the app once you safely enter your residence.',
    'Use the 3-second SOS trigger anytime you feel unsafe — our 24/7 Command Center responds immediately.',
    'Report route deviations, unsafe driving, or vehicle issues directly through Safety Center.',
  ];

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Safety Tips'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.md),
              const SafetyCenterShieldBadge(),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Travel Safely with AdhocX',
                textAlign: TextAlign.center,
                style: AppTypography.h2(color: p.textPrimary, fontSize: 20),
              ),
              const SizedBox(height: AppSpacing.xxl + 4),
              AppCard(
                width: double.infinity,
                padding: AppSpacing.paddingXl,
                child: Column(
                  children: [
                    for (var i = 0; i < _safetyTips.length; i++) ...[
                      if (i > 0)
                        Divider(color: p.border, height: AppSpacing.xxl),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check_circle_rounded,
                              color: AppColors.success, size: 20),
                          const SizedBox(width: AppSpacing.md + 2),
                          Expanded(
                            child: Text(
                              _safetyTips[i],
                              style: AppTypography.bodyMedium(
                                color: p.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
