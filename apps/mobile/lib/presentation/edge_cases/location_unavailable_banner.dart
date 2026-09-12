import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import '../../services/edge_case_manager.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Banner displayed when Location GPS is Unavailable or weak.
class LocationUnavailableBanner extends StatelessWidget {
  const LocationUnavailableBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      color: AppColors.warningContainer,
      child: Row(
        children: [
          const Icon(
            Icons.location_off_rounded,
            color: AppColors.warning,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Location Unavailable • Weak GPS signal. Enable High Accuracy mode.',
              style: AppTypography.caption(
                color: AppColors.warningText,
                fontWeight: FontWeight.w600,
              ).copyWith(fontSize: 11),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              EdgeCaseManager.instance.retryLocationFix();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.warning,
                borderRadius: BorderRadius.circular(AppRadius.xs),
              ),
              child: Text(
                'Retry GPS',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ).copyWith(fontSize: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
