import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

enum LogoTheme { light, dark }

/// "AdhocX" wordmark: brand primary "Adhoc" + brand orange "X".
/// [LogoTheme.light] is for light surfaces; it switches to white automatically
/// when the app runs in dark mode. [LogoTheme.dark] is for brand/dark surfaces.
class EmployeeBrandLogo extends StatelessWidget {
  final double fontSize;
  final LogoTheme logoTheme;
  final String? subtitle;

  const EmployeeBrandLogo({
    super.key,
    this.fontSize = 32,
    this.logoTheme = LogoTheme.light,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onDarkSurface = logoTheme == LogoTheme.dark || isDark;
    final adhocColor = onDarkSurface ? Colors.white : AppColors.primary;

    final wordStyle = AppTypography.display(
      fontSize: fontSize,
      fontWeight: FontWeight.w800,
      color: adhocColor,
      overflow: null,
    ).copyWith(letterSpacing: -0.5);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          label: 'AdhocX',
          excludeSemantics: true,
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(text: 'Adhoc', style: wordStyle),
                TextSpan(
                  text: 'X',
                  style: wordStyle.copyWith(color: AppColors.brandOrange),
                ),
              ],
            ),
            textAlign: TextAlign.center,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: AppTypography.small(
              fontSize: (fontSize * 0.42).clamp(11.0, 14.0),
              fontWeight: FontWeight.w500,
              color: onDarkSurface
                  ? Colors.white.withAlpha(204)
                  : (isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondaryLight),
            ).copyWith(letterSpacing: 0.1),
          ),
        ],
      ],
    );
  }
}
