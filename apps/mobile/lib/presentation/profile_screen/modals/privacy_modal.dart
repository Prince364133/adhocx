import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class PrivacyModal extends StatelessWidget {
  const PrivacyModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Privacy Policy',
      icon: Icons.privacy_tip_outlined,
      iconColor: AppColors.textMutedDark,
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          body,
          style: TextStyle(
            color: AppColors.textMutedDark,
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
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
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
