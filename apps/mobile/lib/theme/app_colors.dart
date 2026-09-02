import 'package:flutter/material.dart';

/// Centralized color tokens for AdhocX Mobile according to docs/04_DESIGN_SYSTEM.md.
class AppColors {
  AppColors._();

  // ── Primary Brand (B2B Operational Blue / Green Accent) ───────────────────
  static const Color primary = Color(0xFF2563EB); // Primary 600 action
  static const Color primaryHover = Color(0xFF1D4ED8); // Primary 700
  static const Color primaryLight = Color(0xFF3B82F6); // Primary 500
  static const Color primarySubtle = Color(0xFF1E3A8A); // Primary 900 tint
  
  // Brand Green Accent (Mobility & Active Status)
  static const Color accentGreen = Color(0xFF22C55E); // Green 500
  static const Color accentGreenDark = Color(0xFF16A34A); // Green 600

  // ── Dark Surfaces (Default Operational Palette) ───────────────────────────
  static const Color bgDark = Color(0xFF0B1220); // Deepest operational dark
  static const Color surfaceDark = Color(0xFF111827); // Standard card surface
  static const Color surfaceElevatedDark = Color(0xFF1E293B); // Elevated panel / input
  static const Color borderDark = Color(0xFF1F2937); // Standard dark border
  static const Color borderSubtleDark = Color(0xFF374151); // Subtle divider

  // ── Light Surfaces (Enterprise Clean) ─────────────────────────────────────
  static const Color bgLight = Color(0xFFF8FAFC); // Application background
  static const Color surfaceLight = Color(0xFFFFFFFF); // Card surface
  static const Color surfaceElevatedLight = Color(0xFFF1F5F9); // Muted secondary
  static const Color borderLight = Color(0xFFE2E8F0); // Light border
  static const Color borderSubtleLight = Color(0xFFCBD5E1); // Emphasized border

  // ── Typography Colors ─────────────────────────────────────────────────────
  static const Color textPrimaryDark = Color(0xFFF8FAFC); // White / Slate 50
  static const Color textSecondaryDark = Color(0xFF94A3B8); // Slate 400
  static const Color textMutedDark = Color(0xFF64748B); // Slate 500

  static const Color textPrimaryLight = Color(0xFF0F172A); // Slate 900
  static const Color textSecondaryLight = Color(0xFF475569); // Slate 600
  static const Color textMutedLight = Color(0xFF94A3B8); // Slate 400

  // ── Semantic Feedback ────────────────────────────────────────────────────
  static const Color success = Color(0xFF16A34A); // Success 600
  static const Color successContainer = Color(0xFF052E16); // Dark green container
  static const Color successText = Color(0xFF4ADE80); // Light green text

  static const Color warning = Color(0xFFD97706); // Amber 600
  static const Color warningContainer = Color(0xFF451A03); // Dark amber container
  static const Color warningText = Color(0xFFFBBF24); // Light amber text

  static const Color error = Color(0xFFDC2626); // Red 600
  static const Color errorContainer = Color(0xFF450A0A); // Dark red container
  static const Color errorText = Color(0xFFF87171); // Light red text

  static const Color info = Color(0xFF0284C7); // Sky 600
  static const Color infoContainer = Color(0xFF082F49); // Dark sky container
  static const Color infoText = Color(0xFF38BDF8); // Light sky text
}
