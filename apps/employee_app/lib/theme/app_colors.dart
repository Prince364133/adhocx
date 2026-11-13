import 'package:flutter/material.dart';

/// Centralized color tokens for AdhocX Mobile according to docs/04_DESIGN_SYSTEM.md.
class AppColors {
  AppColors._();

  // ── Primary Royal Purple Brand (Auth, Hero & Main Actions) ───────────────
  static const Color primary = Color(0xFF5728B2); // Main Brand Royal Purple
  static const Color primaryHover = Color(0xFF431E8E); // Deep Purple
  static const Color primaryDark = Color(0xFF2D145E); // Dark Purple
  static const Color primaryLight = Color(0xFF733DD9); // Light Purple Accent
  static const Color primarySubtle = Color(0xFFEEF2FF); // Purple 50 tint
  static const Color primaryGradientStart = Color(0xFF5728B2);
  static const Color primaryGradientEnd = Color(0xFF431E8E);

  // ── Secondary & Enterprise Status Accents ─────────────────────────────────
  static const Color accentGreen = Color(0xFF22C55E); // Green 500
  static const Color accentGreenLight = Color(0xFF4ADE80); // Green 400
  static const Color accentGreenDark = Color(0xFF16A34A); // Green 600
  static const Color accentBlue = Color(0xFF2563EB); // Blue 600

  // ── Light Surfaces (Enterprise Clean) ─────────────────────────────────────
  static const Color bgLight = Color(0xFFF8FAFC); // Application background
  static const Color surfaceLight = Color(0xFFFFFFFF); // Pure White Card
  static const Color surfaceElevatedLight = Color(0xFFF1F5F9); // Muted secondary
  static const Color surfaceLightElevated = surfaceElevatedLight;
  static const Color borderLight = Color(0xFFE2E8F0); // Light border
  static const Color borderSubtleLight = Color(0xFFCBD5E1); // Emphasized border

  // ── Dark Surfaces (Pure Black OLED & Neutral Gray Architecture) ───────────
  static const Color bgDark = Color(0xFF000000); // Pure OLED Black (#000000)
  static const Color surfaceDark = Color(0xFF121212); // Clean dark gray card surface
  static const Color surfaceElevatedDark = Color(0xFF1E1E1E); // Elevated panel / input container
  static const Color surfaceDarkElevated = surfaceElevatedDark;
  static const Color borderDark = Color(0xFF262626); // Neutral dark gray border
  static const Color borderSubtleDark = Color(0xFF333333); // Subtle dark divider

  // ── Typography Colors ─────────────────────────────────────────────────────
  static const Color textPrimaryLight = Color(0xFF0F172A); // Slate 900
  static const Color textSecondaryLight = Color(0xFF64748B); // Slate 500
  static const Color textMutedLight = Color(0xFF94A3B8); // Slate 400

  static const Color textPrimaryDark = Color(0xFFFFFFFF); // Crisp Pure White
  static const Color textSecondaryDark = Color(0xFFA1A1AA); // Clean Neutral Gray (Zinc/Gray 400)
  static const Color textMutedDark = Color(0xFF71717A); // Neutral Gray (Zinc/Gray 500)

  // ── Semantic Feedback ────────────────────────────────────────────────────
  static const Color success = Color(0xFF16A34A); // Success 600
  static const Color successContainer = Color(0xFFDCFCE7); // Light green container
  static const Color successDarkContainer = Color(0xFF052E16); // Dark green container
  static const Color successText = Color(0xFF15803D); // Green text

  static const Color warning = Color(0xFFD97706); // Amber 600
  static const Color warningContainer = Color(0xFFFEF3C7); // Light amber container
  static const Color warningText = Color(0xFFB45309); // Amber text

  static const Color error = Color(0xFFDC2626); // Red 600
  static const Color errorContainer = Color(0xFFFEE2E2); // Light red container
  static const Color errorText = Color(0xFFB91C1C); // Red text

  static const Color info = Color(0xFF0284C7); // Sky 600
  static const Color infoContainer = Color(0xFFE0F2FE); // Light sky container
  static const Color infoText = Color(0xFF0369A1); // Sky text

