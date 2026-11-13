import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_typography.dart';

/// Centralized OTP input for AdhocX Mobile.
///
/// One real (invisible) [TextField] sits over [length] display boxes and is
/// driven by the phone's native number keyboard. The previous version used
/// one TextField per box, which broke on soft keyboards: typing into a filled
/// box was treated as a paste and scrambled the code, and backspace could not
/// move to the previous box (soft keyboards don't send key events for it).
/// A single field fixes both and enables SMS one-time-code autofill / paste.
class AppOtpField extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final bool autofocus;

  /// Always use the dark styling (for panels that sit on a dark surface
  /// regardless of the app theme).
  final bool forceDark;

  const AppOtpField({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.autofocus = true,
    this.forceDark = false,
  });

  @override
  State<AppOtpField> createState() => _AppOtpFieldState();
}

class _AppOtpFieldState extends State<AppOtpField> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  String? _lastCompleted;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_rebuild);
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _focusNode
      ..removeListener(_rebuild)
      ..dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String raw) {
    final otp = raw.replaceAll(RegExp(r'\D'), '');
    setState(() {});
    widget.onChanged?.call(otp);
    if (otp.length < widget.length) {
      _lastCompleted = null;
    } else if (otp != _lastCompleted) {
      _lastCompleted = otp;
      _focusNode.unfocus();
      widget.onCompleted(otp);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark =
        widget.forceDark || Theme.of(context).brightness == Brightness.dark;
    final otp = _controller.text;
    final activeIndex =
        otp.length < widget.length ? otp.length : widget.length - 1;

    final row = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(widget.length, (index) {
        final isActive = _focusNode.hasFocus && index == activeIndex;
        return Container(
          width: 46,
          height: 54,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
            borderRadius: AppRadius.borderMd,
            border: Border.all(
              color: isActive
                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
              width: isActive ? 2.0 : 1.2,
            ),
          ),
          child: Text(
            index < otp.length ? otp[index] : '',
            key: ValueKey('app-otp-digit-$index'),
            style: AppTypography.h2(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        );
      }),
    );

    return Semantics(
      label: 'One-time password, ${widget.length} digits',
      child: Stack(
        children: [
          ExcludeSemantics(child: row),
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
              style: const TextStyle(
                color: Colors.transparent,
                fontSize: 1,
                height: 1,
              ),
              decoration: const InputDecoration.collapsed(hintText: null),
              onChanged: _onChanged,
            ),
          ),
        ],
      ),
    );
  }
}
