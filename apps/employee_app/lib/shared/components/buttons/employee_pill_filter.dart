import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../feedback/employee_press_scale.dart';

/// Reusable Segmented Pill Filter Bar for AdhocX.
/// Used in Notifications, Trip History, Schedule, and Request views.
class EmployeePillFilter extends StatelessWidget {
  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final Map<int, int>? counts;
  final EdgeInsetsGeometry padding;
  final Color backgroundColor;

  const EmployeePillFilter({
    super.key,
    required this.options,
    required this.selectedIndex,
    required this.onSelected,
    this.counts,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    this.backgroundColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: backgroundColor,
      padding: padding,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(options.length, (index) {
          final isSelected = selectedIndex == index;
          final count = counts?[index];

          return EmployeePressScale(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onSelected(index),
                borderRadius: BorderRadius.circular(20),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeInOut,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                  decoration: BoxDecoration(
                    color:
                        isSelected ? AppColors.primaryBlue : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOutCubic,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? Colors.white
                              : AppColors.textSecondary,
                        ),
                        child: Text(options[index]),
                      ),
                      if (count != null && count > 0) ...[
                        const SizedBox(width: 6),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.white.withValues(alpha: 0.25)
                                : AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$count',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

/// Circular / Squircle Icon Action Button (e.g. Call, Chat, Share, Settings, Close)
class EmployeeIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;
  final double iconSize;
  final String? tooltip;
  final Border? border;

  const EmployeeIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.backgroundColor,
    this.iconColor,
    this.size = 40,
    this.iconSize = 20,
    this.tooltip,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBg = backgroundColor ?? AppColors.surfaceMuted;
    final effectiveColor = iconColor ?? AppColors.textPrimary;

    Widget button = EmployeePressScale(
      enabled: onPressed != null,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: effectiveBg,
              shape: BoxShape.circle,
              border: border,
            ),
            child: Center(
              child: Icon(icon, size: iconSize, color: effectiveColor),
            ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: button);
    }
    return button;
  }
}
