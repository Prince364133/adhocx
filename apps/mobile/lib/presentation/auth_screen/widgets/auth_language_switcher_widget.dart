import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';

class AuthLanguageSwitcherWidget extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const AuthLanguageSwitcherWidget({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopupMenuButton<String>(
      initialValue: selected.toLowerCase(),
      onSelected: onChanged,
      color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
      tooltip: 'Select language',
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'en',
          child: Text(
            'English',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        ),
        PopupMenuItem(
          value: 'hi',
          child: Text(
            'हिन्दी',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        ),
        PopupMenuItem(
          value: 'te',
          child: Text(
            'తెలుగు',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.language,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              size: 18,
            ),
            const SizedBox(width: 6),
            Text(
              selected,
              style: TextStyle(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}