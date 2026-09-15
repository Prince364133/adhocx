import 'package:flutter/material.dart';

/// Centralized animation curves, durations, and timing tokens for AdhocX Mobile
/// adhering to docs/04_DESIGN_SYSTEM.md (150-250ms operational timing).
class AppCurves {
  AppCurves._();

  /// Tactile spring pop curve for button presses, checkmarks, and badges
  static const Curve spring = Cubic(0.34, 1.56, 0.64, 1.0);

  /// Smooth deceleration curve for drawer entries, sheet transitions, and card lifts
  static const Curve smoothOut = Cubic(0.16, 1.0, 0.3, 1.0);

  /// Symmetric in-out curve for radar sweeps, continuous shimmers, and fades
  static const Curve inOutSmooth = Cubic(0.4, 0.0, 0.2, 1.0);

  /// Quick bounce for status indicators
  static const Curve bounce = Curves.elasticOut;
}

class AppDurations {
  AppDurations._();

  /// Quick tap feedback, icon hover, micro-interactions (150ms)
  static const Duration fast = Duration(milliseconds: 150);

  /// Standard card elevation, tab switch, drawer slide, pill indicator (250ms)
  static const Duration normal = Duration(milliseconds: 250);

  /// Modal entrance, checkmark bounce, alert banner drops (350ms)
  static const Duration extended = Duration(milliseconds: 350);

  /// Continuous radar pulse, scanner rotation, shimmer wave (1600-2400ms)
  static const Duration radarLoop = Duration(milliseconds: 2400);
  static const Duration shimmerLoop = Duration(milliseconds: 1600);
}
