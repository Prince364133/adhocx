import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'app_animations.dart';

/// Centralized Radar Pulse & Scanner Widget for Live Dispatch, Driver Matching, and Telemetry.
class AppRadarPulse extends StatefulWidget {
  final double size;
  final Color? color;
  final int numberOfRings;
  final bool showSweep;
  final Widget? centerWidget;

  const AppRadarPulse({
    super.key,
    this.size = 240.0,
    this.color,
    this.numberOfRings = 3,
    this.showSweep = true,
    this.centerWidget,
  });

  @override
  State<AppRadarPulse> createState() => _AppRadarPulseState();
}

class _AppRadarPulseState extends State<AppRadarPulse>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _sweepController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: AppDurations.radarLoop,
    )..repeat();

    _sweepController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _sweepController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final radarColor = widget.color ?? AppColors.primary;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Animated Multi-Ring Ripple Painter
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, _) {
              return CustomPaint(
                size: Size(widget.size, widget.size),
                painter: _RadarRipplesPainter(
                  progress: _pulseController.value,
                  color: radarColor,
                  ringCount: widget.numberOfRings,
                ),
              );
            },
          ),

          // Optional 360-degree rotating sweep gradient
          if (widget.showSweep)
            AnimatedBuilder(
              animation: _sweepController,
              builder: (context, _) {
                return Transform.rotate(
                  angle: _sweepController.value * 2 * math.pi,
                  child: Container(
                    width: widget.size * 0.9,
                    height: widget.size * 0.9,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: SweepGradient(
                        center: Alignment.center,
                        startAngle: 0.0,
                        endAngle: math.pi / 2,
                        colors: [
                          radarColor.withAlpha(0),
                          radarColor.withAlpha(45),
                        ],
                        stops: const [0.0, 1.0],
                      ),
                    ),
                  ),
                );
              },
            ),

          // Center Icon / Custom Widget
          if (widget.centerWidget != null)
            widget.centerWidget!
          else
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: radarColor,
                boxShadow: [
                  BoxShadow(
                    color: radarColor.withAlpha(120),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Icons.directions_car,
                color: Colors.white,
                size: 26,
              ),
            ),
        ],
      ),
    );
  }
}

class _RadarRipplesPainter extends CustomPainter {
  final double progress;
  final Color color;
  final int ringCount;

  _RadarRipplesPainter({
    required this.progress,
    required this.color,
    required this.ringCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;

    for (int i = 0; i < ringCount; i++) {
      final ringProgress = (progress + (i / ringCount)) % 1.0;
      final currentRadius = maxRadius * ringProgress;
      final opacity = (1.0 - ringProgress).clamp(0.0, 1.0);

      final paint = Paint()
        ..color = color.withAlpha((opacity * 130).toInt())
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6;

      canvas.drawCircle(center, currentRadius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarRipplesPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}
