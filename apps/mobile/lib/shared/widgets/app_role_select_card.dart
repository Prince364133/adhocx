import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Card for Screen 10 (Choose your role) matching exact design mockups.
class AppRoleSelectCard extends StatelessWidget {
  final String role; // 'DRIVER' or 'VENDOR'
  final String title;
  final String subtitle;
  final Widget iconWidget;
  final bool isSelected;
  final VoidCallback onTap;

  const AppRoleSelectCard({
    super.key,
    required this.role,
    required this.title,
    required this.subtitle,
    required this.iconWidget,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primarySubtle : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.borderLight,
              width: isSelected ? 2 : 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              // Role Icon / Graphic Container
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary.withAlpha(25)
                      : AppColors.surfaceElevatedLight,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: iconWidget,
              ),
              const SizedBox(width: AppSpacing.lg),

              // Title & Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.h3(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      subtitle,
                      style: AppTypography.small(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),

              // Radio / Checkmark Icon
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.borderSubtleLight,
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check,
                        size: 16,
                        color: Colors.white,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
