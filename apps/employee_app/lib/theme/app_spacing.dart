import 'package:flutter/material.dart';

/// Centralized 4px base grid spacing constants according to docs/04_DESIGN_SYSTEM.md.
class AppSpacing {
  AppSpacing._();

  static const double xs = 4.0; // Micro spacing / icon gap
  static const double sm = 8.0; // Compact component spacing
  static const double md = 12.0; // Field / internal container spacing
  static const double lg = 16.0; // Standard component padding
  static const double xl = 20.0; // Card padding
  static const double xxl = 24.0; // Section spacing
  static const double xxxl = 32.0; // Major section separation
  static const double huge = 48.0; // Large layout separation

  // Inset helpers
  static const EdgeInsets paddingXs = EdgeInsets.all(xs);
  static const EdgeInsets paddingSm = EdgeInsets.all(sm);
  static const EdgeInsets paddingMd = EdgeInsets.all(md);
  static const EdgeInsets paddingLg = EdgeInsets.all(lg);
  static const EdgeInsets paddingXl = EdgeInsets.all(xl);
  static const EdgeInsets paddingXxl = EdgeInsets.all(xxl);

  static const EdgeInsets screenPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: md,
  );
}
