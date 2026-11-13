import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Resolves the Driver app's light/dark colour tokens for the current theme.
///
/// The Driver app writes `isDark ? AppColors.xDark : AppColors.xLight` inline
/// on every widget. This helper is the same choice made once per build, e.g.
///
/// ```dart
/// final p = EmployeePalette.of(context);
/// Text('Hi', style: AppTypography.h2(color: p.textPrimary));
/// ```
///
/// It only ever returns Driver tokens from [AppColors] — never new colours.
@immutable
class EmployeePalette {
  final bool isDark;

  const EmployeePalette._(this.isDark);

  factory EmployeePalette.of(BuildContext context) =>
      EmployeePalette._(Theme.of(context).brightness == Brightness.dark);

  /// Page background (Scaffold / AppBar).
  Color get background => isDark ? AppColors.bgDark : AppColors.bgLight;

  /// Cards, sheets, inputs.
  Color get surface => isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

  /// Muted panels, chips, plates.
  Color get surfaceElevated =>
      isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight;

  Color get border => isDark ? AppColors.borderDark : AppColors.borderLight;
  Color get borderSubtle =>
      isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight;

  Color get textPrimary =>
      isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
  Color get textSecondary =>
      isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
  Color get textMuted =>
      isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

  /// Brand colour for text/icons/links (lighter purple on dark, as in Driver).
  Color get accent => isDark ? AppColors.primaryLight : AppColors.primary;

  /// Soft brand tint behind icons and highlights.
  Color get accentTint => AppColors.primary.withAlpha(isDark ? 46 : 26);
}
