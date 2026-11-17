import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../shared/theme/app_colors.dart';

/// Draggable floating edge-docked tab for quick navigation to Requirement History.
/// Always settles flush against either the LEFT edge or RIGHT edge of the screen
/// (never floats mid-screen or snaps to top/bottom).
class FloatingRequirementHistoryButton extends StatefulWidget {
  final VoidCallback onTap;
  final String label;

  const FloatingRequirementHistoryButton({
    super.key,
    required this.onTap,
    this.label = 'Requirement\nHistory',
  });

  @override
  State<FloatingRequirementHistoryButton> createState() =>
      _FloatingRequirementHistoryButtonState();
}

class _FloatingRequirementHistoryButtonState
    extends State<FloatingRequirementHistoryButton> {
  static const double _pillWidth = 122.0;
  static const double _pillHeight = 46.0;

  bool _dockedRight = true;
  bool _isDragging = false;
  double? _topOffset;
  double _dragLeft = 0.0;
  double _dragTop = 0.0;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final screenWidth = media.size.width;
    final screenHeight = media.size.height;
    final minTop = media.padding.top + 88.0;
    final maxTop = (screenHeight - media.padding.bottom - _pillHeight - 28.0)
        .clamp(minTop, screenHeight);

    // Default initial vertical position: lower-middle right edge (clear of cards & CTA)
    final currentTop = (_topOffset ?? (screenHeight * 0.66)).clamp(minTop, maxTop);
    final settledLeft = _dockedRight ? (screenWidth - _pillWidth) : 0.0;

    final left = _isDragging
        ? _dragLeft.clamp(0.0, (screenWidth - _pillWidth).clamp(0.0, screenWidth))
        : settledLeft;
    final top = _isDragging ? _dragTop.clamp(minTop, maxTop) : currentTop;

    final BorderRadius borderRadius = _isDragging
        ? BorderRadius.circular(24)
        : (_dockedRight
            ? const BorderRadius.horizontal(left: Radius.circular(24))
            : const BorderRadius.horizontal(right: Radius.circular(24)));

    return AnimatedPositioned(
      duration: _isDragging ? Duration.zero : const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      left: left,
      top: top,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          widget.onTap();
        },
        onPanStart: (_) {
          HapticFeedback.lightImpact();
          setState(() {
            _isDragging = true;
            _dragLeft = settledLeft;
            _dragTop = currentTop;
          });
        },
        onPanUpdate: (details) {
          setState(() {
            _dragLeft = (_dragLeft + details.delta.dx)
                .clamp(0.0, (screenWidth - _pillWidth).clamp(0.0, screenWidth));
            _dragTop = (_dragTop + details.delta.dy).clamp(minTop, maxTop);
          });
        },
        onPanEnd: (details) {
          final centerX = _dragLeft + (_pillWidth / 2);
          final velocityX = details.velocity.pixelsPerSecond.dx;
          bool snapRight;
          if (velocityX.abs() > 350) {
            snapRight = velocityX > 0;
          } else {
            snapRight = centerX >= (screenWidth / 2);
          }

          HapticFeedback.selectionClick();
          setState(() {
            _isDragging = false;
            _dockedRight = snapRight;
            _topOffset = _dragTop.clamp(minTop, maxTop);
          });
        },
        onPanCancel: () {
          setState(() {
            _isDragging = false;
            _topOffset = _dragTop.clamp(minTop, maxTop);
          });
        },
        child: Material(
          color: Colors.transparent,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: _pillWidth,
            height: _pillHeight,
            padding: EdgeInsets.only(
              left: _dockedRight ? 12 : 10,
              right: _dockedRight ? 10 : 12,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF5B42F3), Color(0xFF7C3AED)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: borderRadius,
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.28),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: _isDragging ? 0.45 : 0.34),
                  blurRadius: _isDragging ? 18 : 12,
                  spreadRadius: _isDragging ? 1 : 0,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.history_rounded,
                  color: Colors.white,
                  size: 19,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    widget.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10.5,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.1,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
