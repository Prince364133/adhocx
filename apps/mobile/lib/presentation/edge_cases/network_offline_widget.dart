import 'package:flutter/material.dart';
import '../../services/edge_case_manager.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Network Offline global alert banner & fallback widget.
class NetworkOfflineWidget extends StatelessWidget {
  final bool isBannerOnly;
  const NetworkOfflineWidget({super.key, this.isBannerOnly = true});

  @override
  Widget build(BuildContext context) {
    if (isBannerOnly) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        color: AppColors.error,
        child: Row(
          children: [
            const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Network Offline • Check your internet connection',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ).copyWith(fontSize: 11),
              ),
            ),
            GestureDetector(
              onTap: () => EdgeCaseManager.instance.retryNetworkConnection(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  'Try Again',
                  style: AppTypography.caption(
                    color: AppColors.error,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.error),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'No Internet Connection',
            style: AppTypography.h2(
              color: AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Your network appears to be offline. Please connect to Wi-Fi or mobile data to receive trip offers.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          ElevatedButton(
            onPressed: () => EdgeCaseManager.instance.retryNetworkConnection(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
            child: const Text('RETRY CONNECTION', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
