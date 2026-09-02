import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Standardized Form Input Field for AdhocX Mobile.
/// Enforces label hierarchy, error containers, focus states, and styling tokens.
class AppTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType keyboardType;
  final bool obscureText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final String? errorText;
  final String? helperText;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final FormFieldValidator<String>? validator;
  final bool autofocus;
  final bool enabled;
  final int maxLines;
  final TextInputAction? textInputAction;

  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.prefixIcon,
    this.suffixIcon,
    this.errorText,
    this.helperText,
    this.inputFormatters,
    this.onChanged,
    this.onSubmitted,
    this.validator,
    this.autofocus = false,
    this.enabled = true,
    this.maxLines = 1,
    this.textInputAction,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTypography.label(color: AppColors.textSecondaryDark),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          autofocus: autofocus,
          enabled: enabled,
          maxLines: maxLines,
          textInputAction: textInputAction,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          onFieldSubmitted: onSubmitted,
          validator: validator,
          cursorColor: AppColors.primaryLight,
          style: AppTypography.body(color: AppColors.textPrimaryDark),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTypography.body(color: AppColors.textMutedDark),
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: AppColors.surfaceDark,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
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
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.2,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.5,
              ),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: BorderSide(
                color: AppColors.borderDark.withAlpha(80),
                width: 1,
              ),
            ),
          ),
        ),
        if (errorText != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            errorText!,
            style: AppTypography.caption(color: AppColors.errorText),
          ),
        ] else if (helperText != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            helperText!,
            style: AppTypography.caption(color: AppColors.textMutedDark),
          ),
        ],
      ],
    );
  }
}
