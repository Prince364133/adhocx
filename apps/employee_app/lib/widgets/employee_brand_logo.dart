import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

enum LogoTheme { light, dark }

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
    final adhocColor = logoTheme == LogoTheme.light
        ? AppColors.primaryBlue
        : AppColors.textLight;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Adhoc',
                style: GoogleFonts.inter(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w800,
                  color: adhocColor,
                  letterSpacing: -0.5,
                ),
              ),
              TextSpan(
                text: 'X',
                style: GoogleFonts.inter(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w800,
                  color: AppColors.secondaryOrange,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: (fontSize * 0.42).clamp(11.0, 14.0),
              fontWeight: FontWeight.w500,
              color: logoTheme == LogoTheme.light
                  ? AppColors.textSecondary
                  : AppColors.primaryBlueLight,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ],
    );
  }
}

