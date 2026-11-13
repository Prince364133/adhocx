import 'package:flutter/material.dart';
import 'common/app_segmented_control.dart';

enum ScheduleTab { day, week, month }

/// Day / Week / Month switcher — the Driver app's AppSegmentedControl.
class ScheduleTabBar extends StatelessWidget {
  final ScheduleTab activeTab;
  final ValueChanged<ScheduleTab> onTabChanged;

  const ScheduleTabBar({
    super.key,
    required this.activeTab,
    required this.onTabChanged,
  });

  @override
  Widget build(BuildContext context) {
    return AppSegmentedControl<ScheduleTab>(
      items: const [
        SegmentItem(value: ScheduleTab.day, label: 'Day'),
        SegmentItem(value: ScheduleTab.week, label: 'Week'),
        SegmentItem(value: ScheduleTab.month, label: 'Month'),
      ],
      selectedValue: activeTab,
      onValueChanged: onTabChanged,
    );
  }
}
