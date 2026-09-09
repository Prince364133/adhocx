import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 3: KYC & Verification screen matching exact design mockup.
class KycVerificationScreen extends StatelessWidget {
  const KycVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                  decoration: BoxDecoration(
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
                        icon: Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'KYC & Verification',
                        style: AppTypography.h3(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Status Banner Card ─────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreenDark.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: AppColors.accentGreenDark.withValues(alpha: 0.25),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'KYC Status',
                                    style: AppTypography.caption(
                                      color: AppColors.accentGreenDark,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Verified',
                                    style: AppTypography.h1(
                                      color: AppColors.accentGreenDark,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Your documents are verified',
                                    style: AppTypography.body(
                                      color: AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.accentGreenDark.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.accentGreenDark,
                                  width: 2,
                                ),
                              ),
                              child: Icon(
                                Icons.check_rounded,
                                color: AppColors.accentGreenDark,
                                size: 28,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Submitted Documents Section ───────────────────────
                      Text(
                        'Submitted Documents',
                        style: AppTypography.body(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // ── Documents Card List ────────────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildDocumentTile(
                              context: context,
                              icon: Icons.badge_outlined,
                              title: 'Aadhaar Card',
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDocumentTile(
                              context: context,
                              icon: Icons.credit_card_outlined,
                              title: 'PAN Card',
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDocumentTile(
                              context: context,
                              icon: Icons.drive_eta_outlined,
                              title: 'Driving License',
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDocumentTile(
                              context: context,
                              icon: Icons.account_circle_outlined,
                              title: 'Profile Photo',
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDocumentTile(
                              context: context,
                              icon: Icons.home_outlined,
                              title: 'Address Proof',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Info Bottom Footer ─────────────────────────────────
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.md,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'All documents are verified and up to date.',
                                style: AppTypography.caption(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
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

  Widget _buildDocumentTile({
    required BuildContext context,
    required IconData icon,
    required String title,
  }) {
    return ListTile(
      onTap: () => context.push(AppRoutes.documentDetailsScreen),
      leading: Icon(icon, size: 20, color: AppColors.textSecondaryLight),
      title: Text(
        title,
        style: AppTypography.body(
          color: AppColors.textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Verified',
            style: AppTypography.caption(
              color: AppColors.accentGreenDark,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 6),
          Icon(
            Icons.check_circle_rounded,
            size: 18,
            color: AppColors.accentGreenDark,
          ),
        ],
      ),
    );
  }
}
