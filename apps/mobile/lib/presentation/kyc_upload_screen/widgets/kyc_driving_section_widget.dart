import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class KycDrivingSectionWidget extends StatelessWidget {
  final ValueChanged<Map<String, String>> onSaved;

  const KycDrivingSectionWidget({super.key, required this.onSaved});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('2', 'Driving Credentials'),
          const SizedBox(height: 24),
          _label(isDark, 'Driver License Number'),
          const SizedBox(height: 8),
          TextFormField(
            textCapitalization: TextCapitalization.characters,
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              hintText: 'TS09 20220012345',
              hintStyle: TextStyle(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              prefixIcon: Icon(
                Icons.drive_eta_outlined,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                size: 20,
              ),
              filled: true,
              fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
              contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.success),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.error),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.error),
              ),
            ),
            onSaved: (v) => onSaved({'dl_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
        ],
      ),
    );
  }

  Widget _label(bool isDark, String text) => Text(
    text,
    style: TextStyle(
      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      fontSize: 13,
      fontWeight: FontWeight.w500,
    ),
  );

  Widget _sectionHeader(String num, String title) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppColors.successContainer,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Text(
              num,
              style: const TextStyle(
                color: AppColors.success,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.success,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}