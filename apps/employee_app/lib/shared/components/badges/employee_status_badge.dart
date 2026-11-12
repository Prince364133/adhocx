import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../feedback/employee_entrance.dart';

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

/// Unified Status Badge for AdhocX Employee Application.
/// Renders consistent semantic status pills across Trip, Schedule, Driver, and Support views.
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
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  });

  /// Factory helper to build badge directly from string status
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
    final config = _getStyleConfig();
    final displayText = label ?? _getDefaultLabel();

    return EmployeeEntrance(
      duration: const Duration(milliseconds: 280),
      beginOffset: const Offset(0, 0.02),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        padding: padding,
        decoration: BoxDecoration(
          color: config.backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: config.borderColor, width: 1.0),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (showDot) ...[
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: config.textColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
            ],
            if (icon != null) ...[
              Icon(icon, size: 12, color: config.textColor),
              const SizedBox(width: 4),
            ],
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              child: Text(
                displayText,
                key: ValueKey(displayText),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: config.textColor,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getDefaultLabel() {
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

  _BadgeStyle _getStyleConfig() {
    switch (variant) {
      case BadgeVariant.completed:
      case BadgeVariant.approved:
      case BadgeVariant.active:
        return const _BadgeStyle(
          backgroundColor: AppColors.successLight,
          textColor: AppColors.success,
          borderColor: AppColors.successBorder,
        );
      case BadgeVariant.cancelled:
      case BadgeVariant.rejected:
        return const _BadgeStyle(
          backgroundColor: AppColors.errorLight,
          textColor: AppColors.error,
          borderColor: AppColors.errorBorder,
        );
      case BadgeVariant.delayed:
      case BadgeVariant.pending:
        return const _BadgeStyle(
          backgroundColor: AppColors.warningLight,
          textColor: AppColors.warning,
          borderColor: AppColors.warningBorder,
        );
      case BadgeVariant.upcoming:
      case BadgeVariant.assigned:
      case BadgeVariant.approaching:
      case BadgeVariant.arrived:
      case BadgeVariant.boarded:
      case BadgeVariant.inProgress:
        return const _BadgeStyle(
          backgroundColor: AppColors.primaryBlueSoft,
          textColor: AppColors.primaryBlue,
          borderColor: AppColors.primaryBlueLight,
        );
      case BadgeVariant.neutral:
        return const _BadgeStyle(
          backgroundColor: AppColors.surfaceMuted,
          textColor: AppColors.textSecondary,
          borderColor: AppColors.border,
        );
    }
  }
}

class _BadgeStyle {
  final Color backgroundColor;
  final Color textColor;
  final Color borderColor;

  const _BadgeStyle({
    required this.backgroundColor,
    required this.textColor,
    required this.borderColor,
  });
}
