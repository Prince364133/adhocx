import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 2: My Vehicle screen matching exact design mockup.
class MyVehicleScreen extends StatelessWidget {
  const MyVehicleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();

    final vehicleType = onboarding.vehicleType.isNotEmpty ? onboarding.vehicleType : 'Sedan';
    final vehicleNumber = onboarding.registrationNumber.isNotEmpty ? onboarding.registrationNumber : 'HR 26 AB 1234';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'My Vehicle',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          context.push(AppRoutes.addVehicleScreen);
                        },
                        child: Text(
                          'Add Vehicle',
                          style: AppTypography.body(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Content ───────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Vehicle Main Card ──────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x06000000),
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            // Vehicle Photo / Illustration
                            Container(
                              height: 120,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: AppColors.bgLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.directions_car_rounded,
                                  size: 72,
                                  color: AppColors.primary.withValues(alpha: 0.8),
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            // Title & Badges
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Honda City',
                                      style: AppTypography.h2(
                                        color: AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '$vehicleType • White',
                                      style: AppTypography.body(
                                        color: AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.full),
                                  ),
                                  child: Text(
                                    'Active',
                                    style: AppTypography.caption(
                                      color: AppColors.accentGreenDark,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // License Plate & Model Year
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.bgLight,
                                    border: Border.all(color: AppColors.borderLight),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.subtitles_outlined,
                                        size: 16,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        vehicleNumber,
                                        style: AppTypography.body(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  'Year: 2021',
                                  style: AppTypography.caption(
                                    color: AppColors.textMutedLight,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Vehicle Details List Card ──────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildInfoTile(
                              label: 'RC Number',
                              value: 'HR26AB1234',
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildInfoTile(
                              label: 'Registration Date',
                              value: '12 Mar 2021',
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildInfoTile(
                              label: 'Insurance Valid Till',
                              value: '20 Feb 2026',
                              badgeText: 'Valid',
                              badgeColor: AppColors.accentGreenDark,
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildInfoTile(
                              label: 'PUC Valid Till',
                              value: '10 Dec 2025',
                              badgeText: 'Valid',
                              badgeColor: AppColors.accentGreenDark,
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildInfoTile(
                              label: 'Fitness Valid Till',
                              value: '11 Mar 2026',
                              badgeText: 'Valid',
                              badgeColor: AppColors.accentGreenDark,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── View Documents Action Tile ─────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: ListTile(
                          onTap: () => context.push(AppRoutes.onboardingDocumentsScreen),
                          leading: const Icon(
                            Icons.description_outlined,
                            color: AppColors.primary,
                          ),
                          title: Text(
                            'View Documents',
                            style: AppTypography.body(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          trailing: const Icon(
                            Icons.chevron_right,
                            color: AppColors.primary,
                          ),
                        ),
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

  Widget _buildInfoTile({
    required String label,
    required String value,
    String? badgeText,
    Color? badgeColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.body(color: AppColors.textSecondaryLight),
          ),
          Row(
            children: [
              Text(
                value,
                style: AppTypography.body(
                  color: AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (badgeText != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (badgeColor ?? AppColors.primary).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.xs),
                  ),
                  child: Text(
                    badgeText,
                    style: AppTypography.caption(
                      color: badgeColor ?? AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, size: 16, color: AppColors.textMutedLight),
            ],
          ),
        ],
      ),
    );
  }
}
