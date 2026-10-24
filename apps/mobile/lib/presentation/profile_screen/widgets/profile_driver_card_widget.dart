import 'package:flutter/material.dart';
import '../../../services/language_service.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

class ProfileDriverCardWidget extends StatelessWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onTap;

  const ProfileDriverCardWidget({
    super.key,
    required this.profile,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final rawName = (profile['name'] != null && profile['name'].toString().trim().isNotEmpty)
        ? profile['name'].toString().trim()
        : 'Driver';
    final isGenericName = rawName.toLowerCase() == 'driver' || rawName.toLowerCase() == 'partner';
    final name = isGenericName ? context.tr(rawName) : rawName;
    final initial = rawName.isNotEmpty ? rawName[0].toUpperCase() : 'D';

    final phone = (profile['phone'] != null && profile['phone'].toString().trim().isNotEmpty)
        ? profile['phone'].toString().trim()
        : '—';

    final rawVehicle = (profile['vehicle'] != null && profile['vehicle'].toString().trim().isNotEmpty)
        ? profile['vehicle'].toString().trim()
        : 'Commercial Fleet Vehicle';
    final vehicle = context.tr(rawVehicle);

    final isVerified = profile['is_verified'] != false;
    final rating = profile['rating']?.toString() ?? '0';
    final totalTrips = profile['total_trips']?.toString() ?? '0';
    final acceptanceRate = profile['acceptance_rate']?.toString() ?? '0%';

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : AppColors.textSecondaryLight.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                // ── Top Header Row ───────────────────────────────────────────
                Row(
                  children: [
                    // Avatar with online status
                    Stack(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [AppColors.primary, AppColors.primaryHover],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              initial,
                              style: AppTypography.h2(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: AppColors.accentGreen,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDark ? AppColors.surfaceDark : Colors.white,
                                width: 2.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: AppSpacing.md),

                    // User Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  name,
                                  style: AppTypography.h3(
                                    color: isDark
                                        ? AppColors.textPrimaryDark
                                        : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (isVerified)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentGreen.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                    border: Border.all(
                                      color: AppColors.accentGreen.withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.verified_rounded,
                                        size: 11,
                                        color: AppColors.accentGreen,
                                      ),
                                      const SizedBox(width: 3),
                                      Text(
                                        context.tr('Verified'),
                                        style: AppTypography.micro(
                                          color: AppColors.accentGreen,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            phone,
                            style: AppTypography.caption(
                              color: isDark
                                  ? AppColors.textSecondaryDark
                                  : AppColors.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(
                                Icons.directions_car_rounded,
                                size: 13,
                                color: isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  vehicle,
                                  style: AppTypography.caption(
                                    color: isDark
                                        ? AppColors.textMutedDark
                                        : AppColors.textMutedLight,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Chevron
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.surfaceElevatedDark
                            : AppColors.surfaceElevatedLight,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: isDark
                            ? AppColors.textSecondaryDark
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: AppSpacing.lg),

                // ── KPI Quick Stats Row ──────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm + 2,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceElevatedDark.withValues(alpha: 0.6)
                        : AppColors.surfaceElevatedLight,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem(
                        icon: Icons.star_rounded,
                        iconColor: AppColors.warning,
                        value: rating,
                        label: context.tr('Rating'),
                        isDark: isDark,
                      ),
                      _statDivider(isDark),
                      _buildStatItem(
                        icon: Icons.local_taxi_rounded,
                        iconColor: AppColors.primary,
                        value: totalTrips,
                        label: context.tr('Trips'),
                        isDark: isDark,
                      ),
                      _statDivider(isDark),
                      _buildStatItem(
                        icon: Icons.check_circle_rounded,
                        iconColor: AppColors.accentGreen,
                        value: acceptanceRate,
                        label: context.tr('Acceptance'),
                        isDark: isDark,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
    required bool isDark,
  }) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 4),
            Text(
              value,
              style: AppTypography.body(
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 1),
        Text(
          label,
          style: AppTypography.micro(
            color: isDark
                ? AppColors.textSecondaryDark
                : AppColors.textSecondaryLight,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _statDivider(bool isDark) {
    return Container(
      width: 1,
      height: 24,
      color: isDark ? AppColors.borderDark : AppColors.borderLight,
    );
  }
}