import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../../services/user_service.dart';
import '../../services/driver_service.dart';

class TripRatingBottomSheet extends StatefulWidget {
  final String tripId;
  final String targetName;
  final String? vehicleInfo;
  final bool isReviewingDriver;
  final bool isMandatory;
  final VoidCallback? onReviewSubmitted;

  const TripRatingBottomSheet({
    super.key,
    required this.tripId,
    required this.targetName,
    this.vehicleInfo,
    this.isReviewingDriver = true,
    this.isMandatory = true,
    this.onReviewSubmitted,
  });

  static Future<void> show({
    required BuildContext context,
    required String tripId,
    required String targetName,
    String? vehicleInfo,
    bool isReviewingDriver = true,
    bool isMandatory = true,
    VoidCallback? onReviewSubmitted,
  }) {
    return showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      isDismissible: !isMandatory,
      enableDrag: !isMandatory,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PopScope(
        canPop: !isMandatory,
        child: TripRatingBottomSheet(
          tripId: tripId,
          targetName: targetName,
          vehicleInfo: vehicleInfo,
          isReviewingDriver: isReviewingDriver,
          isMandatory: isMandatory,
          onReviewSubmitted: onReviewSubmitted,
        ),
      ),
    );
  }

  @override
  State<TripRatingBottomSheet> createState() => _TripRatingBottomSheetState();
}

class _TripRatingBottomSheetState extends State<TripRatingBottomSheet> {
  int _rating = 5;
  final TextEditingController _feedbackController = TextEditingController();
  final Set<String> _selectedTags = {};
  bool _isSubmitting = false;
  String? _errorMessage;

  List<String> get _availableTags => widget.isReviewingDriver
      ? [
          'Clean Vehicle',
          'Punctual',
          'Safe Driving',
          'Polite & Courteous',
          'Smooth Route',
          'Highly Professional',
        ]
      : [
          'Prompt at Pickup',
          'Polite & Respectful',
          'Easy Navigation',
          'Great Passenger',
          'Clear Communication',
        ];

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_rating < 1 || _rating > 5) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final comments = [
      if (_selectedTags.isNotEmpty) 'Tags: ${_selectedTags.join(", ")}',
      if (_feedbackController.text.trim().isNotEmpty) _feedbackController.text.trim(),
    ].join('\n');

    try {
      if (widget.isReviewingDriver) {
        await UserService.instance.submitReview(
          tripId: widget.tripId,
          rating: _rating,
          feedback: comments.isNotEmpty ? comments : null,
        );
      } else {
        await DriverService.instance.submitReview(
          tripId: widget.tripId,
          rating: _rating,
          feedback: comments.isNotEmpty ? comments : null,
        );
      }

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Thank you! Your feedback has been submitted.'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
        widget.onReviewSubmitted?.call();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  String _getRatingLabel(int stars) {
    switch (stars) {
      case 5:
        return 'Outstanding Experience! ⭐⭐⭐⭐⭐';
      case 4:
        return 'Very Good! ⭐⭐⭐⭐';
      case 3:
        return 'Average / Satisfactory ⭐⭐⭐';
      case 2:
        return 'Needs Improvement ⭐⭐';
      case 1:
        return 'Poor Experience ⭐';
      default:
        return 'Rate Experience';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: AppSpacing.lg + bottomInset,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(50),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate700 : AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header Icon & Title
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.starAmber.withAlpha(30),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.star_rounded, size: 36, color: AppColors.starAmber),
            ),
            const SizedBox(height: 12),
            Text(
              widget.isReviewingDriver ? 'Rate Your Driver' : 'Rate Passenger',
              style: AppTypography.h2(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.isReviewingDriver
                  ? 'How was your journey with ${widget.targetName}?'
                  : 'How was your trip with ${widget.targetName}?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
            if (widget.vehicleInfo != null && widget.vehicleInfo!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.slate800 : AppColors.slate100,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text(
                  widget.vehicleInfo!,
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : AppColors.slate600, fontWeight: FontWeight.w600),
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.lg),

            // Interactive Star Rating Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final starIndex = index + 1;
                final isSelected = starIndex <= _rating;
                return GestureDetector(
                  onTap: () => setState(() => _rating = starIndex),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6.0),
                    child: AnimatedScale(
                      scale: isSelected ? 1.15 : 1.0,
                      duration: const Duration(milliseconds: 180),
                      child: Icon(
                        isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
                        size: 40,
                        color: isSelected ? AppColors.starAmber : (isDark ? AppColors.slate600 : AppColors.slate300),
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 8),
            Text(
              _getRatingLabel(_rating),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.starAmber,
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Quick Tag Compliments
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'What went well?',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.slate700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableTags.map((tag) {
                final isSelected = _selectedTags.contains(tag);
                return FilterChip(
                  label: Text(tag),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedTags.add(tag);
                      } else {
                        _selectedTags.remove(tag);
                      }
                    });
                  },
                  backgroundColor: isDark ? AppColors.slate800 : AppColors.slate100,
                  selectedColor: AppColors.primary.withAlpha(40),
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primary : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : (isDark ? AppColors.slate700 : AppColors.slate300),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.md),

            // Feedback Text Field
            TextField(
              controller: _feedbackController,
              maxLines: 3,
              style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              decoration: InputDecoration(
                hintText: 'Share any additional details about the trip (optional)...',
                hintStyle: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                filled: true,
                fillColor: isDark ? AppColors.slate800 : AppColors.slate50,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.error.withAlpha(20),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 16, color: AppColors.error),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.lg),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Submit Feedback ⭐',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            if (!widget.isMandatory)
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(
                  'Skip for now',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  '🔒 Mandatory feedback required before booking new rides',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
