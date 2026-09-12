import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import './app_colors.dart';

/// Centralized typography hierarchy using Inter font according to docs/04_DESIGN_SYSTEM.md.
class AppTypography {
  AppTypography._();

  static TextStyle display({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 36,
        fontWeight: fontWeight ?? FontWeight.w700,
        height: 1.15,
        letterSpacing: -0.8,
        color: color,
      );

  static TextStyle h1({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 28,
        fontWeight: fontWeight ?? FontWeight.w700,
        height: 1.2,
        letterSpacing: -0.6,
        color: color,
      );

  static TextStyle h2({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 22,
        fontWeight: fontWeight ?? FontWeight.w700,
        height: 1.25,
        letterSpacing: -0.4,
        color: color,
      );

  static TextStyle h3({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 18,
        fontWeight: fontWeight ?? FontWeight.w600,
        height: 1.3,
        letterSpacing: -0.2,
        color: color,
      );

  static TextStyle h4({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 16,
        fontWeight: fontWeight ?? FontWeight.w600,
        height: 1.35,
        color: color,
      );

  static TextStyle bodyLarge({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 16,
        fontWeight: fontWeight ?? FontWeight.w400,
        height: 1.5,
        color: color,
      );

  static TextStyle body({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 14,
        fontWeight: fontWeight ?? FontWeight.w400,
        height: 1.5,
        color: color,
      );

  static TextStyle bodyMedium({
    Color color = AppColors.textPrimaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 14,
        fontWeight: fontWeight ?? FontWeight.w500,
        height: 1.45,
        color: color,
      );

  static TextStyle small({
    Color color = AppColors.textSecondaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 13,
        fontWeight: fontWeight ?? FontWeight.w400,
        height: 1.4,
        color: color,
      );

  static TextStyle caption({
    Color color = AppColors.textMutedDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 12,
        fontWeight: fontWeight ?? FontWeight.w400,
        height: 1.35,
        color: color,
      );

  static TextStyle micro({
    Color color = AppColors.textMutedDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 11,
        fontWeight: fontWeight ?? FontWeight.w500,
        height: 1.3,
        color: color,
      );

  static TextStyle label({
    Color color = AppColors.textSecondaryDark,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 13,
        fontWeight: fontWeight ?? FontWeight.w500,
        height: 1.2,
        color: color,
      );

  static TextStyle button({
    Color color = Colors.white,
    FontWeight? fontWeight,
    double? fontSize,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize ?? 15,
        fontWeight: fontWeight ?? FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.1,
        color: color,
      );
}
