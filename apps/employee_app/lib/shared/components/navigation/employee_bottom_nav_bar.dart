import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';

/// Reusable bottom navigation bar for the AdhocX Employee Mobile App.
/// Tabs: 0: Home, 1: Schedule, 2: Trips, 3: Profile
class EmployeeBottomNavBar extends StatefulWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;

  const EmployeeBottomNavBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
  });

  @override
  State<EmployeeBottomNavBar> createState() => _EmployeeBottomNavBarState();
}

class _EmployeeBottomNavBarState extends State<EmployeeBottomNavBar> {
  int? _hoveredIndex;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Container(
      color: AppColors.background,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, Icons.home_rounded, 'Home', reduceMotion),
                _buildNavItem(
                    1, Icons.calendar_month_rounded, 'Schedule', reduceMotion),
                _buildNavItem(2, Icons.directions_car_filled_rounded, 'Trips',
                    reduceMotion),
                _buildNavItem(3, Icons.person_rounded, 'Profile', reduceMotion),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    int index,
    IconData icon,
    String label,
    bool reduceMotion,
  ) {
    final isActive = widget.currentIndex == index;
    final color = isActive ? AppColors.primaryBlue : AppColors.textMuted;
    final isHovered = _hoveredIndex == index && !reduceMotion;

    return MouseRegion(
      onEnter: (_) => setState(() => _hoveredIndex = index),
      onExit: (_) {
        if (_hoveredIndex == index) setState(() => _hoveredIndex = null);
      },
      cursor: SystemMouseCursors.click,
      child: Semantics(
        button: true,
        selected: isActive,
        label: label,
        child: InkWell(
          onTap: () => widget.onTap?.call(index),
          borderRadius: BorderRadius.circular(18),
          child: SizedBox(
            width: 64,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedSlide(
                    offset: isActive ? const Offset(0, -0.08) : Offset.zero,
                    duration: reduceMotion
                        ? Duration.zero
                        : const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    child: AnimatedScale(
                      scale: isHovered ? 1.12 : (isActive ? 1.04 : 1),
                      duration: reduceMotion
                          ? Duration.zero
                          : const Duration(milliseconds: 200),
                      curve: Curves.easeOutBack,
                      child: AnimatedContainer(
                        duration: reduceMotion
                            ? Duration.zero
                            : const Duration(milliseconds: 220),
                        curve: Curves.easeOutCubic,
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppColors.primaryBlue
                              : Colors.transparent,
                          shape: BoxShape.circle,
                          boxShadow: isActive || isHovered
                              ? [
                                  BoxShadow(
                                    color: AppColors.primaryBlue
                                        .withValues(alpha: 0.22),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: AnimatedSwitcher(
                            duration: reduceMotion
                                ? Duration.zero
                                : const Duration(milliseconds: 180),
                            switchInCurve: Curves.easeOutBack,
                            switchOutCurve: Curves.easeIn,
                            transitionBuilder: (child, animation) =>
                                ScaleTransition(
                              scale: animation,
                              child: FadeTransition(
                                opacity: animation,
                                child: child,
                              ),
                            ),
                            child: Icon(
                              icon,
                              key: ValueKey('${index}_$isActive'),
                              size: 22,
                              color: isActive ? Colors.white : color,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 3),
                  AnimatedDefaultTextStyle(
                    duration: reduceMotion
                        ? Duration.zero
                        : const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: color,
                    ),
                    child: Text(label),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
