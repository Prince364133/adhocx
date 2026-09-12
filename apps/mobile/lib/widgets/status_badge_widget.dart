import '../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

enum BadgeStyle { success, error, warning, info, neutral }

class StatusBadgeWidget extends StatelessWidget {
  final String label;
  final BadgeStyle style;
  final double fontSize;

  const StatusBadgeWidget({
    super.key,
    required this.label,
    this.style = BadgeStyle.neutral,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _bgColor.withAlpha(38),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _bgColor.withAlpha(102)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _bgColor,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Color get _bgColor {
    switch (style) {
      case BadgeStyle.success:
        return AppColors.success;
      case BadgeStyle.error:
        return AppColors.error;
      case BadgeStyle.warning:
        return AppColors.warning;
      case BadgeStyle.info:
        return AppColors.info;
      case BadgeStyle.neutral:
        return AppColors.textMutedDark;
    }
  }
}
