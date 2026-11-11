import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';

enum TripStep { planning, assigned, approaching, arrived, boarded }

/// Reusable Step Tracker for AdhocX Trip Lifecycle.
/// Supports both enum [TripStep] and zero-based [int] step indices.
class EmployeeStepTracker extends StatelessWidget {
  final dynamic currentStep;

  const EmployeeStepTracker({super.key, required this.currentStep});

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
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    int activeIndex;
    if (currentStep is TripStep) {
      activeIndex = _steps.indexOf(currentStep as TripStep);
    } else if (currentStep is int) {
      activeIndex = (currentStep as int).clamp(0, _steps.length - 1);
    } else {
      activeIndex = 0;
    }

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
              child: LayoutBuilder(
                builder: (context, constraints) => SizedBox(
                  height: 18,
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      Container(
                        width: constraints.maxWidth,
                        height: 2.5,
                        color: AppColors.border,
                      ),
                      TweenAnimationBuilder<double>(
                        tween: Tween<double>(
                          begin: 0,
                          end: isCompleted ? 1 : 0,
                        ),
                        duration: reduceMotion
                            ? Duration.zero
                            : const Duration(milliseconds: 360),
                        curve: Curves.easeOutCubic,
                        builder: (context, value, child) => Container(
                          width: constraints.maxWidth * value,
                          height: 2.5,
                          color: AppColors.primaryBlue,
                        ),
                      ),
                    ],
                  ),
                ),
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
              AnimatedScale(
                scale: isCurrent ? 1.08 : 1,
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 220),
                curve: Curves.easeOutBack,
                child: AnimatedContainer(
                  duration: reduceMotion
                      ? Duration.zero
                      : const Duration(milliseconds: 260),
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    boxShadow: isCurrent && !reduceMotion
                        ? [
                            BoxShadow(
                              color: dotColor.withValues(alpha: 0.24),
                              blurRadius: 6,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: AnimatedSwitcher(
                      duration: reduceMotion
                          ? Duration.zero
                          : const Duration(milliseconds: 180),
                      transitionBuilder: (child, animation) => ScaleTransition(
                        scale: animation,
                        child: FadeTransition(opacity: animation, child: child),
                      ),
                      child: KeyedSubtree(
                        key: ValueKey(stepIndex < activeIndex
                            ? 'completed'
                            : isCurrent
                                ? 'current'
                                : 'future'),
                        child: dotChild,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 5),
              AnimatedDefaultTextStyle(
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                  color: isCurrent
                      ? AppColors.textPrimary
                      : (isCompleted
                          ? AppColors.primaryBlueDark
                          : AppColors.textMuted),
                ),
                child: Text(_labels[step]!),
              ),
            ],
          );
        }),
      ),
    );
  }
}
