import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../services/edge_case_manager.dart';
import '../../services/permission_service.dart';
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.1),
            blurRadius: 16,
            offset: const Offset(0, -4),
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
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.location_on_outlined,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
              size: 36,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          Text(
            'Location Permission Required',
            style: AppTypography.h2(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),

          Text(
            'AdhocX requires background location access to match you with nearby trip requests and navigate during active trips.',
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),

          AppPrimaryButton(
            text: 'ENABLE LOCATION SERVICES',
            onPressed: () async {
              final granted = await PermissionService.instance.requestLocationPermission();
              if (granted) {
                EdgeCaseManager.instance.grantLocationPermission();
                Fluttertoast.showToast(
                  msg: 'Location permission granted!',
                  backgroundColor: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                );
              } else {
                await openAppSettings();
                Fluttertoast.showToast(
                  msg: 'Please grant Location permission in Settings to receive trip offers.',
                  backgroundColor: AppColors.warning,
                );
              }
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
              style: AppTypography.body(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
