import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Centralized Phone Number Input with +91 Country Badge.
class AppPhoneField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  const AppPhoneField({
    super.key,
    required this.controller,
    this.label = 'Mobile Number',
    this.errorText,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTypography.label(color: AppColors.textSecondaryDark),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: controller,
          keyboardType: TextInputType.phone,
          enabled: enabled,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          onChanged: onChanged,
          onFieldSubmitted: onSubmitted,
          cursorColor: AppColors.primaryLight,
          style: AppTypography.body(color: AppColors.textPrimaryDark),
          decoration: InputDecoration(
            hintText: '98765 43210',
            hintStyle: AppTypography.body(color: AppColors.textMutedDark),
            prefixIcon: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              margin: const EdgeInsets.only(right: AppSpacing.sm),
              decoration: const BoxDecoration(
                border: Border(
                  right: BorderSide(
                    color: AppColors.borderDark,
                    width: 1.2,
                  ),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.phone_iphone_rounded,
                    size: 18,
                    color: AppColors.textSecondaryDark,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    '+91',
                    style: AppTypography.bodyMedium(
                      color: AppColors.textPrimaryDark,
                    ),
                  ),
                ],
              ),
            ),
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
          ),
          validator: (value) {
            if (value == null || value.trim().length != 10) {
              return 'Enter a valid 10-digit mobile number';
            }
            return null;
          },
        ),
        if (errorText != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            errorText!,
            style: AppTypography.caption(color: AppColors.errorText),
          ),
        ],
      ],
    );
  }
}
