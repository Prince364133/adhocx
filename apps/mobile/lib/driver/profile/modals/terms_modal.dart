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
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
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

class TermsModal extends StatelessWidget {
  const TermsModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Terms & Conditions',
      icon: Icons.gavel_rounded,
      iconColor: const Color(0xFF94a3b8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _TermsSection(
            title: 'OTP Requirement',
            body:
                'Every trip must be started and ended with a valid OTP provided by the passenger. Trips started or ended without OTP validation are invalid and will not be compensated.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Driver Conduct',
            body:
                'Drivers must maintain professional conduct at all times. Use of mobile phone while driving, smoking in the vehicle, or inappropriate behavior towards passengers will result in immediate account suspension.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Settlement Policy',
            body:
                'Earnings are credited to your wallet upon trip completion. Withdrawal requests are processed within 30–60 minutes to your linked bank account or UPI ID. Minimum withdrawal amount is ₹100.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Vehicle Compliance',
            body:
                'Your vehicle must have valid commercial insurance, RC, and fitness certificate at all times. AdhocX reserves the right to suspend accounts with expired documents.',
          ),
          SizedBox(height: 16),
          _TermsSection(
            title: 'Trip Acceptance',
            body:
                'Consistent trip decline rates above 30% may result in reduced broadcast priority. Accepting a trip and then cancelling without valid reason may attract penalties.',
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
          style: const TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 13,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
