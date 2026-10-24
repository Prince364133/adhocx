import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'models/bulk_requirement_item.dart';
import 'services/bulk_posting_service.dart';
import '../../core/utils/app_toast.dart';

class UserReviewBulkPostingScreen extends StatefulWidget {
  final List<BulkRequirementItem>? initialRequirements;

  const UserReviewBulkPostingScreen({
    super.key,
    this.initialRequirements,
  });

  @override
  State<UserReviewBulkPostingScreen> createState() => _UserReviewBulkPostingScreenState();
}

class _UserReviewBulkPostingScreenState extends State<UserReviewBulkPostingScreen> {
  late List<BulkRequirementItem> _requirements;
  bool _isPosting = false;
  int _postingCurrent = 0;
  int _postingTotal = 0;

  @override
  void initState() {
    super.initState();
    _requirements = List<BulkRequirementItem>.from(
      widget.initialRequirements ??
          BulkPostingService.instance.lastResult?.validItems ??
          [],
    );
  }

  int get _totalVehicles => _requirements.fold(0, (sum, i) => sum + i.quantity);

  double get _totalEstimatedCost =>
      _requirements.fold(0.0, (sum, i) => sum + i.totalCost);

  String get _vehicleTypesFormatted {
    if (_requirements.isEmpty) return 'None';
    final set = _requirements.map((i) => i.vehicleTypeDisplay).toSet();
    return set.join(', ');
  }

  String get _dateRangeFormatted {
    if (_requirements.isEmpty) return 'No dates';
    final sorted = List<BulkRequirementItem>.from(_requirements)
      ..sort((a, b) => a.reportingTime.compareTo(b.reportingTime));
    final first = sorted.first.reportingTime;
    final last = sorted.last.reportingTime;

    final fStr = '${first.day} ${_monthName(first.month)} ${first.year}';
    final lStr = '${last.day} ${_monthName(last.month)} ${last.year}';
    if (fStr == lStr) return fStr;
    return '$fStr - $lStr';
  }

