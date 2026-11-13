import 'package:flutter/material.dart';

/// Centralized border radius tokens according to docs/04_DESIGN_SYSTEM.md.
class AppRadius {
  AppRadius._();

  static const double xs = 4.0;
  static const double sm = 6.0;
  static const double md = 8.0; // Standard inputs / buttons
  static const double lg = 10.0; // Standard cards
  static const double xl = 12.0; // Modals / bottom sheets
  static const double xxl = 16.0; // Large containers / brand cards
  static const double pill = 9999.0; // Status badges / pill buttons
  static const double full = 9999.0;

  static final BorderRadius borderXs = BorderRadius.circular(xs);
  static final BorderRadius borderSm = BorderRadius.circular(sm);
  static final BorderRadius borderMd = BorderRadius.circular(md);
  static final BorderRadius borderLg = BorderRadius.circular(lg);
  static final BorderRadius borderXl = BorderRadius.circular(xl);
  static final BorderRadius borderXxl = BorderRadius.circular(xxl);
  static final BorderRadius borderPill = BorderRadius.circular(pill);
  static final BorderRadius borderFull = BorderRadius.circular(full);
}
