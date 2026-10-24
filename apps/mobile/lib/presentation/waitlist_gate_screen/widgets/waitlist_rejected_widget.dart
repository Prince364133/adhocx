import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_primary_button.dart';

class WaitlistRejectedWidget extends StatelessWidget {
  final String reason;
  final VoidCallback onReApply;
  final bool isBusiness;

  const WaitlistRejectedWidget({
    super.key,
    required this.reason,
    required this.onReApply,
    this.isBusiness = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xxl),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.error, width: 2),
            ),
            child: const Icon(
              Icons.cancel_rounded,
              color: AppColors.error,
              size: 48,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Text(
            isBusiness ? 'Corporate Application Requires Updates' : 'Application Requires Updates',
            style: AppTypography.display(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.w800,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.error, size: 16),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Verification Officer Feedback',
                      style: AppTypography.caption(
                        color: AppColors.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  reason,
                  style: AppTypography.body(
                    color: isDark ? AppColors.errorContainer : AppColors.error,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxxl),
          AppPrimaryButton(
            text: isBusiness ? 'Update Corporate Details & Re-Submit' : 'Re-Upload Documents & Re-Apply',
            icon: isBusiness ? Icons.edit_note_rounded : Icons.upload_file_rounded,
            onPressed: onReApply,
          ),
        ],
      ),
    );
  }
}
