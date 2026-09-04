import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 1: Splash / Hero Welcome Screen with custom illustrated background.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FF),
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
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFFEEF2FF),
                        Color(0xFFE0E7FF),
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
                  stops: const [0.0, 0.3, 0.7, 1.0],
                  colors: [
                    Colors.white.withValues(alpha: 0.9),
                    Colors.white.withValues(alpha: 0.1),
                    Colors.white.withValues(alpha: 0.1),
                    Colors.white.withValues(alpha: 0.95),
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
                      // ── Top Brand Header ───────────────────────────────────
                      Column(
                        children: [
                          const SizedBox(height: AppSpacing.xxl),
                          RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: 'Adhoc',
                                  style: AppTypography.display(
                                    color: AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 44,
                                  ),
                                ),
                                TextSpan(
                                  text: 'X',
                                  style: AppTypography.display(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 46,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Your ride. Your way.',
                            style: AppTypography.bodyLarge(
                              color: AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),

                      const Spacer(),

                      // ── Bottom Actions (Get Started, Log In, Guest) ────────
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
                                backgroundColor: Colors.white,
                                foregroundColor: AppColors.primary,
                                side: const BorderSide(
                                  color: AppColors.primary,
                                  width: 1.5,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                                elevation: 2,
                                shadowColor: Colors.black.withValues(alpha: 0.06),
                              ),
                              child: Text(
                                'Log In',
                                style: AppTypography.body(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),

                          // 3. Continue as Guest
                          TextButton(
                            onPressed: () => context.go(AppRoutes.homeScreen),
                            child: Text(
                              'Continue as Guest',
                              style: AppTypography.caption(
                                color: AppColors.textSecondaryLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
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
}
