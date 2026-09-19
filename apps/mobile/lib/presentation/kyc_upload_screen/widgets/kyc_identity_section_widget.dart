import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class KycIdentitySectionWidget extends StatelessWidget {
  final ValueChanged<Map<String, String>> onSaved;

  const KycIdentitySectionWidget({super.key, required this.onSaved});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _KycSection(
      isDark: isDark,
      title: 'Identity & Contact',
      sectionNumber: '1',
      child: Column(
        children: [
          _KycField(
            isDark: isDark,
            label: 'Full Legal Name',
            hint: 'As on Aadhaar card',
            icon: Icons.person_outline_rounded,
            onSaved: (v) => onSaved({'full_name': v ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 14),
          _KycField(
            isDark: isDark,
            label: 'Phone Number',
            hint: '9876543210',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
            onSaved: (v) => onSaved({'phone': v ?? ''}),
            validator: (v) =>
                (v == null || v.length != 10) ? 'Enter 10-digit number' : null,
          ),
          const SizedBox(height: 14),
          _KycField(
            isDark: isDark,
            label: 'Aadhaar Card Number',
            hint: 'XXXX XXXX XXXX',
            icon: Icons.badge_outlined,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(12),
            ],
            onSaved: (v) => onSaved({'aadhaar': v ?? ''}),
            validator: (v) =>
                (v == null || v.length != 12) ? 'Enter 12-digit Aadhaar' : null,
          ),
          const SizedBox(height: 14),
          _KycField(
            isDark: isDark,
            label: 'PAN Card Number',
            hint: 'ABCDE1234F',
            icon: Icons.credit_card_outlined,
            textCapitalization: TextCapitalization.characters,
            inputFormatters: [
              UpperCaseTextFormatter(), 
              FilteringTextInputFormatter.allow(
                RegExp(r'[A-Za-z0-9]'),
              ), 
              LengthLimitingTextInputFormatter(10), 
            ],
            onSaved: (v) => onSaved({'pan': v?.toUpperCase() ?? ''}),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Required';
              final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
              if (!panRegex.hasMatch(v.toUpperCase())) {
                return 'Invalid PAN format';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }
}

// Shared section wrapper
class _KycSection extends StatelessWidget {
  final bool isDark;
  final String title;
  final String sectionNumber;
  final Widget child;

  const _KycSection({
    required this.isDark,
    required this.title,
    required this.sectionNumber,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    sectionNumber,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.success,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

// Shared field widget
class _KycField extends StatelessWidget {
  final bool isDark;
  final String label;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final FormFieldSetter<String>? onSaved;
  final FormFieldValidator<String>? validator;

  const _KycField({
    required this.isDark,
    required this.label,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.onSaved,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          inputFormatters: inputFormatters,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: Icon(
              icon,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              size: 18,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.success),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.error),
            ),
          ),
          onSaved: onSaved,
          validator: validator,
        ),
      ],
    );
  }
}

// Custom Formatter to automatically convert lowercase typing to uppercase
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}