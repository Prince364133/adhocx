import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Shared layout for the 3 onboarding intro steps (Schedule → Tracking →
/// Safety): step counter, illustration, title, message, pagination dots and a
/// round "next" button. Driver tokens; light/dark aware.
class OnboardingStepLayout extends StatelessWidget {
  static const int stepCount = 3;

  /// Zero-based step index.
  final int step;
  final Widget illustration;
  final String title;
  final String message;
  final VoidCallback onNext;

  const OnboardingStepLayout({
    super.key,
    required this.step,
    required this.illustration,
    required this.title,
    required this.message,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: EmployeeAppBar(
        // First step follows the permission flow; nothing to go back to.
        showBackButton: step > 0,
        trailing: Padding(
          padding: const EdgeInsets.only(right: AppSpacing.lg),
          child: Center(
            child: Text(
              '${step + 1} of $stepCount',
              style: AppTypography.label(
                color: p.textMuted,
                fontWeight: FontWeight.w600,
              ).copyWith(letterSpacing: 0.5),
            ),
          ),
        ),
      ),
      illustration: illustration,
      illustrationGap: AppSpacing.xxxl + AppSpacing.md,
      title: title,
      message: message,
      actions: [
        Row(
          children: [
            // Balances the next button so the dots stay centred.
            const SizedBox(width: 56),
            Expanded(
              child: Semantics(
                label: 'Step ${step + 1} of $stepCount',
                excludeSemantics: true,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < stepCount; i++) ...[
                      if (i > 0) const SizedBox(width: AppSpacing.sm),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: i == step ? 22 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == step ? AppColors.primary : p.border,
                          borderRadius: AppRadius.borderPill,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            SizedBox(
              width: 56,
              height: 56,
              child: IconButton.filled(
                tooltip: 'Next',
                onPressed: onNext,
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.arrow_forward_rounded, size: 24),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