  String _monthName(int month) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return month >= 1 && month <= 12 ? months[month] : '';
  }

  String _formatINR(double amount) {
    final str = amount.toStringAsFixed(2);
    final parts = str.split('.');
    final whole = parts[0];
    final dec = parts[1];

    if (whole.length <= 3) return '₹ $whole.$dec';

    final lastThree = whole.substring(whole.length - 3);
    final rest = whole.substring(0, whole.length - 3);

    final buffer = StringBuffer();
    for (int i = 0; i < rest.length; i++) {
      if (i > 0 && (rest.length - i) % 2 == 0) {
        buffer.write(',');
      }
      buffer.write(rest[i]);
    }
    return '₹ ${buffer.toString()},$lastThree.$dec';
  }

  void _removeItem(int index) {
    final removed = _requirements[index];
    setState(() {
      _requirements.removeAt(index);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Removed "${removed.title}" from bulk post.'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            setState(() {
              _requirements.insert(index, removed);
            });
          },
        ),
      ),
    );
  }

  Future<void> _handlePostAllRequirements() async {
    if (_requirements.isEmpty) {
      Fluttertoast.showToast(
        msg: 'No requirements to post.',
        backgroundColor: AppColors.warning,
      );
      return;
    }

    setState(() {
      _isPosting = true;
      _postingCurrent = 0;
      _postingTotal = _requirements.length;
    });

    try {
      final result = await BulkPostingService.instance.postBulkRequirements(
        _requirements,
        onProgress: (cur, tot) {
          if (mounted) {
            setState(() {
              _postingCurrent = cur;
              _postingTotal = tot;
            });
          }
        },
      );

      if (!mounted) return;

      if (result.isFullSuccess) {
        Fluttertoast.showToast(
          msg: 'All ${result.successCount} requirements posted successfully!',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );

        BulkPostingService.instance.lastResult = null;

        // Navigate to confirmation screen
        context.push(
          AppRoutes.userRequirementPostedConfirmationScreen,
          extra: {
            'id': result.createdRequirementIds.isNotEmpty
                ? result.createdRequirementIds.first
                : 'BULK-${DateTime.now().millisecondsSinceEpoch}',
            'title': 'Bulk Corporate Fleet Posting (${result.successCount} Trips)',
            'quantity': _totalVehicles,
            'vehicleType': _requirements.first.vehicleType,
            'ratePerVehicle': _requirements.first.ratePerVehicle,
            'totalAmount': _totalEstimatedCost,
            'isBulk': true,
            'bulkCount': result.successCount,
          },
        );
      } else if (result.isPartialSuccess) {
        // Some posted, some failed
        _showPartialSuccessDialog(result);
      } else {
        // All failed
        _showFailureDialog(result.errors);
      }
    } catch (e) {
      if (mounted) {
        final cleanMsg = AppToast.cleanErrorMessage(e);
        _showFailureDialog([cleanMsg]);
      }
    } finally {
      if (mounted) {
        setState(() => _isPosting = false);
      }
    }
  }

  void _showPartialSuccessDialog(BulkPostResult result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.warning),
            SizedBox(width: 8),
            Text('Partial Bulk Post Result'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${result.successCount} of ${_requirements.length} requirements posted successfully.',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text('${result.failedCount} failed to post due to wallet or data issues:'),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 160),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: result.errors
                      .map((err) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2.0),
                            child: Text(
                              '• $err',
                              style: const TextStyle(color: AppColors.error, fontSize: 11),
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go(AppRoutes.userRequirementsScreen);
            },
            child: const Text('View Active Requirements'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showFailureDialog(List<String> errors) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.error_outline, color: AppColors.error),
            SizedBox(width: 8),
            Text('Posting Failed'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'The requirements could not be posted. Please review the details below:',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 180),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: errors
                      .map((err) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2.0),
                            child: Text(
                              '• $err',
                              style: const TextStyle(color: AppColors.error, fontSize: 12),
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Tip: Check if your AdhocX Wallet balance is sufficient for this bulk batch.',
              style: TextStyle(fontSize: 11, color: AppColors.slate400),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Dismiss'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_requirements.isEmpty) {
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
            'Review Bulk Posting',
            style: AppTypography.h3(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.folder_open_outlined,
                  size: 64,
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'No Requirements to Review',
                  style: AppTypography.h3(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Upload an Excel or CSV file first to review your requirements manifest.',
                  textAlign: TextAlign.center,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                ElevatedButton.icon(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.upload_file),
                  label: const Text('Upload File'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

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
          'Review Bulk Posting',
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
              // Dynamic Ready Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppColors.success, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_requirements.length} Requirements Ready',
                            style: const TextStyle(
                              color: AppColors.success,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            '$_totalVehicles total vehicles ready to be posted',
                            style: AppTypography.caption(color: AppColors.success),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Dynamic Summary Breakdown Box
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
                  children: [
                    _buildSummaryLine(
                      context,
                      'Total Requirements',
                      '${_requirements.length}',
                      isDark,
                    ),
                    const Divider(),
                    _buildSummaryLine(
                      context,
                      'Total Vehicles',
                      '$_totalVehicles',
                      isDark,
                    ),
                    const Divider(),
                    _buildSummaryLine(
                      context,
                      'Vehicle Types',
                      _vehicleTypesFormatted,
                      isDark,
                    ),
                    const Divider(),
                    _buildSummaryLine(
                      context,
                      'Date Range',
                      _dateRangeFormatted,
                      isDark,
                    ),
                    const Divider(),
                    _buildSummaryLine(
                      context,
                      'Total Estimated Cost',
                      _formatINR(_totalEstimatedCost),
                      isDark,
                      isHighlight: true,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Requirements Preview Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Requirements Manifest (${_requirements.length})',
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Swipe / tap trash to remove',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.sm),

              // Dynamic Preview Items List
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _requirements.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) {
                  final item = _requirements[index];
                  return Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title + Index + Remove Action
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                '#${index + 1}',
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
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
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${item.quantity} Vehicles • ${item.vehicleTypeDisplay}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => _removeItem(index),
                              icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                              visualDensity: VisualDensity.compact,
                              tooltip: 'Remove requirement',
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),
                        const Divider(height: 1),
                        const SizedBox(height: 8),

                        // Route Details (Pickup -> Drop)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.trip_origin, size: 14, color: AppColors.success),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                item.pickupAddress,
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.location_on, size: 14, color: AppColors.error),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                item.dropAddress,
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Time, Mode, Cost summary row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.schedule, size: 13, color: AppColors.slate400),
                                const SizedBox(width: 4),
                                Text(
                                  item.formattedDateTime,
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: (item.fulfillmentMode == 'BIDDING'
                                        ? AppColors.warning
                                        : AppColors.primary)
                                    .withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                item.fulfillmentMode == 'BIDDING' ? 'BIDDING' : 'DIRECT DISPATCH',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: item.fulfillmentMode == 'BIDDING'
                                      ? AppColors.warning
                                      : AppColors.primary,
                                ),
                              ),
                            ),
                            Text(
                              _formatINR(item.totalCost),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),

              const SizedBox(height: AppSpacing.xl),

              // Action Buttons (Back + Post All Requirements)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isPosting ? null : () => context.pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                      ),
                      child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    flex: 2,
                    child: AppPrimaryButton(
                      text: _isPosting
                          ? 'Posting ($_postingCurrent/$_postingTotal)...'
                          : 'Post All Requirements (${_requirements.length})',
                      onPressed: _isPosting ? null : _handlePostAllRequirements,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryLine(
    BuildContext context,
    String label,
    String value,
    bool isDark, {
    bool isHighlight = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: isHighlight ? 15 : 12,
                fontWeight: FontWeight.bold,
                color: isHighlight
                    ? AppColors.primary
                    : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
