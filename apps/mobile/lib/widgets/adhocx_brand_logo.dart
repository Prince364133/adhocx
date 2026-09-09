import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Reusable text-based AdhocX brand logo component using the core brand design theme tokens.
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
    this.isDark = false,
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
                  color: isDark ? AppColors.textPrimaryDark : AppColors.primary,
                  fontWeight: FontWeight.w900,
                  fontSize: fontSize,
                ),
              ),
              TextSpan(
                text: 'X',
                style: TextStyle(
                  color: AppColors.brandOrange,
                  fontWeight: FontWeight.w900,
                  fontSize: fontSize * 1.04,
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
              color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(effectiveRadius),
        border: Border.all(
          color: AppColors.borderLight,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 2),
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
                  color: AppColors.primary,
                  fontWeight: FontWeight.w900,
                  fontSize: size * 0.44,
                  fontFamily: 'Inter',
                ),
              ),
              TextSpan(
                text: 'X',
                style: TextStyle(
                  color: AppColors.brandOrange,
                  fontWeight: FontWeight.w900,
                  fontSize: size * 0.48,
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
