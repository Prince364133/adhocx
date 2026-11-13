import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';

/// Production-ready OTP / Verification PIN input widget.
///
/// Uses ONE real [TextField] (invisible, laid over the boxes) driven by the
/// phone's native number keyboard, and renders the [length] boxes purely for
/// display. A single field is what makes native-keyboard entry reliable:
/// - backspace works on every soft keyboard (no cross-field key events needed),
/// - typing never "overwrites" a filled box into a fake paste,
/// - SMS one-time-code autofill (iOS) / paste fills the whole code at once.
class EmployeeOtpInput extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final bool hasError;
  final String? initialValue;
  final double boxSize;

  /// Opens the native keyboard as soon as the screen appears.
  final bool autofocus;

  const EmployeeOtpInput({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.hasError = false,
    this.initialValue,
    this.boxSize = 48,
    this.autofocus = true,
  });

  @override
  State<EmployeeOtpInput> createState() => _EmployeeOtpInputState();
}

class _EmployeeOtpInputState extends State<EmployeeOtpInput> {
  static const double _cellGap = 8;

  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  late final List<double> _digitScales;
  late final List<Timer?> _digitTimers;
  late final List<int> _digitRippleVersions;
  String _lastValue = '';
  String? _lastCompleted;

  @override
  void initState() {
    super.initState();
    _lastValue = _sanitize(widget.initialValue ?? '');
    _controller = TextEditingController(text: _lastValue);
    _focusNode = FocusNode()..addListener(_handleFocusChange);
    _digitScales = List<double>.filled(widget.length, 1);
    _digitTimers = List<Timer?>.filled(widget.length, null);
    _digitRippleVersions = List<int>.filled(widget.length, 0);
  }

  void _handleFocusChange() {
    if (mounted) setState(() {});
  }

  String _sanitize(String raw) {
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length > widget.length
        ? digits.substring(0, widget.length)
        : digits;
  }

  @override
  void didUpdateWidget(covariant EmployeeOtpInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != null) {
      final next = _sanitize(widget.initialValue!);
      _controller.value = TextEditingValue(
        text: next,
        selection: TextSelection.collapsed(offset: next.length),
      );
      _lastValue = next;
      _lastCompleted = null;
    }
    // A rejected code re-opens the keyboard so the user can correct it.
    if (widget.hasError && !oldWidget.hasError && !_focusNode.hasFocus) {
      _focusNode.requestFocus();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode
      ..removeListener(_handleFocusChange)
      ..dispose();
    for (final timer in _digitTimers) {
      timer?.cancel();
    }
    super.dispose();
  }

  void _onChanged(String raw) {
    final otp = _sanitize(raw);
    final previous = _lastValue;
    _lastValue = otp;

    for (var i = 0; i < widget.length; i++) {
      final before = i < previous.length ? previous[i] : '';
      final after = i < otp.length ? otp[i] : '';
      if (before != after) _animateDigit(i, isFilled: after.isNotEmpty);
    }
    if (mounted) setState(() {});

    widget.onChanged?.call(otp);
    if (otp.length < widget.length) {
      _lastCompleted = null;
    } else if (otp != _lastCompleted) {
      _lastCompleted = otp;
      _focusNode.unfocus();
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
    final otp = _controller.text;
    final hasFocus = _focusNode.hasFocus;
    // The box the next digit lands in (last box once the code is complete).
    final activeIndex =
        otp.length < widget.length ? otp.length : widget.length - 1;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Shrink boxes on narrow phones instead of overflowing the row.
        final available = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : widget.boxSize * widget.length +
                _cellGap * (widget.length - 1);
        final fitted =
            (available - _cellGap * (widget.length - 1)) / widget.length;
        final boxWidth = fitted < widget.boxSize ? fitted : widget.boxSize;
        final boxHeight = boxWidth + 8;

        final row = Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.length, (index) {
            final digit = index < otp.length ? otp[index] : '';
            final isActive = hasFocus && index == activeIndex;
            final cell = _buildCell(
              index: index,
              digit: digit,
              isActive: isActive,
              width: boxWidth,
              height: boxHeight,
              reduceMotion: reduceMotion,
            );

            final spaced = Padding(
              padding: EdgeInsets.only(
                right: index == widget.length - 1 ? 0 : _cellGap,
              ),
              child: cell,
            );
            if (reduceMotion) return spaced;

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
              child: spaced,
            );
          }),
        );

        return Semantics(
          label: 'One-time password, ${widget.length} digits',
          child: Stack(
              alignment: Alignment.center,
              children: [
                // Display-only boxes (the real input sits on top of them).
                ExcludeSemantics(child: row),
                // The single native-keyboard input. Invisible text/cursor,
                // but still receives taps, long-press paste and autofill.
                Positioned.fill(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    autofocus: widget.autofocus,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(widget.length),
                    ],
                    showCursor: false,
                    enableSuggestions: false,
                    autocorrect: false,
                    expands: true,
                    maxLines: null,
                    minLines: null,
                    textAlignVertical: TextAlignVertical.center,
                    style: const TextStyle(
                      color: Colors.transparent,
                      fontSize: 1,
                      height: 1,
                    ),
                    decoration: const InputDecoration.collapsed(
                      hintText: null,
                    ),
                    onChanged: _onChanged,
                  ),
                ),
              ],
          ),
        );
      },
    );
  }

  Widget _buildCell({
    required int index,
    required String digit,
    required bool isActive,
    required double width,
    required double height,
    required bool reduceMotion,
  }) {
    final hasValue = digit.isNotEmpty;

    Color borderColor = AppColors.border;
    double borderWidth = 1.5;
    if (widget.hasError) {
      borderColor = AppColors.error;
    } else if (isActive) {
      borderColor = AppColors.primaryBlue;
      borderWidth = 2;
    } else if (hasValue) {
      borderColor = AppColors.primaryBlueLight;
    }

    final fillColor = widget.hasError
        ? AppColors.errorLight
        : (isActive ? AppColors.primaryBlueSoft : AppColors.surface);

    return SizedBox(
      width: width,
      height: height,
      child: AnimatedContainer(
        duration:
            reduceMotion ? Duration.zero : const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: fillColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: borderWidth),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppColors.primaryBlue.withValues(alpha: 0.1),
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
                  width: width,
                  height: width,
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
              child: Text(
                digit,
                key: ValueKey('otp-digit-$index'),
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: widget.hasError
                      ? AppColors.error
                      : AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
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
