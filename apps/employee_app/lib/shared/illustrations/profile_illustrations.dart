import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';

/// Vector illustrations and metric cards for Batch 08 (History, Notifications & Profile)

/// 1. Analytics Stat Metric Tile
class AnalyticsStatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const AnalyticsStatTile({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              Icon(icon, size: 20, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// 2. Sign Out Confirmation Badge (Screen 13)
class SignOutConfirmBadge extends StatelessWidget {
  const SignOutConfirmBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFFCA5A5), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.logout_rounded, size: 44, color: Color(0xFFDC2626)),
      ),
    );
  }
}

/// 3. Delete Account Danger Badge (Screen 14)
class DeleteAccountDangerBadge extends StatelessWidget {
  const DeleteAccountDangerBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFFCA5A5), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.delete_forever_rounded, size: 44, color: Color(0xFFDC2626)),
      ),
    );
  }
}


