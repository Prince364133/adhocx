import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'about_modal.dart' show kAdhocxOperatorStatement;

class PrivacyModal extends StatelessWidget {
  /// Vendor (business booker) privacy notice instead of the driver-partner one.
  final bool forVendor;
  const PrivacyModal({super.key, this.forVendor = false});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Privacy Policy',
      icon: Icons.privacy_tip_outlined,
      iconColor: AppColors.primary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: forVendor ? _vendorSections : _driverSections,
      ),
    );
  }

  static const List<Widget> _vendorSections = [
    _TermsSection(
      title: 'What We Collect',
      body:
          'Your name, phone number, email, organisation details, the pickup and drop addresses and map pins you book with, and your booking and payment history.',
    ),
    SizedBox(height: 16),
    _TermsSection(
      title: 'Location',
      body:
          'Your device location is used only while you are choosing a pickup or drop point (to show nearby places or when you tap "Use Current Location"). The pins you confirm are shared with the assigned driver so they can navigate to the exact point.',
    ),
    SizedBox(height: 16),
    _TermsSection(
      title: 'Who Sees Your Booking',
      body:
          'The assigned driver sees the pickup and drop points and the contact details needed to complete the trip. AdhocX staff can access booking records for support, billing and safety.',
    ),
    SizedBox(height: 16),
    _TermsSection(
      title: 'Retention & Deletion',
      body:
          'Booking and billing records are kept as required for accounting and regulatory purposes. You can request account deletion from the Support Center, subject to any outstanding bookings or dues.',
    ),
    SizedBox(height: 16),
    _TermsSection(
      title: 'Operator',
      body: kAdhocxOperatorStatement,
    ),
  ];

  static const List<Widget> _driverSections = [
    _TermsSection(
      title: 'GPS & Location Data',
      body:
          'While you are online, AdhocX records your GPS location every few seconds. It is used for matching you with nearby trips, navigation, trip safety and route optimisation. Location data is not sold to third parties.',
    ),
    SizedBox(height: 16),
    _TermsSection(
      title: 'Data Protection',
      body:
          'Personal data such as Aadhaar, PAN, bank account details and documents is access-restricted to authorised AdhocX staff and is transmitted over encrypted (HTTPS) connections.',
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
    SizedBox(height: 16),
    _TermsSection(
      title: 'Operator',
      body: kAdhocxOperatorStatement,
    ),
  ];
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
