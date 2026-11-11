import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Document Upload Tile for KYC screens (Driving License, RC, Insurance, Photo)
class AppDocumentUploadTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isUploaded;
  final bool isUploading;
  final String? uploadedFileName;
  final bool isVerifiedDigitally;
  final String? verifiedBadgeLabel;
  final String? verifiedSubtitle;
  final VoidCallback onUploadTap;

  const AppDocumentUploadTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isUploaded,
    required this.onUploadTap,
    this.isUploading = false,
    this.uploadedFileName,
    this.isVerifiedDigitally = false,
    this.verifiedBadgeLabel,
    this.verifiedSubtitle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bool isSatisfied = isUploaded || isVerifiedDigitally;
    final greenColor =
        isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark;
    const amberColor = AppColors.warningText;
    final Color statusBorderColor = isVerifiedDigitally
        ? greenColor
        : (isUploaded
            ? AppColors.warning
            : (isDark ? AppColors.borderDark : AppColors.borderLight));
    final Color statusIconBgColor = isVerifiedDigitally
        ? (isDark
            ? AppColors.accentGreenLight.withValues(alpha: 0.15)
            : AppColors.successContainer)
        : (isUploaded
            ? AppColors.warning.withValues(alpha: 0.14)
            : (isDark
                ? AppColors.surfaceElevatedDark
                : AppColors.surfaceElevatedLight));
    final Color statusIconColor = isVerifiedDigitally
        ? greenColor
        : (isUploaded
            ? amberColor
            : (isDark ? AppColors.primaryLight : AppColors.primary));

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: (isUploading || isVerifiedDigitally) ? null : onUploadTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: isVerifiedDigitally
                ? (isDark
                    ? greenColor.withValues(alpha: 0.08)
                    : AppColors.successContainer.withValues(alpha: 0.45))
                : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: statusBorderColor,
              width: isSatisfied ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              // Icon Box
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: statusIconBgColor,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                alignment: Alignment.center,
                child: Icon(
                  icon,
                  size: 22,
                  color: statusIconColor,
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Title & Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.body(
                        color: isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isVerifiedDigitally
                          ? (verifiedSubtitle ??
                              'Verified via DigiLocker — already uploaded')
                          : isSatisfied
                              ? (uploadedFileName ?? 'Uploaded — pending review')
                              : subtitle,
                      style: AppTypography.caption(
                        color: isVerifiedDigitally
                            ? greenColor
                            : isSatisfied
                                ? AppColors.warningText
                                : (isDark
                                    ? AppColors.textSecondaryDark
                                    : AppColors.textSecondaryLight),
                        fontWeight:
                            isSatisfied ? FontWeight.w600 : FontWeight.normal,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Status indicator / Upload action
              if (isUploading)
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                  ),
                )
              else if (isVerifiedDigitally)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: greenColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    border: Border.all(
                        color: greenColor.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_rounded,
                          size: 13, color: greenColor),
                      const SizedBox(width: 4),
                      Text(
                        verifiedBadgeLabel ?? 'DigiLocker',
                        style: AppTypography.caption(
                          color: greenColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                )
              else if (isSatisfied)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    border: Border.all(
                        color: AppColors.warning.withValues(alpha: 0.45)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule_rounded,
                          size: 13, color: AppColors.warningText),
                      const SizedBox(width: 4),
                      Text(
                        'Pending Review',
                        style: AppTypography.caption(
                          color: AppColors.warningText,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.primary.withValues(alpha: 0.25)
                        : AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                  child: Text(
                    'Upload',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
