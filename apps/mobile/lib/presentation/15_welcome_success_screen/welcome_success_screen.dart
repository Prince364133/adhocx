import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 15: Welcome to AdhocX! (Account Created Celebration).
class WelcomeSuccessScreen extends StatelessWidget {
  const WelcomeSuccessScreen({super.key});

  Widget _buildCheckItem(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
            ),
            child: Icon(
              Icons.check,
              size: 14,
              color: isDark ? AppColors.bgDark : Colors.white,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              text,
              style: AppTypography.body(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isUser = onboarding.isUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.xl,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.lg),

                  // ── Celebration Icon Box ─────────────────────────────────
                  Center(
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.primaryLight.withValues(alpha: 0.15)
                            : AppColors.primarySubtle,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.4),
                          width: 2,
                        ),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Icon(
                            Icons.celebration_rounded,
                            size: 64,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                          ),
                          Positioned(
                            bottom: 10,
                            right: 14,
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                              ),
                              child: Icon(
                                Icons.check,
                                size: 18,
                                color: isDark ? AppColors.bgDark : Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Title & Subtitle ─────────────────────────────────────
                  Text(
                    'Welcome to AdhocX!',
                    style: AppTypography.h1(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    isUser
                        ? 'Your account is ready to book bulk & outstation rides.'
                        : 'Your account has been created successfully.',
                    style: AppTypography.body(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Feature Checklist ────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                    child: Column(
                      children: isUser
                          ? [
                              _buildCheckItem('Post trip requirements for competitive driver bids', isDark),
                              _buildCheckItem('Instant booking for outstation and bulk fleets', isDark),
                              _buildCheckItem('Track trips & receipts in real-time', isDark),
                            ]
                          : [
                              _buildCheckItem('You are all set to start earning', isDark),
                              _buildCheckItem('Go online to receive trip offers', isDark),
                              _buildCheckItem('Complete trips and earn more', isDark),
                            ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.xxxl),

                  // ── Action ───────────────────────────────────────────────
                  AppPrimaryButton(
                    text: isUser ? 'Start Booking & Posting Trips' : 'Go to Driver Dashboard',
                    onPressed: () {
                      final user = UserModel(
                        id: 'usr_${DateTime.now().millisecondsSinceEpoch}',
                        phone: onboarding.phone,
                        email: onboarding.email,
                        fullName: onboarding.fullName.isNotEmpty ? onboarding.fullName : 'AdhocX User',
                        role: isUser ? 'USER' : 'DRIVER',
                      );
                      context.read<AuthProvider>().setUser(user);

                      if (isUser) {
                        context.go(AppRoutes.userHomeScreen);
                      } else {
                        context.go(AppRoutes.homeScreen);
                      }
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
