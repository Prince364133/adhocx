import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../services/edge_case_manager.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Modal/Sheet displayed when Location Permission is Required.
class LocationPermissionModal extends StatelessWidget {
  const LocationPermissionModal({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1a000000),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.borderLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.location_on_outlined,
              color: AppColors.primary,
              size: 36,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          Text(
            'Location Permission Required',
            style: AppTypography.h2(
              color: AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),

          Text(
            'AdhocX requires background location access to match you with nearby trip requests and navigate during active trips.',
            style: AppTypography.body(
              color: AppColors.textSecondaryLight,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),

          AppPrimaryButton(
            text: 'ENABLE LOCATION SERVICES',
            onPressed: () {
              EdgeCaseManager.instance.grantLocationPermission();
              Fluttertoast.showToast(
                msg: 'Location permission granted!',
                backgroundColor: AppColors.accentGreenDark,
              );
            },
          ),
          const SizedBox(height: AppSpacing.md),

          TextButton(
            onPressed: () {
              Fluttertoast.showToast(
                msg: 'Location access is required to receive trip offers.',
                backgroundColor: AppColors.warning,
              );
            },
            child: Text(
              'Not Now',
              style: AppTypography.body(color: AppColors.textMutedLight),
            ),
          ),
        ],
      ),
    );
  }
}
