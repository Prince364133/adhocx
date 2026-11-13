import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

enum AppBadgeVariant { neutral, success, warning, error, info }

/// Centralized Status Badge Pill for AdhocX Mobile.
class AppBadge extends StatelessWidget {
  final String label;
  final AppBadgeVariant variant;
  final IconData? icon;

  const AppBadge({
    super.key,
    required this.label,
    this.variant = AppBadgeVariant.neutral,
    this.icon,
  });

  factory AppBadge.fromStatus(String status) {
    final s = status.toUpperCase();
    if (s.contains('VERIFIED') || s.contains('COMPLETED') || s.contains('ACTIVE')) {
      return AppBadge(label: status, variant: AppBadgeVariant.success);
    }
    if (s.contains('PENDING') || s.contains('REVIEW') || s.contains('OFFERED')) {
      return AppBadge(label: status, variant: AppBadgeVariant.warning);
    }
    if (s.contains('REJECTED') || s.contains('CANCELLED') || s.contains('FAILED')) {
      return AppBadge(label: status, variant: AppBadgeVariant.error);
    }
    return AppBadge(label: status, variant: AppBadgeVariant.info);
  }

  Color _getBackgroundColor() {
    switch (variant) {
      case AppBadgeVariant.neutral:
        return AppColors.surfaceElevatedDark;
      case AppBadgeVariant.success:
        return AppColors.successContainer;
      case AppBadgeVariant.warning:
        return AppColors.warningContainer;
      case AppBadgeVariant.error:
        return AppColors.errorContainer;
      case AppBadgeVariant.info:
        return AppColors.infoContainer;
    }
  }

  Color _getTextColor() {
    switch (variant) {
      case AppBadgeVariant.neutral:
        return AppColors.textSecondaryDark;
      case AppBadgeVariant.success:
        return AppColors.successText;
      case AppBadgeVariant.warning:
        return AppColors.warningText;
      case AppBadgeVariant.error:
        return AppColors.errorText;
      case AppBadgeVariant.info:
        return AppColors.infoText;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _getBackgroundColor();
    final textColor = _getTextColor();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm + 2,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.borderPill,
        border: Border.all(
          color: textColor.withAlpha(50),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(
            label,
            style: AppTypography.caption(color: textColor).copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
