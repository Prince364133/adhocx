// THEME: Supports dark (default) and light modes
// Scaffold.backgroundColor driven by ThemeData — ALL screens

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Core brand colors — AdhocX logo palette: black bg + green accent
  static const Color primary = Color(0xFF22c55e); // green-500
  static const Color primaryDark = Color(0xFF16a34a); // green-600
  static const Color primaryContainer = Color(0xFF052e16); // green-950

  static const Color success = Color(0xFF22c55e); // green-500
  static const Color successContainer = Color(0xFF052e16);

  static const Color error = Color(0xFFef4444); // red-500
  static const Color errorContainer = Color(0xFF450a0a);

  static const Color warning = Color(0xFFf59e0b);
  static const Color info = Color(0xFF0ea5e9); // sky-500

  // ── Dark surfaces (near-black palette matching logo bg) ──────────────────
  static const Color backgroundDark = Color(0xFF020617); // slate-950
  static const Color surfaceDark = Color(0xFF0d1117); // near-black surface
  static const Color surfaceVariantDark = Color(0xFF0f172a); // slate-900
  static const Color borderDark = Color(0xFF1a2332); // dark border

  // ── Dark text ─────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFffffff);
  static const Color textSecondary = Color(0xFF94a3b8); // slate-400
  static const Color textMuted = Color(0xFF475569); // slate-600

  // ── Light surfaces ────────────────────────────────────────────────────────
  static const Color backgroundLight = Color(0xFFf1f5f9); // slate-100
  static const Color surfaceLight = Color(0xFFffffff);
  static const Color surfaceVariantLight = Color(0xFFf8fafc); // slate-50
  static const Color borderLight = Color(0xFFe2e8f0); // slate-200

  // ── Light text ────────────────────────────────────────────────────────────
  static const Color textPrimaryLight = Color(0xFF0f172a); // slate-900
  static const Color textSecondaryLight = Color(0xFF475569); // slate-600
  static const Color textMutedLight = Color(0xFF94a3b8); // slate-400

  // ── Light primary container ───────────────────────────────────────────────
  static const Color primaryContainerLight = Color(0xFFdcfce7); // green-100

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME
  // ─────────────────────────────────────────────────────────────────────────
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      onPrimary: Color(0xFF000000),
      primaryContainer: primaryContainer,
      onPrimaryContainer: Color(0xFFbbf7d0),
      secondary: success,
      onSecondary: Color(0xFF000000),
      secondaryContainer: successContainer,
      onSecondaryContainer: Color(0xFFbbf7d0),
      surface: surfaceDark,
      onSurface: textPrimary,
      surfaceContainerHighest: surfaceVariantDark,
      onSurfaceVariant: textSecondary,
      error: error,
      onError: textPrimary,
      errorContainer: errorContainer,
      onErrorContainer: Color(0xFFfca5a5),
      outline: borderDark,
      outlineVariant: Color(0xFF0d1117),
      inverseSurface: Color(0xFFe2e8f0),
      onInverseSurface: backgroundDark,
      tertiary: info,
      onTertiary: Color(0xFF00243a),
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
        foregroundColor: const Color(0xFF000000),
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
      onPrimaryContainer: Color(0xFF052e16),
      secondary: success,
      onSecondary: Colors.white,
      secondaryContainer: primaryContainerLight,
      onSecondaryContainer: Color(0xFF052e16),
      surface: surfaceLight,
      onSurface: textPrimaryLight,
      surfaceContainerHighest: surfaceVariantLight,
      onSurfaceVariant: textSecondaryLight,
      error: error,
      onError: Colors.white,
      errorContainer: Color(0xFFfee2e2),
      onErrorContainer: Color(0xFF7f1d1d),
      outline: borderLight,
      outlineVariant: Color(0xFFf1f5f9),
      inverseSurface: Color(0xFF1e293b),
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