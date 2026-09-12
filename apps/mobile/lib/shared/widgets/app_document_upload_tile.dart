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
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isUploading ? null : onUploadTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: isUploaded ? AppColors.accentGreenDark : AppColors.borderLight,
              width: isUploaded ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              // Icon Box
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isUploaded
                      ? AppColors.successContainer
                      : AppColors.surfaceElevatedLight,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                alignment: Alignment.center,
                child: Icon(
                  icon,
                  size: 22,
                  color: isUploaded
                      ? AppColors.accentGreenDark
                      : AppColors.primary,
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
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isUploaded
                          ? (uploadedFileName ?? 'Uploaded successfully')
                          : subtitle,
                      style: AppTypography.caption(
                        color: isUploaded
                            ? AppColors.accentGreenDark
                            : AppColors.textSecondaryLight,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Status indicator / Upload action
              if (isUploading)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                )
              else if (isUploaded)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.accentGreenDark,
                  ),
                  child: const Icon(
                    Icons.check,
                    size: 16,
                    color: Colors.white,
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                  child: Text(
                    'Upload',
                    style: AppTypography.caption(
                      color: AppColors.primary,
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
