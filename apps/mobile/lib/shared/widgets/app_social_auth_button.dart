import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

enum SocialAuthType { google, apple }

class AppSocialAuthButton extends StatelessWidget {
  final SocialAuthType type;
  final VoidCallback onPressed;

  const AppSocialAuthButton({
    super.key,
    required this.type,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isGoogle = type == SocialAuthType.google;
    final label = isGoogle ? 'Continue with Google' : 'Continue with Apple';

    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textPrimaryLight,
        backgroundColor: AppColors.surfaceLight,
        side: BorderSide(color: AppColors.borderLight),
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isGoogle)
            Image.network(
              'https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png',
              width: 20,
              height: 20,
              errorBuilder: (_, __, ___) => const Icon(Icons.g_mobiledata, size: 24),
            )
          else
            const Icon(
              Icons.apple,
              size: 22,
              color: Colors.black,
            ),
          const SizedBox(width: AppSpacing.md),
          Text(
            label,
            style: AppTypography.body(
              color: AppColors.textPrimaryLight,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
