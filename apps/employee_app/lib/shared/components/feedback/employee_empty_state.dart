import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../buttons/employee_primary_button.dart';

/// Empty state (No Trips, Empty Schedule, No Notifications, Search results).
/// Driver app design (AppEmptyState): tinted circle icon, h3 bold title,
/// muted body description, optional primary action.
class EmployeeEmptyState extends StatelessWidget {
  final Widget? illustration;
  final IconData? icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onActionPressed;
  final EdgeInsetsGeometry padding;

  const EmployeeEmptyState({
    super.key,
    this.illustration,
    this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onActionPressed,
    this.padding = AppSpacing.paddingXl,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (illustration != null)
              illustration!
            else
              Container(
                padding: AppSpacing.paddingLg,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon ?? Icons.inbox_outlined,
                  size: 56,
                  color: AppColors.primary,
                ),
              ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppTypography.h3(
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
                overflow: null,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              description,
              textAlign: TextAlign.center,
              style: AppTypography.body(
                color:
                    isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
            if (actionLabel != null && onActionPressed != null) ...[
              const SizedBox(height: AppSpacing.xl),
              EmployeePrimaryButton(
                label: actionLabel!,
                onPressed: onActionPressed,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
