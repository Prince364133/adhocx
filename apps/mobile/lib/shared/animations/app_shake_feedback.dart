import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Centralized Shake Feedback Widget for Error States, Invalid Inputs, and Rejected Actions.
class AppShakeFeedback extends StatefulWidget {
  final Widget child;
  final bool shake;
  final VoidCallback? onComplete;

  const AppShakeFeedback({
    super.key,
    required this.child,
    required this.shake,
    this.onComplete,
  });

  @override
  State<AppShakeFeedback> createState() => _AppShakeFeedbackState();
}

class _AppShakeFeedbackState extends State<AppShakeFeedback>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          widget.onComplete?.call();
        }
      });
  }

  @override
  void didUpdateWidget(covariant AppShakeFeedback oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.shake && !oldWidget.shake) {
      HapticFeedback.mediumImpact();
      _controller.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final progress = _controller.value;
        final offset = math.sin(progress * math.pi * 4) * (1.0 - progress) * 8.0;
        return Transform.translate(
          offset: Offset(offset, 0),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
