import 'package:flutter/material.dart';
import 'app_animations.dart';

/// Centralized animated ticker widget that performs a micro-scale punch when numbers or values change.
class AppAnimatedCounter extends StatefulWidget {
  final String value;
  final TextStyle? style;
  final Duration duration;

  const AppAnimatedCounter({
    super.key,
    required this.value,
    this.style,
    this.duration = AppDurations.fast,
  });

  @override
  State<AppAnimatedCounter> createState() => _AppAnimatedCounterState();
}

class _AppAnimatedCounterState extends State<AppAnimatedCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  String _oldValue = '';

  @override
  void initState() {
    super.initState();
    _oldValue = widget.value;
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.15), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.15, end: 1.0), weight: 60),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AppCurves.spring,
      ),
    );
  }

  @override
  void didUpdateWidget(covariant AppAnimatedCounter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _oldValue = oldWidget.value;
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
    return ScaleTransition(
      scale: _scaleAnimation,
      child: AnimatedSwitcher(
        duration: widget.duration,
        transitionBuilder: (child, animation) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 0.2),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          );
        },
        child: Text(
          widget.value,
          key: ValueKey<String>(widget.value),
          style: widget.style,
        ),
      ),
    );
  }
}
