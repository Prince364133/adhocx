import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

enum AppSecondaryVariant { outline, ghost, subtle }

/// Centralized secondary action button for AdhocX Mobile.
class AppSecondaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;
  final AppSecondaryVariant variant;
  final double height;

  const AppSecondaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.variant = AppSecondaryVariant.outline,
    this.height = 48.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;

    Widget buttonChild = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
            ),
          )
        : Row(
            mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: textColor),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(
                text,
                style: AppTypography.button(color: textColor),
              ),
            ],
          );

    BorderSide side;
    Color bgColor;

    switch (variant) {
      case AppSecondaryVariant.outline:
        side = BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1.2);
        bgColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
        break;
      case AppSecondaryVariant.subtle:
        side = BorderSide(color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight, width: 1);
        bgColor = isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight;
        break;
      case AppSecondaryVariant.ghost:
        side = BorderSide.none;
        bgColor = Colors.transparent;
        break;
    }

    final button = SizedBox(
      height: height,
      child: OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: textColor,
          side: side,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.borderMd,
          ),
        ),
        child: buttonChild,
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}
