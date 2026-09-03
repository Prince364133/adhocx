import 'package:flutter/material.dart';
import '../../services/vendor_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class TripDisputeDialog extends StatefulWidget {
  final String tripId;

  const TripDisputeDialog({
    super.key,
    required this.tripId,
  });

  static Future<bool?> show(BuildContext context, {required String tripId}) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => TripDisputeDialog(tripId: tripId),
    );
  }

  @override
  State<TripDisputeDialog> createState() => _TripDisputeDialogState();
}

class _TripDisputeDialogState extends State<TripDisputeDialog> {
  String _selectedReason = 'Route Deviation & Delay';
  final TextEditingController _descController = TextEditingController();
  bool _submitting = false;

  final List<String> _reasons = [
    'Route Deviation & Delay',
    'Unpaid Toll / Parking Disagreement',
    'Vehicle Condition / Cleanliness',
    'Driver / Customer Conduct',
    'Billing Discrepancy',
    'Other Issue',
  ];

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final description = _descController.text.trim();
    if (description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe the issue in detail')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await VendorService.instance.fileDispute(
        tripId: widget.tripId,
        reason: _selectedReason,
        description: description,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Dispute ticket filed. AdhocX operations is investigating.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(Icons.report_problem_rounded, color: Color(0xFFEF4444), size: 24),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'File Trip Dispute',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'AdhocX Customer Care Escalation',
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

              Text(
                'Reason Category *',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isDark ? Colors.white : Colors.black),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedReason,
                items: _reasons
                    .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13))))
                    .toList(),
                onChanged: (val) => setState(() => _selectedReason = val!),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              Text(
                'Explain what happened *',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isDark ? Colors.white : Colors.black),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _descController,
                maxLines: 4,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Provide specific facts, toll amounts, or timeline discrepancies...',
                  filled: true,
                  fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    flex: 2,
                    child: AppPrimaryButton(
                      text: _submitting ? 'Filing...' : 'Submit Dispute',
                      onPressed: _submitting ? null : _submit,
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
}
