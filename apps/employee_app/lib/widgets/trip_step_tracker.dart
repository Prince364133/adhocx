import 'package:flutter/material.dart';
import '../shared/components/feedback/employee_step_tracker.dart' as shared;

enum TripStep { planning, assigned, approaching, arrived, boarded }

class TripStepTracker extends StatelessWidget {
  final dynamic currentStep;

  const TripStepTracker({super.key, required this.currentStep});

  @override
  Widget build(BuildContext context) {
    int activeIndex;
    if (currentStep is TripStep) {
      activeIndex = (currentStep as TripStep).index;
    } else if (currentStep is int) {
      activeIndex = (currentStep as int).clamp(0, TripStep.values.length - 1);
    } else {
      activeIndex = 0;
    }

    return shared.EmployeeStepTracker(
      currentStep: activeIndex,
    );
  }
}
