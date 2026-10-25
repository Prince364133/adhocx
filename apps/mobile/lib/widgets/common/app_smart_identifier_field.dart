import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Unified Smart Identifier Field:
/// Automatically detects whether the user is typing a Phone Number or Email Address.
/// Seamlessly transitions labels, prefix icons, hints, and validation.
class AppSmartIdentifierField extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final String? errorText;
  final bool enabled;
  final FocusNode? focusNode;

  const AppSmartIdentifierField({
    super.key,
    required this.controller,
    this.onChanged,
    this.onSubmitted,
    this.errorText,
    this.enabled = true,
    this.focusNode,
  });

  /// Check if the input contains text letters or @ indicating an email address
  static bool isEmailInput(String text) {
    final trimmed = text.trim();
    return RegExp(r'[a-zA-Z@]').hasMatch(trimmed);
  }

  /// Parse identifier into structured target data for login / OTP requests
  static Map<String, dynamic> parseIdentifier(String raw) {
    final text = raw.trim();
    final isEmail = isEmailInput(text);
    if (isEmail) {
      final emailVal = text.toLowerCase();
      return {
        'isEmail': true,
        'value': emailVal,
        'phone': null,
        'email': emailVal,
        'channel': 'EMAIL',
      };
    } else {
      final digits = text.replaceAll(RegExp(r'\D'), '');
      final clean10 = digits.length > 10 && digits.startsWith('91')
          ? digits.substring(digits.length - 10)
          : (digits.length > 10 ? digits.substring(0, 10) : digits);
      final formatted = '+91$clean10';
      return {
        'isEmail': false,
        'value': formatted,
        'phone': formatted,
        'email': null,
        'channel': 'SMS',
        'rawDigits': clean10,
      };
    }
  }

  /// Universal validator for phone or email
  static String? validate(String? value) {
    final text = (value ?? '').trim();
    if (text.isEmpty) {
      return 'Enter mobile number or email';
    }

    if (isEmailInput(text)) {
      final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
      if (!emailRegex.hasMatch(text)) {
        return 'Enter a valid email address';
      }
    } else {
      final digits = text.replaceAll(RegExp(r'\D'), '');
      if (digits.length != 10) {
        return 'Enter a valid 10-digit mobile number';
      }
    }
    return null;
  }

  @override
  State<AppSmartIdentifierField> createState() => _AppSmartIdentifierFieldState();
}

class _AppSmartIdentifierFieldState extends State<AppSmartIdentifierField> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_handleTextChange);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleTextChange);
    super.dispose();
  }

  void _handleTextChange() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final text = widget.controller.text.trim();
    final isEmpty = text.isEmpty;
    final isEmail = AppSmartIdentifierField.isEmailInput(text);

    // Dynamic Label
    final label = isEmpty
        ? 'Mobile Number or Email'
        : (isEmail ? 'Email Address' : 'Mobile Number');

    // Dynamic Hint
    final hint = isEmpty
        ? 'Enter mobile number or email'
        : (isEmail ? 'name@example.com' : '98765 43210');

    // Dynamic Prefix Icon
    final Widget prefixWidget;
    if (isEmpty) {
      prefixWidget = Icon(
        Icons.alternate_email_rounded,
        size: 20,
        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      );
    } else if (isEmail) {
      prefixWidget = Icon(
        Icons.email_outlined,
        size: 20,
        color: isDark ? AppColors.primaryLight : AppColors.primary,
      );
    } else {
      prefixWidget = Container(
        padding: const EdgeInsets.only(left: 12, right: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.phone_iphone_rounded,
              size: 18,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
            const SizedBox(width: 6),
            Text(
              '+91',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              height: 18,
              width: 1,
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ],
        ),
      );
    }

    // Dynamic Mode Badge
    final Widget? suffixWidget;
    if (isEmpty) {
      suffixWidget = null;
    } else if (isEmail) {
      suffixWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.mail_outline_rounded,
              size: 12,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
            const SizedBox(width: 4),
            Text(
              'Email',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
              ),
            ),
          ],
        ),
      );
    } else {
      suffixWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.phone_rounded,
              size: 12,
              color: AppColors.success,
            ),
            const SizedBox(width: 4),
            const Text(
              'Mobile',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.success,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: Text(
            label,
            key: ValueKey(label),
            style: AppTypography.caption(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextFormField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          enabled: widget.enabled,
          keyboardType: TextInputType.emailAddress,
          cursorColor: isDark ? AppColors.primaryLight : AppColors.primary,
          inputFormatters: [
            TextInputFormatter.withFunction((oldVal, newVal) {
              final newText = newVal.text;
              if (AppSmartIdentifierField.isEmailInput(newText)) {
                return newVal;
              }
              final digits = newText.replaceAll(RegExp(r'\D'), '');
              if (digits.length > 10) {
                if (digits.startsWith('91') && digits.length >= 12) {
                  final truncated = digits.substring(digits.length - 10);
                  return TextEditingValue(
                    text: truncated,
                    selection: TextSelection.collapsed(offset: truncated.length),
                  );
                }
                final truncated = digits.substring(0, 10);
                return TextEditingValue(
                  text: truncated,
                  selection: TextSelection.collapsed(offset: truncated.length),
                );
              }
              return newVal;
            }),
          ],
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          validator: AppSmartIdentifierField.validate,
          onChanged: widget.onChanged,
          onFieldSubmitted: widget.onSubmitted,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: prefixWidget,
            prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            suffixIcon: suffixWidget,
            suffixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.error, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
