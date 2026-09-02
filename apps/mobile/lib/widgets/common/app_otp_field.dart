import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_typography.dart';


/// Centralized 6-Digit OTP Input Field for AdhocX Mobile.
class AppOtpField extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final bool autofocus;

  const AppOtpField({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.autofocus = true,
  });

  @override
  State<AppOtpField> createState() => _AppOtpFieldState();
}

class _AppOtpFieldState extends State<AppOtpField> {
  late List<TextEditingController> _controllers;
  late List<FocusNode> _focusNodes;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      widget.length,
      (_) => TextEditingController(),
    );
    _focusNodes = List.generate(
      widget.length,
      (_) => FocusNode(),
    );
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
    if (value.length > 1) {
      // Handle paste
      final cleanDigits = value.replaceAll(RegExp(r'\D'), '');
      for (int i = 0; i < widget.length; i++) {
        if (i < cleanDigits.length) {
          _controllers[i].text = cleanDigits[i];
        }
      }
      final otp = _currentOtp;
      widget.onChanged?.call(otp);
      if (otp.length == widget.length) {
        widget.onCompleted(otp);
        _focusNodes.last.unfocus();
      }
      return;
    }

    if (value.isNotEmpty) {
      if (index < widget.length - 1) {
        _focusNodes[index + 1].requestFocus();
      } else {
        _focusNodes[index].unfocus();
      }
    }

    final otp = _currentOtp;
    widget.onChanged?.call(otp);
    if (otp.length == widget.length) {
      widget.onCompleted(otp);
    }
  }

  void _onKeyDown(int index, RawKeyEvent event) {
    if (event is RawKeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _controllers[index].text.isEmpty &&
        index > 0) {
      _focusNodes[index - 1].requestFocus();
      _controllers[index - 1].text = '';
      widget.onChanged?.call(_currentOtp);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(widget.length, (index) {
        return SizedBox(
          width: 46,
          height: 54,
          child: RawKeyboardListener(
            focusNode: FocusNode(),
            onKey: (event) => _onKeyDown(index, event),
            child: TextFormField(
              controller: _controllers[index],
              focusNode: _focusNodes[index],
              autofocus: widget.autofocus && index == 0,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(widget.length), // Allow paste
              ],
              cursorColor: AppColors.primaryLight,
              style: AppTypography.h2(color: AppColors.textPrimaryDark),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.surfaceDark,
                contentPadding: EdgeInsets.zero,
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppRadius.borderMd,
                  borderSide: const BorderSide(
                    color: AppColors.borderDark,
                    width: 1.2,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppRadius.borderMd,
                  borderSide: const BorderSide(
                    color: AppColors.primary,
                    width: 2.0,
                  ),
                ),
              ),
              onChanged: (val) => _onDigitChanged(index, val),
            ),
          ),
        );
      }),
    );
  }
}
