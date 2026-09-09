import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import 'app_primary_button.dart';

class AppCancellationDialog extends StatefulWidget {
  final String title;
  final List<String> reasons;
  final Function(String reason, String? notes) onCancelConfirmed;

  const AppCancellationDialog({
    super.key,
    this.title = 'Cancel Trip / Assignment',
    this.reasons = const [
      'Driver not responding',
      'Taking too long to arrive',
      'Vehicle details mismatch',
      'Price dispute',
      'Other',
    ],
    required this.onCancelConfirmed,
  });

  static Future<void> show(
    BuildContext context, {
    String title = 'Cancel Trip / Assignment',
    List<String> reasons = const [
      'Driver not responding',
      'Taking too long to arrive',
      'Vehicle details mismatch',
      'Price dispute',
      'Other',
    ],
    required Function(String reason, String? notes) onCancelConfirmed,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AppCancellationDialog(
        title: title,
        reasons: reasons,
        onCancelConfirmed: onCancelConfirmed,
      ),
    );
  }

  @override
  State<AppCancellationDialog> createState() => _AppCancellationDialogState();
}

class _AppCancellationDialogState extends State<AppCancellationDialog> {
  String? _selectedReason;
  final TextEditingController _notesController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.slate400, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              widget.title,
              style: AppTypography.h3(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Please select a reason for cancellation:',
              style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            ),
            const SizedBox(height: AppSpacing.md),
            Column(
              children: widget.reasons.map((r) {
                return RadioListTile<String>(
                  title: Text(r, style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                  value: r,
                  groupValue: _selectedReason,
                  onChanged: (val) => setState(() => _selectedReason = val),
                  activeColor: AppColors.error,
                  contentPadding: EdgeInsets.zero,
                );
              }).toList(),
            ),
            if (_selectedReason == 'Other') ...[
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Describe reason...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AppPrimaryButton(
              text: 'Confirm Cancellation',
              onPressed: _selectedReason == null
                  ? null
                  : () {
                      Navigator.of(context).pop();
                      widget.onCancelConfirmed(_selectedReason!, _notesController.text);
                    },
            ),
          ],
        ),
      ),
    );
  }
}
