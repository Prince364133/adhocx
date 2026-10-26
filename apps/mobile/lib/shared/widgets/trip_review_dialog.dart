import 'package:flutter/material.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../core/utils/app_toast.dart';

class TripReviewDialog extends StatefulWidget {
  final String tripId;
  final String targetName;
  final bool isReviewingDriver;

  const TripReviewDialog({
    super.key,
    required this.tripId,
    required this.targetName,
    this.isReviewingDriver = true,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String tripId,
    required String targetName,
    bool isReviewingDriver = true,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TripReviewDialog(
        tripId: tripId,
        targetName: targetName,
        isReviewingDriver: isReviewingDriver,
      ),
    );
  }

  @override
  State<TripReviewDialog> createState() => _TripReviewDialogState();
}

class _TripReviewDialogState extends State<TripReviewDialog> {
  int _selectedRating = 5;
  final TextEditingController _feedbackController = TextEditingController();
  final Set<String> _selectedTags = {};
  bool _submitting = false;

  final List<String> _driverTags = [
    'On-time Pickup',
    'Polite Behavior',
    'Clean Vehicle',
    'Smooth Driving',
    'Route Knowledge',
  ];

  final List<String> _userTags = [
    'Clear Instructions',
    'Prompt Boarding',
    'Respectful Passenger',
    'Quick Payment',
  ];

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final combinedFeedback = [
        if (_selectedTags.isNotEmpty) '[${_selectedTags.join(', ')}]',
        if (_feedbackController.text.trim().isNotEmpty) _feedbackController.text.trim(),
      ].join(' ');

      await UserService.instance.submitReview(
        tripId: widget.tripId,
        rating: _selectedRating,
        feedback: combinedFeedback.isNotEmpty ? combinedFeedback : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Thank you for your rating & feedback!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        AppToast.showError(e, context: context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final availableTags = widget.isReviewingDriver ? _driverTags : _userTags;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.md,
        bottom: AppSpacing.xl + bottomInset,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.starAmber.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star_rounded, color: AppColors.starAmber, size: 36),
              ),
              const SizedBox(height: AppSpacing.sm),

              Text(
                'Rate Experience',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.targetName,
                style: AppTypography.body(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Interactive Stars
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final starNum = index + 1;
                  return IconButton(
                    onPressed: () => setState(() => _selectedRating = starNum),
                    icon: Icon(
                      starNum <= _selectedRating ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: starNum <= _selectedRating ? AppColors.starAmber : AppColors.slate400,
                      size: 36,
                    ),
                  );
                }),
              ),
              const SizedBox(height: AppSpacing.md),

              // Tags
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: availableTags.map((tag) {
                  final isSelected = _selectedTags.contains(tag);
                  return FilterChip(
                    label: Text(tag, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withValues(alpha: 0.2),
                    checkmarkColor: AppColors.primary,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedTags.add(tag);
                        } else {
                          _selectedTags.remove(tag);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.md),

              // Feedback Note
              TextField(
                controller: _feedbackController,
                maxLines: 3,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Share more details about this trip...',
                  filled: true,
                  fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              AppPrimaryButton(
                text: _submitting ? 'Submitting...' : 'Submit Rating',
                onPressed: _submitting ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
