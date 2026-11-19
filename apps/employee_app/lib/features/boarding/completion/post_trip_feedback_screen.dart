import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Post-Trip Feedback wired to POST /corporate/me/trips/:stopId/feedback.
class PostTripFeedbackScreen extends StatefulWidget {
  const PostTripFeedbackScreen({super.key});

  @override
  State<PostTripFeedbackScreen> createState() => _PostTripFeedbackScreenState();
}

class _PostTripFeedbackScreenState extends State<PostTripFeedbackScreen> {
  static const _maxLength = 200;

  int _selectedRating = 5;
  bool _submitting = false;
  final TextEditingController _feedbackController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _feedbackController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<String?> _resolveStopId() async {
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map && extra['stopId'] != null) {
        return extra['stopId'].toString();
      }
      if (extra is String && extra.isNotEmpty) return extra;
    } catch (_) {}
    final latest = await loadLiveLatestTrip(context);
    return latest['stopId']?.toString();
  }

  Future<void> _submitFeedback() async {
    setState(() => _submitting = true);
    final data = maybeEmployeeData(context);
    final stopId = await _resolveStopId();
    final comment = _feedbackController.text.trim();

    try {
      if (data != null && stopId != null && stopId.isNotEmpty) {
        await data.repository.submitFeedback(
          stopId,
          rating: _selectedRating,
          feltSafe: _selectedRating >= 3,
          comment: comment.isNotEmpty ? comment : null,
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Thank you! Your feedback has been recorded.'),
          backgroundColor: AppColors.success,
        ),
      );
      context.go(AppRoutes.homeUpcomingPickup);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst('Exception: ', ''),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.md),
              const PostTripFinishGraphic(),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Trip Completed',
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.xs + 2),
              Text(
                'How was your trip?',
                style: AppTypography.bodyLarge(
                  color: p.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final star = index + 1;
                  final isFilled = star <= _selectedRating;
                  return IconButton(
                    iconSize: 38,
                    tooltip: 'Rate $star ${star == 1 ? 'star' : 'stars'}',
                    isSelected: star == _selectedRating,
                    icon: Icon(
                      isFilled ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppColors.starAmber,
                    ),
                    onPressed: () => setState(() => _selectedRating = star),
                  );
                }),
              ),
              const SizedBox(height: AppSpacing.xxl),
              AppCard(
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    TextField(
                      controller: _feedbackController,
                      maxLines: 4,
                      maxLength: _maxLength,
                      textCapitalization: TextCapitalization.sentences,
                      style: AppTypography.body(color: p.textPrimary),
                      cursorColor: p.accent,
                      decoration: InputDecoration(
                        hintText: 'Share your feedback (optional)',
                        hintStyle: AppTypography.body(color: p.textMuted),
                        filled: false,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        counterText: '',
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    Text(
                      '${_feedbackController.text.length}/$_maxLength',
                      style: AppTypography.micro(color: p.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl + AppSpacing.sm),
              EmployeePrimaryButton(
                label: 'Submit Feedback',
                isLoading: _submitting,
                onPressed: _submitting ? null : _submitFeedback,
              ),
              const SizedBox(height: AppSpacing.md),
              EmployeeTextLink(
                label: 'Maybe Later',
                emphasised: false,
                onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
