import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../animations/app_bouncing_wrapper.dart';

enum AppButtonVariant { primary, accentGreen, danger }

/// Centralized primary action button for AdhocX Mobile.
/// Implements 48px minimum touch target, tactile spring bounce, and glowing variant shadow.
class AppPrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;
  final AppButtonVariant variant;
  final double height;

  const AppPrimaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.variant = AppButtonVariant.primary,
    this.height = 48.0,
  });

  Color _getBackgroundColor() {
    switch (variant) {
      case AppButtonVariant.primary:
        return AppColors.primary;
      case AppButtonVariant.accentGreen:
        return AppColors.accentGreen;
      case AppButtonVariant.danger:
        return AppColors.error;
    }
  }

  Color _getTextColor() {
    switch (variant) {
      case AppButtonVariant.primary:
      case AppButtonVariant.danger:
        return Colors.white;
      case AppButtonVariant.accentGreen:
        return Colors.black;
    }
  }

  Color _getGlowColor() {
    switch (variant) {
      case AppButtonVariant.primary:
        return AppColors.primary.withAlpha(85);
      case AppButtonVariant.accentGreen:
        return AppColors.accentGreen.withAlpha(85);
      case AppButtonVariant.danger:
        return AppColors.error.withAlpha(85);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _getBackgroundColor();
    final textColor = _getTextColor();
    final glowColor = _getGlowColor();

    Widget buttonChild = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation<Color>(textColor),
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
              Flexible(
                child: Text(
                  text,
                  style: AppTypography.button(color: textColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          );

    final button = Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: AppRadius.borderMd,
        boxShadow: onPressed != null && !isLoading
            ? [
                BoxShadow(
                  color: glowColor,
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ]
            : null,
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: textColor,
          disabledBackgroundColor: bgColor.withAlpha(110),
          disabledForegroundColor: textColor.withAlpha(150),
          elevation: 0,
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

    final wrappedButton = AppBouncingWrapper(
      onTap: isLoading ? null : onPressed,
      child: isFullWidth ? SizedBox(width: double.infinity, child: button) : button,
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: wrappedButton) : wrappedButton;
  }
}

