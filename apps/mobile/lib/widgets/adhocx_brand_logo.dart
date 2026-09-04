import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Reusable text-based AdhocX brand logo & icon components for the mobile application.
class AdhocxBrandLogo extends StatelessWidget {
  final double fontSize;
  final String? subtitle;
  final bool isDark;
  final MainAxisSize mainAxisSize;
  final CrossAxisAlignment crossAxisAlignment;

  const AdhocxBrandLogo({
    super.key,
    this.fontSize = 32,
    this.subtitle,
    this.isDark = true,
    this.mainAxisSize = MainAxisSize.min,
    this.crossAxisAlignment = CrossAxisAlignment.center,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: mainAxisSize,
      crossAxisAlignment: crossAxisAlignment,
      children: [
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Adhoc',
                style: AppTypography.display(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w800,
                  fontSize: fontSize,
                ),
              ),
              TextSpan(
                text: 'X',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w900,
                  fontSize: fontSize * 1.08,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ),
        if (subtitle != null && subtitle!.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: TextStyle(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              fontSize: fontSize * 0.32,
              fontWeight: FontWeight.w600,
              letterSpacing: 2.5,
            ),
          ),
        ],
      ],
    );
  }
}

/// Standalone text-based brand badge / icon for AdhocX.
class AdhocxBrandIcon extends StatelessWidget {
  final double size;
  final double? borderRadius;

  const AdhocxBrandIcon({
    super.key,
    this.size = 48,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveRadius = borderRadius ?? (size * 0.25);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.circular(effectiveRadius),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.4),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'A',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: size * 0.42,
                  fontFamily: 'Inter',
                ),
              ),
              TextSpan(
                text: 'X',
                style: TextStyle(
                  color: AppColors.primaryLight,
                  fontWeight: FontWeight.w900,
                  fontSize: size * 0.46,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
