import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

class EmployeeOtpInput extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final bool hasError;
  final String? initialValue;

  const EmployeeOtpInput({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.hasError = false,
    this.initialValue,
  });

  @override
  State<EmployeeOtpInput> createState() => _EmployeeOtpInputState();
}

class _EmployeeOtpInputState extends State<EmployeeOtpInput> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      widget.length,
      (index) {
        final char = (widget.initialValue != null && index < widget.initialValue!.length)
            ? widget.initialValue![index]
            : '';
        return TextEditingController(text: char);
      },
    );
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
  }

  @override
  void didUpdateWidget(covariant EmployeeOtpInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue && widget.initialValue != null) {
      for (int i = 0; i < widget.length; i++) {
        if (i < widget.initialValue!.length) {
          _controllers[i].text = widget.initialValue![i];
        } else {
          _controllers[i].clear();
        }
      }
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _currentOtp => _controllers.map((c) => c.text).join();

  void _onDigitChanged(int index, String value) {
    if (value.isNotEmpty) {
      if (value.length > 1) {
        // Handle paste scenario
        final digits = value.replaceAll(RegExp(r'\D'), '');
        for (int i = 0; i < widget.length && i < digits.length; i++) {
          _controllers[i].text = digits[i];
        }
        final nextIndex = (digits.length < widget.length) ? digits.length : widget.length - 1;
        _focusNodes[nextIndex].requestFocus();
      } else {
        _controllers[index].text = value;
        if (index < widget.length - 1) {
          _focusNodes[index + 1].requestFocus();
        } else {
          _focusNodes[index].unfocus();
        }
      }
    }

    final otp = _currentOtp;
    widget.onChanged?.call(otp);
    if (otp.length == widget.length) {
      widget.onCompleted(otp);
    }
  }

  void _onKeyDown(int index, RawKeyEvent event) {
    if (event is RawKeyDownEvent && event.logicalKey == LogicalKeyboardKey.backspace) {
      if (_controllers[index].text.isEmpty && index > 0) {
        _controllers[index - 1].clear();
        _focusNodes[index - 1].requestFocus();
        widget.onChanged?.call(_currentOtp);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(widget.length, (index) {
        final isFilled = _controllers[index].text.isNotEmpty;
        final hasFocus = _focusNodes[index].hasFocus;

        Color borderColor;
        Color backgroundColor = AppColors.surface;

        if (widget.hasError) {
          borderColor = AppColors.error;
          backgroundColor = AppColors.errorLight.withOpacity(0.35);
        } else if (hasFocus) {
          borderColor = AppColors.primaryBlue;
        } else if (isFilled) {
          borderColor = AppColors.primaryBlue.withOpacity(0.6);
        } else {
          borderColor = AppColors.border;
        }

        return Container(
          width: 48,
          height: 54,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: borderColor,
              width: (hasFocus || widget.hasError) ? 2.0 : 1.2,
            ),
          ),
          child: RawKeyboardListener(
            focusNode: FocusNode(), // auxiliary listener
            onKey: (event) => _onKeyDown(index, event),
            child: TextField(
              controller: _controllers[index],
              focusNode: _focusNodes[index],
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              maxLength: 1,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: widget.hasError ? AppColors.error : AppColors.textPrimary,
              ),
              decoration: const InputDecoration(
                counterText: '',
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                isDense: true,
              ),
              onChanged: (val) => _onDigitChanged(index, val),
            ),
          ),
        );
      }),
    );
  }
}

