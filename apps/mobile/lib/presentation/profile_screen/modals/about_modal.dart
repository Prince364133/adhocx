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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.2,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              width: 38,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              Icon(icon, color: iconColor, size: 22),
              const SizedBox(width: 10),
              Text(
                title,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class AboutModal extends StatelessWidget {
  const AboutModal({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _ModalShell(
      title: 'About AdhocX',
      icon: Icons.info_outline_rounded,
      iconColor: AppColors.primary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _AboutSection(
            title: 'Platform Overview',
            body:
                'AdhocX is an advanced enterprise mobility and on-demand transit platform engineered to empower corporate vendors, logistics coordinators, and driver partners with transparent pricing, automated routing, and zero-trust safety protocols.',
          ),
          const SizedBox(height: 16),
          const _AboutSection(
            title: 'Operating Entity',
            body:
                'AdhocX is operated by Estemporaneo Technologies Private Limited, an Indian technology company committed to revolutionizing commercial employee transport and logistics orchestration.',
          ),
          const SizedBox(height: 16),
          const _AboutSection(
            title: 'Safety & Compliance Standards',
            body:
                'All operations comply strictly with statutory workplace safety mandates, featuring automated DigiLocker driver document verification, real-time GPS telemetry, SOS emergency response, and verified security escorts for night shifts.',
          ),
          const SizedBox(height: 16),
          const _AboutSection(
            title: 'Support & Inquiries',
            body:
                'For customer care, corporate partnerships, or driver partner onboarding inquiries, contact support@adhocx.com or call our 24/7 dedicated control tower helpline.',
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevatedDark : AppColors.slate100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            child: Center(
              child: Text(
                'AdhocX is operated by Estemporaneo Technologies Private Limited.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AboutSection extends StatelessWidget {
  final String title;
  final String body;
  const _AboutSection({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          body,
          style: TextStyle(
            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
            fontSize: 13,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
