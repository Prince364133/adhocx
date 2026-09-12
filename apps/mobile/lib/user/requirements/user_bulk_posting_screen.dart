import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserBulkPostingScreen extends StatefulWidget {
  const UserBulkPostingScreen({super.key});

  @override
  State<UserBulkPostingScreen> createState() => _UserBulkPostingScreenState();
}

class _UserBulkPostingScreenState extends State<UserBulkPostingScreen> {
  String _inputMethod = 'Upload Excel / CSV';
  String? _uploadedFileName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Bulk Posting',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Choose Input Method',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),

              // 2 Selection Cards (Upload Excel/CSV vs Manual Entry)
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _inputMethod = 'Upload Excel / CSV'),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: _inputMethod == 'Upload Excel / CSV'
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: _inputMethod == 'Upload Excel / CSV'
                                ? AppColors.primary
                                : (isDark ? AppColors.borderDark : AppColors.borderLight),
                            width: _inputMethod == 'Upload Excel / CSV' ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          children: const [
                            Icon(Icons.upload_file, size: 32, color: AppColors.primary),
                            SizedBox(height: 8),
                            Text('Upload Excel / CSV', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            SizedBox(height: 4),
                            Text('Download template and upload your file', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.slate400)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _inputMethod = 'Manual Entry'),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: _inputMethod == 'Manual Entry'
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: _inputMethod == 'Manual Entry'
                                ? AppColors.primary
                                : (isDark ? AppColors.borderDark : AppColors.borderLight),
                            width: _inputMethod == 'Manual Entry' ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          children: const [
                            Icon(Icons.edit_note, size: 32, color: AppColors.slate400),
                            SizedBox(height: 8),
                            Text('Manual Entry', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            SizedBox(height: 4),
                            Text('Enter requirements one by one', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.slate400)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xl),

              // Download Template Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Download Template', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('Download our Excel template and fill in your requirements', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Downloading AdhocX_Bulk_Template.xlsx...')));
                      },
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                        child: Icon(Icons.download, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Upload File Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Upload File', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(_uploadedFileName ?? 'Upload your filled template', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () {
                        setState(() => _uploadedFileName = 'fleet_requirements_may2025.xlsx');
                      },
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                        child: Icon(Icons.file_upload_outlined, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Action Button -> Navigates to Review Bulk Posting (Screen 20)
              AppPrimaryButton(
                text: 'Continue →',
                onPressed: () => context.push(AppRoutes.userReviewBulkPostingScreen),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
