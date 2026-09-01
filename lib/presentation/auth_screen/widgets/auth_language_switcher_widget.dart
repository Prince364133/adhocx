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
      color: const Color(0xFF0d1117),
      tooltip: 'Select language',
      itemBuilder: (context) => const [
        PopupMenuItem(value: 'en', child: Text('English')),
        PopupMenuItem(value: 'hi', child: Text('हिन्दी')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFF1a2332)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.language, color: Color(0xFF94a3b8), size: 18),
            const SizedBox(width: 6),
            Text(
              selected,
              style: const TextStyle(
                color: Color(0xFFf8fafc),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.keyboard_arrow_down,
              color: Color(0xFF94a3b8),
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}