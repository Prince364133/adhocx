import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 12: Post-Trip Feedback
class PostTripFeedbackScreen extends StatefulWidget {
  const PostTripFeedbackScreen({super.key});

  @override
  State<PostTripFeedbackScreen> createState() => _PostTripFeedbackScreenState();
}

class _PostTripFeedbackScreenState extends State<PostTripFeedbackScreen> {
  static const _maxLength = 200;

  Map<String, dynamic>? _feedbackData;
  bool _isLoading = true;
  int _selectedRating = 5;
  final TextEditingController _feedbackController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Keeps the "n/200" counter in sync while typing (it never updated before).
    _feedbackController.addListener(() => setState(() {}));
    _loadData();
  }

  Future<void> _loadData() async {
    final data = await loadBoardingSection('feedback');
    if (mounted) {
      setState(() {
        _feedbackData = data;
        _selectedRating = data?['defaultRating'] ?? 5;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  void _finish({required bool submitted}) {
    if (submitted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thank you! Your feedback has been recorded.')),
      );
    }
    context.go(AppRoutes.homeUpcomingPickup);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
    }
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.md),
              const PostTripFinishGraphic(),
              const SizedBox(height: AppSpacing.xl),
              Text(
                _feedbackData?['title'] ?? 'Trip Completed',
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.xs + 2),
              Text(
                _feedbackData?['subtitle'] ?? 'How was your trip?',
                style: AppTypography.bodyLarge(
                  color: p.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // 5-star rating
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
                onPressed: () => _finish(submitted: true),
              ),
              const SizedBox(height: AppSpacing.md),
              EmployeeTextLink(
                label: 'Maybe Later',
                emphasised: false,
                onPressed: () => _finish(submitted: false),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
