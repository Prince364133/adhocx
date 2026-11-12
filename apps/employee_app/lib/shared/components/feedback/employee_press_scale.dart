import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';

class EmployeePressScale extends StatefulWidget {
  final Widget child;
  final bool enabled;
  final double pressedScale;
  final double hoveredScale;
  final double borderRadius;
  final Color shadowColor;

  const EmployeePressScale({
    super.key,
    required this.child,
    this.enabled = true,
    this.pressedScale = 0.96,
    this.hoveredScale = 1,
    this.borderRadius = 16,
    this.shadowColor = AppColors.primaryBlue,
  });

  @override
  State<EmployeePressScale> createState() => _EmployeePressScaleState();
}

class _EmployeePressScaleState extends State<EmployeePressScale> {
  bool _isPressed = false;
  bool _isHovered = false;

  void _setPressed(bool value) {
    if (_isPressed != value) setState(() => _isPressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final isEnabled =
        widget.enabled && !MediaQuery.disableAnimationsOf(context);

    final isPressed = _isPressed && isEnabled;
    final isHovered = _isHovered && isEnabled && !isPressed;
    return MouseRegion(
      onEnter: isEnabled ? (_) => setState(() => _isHovered = true) : null,
      onExit: isEnabled ? (_) => setState(() => _isHovered = false) : null,
      cursor: isEnabled ? SystemMouseCursors.click : MouseCursor.defer,
      child: Listener(
        onPointerDown: isEnabled ? (_) => _setPressed(true) : null,
        onPointerUp: isEnabled ? (_) => _setPressed(false) : null,
        onPointerCancel: isEnabled ? (_) => _setPressed(false) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            boxShadow: [
              BoxShadow(
                color: widget.shadowColor.withValues(
                  alpha: isPressed ? 0.08 : (isHovered ? 0.04 : 0),
                ),
                blurRadius: isPressed ? 8 : (isHovered ? 6 : 0),
                offset: Offset(0, isPressed ? 2 : (isHovered ? 1 : 0)),
              ),
            ],
          ),
          child: AnimatedScale(
            scale: isPressed
                ? widget.pressedScale
                : (isHovered ? widget.hoveredScale : 1),
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
