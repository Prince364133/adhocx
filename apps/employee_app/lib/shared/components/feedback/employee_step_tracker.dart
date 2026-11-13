import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

enum TripStep { planning, assigned, approaching, arrived, boarded }

/// Trip lifecycle step tracker (Planning → Boarded) on Driver tokens.
/// Accepts a [TripStep] or a zero-based int index.
///
/// Layout: five equal-width cells, each holding its dot, the two half
/// connectors either side, and its label — so labels stay centred under their
/// dots and long/translated labels scale down instead of overflowing.
class EmployeeStepTracker extends StatelessWidget {
  final dynamic currentStep;

  /// Custom milestone labels (e.g. Pickup / Boarded / In Progress / Drop).
  /// When null the 5 [TripStep] lifecycle labels are used.
  final List<String>? labels;

  const EmployeeStepTracker({
    super.key,
    required this.currentStep,
    this.labels,
  });

  static const List<TripStep> _steps = TripStep.values;

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final track = isDark ? AppColors.borderDark : AppColors.borderLight;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textMuted =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    final names =
        labels ?? [for (final step in _steps) _labels[step]!];
    final count = names.length;

    final int activeIndex;
    if (currentStep is TripStep) {
      activeIndex = _steps.indexOf(currentStep as TripStep).clamp(0, count - 1);
    } else if (currentStep is int) {
      activeIndex = (currentStep as int).clamp(0, count - 1);
    } else {
      activeIndex = 0;
    }

    final duration =
        reduceMotion ? Duration.zero : const Duration(milliseconds: 260);

    Widget connector({required bool visible, required bool done}) => Expanded(
          child: AnimatedContainer(
            duration: duration,
            height: 2.5,
            color: !visible
                ? Colors.transparent
                : (done ? AppColors.primary : track),
          ),
        );

    return Semantics(
      label: 'Trip progress: ${names[activeIndex]}, '
          'step ${activeIndex + 1} of $count',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xs,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: AppRadius.borderLg,
          border: Border.all(color: track, width: 1.2),
        ),
        child: Row(
          children: List.generate(count, (i) {
            final isCompleted = i < activeIndex;
            final isCurrent = i == activeIndex;

            final Color dotColor;
            final Widget dotChild;
            if (isCompleted) {
              dotColor = AppColors.primary;
              dotChild =
                  const Icon(Icons.check, size: 10, color: Colors.white);
            } else if (isCurrent) {
              // Lifecycle "Planning" is shown in brand orange (not yet assigned).
              dotColor = labels == null && i == 0
                  ? AppColors.brandOrange
                  : AppColors.primary;
              dotChild = Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              );
            } else {
              dotColor = track;
              dotChild = const SizedBox.shrink();
            }

            return Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: 18,
                    child: Row(
                      children: [
                        // Left half: segment from the previous step.
                        connector(visible: i > 0, done: i <= activeIndex),
                        AnimatedContainer(
                          duration: duration,
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: dotColor,
                            shape: BoxShape.circle,
                          ),
                          child: Center(child: dotChild),
                        ),
                        // Right half: segment to the next step.
                        connector(
                          visible: i < count - 1,
                          done: i < activeIndex,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      names[i],
                      maxLines: 1,
                      style: AppTypography.micro(
                        fontSize: 9,
                        fontWeight:
                            isCurrent ? FontWeight.w700 : FontWeight.w500,
                        color: isCurrent
                            ? textPrimary
                            : (isCompleted ? AppColors.primary : textMuted),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ),
      ),
    );
  }
}
