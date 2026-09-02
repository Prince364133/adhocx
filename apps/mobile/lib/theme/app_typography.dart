import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import './app_colors.dart';

/// Centralized typography hierarchy using Inter font according to docs/04_DESIGN_SYSTEM.md.
class AppTypography {
  AppTypography._();

  static TextStyle display({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 36,
        fontWeight: FontWeight.w700,
        height: 1.15,
        letterSpacing: -0.8,
        color: color,
      );

  static TextStyle h1({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        height: 1.2,
        letterSpacing: -0.6,
        color: color,
      );

  static TextStyle h2({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 1.25,
        letterSpacing: -0.4,
        color: color,
      );

  static TextStyle h3({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 1.3,
        letterSpacing: -0.2,
        color: color,
      );

  static TextStyle h4({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 1.35,
        color: color,
      );

  static TextStyle bodyLarge({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: color,
      );

  static TextStyle body({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: color,
      );

  static TextStyle bodyMedium({Color color = AppColors.textPrimaryDark}) =>
      GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.45,
        color: color,
      );

  static TextStyle small({Color color = AppColors.textSecondaryDark}) =>
      GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: color,
      );

  static TextStyle caption({Color color = AppColors.textMutedDark}) =>
      GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.35,
        color: color,
      );

  static TextStyle label({Color color = AppColors.textSecondaryDark}) =>
      GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 1.2,
        color: color,
      );

  static TextStyle button({Color color = Colors.white}) =>
      GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.1,
        color: color,
      );
}
