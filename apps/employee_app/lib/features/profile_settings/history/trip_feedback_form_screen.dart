import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

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
  // Starts empty: pre-selected answers biased the feedback.
  final Set<String> _selectedTags = {};
  final TextEditingController _feedback = TextEditingController();

  @override
  void initState() {
    super.initState();
    _feedback.addListener(() => setState(() {})); // live counter
  }

  @override
  void dispose() {
    _feedback.dispose();
    super.dispose();
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
            horizontal: AppSpacing.xxl,
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
                      onSelected: (on) => setState(() =>
                          on ? _selectedTags.add(tag) : _selectedTags.remove(tag)),
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
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Thank you! Feedback recorded.')),
                  );
                  Navigator.of(context).maybePop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
