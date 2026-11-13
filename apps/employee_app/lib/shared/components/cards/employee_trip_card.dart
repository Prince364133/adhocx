import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_card.dart';
import '../badges/employee_status_badge.dart';
import '../feedback/employee_entrance.dart';

/// Trip list item (Trip History, Daily Schedule, Overview).
/// Built on the Driver app's AppCard: flat surface, 10px radius, 1.2px border.
class EmployeeTripCard extends StatelessWidget {
  final String title;
  final String date;
  final String? time;
  final String? status;
  final String? route;
  final bool isDrop;
  final VoidCallback? onTap;
  final Widget? trailing;

  const EmployeeTripCard({
    super.key,
    required this.title,
    required this.date,
    this.time,
    this.status,
    this.route,
    this.isDrop = false,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final textMuted =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final accent = isDrop ? AppColors.brandOrange : AppColors.primary;

    return EmployeeEntrance(
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: AppCard(
          onTap: onTap,
          child: Row(
            children: [
              // Direction icon
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm + 2),
                decoration: BoxDecoration(
                  color: accent.withAlpha(isDark ? 46 : 26),
                  borderRadius: AppRadius.borderMd,
                ),
                child: Icon(
                  isDrop
                      ? Icons.business_rounded
                      : Icons.directions_car_filled_rounded,
                  color: accent,
                  size: 22,
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Main info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            style: AppTypography.h4(
                              color: textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        if (status != null) ...[
                          const SizedBox(width: AppSpacing.sm),
                          EmployeeStatusBadge.fromString(status),
                        ],
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: date,
                            style: AppTypography.caption(color: textMuted),
                          ),
                          if (time != null)
                            TextSpan(
                              text: ' • $time',
                              style: AppTypography.caption(
                                color: textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (route != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        route!,
                        style: AppTypography.micro(
                          color: textSecondary,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Trailing action / chevron
              if (trailing != null) ...[
                const SizedBox(width: AppSpacing.sm),
                trailing!,
              ] else if (onTap != null) ...[
                const SizedBox(width: AppSpacing.sm),
                Icon(Icons.chevron_right_rounded, size: 20, color: textMuted),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
