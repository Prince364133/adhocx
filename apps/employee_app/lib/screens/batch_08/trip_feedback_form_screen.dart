import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_06_illustrations.dart';
import '../../widgets/employee_primary_button.dart';

/// Screen 4: Trip Feedback
class TripFeedbackFormScreen extends StatefulWidget {
  const TripFeedbackFormScreen({super.key});

  @override
  State<TripFeedbackFormScreen> createState() => _TripFeedbackFormScreenState();
}

class _TripFeedbackFormScreenState extends State<TripFeedbackFormScreen> {
  int _rating = 5;
  final Set<String> _selectedTags = {'Safe Drive', 'On Time'};
  final TextEditingController _feedbackController = TextEditingController();

  final List<String> _tags = [
    'Safe Drive',
    'On Time',
    'Clean Cab',
    'Polite Driver',
    'Comfortable',
    '+ Other',
  ];

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Trip Feedback',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              const PostTripFinishGraphic(),
              const SizedBox(height: 20),

              // Star Selector
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final star = index + 1;
                  return IconButton(
                    iconSize: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    icon: Icon(
                      star <= _rating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: const Color(0xFFF59E0B),
                    ),
                    onPressed: () => setState(() => _rating = star),
                  );
                }),
              ),
              const SizedBox(height: 8),

              Text(
                'How was your last trip?',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 20),

              // Feedback Tags
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: _tags.map((tag) {
                  final isSelected = _selectedTags.contains(tag);
                  return FilterChip(
                    label: Text(tag),
                    selected: isSelected,
                    onSelected: (val) {
                      setState(() {
                        if (val) {
                          _selectedTags.add(tag);
                        } else {
                          _selectedTags.remove(tag);
                        }
                      });
                    },
                    selectedColor: AppColors.primaryBlueLight.withOpacity(0.5),
                    checkmarkColor: AppColors.primaryBlue,
                    labelStyle: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppColors.primaryBlueDark : AppColors.textPrimary,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 24),

              // Feedback Input
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
                        hintText: 'Write your feedback (optional)...',
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

              const SizedBox(height: 36),

              EmployeePrimaryButton(
                label: 'Submit Feedback',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Thank you! Feedback recorded.')),
                  );
                  Navigator.of(context).pop();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

