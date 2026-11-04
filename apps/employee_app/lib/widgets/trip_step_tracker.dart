import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

enum TripStep { planning, assigned, approaching, arrived, boarded }

class TripStepTracker extends StatelessWidget {
  final TripStep currentStep;

  const TripStepTracker({super.key, required this.currentStep});

  static const List<TripStep> _steps = [
    TripStep.planning,
    TripStep.assigned,
    TripStep.approaching,
    TripStep.arrived,
    TripStep.boarded,
  ];

  static const Map<TripStep, String> _labels = {
    TripStep.planning: 'Planning',
    TripStep.assigned: 'Assigned',
    TripStep.approaching: 'Approaching',
    TripStep.arrived: 'Arrived',
    TripStep.boarded: 'Boarded',
  };

  @override
  Widget build(BuildContext context) {
    final activeIndex = _steps.indexOf(currentStep);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: List.generate(_steps.length * 2 - 1, (index) {
          if (index.isOdd) {
            final prevStepIndex = index ~/ 2;
            final isCompleted = prevStepIndex < activeIndex;
            return Expanded(
              child: Container(
                height: 2.5,
                color: isCompleted ? AppColors.primaryBlue : AppColors.border,
              ),
            );
          }

          final stepIndex = index ~/ 2;
          final step = _steps[stepIndex];
          final isCompleted = stepIndex < activeIndex;
          final isCurrent = stepIndex == activeIndex;

          Color dotColor;
          Widget dotChild;

          if (isCompleted) {
            dotColor = AppColors.primaryBlue;
            dotChild = const Icon(Icons.check, size: 10, color: Colors.white);
          } else if (isCurrent) {
            dotColor = (step == TripStep.planning)
                ? AppColors.secondaryOrange
                : AppColors.primaryBlue;
            dotChild = Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
            );
          } else {
            dotColor = AppColors.border;
            dotChild = const SizedBox.shrink();
          }

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                ),
                child: Center(child: dotChild),
              ),
              const SizedBox(height: 5),
              Text(
                _labels[step]!,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                  color: isCurrent
                      ? AppColors.textPrimary
                      : (isCompleted ? AppColors.primaryBlueDark : AppColors.textMuted),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
