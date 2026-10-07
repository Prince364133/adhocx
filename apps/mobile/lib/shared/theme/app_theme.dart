import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx/shared/theme/app_colors.dart';

/// Centralized ThemeData for dark (default) and light modes
/// adhering to docs/04_DESIGN_SYSTEM.md.
class AppTheme {
  // Core brand colors mapped from AppColors
  static const Color primary = AppColors.primary;
  static const Color primaryDark = AppColors.primaryDark;
  static const Color primaryContainer = AppColors.primarySubtle;

  static const Color success = AppColors.success;
  static const Color successContainer = AppColors.successDarkContainer;

  static const Color error = AppColors.error;
  static const Color errorContainer = AppColors.errorContainer;

  static const Color warning = AppColors.warning;
  static const Color info = AppColors.info;

  // ── Dark surfaces ────────────────────────────────────────────────────────
  static const Color backgroundDark = AppColors.bgDark;
  static const Color surfaceDark = AppColors.surfaceDark;
  static const Color surfaceVariantDark = AppColors.surfaceElevatedDark;
  static const Color borderDark = AppColors.borderDark;

  // ── Dark text ─────────────────────────────────────────────────────────────
  static const Color textPrimary = AppColors.textPrimaryDark;
  static const Color textSecondary = AppColors.textSecondaryDark;
  static const Color textMuted = AppColors.textMutedDark;

  // ── Light surfaces ────────────────────────────────────────────────────────
  static const Color backgroundLight = AppColors.bgLight;
  static const Color surfaceLight = AppColors.surfaceLight;
  static const Color surfaceVariantLight = AppColors.surfaceElevatedLight;
  static const Color borderLight = AppColors.borderLight;

  // ── Light text ────────────────────────────────────────────────────────────
  static const Color textPrimaryLight = AppColors.textPrimaryLight;
  static const Color textSecondaryLight = AppColors.textSecondaryLight;
  static const Color textMutedLight = AppColors.textMutedLight;

  // ── Light primary container ───────────────────────────────────────────────
  static const Color primaryContainerLight = AppColors.primarySubtle;

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME
  // ─────────────────────────────────────────────────────────────────────────
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: primaryContainer,
      onPrimaryContainer: AppColors.primaryLight,
      secondary: success,
      onSecondary: Colors.white,
      secondaryContainer: successContainer,
      onSecondaryContainer: AppColors.accentGreen,
      surface: surfaceDark,
      onSurface: textPrimary,
      surfaceContainerHighest: surfaceVariantDark,
      onSurfaceVariant: textSecondary,
      error: error,
      onError: textPrimary,
      errorContainer: errorContainer,
      onErrorContainer: AppColors.errorContainer,
      outline: borderDark,
      outlineVariant: AppColors.borderSubtleDark,
      inverseSurface: AppColors.gray200,
      onInverseSurface: backgroundDark,
      tertiary: info,
      onTertiary: Colors.white,
    ),
    scaffoldBackgroundColor: backgroundDark,
    textTheme: GoogleFonts.interTextTheme(
      const TextTheme(
        displayLarge: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w700,
        ),
        displayMedium: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w700,
        ),
        displaySmall: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w600,
        ),
        headlineLarge: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w700,
        ),
        headlineMedium: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w600,
        ),
        headlineSmall: TextStyle(
          color: textPrimary,
          fontWeight: FontWeight.w600,
        ),
        titleLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w500),
        titleSmall: TextStyle(color: textPrimary, fontWeight: FontWeight.w500),
        bodyLarge: TextStyle(color: textPrimary),
        bodyMedium: TextStyle(color: textSecondary),
        bodySmall: TextStyle(color: textSecondary),
        labelLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
        labelMedium: TextStyle(
          color: textSecondary,
          fontWeight: FontWeight.w500,
        ),
        labelSmall: TextStyle(color: textMuted, fontWeight: FontWeight.w500),
      ),
    ),
    appBarTheme: const AppBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: textPrimary,
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      color: surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: borderDark, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: surfaceVariantDark.withAlpha(128),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderDark),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderDark),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error, width: 1.5),
      ),
      labelStyle: const TextStyle(color: textSecondary),
      hintStyle: const TextStyle(color: textMuted),
      prefixIconColor: textSecondary,
      suffixIconColor: textSecondary,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: borderDark,
      thickness: 1,
      space: 1,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: surfaceVariantDark,
      selectedColor: primary,
      labelStyle: const TextStyle(color: textSecondary, fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      side: const BorderSide(color: borderDark),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: surfaceDark,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: surfaceDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: textSecondary,
      textColor: textPrimary,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? primary : textMuted,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? primary.withAlpha(100)
            : surfaceVariantDark,
      ),
    ),
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME
  // ─────────────────────────────────────────────────────────────────────────
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: primaryContainerLight,
      onPrimaryContainer: AppColors.primaryDark,
      secondary: success,
      onSecondary: Colors.white,
      secondaryContainer: primaryContainerLight,
      onSecondaryContainer: AppColors.accentGreenDark,
      surface: surfaceLight,
      onSurface: textPrimaryLight,
      surfaceContainerHighest: surfaceVariantLight,
      onSurfaceVariant: textSecondaryLight,
      error: error,
      onError: Colors.white,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.errorText,
      outline: borderLight,
      outlineVariant: AppColors.slate100,
      inverseSurface: AppColors.slate800,
      onInverseSurface: Colors.white,
      tertiary: info,
      onTertiary: Colors.white,
    ),
    scaffoldBackgroundColor: backgroundLight,
    textTheme: GoogleFonts.interTextTheme(
      const TextTheme(
        displayLarge: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w700,
        ),
        displayMedium: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w700,
        ),
        displaySmall: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
        headlineLarge: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w700,
        ),
        headlineMedium: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
        headlineSmall: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
        titleLarge: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w500,
        ),
        titleSmall: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w500,
        ),
        bodyLarge: TextStyle(color: textPrimaryLight),
        bodyMedium: TextStyle(color: textSecondaryLight),
        bodySmall: TextStyle(color: textSecondaryLight),
        labelLarge: TextStyle(
          color: textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
        labelMedium: TextStyle(
          color: textSecondaryLight,
          fontWeight: FontWeight.w500,
        ),
        labelSmall: TextStyle(
          color: textMutedLight,
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
    appBarTheme: const AppBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: textPrimaryLight,
      titleTextStyle: TextStyle(
        color: textPrimaryLight,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      color: surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: borderLight, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: surfaceVariantLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error, width: 1.5),
      ),
      labelStyle: const TextStyle(color: textSecondaryLight),
      hintStyle: const TextStyle(color: textMutedLight),
      prefixIconColor: textSecondaryLight,
      suffixIconColor: textSecondaryLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: borderLight,
      thickness: 1,
      space: 1,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: surfaceVariantLight,
      selectedColor: primary,
      labelStyle: const TextStyle(color: textSecondaryLight, fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      side: const BorderSide(color: borderLight),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: surfaceLight,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: surfaceLight,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: textSecondaryLight,
      textColor: textPrimaryLight,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? primary : textMutedLight,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? primary.withAlpha(100)
            : borderLight,
      ),
    ),
  );
}