import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class PrivacyModal extends StatelessWidget {
  const PrivacyModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Privacy Policy',
      icon: Icons.privacy_tip_outlined,
      iconColor: AppColors.primary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _TermsSection(
            title: 'GPS & Location Data',
            body:
                'AdhocX captures your GPS coordinates every 4 seconds while you are online. This data is used exclusively for trip matching within a 6 km radius and for route optimization. Location data is not shared with third parties.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Data Encryption',
            body:
                'All personal data including Aadhaar, PAN, bank account details, and documents are encrypted at rest using AES-256 encryption. Data in transit is protected by TLS 1.3.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Document Storage',
            body:
                'Uploaded documents are stored in secure cloud storage accessible only to AdhocX administrators for KYC verification purposes. Documents are retained for the duration of your active driver account.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Data Retention',
            body:
                'Trip history and earnings data are retained for 3 years for regulatory compliance. You may request account deletion by contacting operations support, subject to outstanding settlement obligations.',
          ),
        ],
      ),
    );
  }
}

class _TermsSection extends StatelessWidget {
  final String title;
  final String body;
  const _TermsSection({required this.title, required this.body});

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
              Icon(icon, color: iconColor, size: 20),
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
