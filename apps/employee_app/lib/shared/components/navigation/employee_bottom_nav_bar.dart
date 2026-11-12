import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';

/// Reusable bottom navigation bar for the AdhocX Employee Mobile App.
/// Tabs: 0: Home, 1: Schedule, 2: Trips, 3: Profile
class EmployeeBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;

  const EmployeeBottomNavBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 0.8),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _buildNavItem(
                context,
                0,
                Icons.home_rounded,
                'Home',
                reduceMotion,
              ),
              _buildNavItem(
                context,
                1,
                Icons.calendar_month_rounded,
                'Schedule',
                reduceMotion,
              ),
              _buildNavItem(
                context,
                2,
                Icons.directions_car_filled_rounded,
                'Trips',
                reduceMotion,
              ),
              _buildNavItem(
                context,
                3,
                Icons.person_rounded,
                'Profile',
                reduceMotion,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    int index,
    IconData icon,
    String label,
    bool reduceMotion,
  ) {
    final isActive = currentIndex == index;
    final color = isActive ? AppColors.primaryBlue : AppColors.textMuted;

    return Expanded(
      child: Semantics(
        button: true,
        selected: isActive,
        label: label,
        child: InkWell(
          onTap: () => onTap?.call(index),
          splashFactory: NoSplash.splashFactory,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 21, color: color),
              const SizedBox(height: 3),
              AnimatedDefaultTextStyle(
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 150),
                curve: Curves.easeOut,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  color: color,
                ),
                child: Text(label, maxLines: 1),
              ),
              const SizedBox(height: 3),
              AnimatedContainer(
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 150),
                curve: Curves.easeOut,
                width: isActive ? 18 : 0,
                height: 2,
                decoration: BoxDecoration(
                  color: isActive ? AppColors.primaryBlue : Colors.transparent,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
