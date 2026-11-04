import 'package:flutter/material.dart';

/// Centralized color palette for the AdhocX Employee Mobile App.
/// Adheres strictly to the AdhocX Design System (docs/04_DESIGN_SYSTEM.md):
/// - Primary Brand Blue: #1167EE
/// - Secondary Brand Orange: #FF5F09
/// - Warm Amber Gold Accent: #EE9811
/// - Midnight Navy: #010D2D
class AppColors {
  AppColors._();

  // Primary Brand Blue
  static const Color primaryBlue = Color(0xFF1167EE);
  static const Color primary = primaryBlue;
  static const Color primaryBlueDark = Color(0xFF0948AC);
  static const Color primaryBlueDarker = Color(0xFF032969);
  static const Color primaryBlueLight = Color(0xFFCEE0FD);
  static const Color primaryBlueSoft = Color(0xFFEFF6FF);

  // Secondary Brand Orange (AdhocX Logo "X" Accent & Secondary Color)
  static const Color secondaryOrange = Color(0xFFFF5F09);
  static const Color secondaryOrangeHover = Color(0xFFE04E00);
  static const Color secondaryOrangeLight = Color(0xFFFFEADF);

  // Warm Amber Gold Accent
  static const Color accentAmber = Color(0xFFEE9811);
  static const Color accentAmberLight = Color(0xFFFFFBF7);
  static const Color accentAmberBorder = Color(0xFFFEC98E);

  // Midnight Navy (Enterprise Contrast)
  static const Color darkNavy = Color(0xFF010D2D);
  static const Color darkNavyCard = Color(0xFF07193F);

  // Surfaces & Backgrounds
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF1F5F9);
  static const Color surfacePill = Color(0xFFE2E8F0);

  // Typography Neutrals
  static const Color textPrimary = Color(0xFF191B1C);
  static const Color textSecondary = Color(0xFF595F61);
  static const Color textMuted = Color(0xFF8A9295);
  static const Color textLight = Color(0xFFFFFFFF);

  // Borders & Dividers
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderSubtle = Color(0xFFEEF2F6);
  static const Color borderFocused = Color(0xFF1167EE);

  // Semantic Status
  static const Color success = Color(0xFF16A34A);
  static const Color successLight = Color(0xFFDCFCE7);
  static const Color successBorder = Color(0xFF86EFAC);

  static const Color error = Color(0xFFDC2626);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color errorBorder = Color(0xFFFCA5A5);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color warningBorder = Color(0xFFFDE68A);

  // Purple accents (Notifications, Analytics)
  static const Color primaryPurple = Color(0xFF7C3AED);
  static const Color primaryPurpleLight = Color(0xFFEDE9FE);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryBlue, primaryBlueDark],
  );

  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [darkNavy, Color(0xFF032258), Color(0xFF063378)],
  );

  static const LinearGradient orangeGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [secondaryOrange, Color(0xFFFF7E39)],
  );
}
