import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';

/// Toggle card for requesting a Security Escort guard during booking.
/// The actual escort charge is resolved on the server from Platform Policy.
class SecurityEscortToggleCard extends StatelessWidget {
  final bool hasEscort;
  final double? escortFeeRupees;
  final ValueChanged<bool> onChanged;

  const SecurityEscortToggleCard({
    super.key,
    required this.hasEscort,
    this.escortFeeRupees,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final badgeLabel = (escortFeeRupees != null && escortFeeRupees! > 0)
        ? '+₹${escortFeeRupees!.toStringAsFixed(0)}'
        : (escortFeeRupees == 0 ? 'Included' : 'Guard Add-on');

    return InkWell(
      onTap: () => onChanged(!hasEscort),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: hasEscort
              ? AppColors.accentPurple.withValues(alpha: 0.08)
              : (isDark ? AppColors.bgDark : AppColors.bgLight),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: hasEscort
                ? AppColors.accentPurple.withValues(alpha: 0.45)
                : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.shield_outlined,
              size: 18,
              color: hasEscort
                  ? AppColors.accentPurple
                  : (isDark ? AppColors.slate400 : AppColors.slate500),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 2,
                children: [
                  Text(
                    'Security Escort',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.accentPurple.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      badgeLabel,
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.accentPurple,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            Transform.scale(
              scale: 0.8,
              child: Switch(
                value: hasEscort,
                activeThumbColor: AppColors.accentPurple,
                onChanged: onChanged,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

