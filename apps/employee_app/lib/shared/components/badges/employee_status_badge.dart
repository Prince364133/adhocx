import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

enum BadgeVariant {
  upcoming,
  assigned,
  approaching,
  arrived,
  boarded,
  inProgress,
  completed,
  cancelled,
  delayed,
  pending,
  approved,
  rejected,
  active,
  neutral,
}

/// Unified status pill for trips, schedule, requests and support tickets.
///
/// Driver app design (AppBadge): pill radius, semantic container fill,
/// semantic text colour, 1px border at the text colour's alpha 50,
/// caption 11 / w600. Mapping of employee states onto driver semantics:
/// - success: completed, approved, active
/// - error:   cancelled, rejected
/// - warning: delayed, pending
/// - info:    upcoming, assigned, approaching, arrived, boarded, in progress
/// - neutral: anything else ("Scheduled")
class EmployeeStatusBadge extends StatelessWidget {
  final String? label;
  final BadgeVariant variant;
  final bool showDot;
  final IconData? icon;
  final EdgeInsetsGeometry padding;

  const EmployeeStatusBadge({
    super.key,
    this.label,
    this.variant = BadgeVariant.neutral,
    this.showDot = false,
    this.icon,
    this.padding = const EdgeInsets.symmetric(
      horizontal: AppSpacing.sm + 2,
      vertical: AppSpacing.xs,
    ),
  });

  /// Builds a badge from a free-text status string.
  factory EmployeeStatusBadge.fromString(
    String? status, {
    Key? key,
    bool showDot = false,
  }) {
    final s = (status ?? '').toLowerCase().trim();
    BadgeVariant variant = BadgeVariant.neutral;

    if (s.contains('completed') ||
        s.contains('resolved') ||
        s.contains('successful')) {
      variant = BadgeVariant.completed;
    } else if (s.contains('approaching') || s.contains('arrived')) {
      variant = s.contains('arrived')
          ? BadgeVariant.arrived
          : BadgeVariant.approaching;
    } else if (s.contains('boarded') ||
        s.contains('progress') ||
        s.contains('active')) {
      variant = BadgeVariant.inProgress;
    } else if (s.contains('cancel') ||
        s.contains('reject') ||
        s.contains('error')) {
      variant = BadgeVariant.cancelled;
    } else if (s.contains('delay') || s.contains('late')) {
      variant = BadgeVariant.delayed;
    } else if (s.contains('pending') || s.contains('assigned')) {
      variant =
          s.contains('pending') ? BadgeVariant.pending : BadgeVariant.assigned;
    } else if (s.contains('approved')) {
      variant = BadgeVariant.approved;
    } else if (s.contains('upcoming') || s.contains('scheduled')) {
      variant = BadgeVariant.upcoming;
    }

    return EmployeeStatusBadge(
      key: key,
      label: status,
      variant: variant,
      showDot: showDot,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final (bgColor, textColor) = _colors(isDark);
    final displayText = label ?? _defaultLabel();

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.borderPill,
        border: Border.all(color: textColor.withAlpha(50), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: textColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppSpacing.xs + 2),
          ],
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(
            displayText,
            style: AppTypography.caption(color: textColor).copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  (Color, Color) _colors(bool isDark) {
    switch (variant) {
      case BadgeVariant.completed:
      case BadgeVariant.approved:
      case BadgeVariant.active:
        return (AppColors.successContainer, AppColors.successText);
      case BadgeVariant.cancelled:
      case BadgeVariant.rejected:
        return (AppColors.errorContainer, AppColors.errorText);
      case BadgeVariant.delayed:
      case BadgeVariant.pending:
        return (AppColors.warningContainer, AppColors.warningText);
      case BadgeVariant.upcoming:
      case BadgeVariant.assigned:
      case BadgeVariant.approaching:
      case BadgeVariant.arrived:
      case BadgeVariant.boarded:
      case BadgeVariant.inProgress:
        return (AppColors.infoContainer, AppColors.infoText);
      case BadgeVariant.neutral:
        return isDark
            ? (AppColors.surfaceElevatedDark, AppColors.textSecondaryDark)
            : (AppColors.surfaceElevatedLight, AppColors.textSecondaryLight);
    }
  }

  String _defaultLabel() {
    switch (variant) {
      case BadgeVariant.upcoming:
        return 'Upcoming';
      case BadgeVariant.assigned:
        return 'Cab Assigned';
      case BadgeVariant.approaching:
        return 'Approaching';
      case BadgeVariant.arrived:
        return 'Cab Arrived';
      case BadgeVariant.boarded:
        return 'Boarded';
      case BadgeVariant.inProgress:
        return 'In Progress';
      case BadgeVariant.completed:
        return 'Completed';
      case BadgeVariant.cancelled:
        return 'Cancelled';
      case BadgeVariant.delayed:
        return 'Delayed';
      case BadgeVariant.pending:
        return 'Pending';
      case BadgeVariant.approved:
        return 'Approved';
      case BadgeVariant.rejected:
        return 'Rejected';
      case BadgeVariant.active:
        return 'Active';
      case BadgeVariant.neutral:
        return 'Scheduled';
    }
  }
}
