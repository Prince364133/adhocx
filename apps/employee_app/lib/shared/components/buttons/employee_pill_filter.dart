import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

/// Segmented filter bar (Notifications, Trip History, Schedule, Requests).
/// Driver app design (AppSegmentedControl): bordered surface container,
/// 8px-radius selected segment in brand primary, optional count chips.
class EmployeePillFilter extends StatelessWidget {
  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final Map<int, int>? counts;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;

  const EmployeePillFilter({
    super.key,
    required this.options,
    required this.selectedIndex,
    required this.onSelected,
    this.counts,
    this.padding = const EdgeInsets.symmetric(
      horizontal: AppSpacing.lg,
      vertical: AppSpacing.sm,
    ),
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final idleText =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

    return Container(
      color: backgroundColor,
      padding: padding,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.xs),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: AppRadius.borderLg,
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.2,
          ),
        ),
        child: Row(
          children: List.generate(options.length, (index) {
            final isSelected = selectedIndex == index;
            final count = counts?[index];
            final textColor = isSelected ? Colors.white : idleText;

            return Expanded(
              child: Semantics(
                button: true,
                selected: isSelected,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onSelected(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(
                      vertical: AppSpacing.sm + 2,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.transparent,
                      borderRadius: AppRadius.borderMd,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            options[index],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.bodyMedium(color: textColor)
                                .copyWith(
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                        ),
                        if (count != null && count > 0) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.xs + 2,
                              vertical: 1,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white.withAlpha(64)
                                  : (isDark
                                      ? AppColors.surfaceElevatedDark
                                      : AppColors.surfaceElevatedLight),
                              borderRadius: AppRadius.borderPill,
                            ),
                            child: Text(
                              '$count',
                              style: AppTypography.micro(
                                color: textColor,
                                fontWeight: FontWeight.w700,
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
      ),
    );
  }
}

/// Circular icon action button (Call, Chat, Share, Close) on driver tokens.
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBg = backgroundColor ??
        (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight);
    final effectiveColor = iconColor ??
        (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight);

    final button = Material(
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
    );

    // Keep a 48dp touch target even when the visual circle is smaller.
    final target = ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      child: Center(widthFactor: 1, heightFactor: 1, child: button),
    );

    return tooltip != null
        ? Tooltip(message: tooltip!, child: target)
        : Semantics(button: true, child: target);
  }
}
