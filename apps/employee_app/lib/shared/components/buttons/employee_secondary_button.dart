import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

/// Outlined secondary button — Driver app design (AppSecondaryButton.outline):
/// 48px tall, 8px radius, 1.2px border, surface fill, light/dark aware.
///
/// Screens may override [borderColor] / [textColor] / [backgroundColor]
/// (e.g. a red "Cancel trip" outline); defaults follow the driver tokens.
class EmployeeSecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final double height;
  final double? width;
  final IconData? icon;
  final Color? borderColor;
  final Color? textColor;
  final Color? backgroundColor;
  final double borderRadius;

  const EmployeeSecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.height = 48,
    this.width,
    this.icon,
    this.borderColor,
    this.textColor,
    this.backgroundColor,
    this.borderRadius = AppRadius.md,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveText = textColor ??
        (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight);
    final effectiveBorder =
        borderColor ?? (isDark ? AppColors.borderDark : AppColors.borderLight);
    final effectiveBg = backgroundColor ??
        (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);

    final child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: effectiveText),
                const SizedBox(width: AppSpacing.sm),
              ],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.button(color: effectiveText),
                ),
              ),
            ],
          );

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: effectiveBg,
          foregroundColor: effectiveText,
          side: effectiveBorder == Colors.transparent
              ? BorderSide.none
              : BorderSide(color: effectiveBorder, width: 1.2),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
        ),
        child: child,
      ),
    );
  }
}
