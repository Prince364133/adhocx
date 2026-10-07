import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'services/bulk_posting_service.dart';

class UserBulkPostingScreen extends StatefulWidget {
  const UserBulkPostingScreen({super.key});

  @override
  State<UserBulkPostingScreen> createState() => _UserBulkPostingScreenState();
}

class _UserBulkPostingScreenState extends State<UserBulkPostingScreen> {
  bool _isDownloadingTemplate = false;
  bool _isUploadingFile = false;
  BulkParseResult? _parseResult;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Restore previous parsed result if user came back from review screen
    _parseResult = BulkPostingService.instance.lastResult;
  }

  Future<void> _handleDownloadTemplate({bool asExcel = true}) async {
    setState(() => _isDownloadingTemplate = true);
    try {
      await BulkPostingService.instance.downloadTemplate(asExcel: asExcel);
      if (mounted) {
        final formatName = asExcel ? 'Excel (.xlsx)' : 'CSV (.csv)';
        Fluttertoast.showToast(
          msg: 'Downloaded $formatName template successfully!',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Download failed: ${e.toString().replaceAll('Exception: ', '')}',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloadingTemplate = false);
    }
  }

  Future<void> _handleUploadFile() async {
    setState(() {
      _isUploadingFile = true;
      _errorMessage = null;
    });

    try {
      final result = await BulkPostingService.instance.pickAndParseFile();
      if (result != null && mounted) {
        setState(() {
          _parseResult = result;
        });

        if (result.hasValidItems) {
          Fluttertoast.showToast(
            msg: 'Parsed ${result.validItems.length} requirements from ${result.fileName}',
            backgroundColor: AppColors.success,
            textColor: Colors.white,
          );
        } else {
          setState(() {
            _errorMessage = result.warnings.isNotEmpty
                ? result.warnings.first
                : 'No valid requirements found in the uploaded file.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        final cleanMsg = e.toString().replaceAll('Exception: ', '');
        setState(() => _errorMessage = cleanMsg);
        Fluttertoast.showToast(
          msg: 'Upload error: $cleanMsg',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingFile = false);
    }
  }

  void _clearUploadedFile() {
    setState(() {
      _parseResult = null;
      _errorMessage = null;
      BulkPostingService.instance.lastResult = null;
    });
  }

  void _continueToReview() {
    if (_parseResult == null || !_parseResult!.hasValidItems) {
      Fluttertoast.showToast(
        msg: 'Please upload a valid Excel or CSV file with requirements first.',
        backgroundColor: AppColors.warning,
        textColor: Colors.white,
      );
      return;
    }

    context.push(
      AppRoutes.userReviewBulkPostingScreen,
      extra: _parseResult!.validItems,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final validItemsCount = _parseResult?.validItems.length ?? 0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
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
              // Info Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.table_view_rounded,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Upload Fleet Spreadsheet',
                            style: AppTypography.body(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Schedule multiple corporate trips, shifts, or events at once using Excel (.xlsx) or CSV.',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Step 1: Download Template Card
              Text(
                'Step 1: Download Template',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Download Pre-formatted Template',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Includes verified headers and 4 sample rows for Sedans, SUVs, and Tempo Travellers.',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: ElevatedButton.icon(
                            onPressed: _isDownloadingTemplate ? null : () => _handleDownloadTemplate(asExcel: true),
                            icon: _isDownloadingTemplate
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.download, size: 18),
                            label: const Text(
                              'Download Excel (.xlsx)',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          flex: 2,
                          child: OutlinedButton.icon(
                            onPressed: _isDownloadingTemplate ? null : () => _handleDownloadTemplate(asExcel: false),
                            icon: const Icon(Icons.description_outlined, size: 16),
                            label: const Text(
                              'CSV (.csv)',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              side: BorderSide(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Step 2: Upload File Card
              Text(
                'Step 2: Upload Filled File',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              GestureDetector(
                onTap: _isUploadingFile ? null : _handleUploadFile,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: _parseResult != null
                        ? AppColors.success.withValues(alpha: isDark ? 0.12 : 0.05)
                        : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(
                      color: _parseResult != null
                          ? AppColors.success
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                      width: _parseResult != null ? 1.5 : 1,
                    ),
                  ),
                  child: _isUploadingFile
                      ? Column(
                          children: [
                            const CircularProgressIndicator(color: AppColors.primary),
                            const SizedBox(height: 12),
                            Text(
                              'Reading and parsing spreadsheet...',
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                            ),
                          ],
                        )
                      : _parseResult != null
                          ? Column(
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.success.withValues(alpha: 0.15),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.check_circle, color: AppColors.success, size: 28),
                                    ),
                                    const SizedBox(width: AppSpacing.md),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _parseResult!.fileName,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${(_parseResult!.fileSizeBytes / 1024).toStringAsFixed(1)} KB • ${_parseResult!.validItems.length} requirements ready',
                                            style: AppTypography.caption(
                                              color: AppColors.success,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      onPressed: _clearUploadedFile,
                                      icon: const Icon(Icons.close, color: AppColors.error),
                                      tooltip: 'Remove file',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${_parseResult!.totalVehicles} Vehicles across ${_parseResult!.vehicleTypes.length} vehicle types',
                                      style: AppTypography.caption(
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                    TextButton.icon(
                                      onPressed: _handleUploadFile,
                                      icon: const Icon(Icons.refresh, size: 14),
                                      label: const Text('Change file', style: TextStyle(fontSize: 12)),
                                    ),
                                  ],
                                ),
                              ],
                            )
                          : Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.file_upload_outlined,
                                    size: 36,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Click to Upload Excel / CSV',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Supports .xlsx, .xls, and .csv files',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                ),
              ),

              // Error or Warnings Banner
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.error, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Parsed Items Preview
              if (_parseResult != null && _parseResult!.hasValidItems) ...[
                const SizedBox(height: AppSpacing.lg),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Preview (${_parseResult!.validItems.length} Requirements)',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Est. ₹ ${_parseResult!.totalEstimatedCost.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _parseResult!.validItems.length > 3 ? 3 : _parseResult!.validItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = _parseResult!.validItems[index];
                    return Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Icon(
                              item.vehicleType == 'TEMPO_TRAVELLER'
                                  ? Icons.airport_shuttle
                                  : item.vehicleType == 'SUV'
                                      ? Icons.directions_car_filled
                                      : Icons.directions_car,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${item.quantity} × ${item.vehicleTypeDisplay} • ${item.formattedDateTime}',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '₹ ${item.totalCost.toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                if (_parseResult!.validItems.length > 3) ...[
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      '+ ${_parseResult!.validItems.length - 3} more requirements in file',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ),
                ],
              ],

              const SizedBox(height: AppSpacing.xl),

              // Action Button -> Navigates to Review Bulk Posting
              AppPrimaryButton(
                text: validItemsCount > 0
                    ? 'Continue to Review ($validItemsCount) →'
                    : 'Upload File to Continue →',
                onPressed: validItemsCount > 0 ? _continueToReview : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
