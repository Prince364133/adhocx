import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Vector illustrations and badges for Batch 07 (Safety, SOS & Helpdesk)

/// 1. Safety Center Security Shield Badge
class SafetyCenterShieldBadge extends StatelessWidget {
  const SafetyCenterShieldBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.primaryBlueLight.withOpacity(0.4),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.shield_rounded, size: 44, color: AppColors.primaryBlue),
      ),
    );
  }
}

/// 2. SOS Siren Large Emergency Button
class SosSirenBadge extends StatelessWidget {
  const SosSirenBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      height: 180,
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444).withOpacity(0.18),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Container(
          width: 140,
          height: 140,
          decoration: BoxDecoration(
            color: const Color(0xFFDC2626),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFDC2626).withOpacity(0.4),
                blurRadius: 24,
                spreadRadius: 4,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.notifications_active_rounded, size: 40, color: Colors.white),
              SizedBox(height: 6),
              Text(
                'SOS',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 3. Safety Call Pulse Avatar (Incoming Call Screen)
class SafetyCallPulseAvatar extends StatelessWidget {
  const SafetyCallPulseAvatar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      height: 160,
      decoration: BoxDecoration(
        color: AppColors.primaryBlue.withOpacity(0.15),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: AppColors.primaryBlue.withOpacity(0.3),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                color: AppColors.primaryBlue,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.headset_mic_rounded,
                size: 44,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 4. Lost Property Luggage Graphic
class LostPropertyBadge extends StatelessWidget {
  const LostPropertyBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100,
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(22),
      ),
      child: const Center(
        child: Icon(
          Icons.backpack_rounded,
          size: 52,
          color: AppColors.primaryBlue,
        ),
      ),
    );
  }
}

/// 5. Reusable Ticket Status Pill
class TicketStatusPill extends StatelessWidget {
  final String status;

  const TicketStatusPill({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFF1F5F9);
    Color fg = AppColors.textSecondary;

    final lower = status.toLowerCase();
    if (lower.contains('resolved') || lower.contains('closed')) {
      bg = AppColors.successLight;
      fg = AppColors.success;
    } else if (lower.contains('progress') || lower.contains('review')) {
      bg = AppColors.warningLight;
      fg = AppColors.warning;
    } else if (lower.contains('open')) {
      bg = AppColors.primaryBlueLight.withOpacity(0.5);
      fg = AppColors.primaryBlueDark;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

