import 'package:flutter/material.dart';
import '../../widgets/common/app_otp_field.dart' as common;

/// Dark-styled OTP input (used on corporate ETS panels that are always dark).
///
/// Delegates to the shared single-field implementation in
/// widgets/common/app_otp_field.dart (native keyboard, working backspace,
/// paste / SMS autofill) with [common.AppOtpField.forceDark] set.
class AppOtpField extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return common.AppOtpField(
      length: length,
      onCompleted: onCompleted,
      onChanged: onChanged,
      autofocus: autofocus,
      forceDark: true,
    );
  }
}
