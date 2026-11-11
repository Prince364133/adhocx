import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../shared/components/feedback/employee_press_scale.dart';

enum ScheduleTab { day, week, month }

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
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _buildTab(ScheduleTab.day, 'Day'),
          _buildTab(ScheduleTab.week, 'Week'),
          _buildTab(ScheduleTab.month, 'Month'),
        ],
      ),
    );
  }

  Widget _buildTab(ScheduleTab tab, String label) {
    final isActive = activeTab == tab;

    return Expanded(
      child: EmployeePressScale(
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            onTap: () => onTabChanged(tab),
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primaryBlue : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutCubic,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  color: isActive ? Colors.white : AppColors.textSecondary,
                ),
                child: Text(label, textAlign: TextAlign.center),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
