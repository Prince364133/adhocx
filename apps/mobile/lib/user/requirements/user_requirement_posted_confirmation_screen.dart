import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserRequirementPostedConfirmationScreen extends StatelessWidget {
  const UserRequirementPostedConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Success Green Check Icon with Circle Glow
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check, size: 48, color: Colors.white),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              Text(
                'Requirement Posted!',
                style: AppTypography.h1(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 6),

              Text(
                'Your requirement has been posted successfully.',
                textAlign: TextAlign.center,
                style: AppTypography.body(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Requirement Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Requirement ID', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        const Text('REQ-250510-0001', style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 16),
                    Text(
                      '10 Vehicles • Sedan • One Way',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF6C5CE7)),
                        SizedBox(width: 4),
                        Text('DLF Cyber City, Gurugram', style: TextStyle(fontSize: 12)),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
                        SizedBox(width: 6),
                        Icon(Icons.pin_drop_outlined, size: 16, color: Color(0xFF6C5CE7)),
                        SizedBox(width: 4),
                        Text('IGIA, Delhi', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '10 May 2025 • 06:30 PM',
                      style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Actions: View Requirement + Back to Home
              AppPrimaryButton(
                text: 'View Requirement',
                onPressed: () => context.push(AppRoutes.userRequirementDetailsScreen),
              ),

              const SizedBox(height: AppSpacing.md),

              OutlinedButton(
                onPressed: () => context.go(AppRoutes.userHomeScreen),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)),
              ),

              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }
}
