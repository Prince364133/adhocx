import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class OtpDialogWidget extends StatefulWidget {
  final bool isStart;
  final ValueChanged<String> onConfirm;

  const OtpDialogWidget({
    super.key,
    required this.isStart,
    required this.onConfirm,
  });

  @override
  State<OtpDialogWidget> createState() => _OtpDialogWidgetState();
}

class _OtpDialogWidgetState extends State<OtpDialogWidget> {
  final _controllers = List.generate(4, (_) => TextEditingController());
  final _focusNodes = List.generate(4, (_) => FocusNode());
  String get _otp => _controllers.map((c) => c.text).join();
  bool get _isComplete => _otp.length == 4;

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

  void _onDigitChanged(int index, String value) {
    if (value.length == 1 && index < 3) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(isDark ? 102 : 25),
              blurRadius: 32,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.isStart ? 'Enter Start OTP' : 'Enter End OTP',
                  style: TextStyle(
                    color: isDark
                        ? AppColors.textPrimaryDark
                        : AppColors.textPrimaryLight,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Icon(
                    Icons.close_rounded,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                    size: 20,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              widget.isStart
                  ? 'Ask the passenger for their 4-digit start OTP'
                  : 'Ask the passenger for their 4-digit end OTP',
              style: TextStyle(
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textMutedLight,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 28),
            // OTP input boxes
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (i) {
                return Container(
                  width: 56,
                  height: 64,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceElevatedDark
                        : AppColors.surfaceElevatedLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _controllers[i].text.isNotEmpty
                          ? AppColors.warning
                          : (isDark
                              ? AppColors.borderDark
                              : AppColors.borderLight),
                      width: _controllers[i].text.isNotEmpty ? 1.5 : 1,
                    ),
                  ),
                  child: TextField(
                    controller: _controllers[i],
                    focusNode: _focusNodes[i],
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(1),
                    ],
                    style: const TextStyle(
                      color: AppColors.warning,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'monospace',
                      letterSpacing: 2,
                    ),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      counterText: '',
                      contentPadding: EdgeInsets.zero,
                    ),
                    onChanged: (v) => _onDigitChanged(i, v),
                  ),
                );
              }),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isComplete ? () => widget.onConfirm(_otp) : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.warning,
                  foregroundColor: AppColors.bgDark,
                  disabledBackgroundColor:
                      isDark ? AppColors.borderDark : AppColors.borderLight,
                  disabledForegroundColor: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  widget.isStart
                      ? 'Confirm & Start Trip'
                      : 'Confirm & End Trip',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
