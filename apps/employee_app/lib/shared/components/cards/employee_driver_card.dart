import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_card.dart';
import '../buttons/employee_pill_filter.dart';
import '../feedback/employee_entrance.dart';

/// Driver & vehicle card with rating, registration plate and contact actions.
/// Built on the Driver app's AppCard and tokens; light/dark aware.
class EmployeeDriverCard extends StatelessWidget {
  final String name;
  final double rating;
  final String? vehicleModel;
  final String vehicleNumber;
  final String? phone;
  final String? experience;
  final VoidCallback? onCall;
  final VoidCallback? onChat;
  final VoidCallback? onViewDetails;

  const EmployeeDriverCard({
    super.key,
    required this.name,
    this.rating = 4.8,
    this.vehicleModel,
    required this.vehicleNumber,
    this.phone,
    this.experience,
    this.onCall,
    this.onChat,
    this.onViewDetails,
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
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    return EmployeeEntrance(
      delay: const Duration(milliseconds: 80),
      child: AppCard(
        width: double.infinity,
        child: Column(
          children: [
            Row(
              children: [
                // Avatar with verified tick
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.primary.withAlpha(26),
                      child: const Icon(
                        Icons.person,
                        size: 30,
                        color: AppColors.primary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                      child:
                          const Icon(Icons.check, size: 10, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),

                // Name, rating, model
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: AppTypography.h4(
                          color: textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 16, color: AppColors.starAmber),
                          const SizedBox(width: 2),
                          Text(
                            rating.toStringAsFixed(1),
                            style: AppTypography.caption(
                              color: textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (experience != null)
                            Flexible(
                              child: Text(
                                ' • $experience',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.caption(color: textMuted),
                              ),
                            ),
                        ],
                      ),
                      if (vehicleModel != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          vehicleModel!,
                          style: AppTypography.caption(color: textSecondary),
                        ),
                      ],
                    ],
                  ),
                ),

                // Registration plate
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm + 2,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceElevatedDark
                        : AppColors.surfaceElevatedLight,
                    borderRadius: AppRadius.borderMd,
                    border: Border.all(color: border),
                  ),
                  child: Text(
                    vehicleNumber,
                    style: AppTypography.micro(
                      color: textPrimary,
                      fontWeight: FontWeight.w800,
                    ).copyWith(letterSpacing: 0.5),
                  ),
                ),
              ],
            ),

            // Actions
            if (onCall != null || onChat != null || onViewDetails != null) ...[
              const SizedBox(height: AppSpacing.md),
              Divider(height: 1, color: border),
              const SizedBox(height: AppSpacing.xs),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (onViewDetails != null)
                    Flexible(
                      child: TextButton(
                        onPressed: onViewDetails,
                        child: Text(
                          'View Driver Profile',
                          maxLines: 1,
                          style: AppTypography.label(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                  else
                    const Spacer(),
                  Row(
                    children: [
                      if (onChat != null)
                        EmployeeIconButton(
                          icon: Icons.chat_bubble_outline_rounded,
                          onPressed: onChat,
                          size: 36,
                          iconSize: 18,
                          backgroundColor: AppColors.primary.withAlpha(26),
                          iconColor: AppColors.primary,
                          tooltip: 'Message Driver',
                        ),
                      if (onCall != null)
                        EmployeeIconButton(
                          icon: Icons.phone_rounded,
                          onPressed: onCall,
                          size: 36,
                          iconSize: 18,
                          backgroundColor: AppColors.successContainer,
                          iconColor: AppColors.success,
                          tooltip: 'Call Driver',
                        ),
                    ],
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
