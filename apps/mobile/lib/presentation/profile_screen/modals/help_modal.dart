import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class _ModalShell extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _ModalShell({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevatedDark,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 22),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
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

class HelpModal extends StatelessWidget {
  const HelpModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Help & Operations Support',
      icon: Icons.headset_mic_rounded,
      iconColor: AppColors.success,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.textPrimaryLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderDark),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Operations Hours',
                  style: TextStyle(
                    color: AppColors.textMutedDark,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Monday – Saturday: 6:00 AM – 10:00 PM',
                  style: TextStyle(color: Colors.white, fontSize: 13),
                ),
                Text(
                  'Sunday: 8:00 AM – 6:00 PM',
                  style: TextStyle(color: Colors.white, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _contactBtn(
            icon: Icons.call_rounded,
            label: 'Call Dispatch (+91 40 4987 6543)',
            color: AppColors.success,
            onTap: () {
              // TODO: url_launcher: launch('tel:+914049876543') for production
            },
          ),
          const SizedBox(height: 12),
          _contactBtn(
            icon: Icons.chat_rounded,
            label: 'WhatsApp Support Desk',
            color: AppColors.textSecondaryLight,
            onTap: () {
              // TODO: url_launcher: launch('https://wa.me/914049876543') for production
            },
          ),
          const SizedBox(height: 16),
          Text(
            'For trip disputes, wallet issues, or document re-verification — contact the operations team during working hours.',
            style: TextStyle(color: AppColors.textSecondaryLight, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _contactBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }
}
