import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

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
    return PopupMenuButton<String>(
      initialValue: selected.toLowerCase(),
      onSelected: onChanged,
      color: AppColors.bgDark,
      tooltip: 'Select language',
      itemBuilder: (context) => const [
        PopupMenuItem(value: 'en', child: Text('English')),
        PopupMenuItem(value: 'hi', child: Text('हिन्दी')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderDark),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.language, color: AppColors.textMutedDark, size: 18),
            const SizedBox(width: 6),
            Text(
              selected,
              style: TextStyle(
                color: AppColors.bgLight,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              color: AppColors.textMutedDark,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}