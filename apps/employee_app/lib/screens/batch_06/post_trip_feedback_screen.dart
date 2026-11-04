import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_06_illustrations.dart';
import '../../widgets/employee_primary_button.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 12: Post-Trip Feedback
class PostTripFeedbackScreen extends StatefulWidget {
  const PostTripFeedbackScreen({super.key});

  @override
  State<PostTripFeedbackScreen> createState() => _PostTripFeedbackScreenState();
}

class _PostTripFeedbackScreenState extends State<PostTripFeedbackScreen> {
  Map<String, dynamic>? _feedbackData;
  bool _isLoading = true;
  int _selectedRating = 5;
  final TextEditingController _feedbackController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final boarding = await MockDataService.getBoardingData();
    if (mounted) {
      setState(() {
        _feedbackData = boarding['feedback'] as Map<String, dynamic>?;
        _selectedRating = _feedbackData?['defaultRating'] ?? 5;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final title = _feedbackData?['title'] ?? 'Trip Completed';
    final subtitle = _feedbackData?['subtitle'] ?? 'How was your trip?';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const PostTripFinishGraphic(),
                    const SizedBox(height: 20),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 5-Star Rating Selector
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final starIndex = index + 1;
                        final isFilled = starIndex <= _selectedRating;
                        return IconButton(
                          iconSize: 38,
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          icon: Icon(
                            isFilled ? Icons.star_rounded : Icons.star_border_rounded,
                            color: const Color(0xFFF59E0B),
                          ),
                          onPressed: () {
                            setState(() => _selectedRating = starIndex);
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 24),

                    // Feedback Text Field
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          TextField(
                            controller: _feedbackController,
                            maxLines: 4,
                            maxLength: 200,
                            decoration: const InputDecoration(
                              hintText: 'Share your feedback (optional)',
                              border: InputBorder.none,
                              counterText: '',
                            ),
                            style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                          ),
                          Text(
                            '${_feedbackController.text.length}/200',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Primary Button: Submit Feedback
                    EmployeePrimaryButton(
                      label: 'Submit Feedback',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Thank you! Your feedback has been recorded.')),
                        );
                        context.go(AppRoutes.homeUpcomingPickup);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Text Button: Maybe Later
                    TextButton(
                      onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
                      child: Text(
                        'Maybe Later',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