  // ── Brand & Feature Accents ──────────────────────────────────────────────
  static const Color brandOrange = Color(0xFFFF6200); // AdhocX Brand Orange Accent
  static const Color accentPurple = Color(0xFFA855F7); // Purple 500
  static const Color starAmber = Color(0xFFF59E0B); // Amber 500 for rating stars

  // ── Social Auth Palette ──────────────────────────────────────────────────
  static const Color googleBlue = Color(0xFF4285F4);
  static const Color googleGreen = Color(0xFF34A853);
  static const Color googleYellow = Color(0xFFFBBC05);
  static const Color googleRed = Color(0xFFEA4335);

  // ── Extended Slate Scale ─────────────────────────────────────────────────
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);

  // ── Neutral Gray Scale (Modern Dark Mode) ─────────────────────────────────
  static const Color gray50 = Color(0xFFFAFAFA);
  static const Color gray100 = Color(0xFFF4F4F5);
  static const Color gray200 = Color(0xFFE4E4E7);
  static const Color gray300 = Color(0xFFD4D4D8);
  static const Color gray400 = Color(0xFFA1A1AA);
  static const Color gray500 = Color(0xFF71717A);
  static const Color gray600 = Color(0xFF52525B);
  static const Color gray700 = Color(0xFF3F3F46);
  static const Color gray800 = Color(0xFF27272A);
  static const Color gray900 = Color(0xFF18181B);
  static const Color gray950 = Color(0xFF09090B);

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE LEGACY ALIASES — TEMPORARY (design migration Phase 1 → Phase 4)
  //
  // Everything ABOVE this banner is an exact copy of the Driver app
  // (apps/mobile/lib/shared/theme/app_colors.dart) and must stay identical.
  //
  // The names below are the old employee-only colour names, re-pointed at the
  // closest Driver token so un-migrated screens keep compiling and already pick
  // up the Driver palette. They are LIGHT-MODE ONLY. Phase 3 replaces each use
  // with the Driver token + `isDark` pattern; Phase 4 deletes this block.
  // No new code may use these names.
  // ═══════════════════════════════════════════════════════════════════════════

  // Brand
  static const Color primaryBlue = primary;
  static const Color primaryBlueDark = primaryHover;
  static const Color primaryBlueDarker = primaryDark;
  static const Color primaryBlueLight = primarySubtle;
  static const Color primaryBlueSoft = primarySubtle;
  static const Color primaryPurple = primary; // off-brand #7C3AED retired
  static const Color primaryPurpleLight = primarySubtle;
  static const Color secondaryOrange = brandOrange;
  static const Color secondaryOrangeHover = brandOrange;
  static const Color secondaryOrangeLight = warningContainer;
  static const Color accentAmber = starAmber;
  static const Color accentAmberLight = warningContainer;
  static const Color accentAmberBorder = Color(0x66D97706); // warning @ 40%
  static const Color darkNavy = slate900;
  static const Color darkNavyCard = slate800;

  // Surfaces
  static const Color background = bgLight;
  static const Color surface = surfaceLight;
  static const Color surfaceMuted = surfaceElevatedLight;
  static const Color surfacePill = slate200;

  // Text
  static const Color textPrimary = textPrimaryLight;
  static const Color textSecondary = textSecondaryLight;
  static const Color textMuted = textMutedLight;
  static const Color textLight = Color(0xFFFFFFFF);

  // Borders
  static const Color border = borderLight;
  static const Color borderSubtle = slate100;
  static const Color borderFocused = primary;

  // Semantic tints (borders = semantic colour @ 40%, no new hues)
  static const Color successLight = successContainer;
  static const Color successBorder = Color(0x6616A34A);
  static const Color errorLight = errorContainer;
  static const Color errorBorder = Color(0x66DC2626);
  static const Color warningLight = warningContainer;
  static const Color warningBorder = Color(0x66D97706);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryGradientStart, primaryGradientEnd],
  );
  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [primaryDark, primaryHover, primary],
  );
  static const LinearGradient orangeGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [brandOrange, starAmber],
  );
}

