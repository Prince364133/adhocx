import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 1: Splash / Hero Welcome Screen with custom illustrated background and corporate mobility features.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: Stack(
        children: [
          // ── Background Illustrated Artwork ─────────────────────────────────
          Positioned.fill(
            child: Image.asset(
              'assets/images/splash_bg.png',
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: isDark
                          ? [
                              AppColors.surfaceElevatedDark,
                              AppColors.bgDark,
                            ]
                          : [
                              AppColors.primarySubtle,
                              AppColors.borderLight,
                            ],
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Contrast Gradient Overlay ──────────────────────────────────────
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: const [0.0, 0.25, 0.65, 1.0],
                  colors: isDark
                      ? [
                          AppColors.bgDark.withValues(alpha: 0.95),
                          AppColors.bgDark.withValues(alpha: 0.6),
                          AppColors.bgDark.withValues(alpha: 0.8),
                          AppColors.bgDark.withValues(alpha: 0.98),
                        ]
                      : [
                          Colors.white.withValues(alpha: 0.92),
                          Colors.white.withValues(alpha: 0.2),
                          Colors.white.withValues(alpha: 0.4),
                          Colors.white.withValues(alpha: 0.96),
                        ],
                ),
              ),
            ),
          ),

          // ── Foreground Content ─────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xxl,
                    vertical: AppSpacing.lg,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // ── Top Brand Header (Centered Logo & Tagline) ─────────
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const SizedBox(height: AppSpacing.xl),
                          RichText(
                            textAlign: TextAlign.center,
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: 'Adhoc',
                                  style: AppTypography.display(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 44,
                                  ),
                                ),
                                const TextSpan(
                                  text: 'X',
                                  style: TextStyle(
                                    color: AppColors.brandOrange,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 46,
                                    fontFamily: 'Inter',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Your ride. Your way.',
                            style: AppTypography.bodyLarge(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.3),
                              ),
                            ),
                            child: Text(
                              'Corporate Mobility & Bulk Booking Platform',
                              style: TextStyle(
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ],
                      ),

                      // ── Middle Feature Highlights (Corporate, Location, Bulk)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.md,
                        ),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark.withValues(alpha: 0.95) : Colors.white.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : Colors.white,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildFeatureRow(
                              isDark: isDark,
                              icon: Icons.corporate_fare_rounded,
                              iconBg: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.15),
                              iconColor: isDark ? AppColors.primaryLight : AppColors.primary,
                              title: 'Corporate Bulk Booking',
                              subtitle:
                                  'Multi-vehicle fleet reservation & group transit',
                            ),
                            Divider(
                              height: 18,
                              thickness: 1,
                              color: isDark ? AppColors.borderDark : AppColors.surfaceElevatedLight,
                            ),
                            _buildFeatureRow(
                              isDark: isDark,
                              icon: Icons.hub_rounded,
                              iconBg: AppColors.info.withValues(alpha: 0.15),
                              iconColor: AppColors.info,
                              title: 'Location & Hub Dispatch',
                              subtitle:
                                  'Smart multi-stop routing & live fleet tracking',
                            ),
                            Divider(
                              height: 18,
                              thickness: 1,
                              color: isDark ? AppColors.borderDark : AppColors.surfaceElevatedLight,
                            ),
                            _buildFeatureRow(
                              isDark: isDark,
                              icon: Icons.verified_user_rounded,
                              iconBg: AppColors.brandOrange.withValues(alpha: 0.15),
                              iconColor: AppColors.brandOrange,
                              title: 'Enterprise SLAs',
                              subtitle:
                                  'Verified drivers, upfront rates & dedicated support',
                            ),
                          ],
                        ),
                      ),

                      // ── Bottom Actions (Get Started, Log In) ──────────────
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // 1. Get Started Primary Button
                          AppPrimaryButton(
                            text: 'Get Started',
                            onPressed: () => context.push(AppRoutes.signUpScreen),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // 2. Log In Outlined Button
                          SizedBox(
                            height: 52,
                            child: OutlinedButton(
                              onPressed: () => context.push(AppRoutes.signInScreen),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                                foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                side: BorderSide(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  width: 1.5,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppRadius.md),
                                ),
                                elevation: isDark ? 0 : 2,
                                shadowColor:
                                    Colors.black.withValues(alpha: 0.06),
                              ),
                              child: Text(
                                'Log In',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRow({
    required bool isDark,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
