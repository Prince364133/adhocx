import 'package:flutter/material.dart';

/// Centralized color tokens for AdhocX Mobile according to docs/04_DESIGN_SYSTEM.md.
class AppColors {
  AppColors._();

  // ── Primary Royal Purple Brand (Auth, Hero & Main Actions) ───────────────
  static const Color primary = Color(0xFF5B42F3); // Main Brand Royal Purple
  static const Color primaryHover = Color(0xFF4E35DE); // Deep Purple
  static const Color primaryDark = Color(0xFF3727A6); // Dark Purple
  static const Color primaryLight = Color(0xFF7C68F5); // Light Purple Accent
  static const Color primarySubtle = Color(0xFFEEF2FF); // Purple 50 tint
  static const Color primaryGradientStart = Color(0xFF6347F9);
  static const Color primaryGradientEnd = Color(0xFF4328E0);

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
}

