import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';

/// Production-ready OTP / Verification PIN input widget.
/// Auto-advances focus, handles backspace deletion cleanly, and supports error states.
class EmployeeOtpInput extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final bool hasError;
  final String? initialValue;
  final double boxSize;

  const EmployeeOtpInput({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.hasError = false,
    this.initialValue,
    this.boxSize = 48,
  });

  @override
  State<EmployeeOtpInput> createState() => _EmployeeOtpInputState();
}

class _EmployeeOtpInputState extends State<EmployeeOtpInput> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;
  late final List<FocusNode> _keyboardFocusNodes;
  late final List<double> _digitScales;
  late final List<Timer?> _digitTimers;
  late final List<int> _digitRippleVersions;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      widget.length,
      (index) {
        final char =
            (widget.initialValue != null && index < widget.initialValue!.length)
                ? widget.initialValue![index]
                : '';
        return TextEditingController(text: char);
      },
    );
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
    _keyboardFocusNodes = List.generate(widget.length, (_) => FocusNode());
    _digitScales = List<double>.filled(widget.length, 1);
    _digitTimers = List<Timer?>.filled(widget.length, null);
    _digitRippleVersions = List<int>.filled(widget.length, 0);
    for (final focusNode in _focusNodes) {
      focusNode.addListener(_handleFocusChange);
    }
  }

  void _handleFocusChange() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant EmployeeOtpInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != null) {
      for (int i = 0; i < widget.length; i++) {
        _controllers[i].text =
            i < widget.initialValue!.length ? widget.initialValue![i] : '';
      }
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.removeListener(_handleFocusChange);
      f.dispose();
    }
    for (final f in _keyboardFocusNodes) {
      f.dispose();
    }
    for (final timer in _digitTimers) {
      timer?.cancel();
    }
    super.dispose();
  }

  String get _currentOtp => _controllers.map((c) => c.text).join();

  void _onChanged(String value, int index) {
    final oldValues =
        _controllers.map((controller) => controller.text).toList();
    if (value.length > 1) {
      final trimmed = value.replaceAll(RegExp(r'[^0-9]'), '');
      final pasted = trimmed.substring(
        0,
        trimmed.length > widget.length ? widget.length : trimmed.length,
      );
      for (int i = 0; i < widget.length; i++) {
        _controllers[i].value = TextEditingValue(
          text: i < pasted.length ? pasted[i] : '',
          selection: TextSelection.collapsed(offset: i < pasted.length ? 1 : 0),
        );
      }
      if (pasted.length == widget.length) {
        _focusNodes[index].unfocus();
      } else {
        _focusNodes[pasted.length].requestFocus();
      }
    } else if (value.isNotEmpty) {
      if (index < widget.length - 1) {
        _focusNodes[index + 1].requestFocus();
      } else {
        _focusNodes[index].unfocus();
      }
    }

    final otp = _currentOtp;
    for (var i = 0; i < widget.length; i++) {
      if (oldValues[i] != _controllers[i].text) {
        _animateDigit(i, isFilled: _controllers[i].text.isNotEmpty);
      }
    }
    if (mounted) setState(() {});
    widget.onChanged?.call(otp);
    if (otp.length == widget.length) {
      widget.onCompleted(otp);
    }
  }

  void _animateDigit(int index, {required bool isFilled}) {
    _digitTimers[index]?.cancel();
    _digitScales[index] = isFilled ? 1.07 : 0.94;
    _digitRippleVersions[index]++;
    _digitTimers[index] = Timer(const Duration(milliseconds: 145), () {
      if (mounted) setState(() => _digitScales[index] = 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final gap = math.min(
          8.0,
          math.max(
            0.0,
            (constraints.maxWidth - widget.length * 24) /
                math.max(1, widget.length - 1),
          ),
        );
        final cellSize = math.min(
          widget.boxSize,
          (constraints.maxWidth - gap * (widget.length - 1)) / widget.length,
        );

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(widget.length, (index) {
            final isFocused = _focusNodes[index].hasFocus;
            final hasValue = _controllers[index].text.isNotEmpty;

            Color borderColor = AppColors.border;
            if (widget.hasError) {
              borderColor = AppColors.error;
            } else if (isFocused) {
              borderColor = AppColors.primaryBlue;
            } else if (hasValue) {
              borderColor = AppColors.primaryBlueLight;
            }

            final cell = SizedBox(
              width: cellSize,
              height: cellSize + 8,
              child: KeyboardListener(
                focusNode: _keyboardFocusNodes[index],
                onKeyEvent: (event) {
                  if (event is KeyDownEvent &&
                      event.logicalKey == LogicalKeyboardKey.backspace &&
                      _controllers[index].text.isEmpty &&
                      index > 0) {
                    _focusNodes[index - 1].requestFocus();
                    _controllers[index - 1].clear();
                  }
                },
                child: AnimatedContainer(
                  duration: reduceMotion
                      ? Duration.zero
                      : const Duration(milliseconds: 180),
                  curve: Curves.easeOutCubic,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: isFocused
                        ? [
                            BoxShadow(
                              color:
                                  AppColors.primaryBlue.withValues(alpha: 0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      if (_digitRippleVersions[index] > 0 && !reduceMotion)
                        TweenAnimationBuilder<double>(
                          key: ValueKey(
                              'otp-ripple-$index-${_digitRippleVersions[index]}'),
                          tween: Tween<double>(begin: 0, end: 1),
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, child) => Opacity(
                            opacity: (1 - value) * 0.32,
                            child: Transform.scale(
                              scale: 0.72 + (0.78 * value),
                              child: child,
                            ),
                          ),
                          child: Container(
                            width: cellSize,
                            height: cellSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.primaryBlue,
                                width: 1.2,
                              ),
                            ),
                          ),
                        ),
                      AnimatedScale(
                        scale: _digitScales[index],
                        duration: reduceMotion
                            ? Duration.zero
                            : const Duration(milliseconds: 145),
                        curve: Curves.easeOutBack,
                        child: TextField(
                          controller: _controllers[index],
                          focusNode: _focusNodes[index],
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: math.min(20, cellSize * 0.52),
                            fontWeight: FontWeight.w700,
                            color: widget.hasError
                                ? AppColors.error
                                : AppColors.textPrimary,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          decoration: InputDecoration(
                            counterText: '',
                            contentPadding: EdgeInsets.zero,
                            filled: true,
                            fillColor: isFocused
                                ? AppColors.primaryBlueSoft
                                : (widget.hasError
                                    ? AppColors.errorLight
                                    : Colors.white),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide:
                                  BorderSide(color: borderColor, width: 1.5),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                color: widget.hasError
                                    ? AppColors.error
                                    : AppColors.primaryBlue,
                                width: 2,
                              ),
                            ),
                          ),
                          onChanged: (val) => _onChanged(val, index),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );

            if (reduceMotion) return cell;

            return TweenAnimationBuilder<double>(
              key: ValueKey('otp-cell-$index'),
              tween: Tween(begin: 0, end: 1),
              duration: Duration(milliseconds: 280 + index * 45),
              curve: Curves.easeOutCubic,
              builder: (context, value, child) => Opacity(
                opacity: value,
                child: Transform.translate(
                  offset: Offset(0, 8 * (1 - value)),
                  child: child,
                ),
              ),
              child: cell,
            );
          }),
        );
      },
    );
  }
}

/// Standard Outlined Text Form Field for forms and filters.
class EmployeeTextField extends StatelessWidget {
  final String? label;
  final String? hintText;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int maxLines;
  final String? errorText;

  const EmployeeTextField({
    super.key,
    this.label,
    this.hintText,
    this.controller,
    this.onChanged,
    this.prefixIcon,
    this.suffix,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: controller,
          onChanged: onChanged,
          obscureText: obscureText,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle:
                GoogleFonts.inter(fontSize: 14, color: AppColors.textMuted),
            prefixIcon: prefixIcon != null
                ? Icon(prefixIcon, size: 20, color: AppColors.textMuted)
                : null,
            suffixIcon: suffix,
            errorText: errorText,
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.border, width: 1.2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppColors.primaryBlue, width: 1.8),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.error, width: 1.2),
            ),
          ),
        ),
      ],
    );
  }
}
