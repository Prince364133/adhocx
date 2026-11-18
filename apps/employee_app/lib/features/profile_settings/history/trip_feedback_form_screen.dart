import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trip Feedback Form wired to POST /corporate/me/trips/:stopId/feedback.
class TripFeedbackFormScreen extends StatefulWidget {
  const TripFeedbackFormScreen({super.key});

  @override
  State<TripFeedbackFormScreen> createState() => _TripFeedbackFormScreenState();
}

class _TripFeedbackFormScreenState extends State<TripFeedbackFormScreen> {
  static const _maxLength = 200;
  static const _tags = [
    'Safe Drive',
    'On Time',
    'Clean Cab',
    'Polite Driver',
    'Comfortable',
    'Other',
  ];

  int _rating = 5;
  bool _submitting = false;
  final Set<String> _selectedTags = {};
  final TextEditingController _feedback = TextEditingController();

  @override
  void initState() {
    super.initState();
    _feedback.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _feedback.dispose();
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

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final data = maybeEmployeeData(context);
    final stopId = await _resolveStopId();
    final comment = _feedback.text.trim();

    try {
      if (data != null && stopId != null && stopId.isNotEmpty) {
        await data.repository.submitFeedback(
          stopId,
          rating: _rating,
          feltSafe: _rating >= 3,
          tags: _selectedTags.toList(),
          comment: comment.isNotEmpty ? comment : null,
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Thank you! Feedback recorded.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).maybePop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
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
      appBar: const EmployeeAppBar(title: 'Trip Feedback'),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(child: PostTripFinishGraphic()),
              const SizedBox(height: AppSpacing.xl),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final star = index + 1;
                  return IconButton(
                    iconSize: 36,
                    tooltip: 'Rate $star ${star == 1 ? 'star' : 'stars'}',
                    isSelected: star == _rating,
                    icon: Icon(
                      star <= _rating
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: AppColors.starAmber,
                    ),
                    onPressed: () => setState(() => _rating = star),
                  );
                }),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'How was your last trip?',
                textAlign: TextAlign.center,
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                alignment: WrapAlignment.center,
                children: [
                  for (final tag in _tags)
                    FilterChip(
                      label: Text(tag),
                      selected: _selectedTags.contains(tag),
                      onSelected: (on) => setState(() => on
                          ? _selectedTags.add(tag)
                          : _selectedTags.remove(tag)),
                      selectedColor: p.accentTint,
                      checkmarkColor: p.accent,
                      labelStyle: AppTypography.small(
                        color: _selectedTags.contains(tag)
                            ? p.accent
                            : p.textPrimary,
                        fontWeight: _selectedTags.contains(tag)
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxl),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    TextField(
                      controller: _feedback,
                      maxLines: 4,
                      maxLength: _maxLength,
                      textCapitalization: TextCapitalization.sentences,
                      style: AppTypography.body(color: p.textPrimary),
                      cursorColor: p.accent,
                      decoration: InputDecoration(
                        hintText: 'Write your feedback (optional)...',
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
                      '${_feedback.text.length}/$_maxLength',
                      style: AppTypography.micro(color: p.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl + 4),
              EmployeePrimaryButton(
                label: 'Submit Feedback',
                isLoading: _submitting,
                onPressed: _submitting ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
