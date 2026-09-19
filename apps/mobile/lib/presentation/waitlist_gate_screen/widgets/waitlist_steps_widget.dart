import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class WaitlistStepsWidget extends StatelessWidget {
  const WaitlistStepsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _Step(number: '1', label: 'KYC\nSubmitted', state: _StepState.done),
        _StepConnector(isActive: true),
        _Step(number: '2', label: 'Admin\nReview', state: _StepState.active),
        _StepConnector(isActive: false),
        _Step(number: '3', label: 'Start\nDriving', state: _StepState.pending),
      ],
    );
  }
}

enum _StepState { done, active, pending }

class _Step extends StatefulWidget {
  final String number;
  final String label;
  final _StepState state;

  const _Step({required this.number, required this.label, required this.state});

  @override
  State<_Step> createState() => _StepState2();
}

class _StepState2 extends State<_Step> with SingleTickerProviderStateMixin {
  AnimationController? _pulseController;
  Animation<double>? _pulseAnimation;

  @override
  void initState() {
    super.initState();
    if (widget.state == _StepState.active) {
      _pulseController = AnimationController(
        duration: const Duration(milliseconds: 1000),
        vsync: this,
      )..repeat(reverse: true);
      _pulseAnimation = Tween<double>(begin: 0.7, end: 1.0).animate(
        CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
      );
    }
  }

  @override
  void dispose() {
    _pulseController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: Column(
        children: [
          _buildCircle(isDark),
          const SizedBox(height: 8),
          Text(
            widget.label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _labelColor(isDark),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircle(bool isDark) {
    final circle = Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: _bgColor(isDark),
        shape: BoxShape.circle,
        border: Border.all(color: _borderColor(isDark), width: 2),
      ),
      child: Center(
        child: widget.state == _StepState.done
            ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
            : Text(
                widget.number,
                style: TextStyle(
                  color: _textColor(isDark),
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
      ),
    );

    if (widget.state == _StepState.active && _pulseAnimation != null) {
      return AnimatedBuilder(
        animation: _pulseAnimation!,
        builder: (context, child) {
          return Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(
                0xFFf59e0b,
              ).withValues(alpha: 0.2 * _pulseAnimation!.value),
              shape: BoxShape.circle,
            ),
            child: Center(child: circle),
          );
        },
      );
    }
    return circle;
  }

  Color _bgColor(bool isDark) => switch (widget.state) {
    _StepState.done => AppColors.success,
    _StepState.active => AppColors.warning,
    _StepState.pending => isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
  };

  Color _borderColor(bool isDark) => switch (widget.state) {
    _StepState.done => AppColors.success,
    _StepState.active => AppColors.warning,
    _StepState.pending => isDark ? AppColors.borderDark : AppColors.borderLight,
  };

  Color _textColor(bool isDark) => switch (widget.state) {
    _StepState.done => Colors.white,
    _StepState.active => AppColors.bgDark,
    _StepState.pending => isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
  };

  Color _labelColor(bool isDark) => switch (widget.state) {
    _StepState.done => AppColors.success,
    _StepState.active => AppColors.warning,
    _StepState.pending => isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
  };
}

class _StepConnector extends StatelessWidget {
  final bool isActive;
  const _StepConnector({required this.isActive});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: 2,
      width: 32,
      margin: const EdgeInsets.only(bottom: 28),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.warning.withAlpha(128)
            : (isDark ? AppColors.borderDark : AppColors.borderLight),
        borderRadius: BorderRadius.circular(1),
      ),
    );
  }
}
