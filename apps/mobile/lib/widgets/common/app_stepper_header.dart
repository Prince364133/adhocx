import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';

/// Reusable 4-step progress bar for onboarding wizards.
class AppStepperHeader extends StatelessWidget {
  final int currentStep; // 1, 2, 3, 4
  final int totalSteps;
  final VoidCallback? onBack;

  const AppStepperHeader({
    super.key,
    required this.currentStep,
    this.totalSteps = 4,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            if (onBack != null)
              IconButton(
                onPressed: onBack,
                icon: Icon(
                  Icons.arrow_back,
                  color: AppColors.textPrimaryLight,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            if (onBack != null) const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Row(
                children: List.generate(totalSteps, (index) {
                  final stepNum = index + 1;
                  final isCompleted = stepNum < currentStep;
                  final isActive = stepNum == currentStep;

                  return Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isActive || isCompleted
                                ? AppColors.primary
                                : AppColors.surfaceElevatedLight,
                            border: Border.all(
                              color: isActive || isCompleted
                                  ? AppColors.primary
                                  : AppColors.borderLight,
                              width: 1.5,
                            ),
                          ),
                          child: isCompleted
                              ? const Icon(
                                  Icons.check,
                                  size: 16,
                                  color: Colors.white,
                                )
                              : Text(
                                  '$stepNum',
                                  style: TextStyle(
                                    color: isActive
                                        ? Colors.white
                                        : AppColors.textSecondaryLight,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                        if (index < totalSteps - 1)
                          Expanded(
                            child: Container(
                              height: 3,
                              color: isCompleted
                                  ? AppColors.primary
                                  : AppColors.borderLight,
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
