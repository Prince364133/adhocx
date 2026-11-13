import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../buttons/employee_danger_button.dart';
import '../buttons/employee_primary_button.dart';
import '../buttons/employee_secondary_button.dart';

/// Confirmation sheet body for critical actions (Sign out, Cancel trip,
/// Delete account). Driver tokens; light/dark aware.
class EmployeeConfirmationSheet extends StatelessWidget {
  final String title;
  final String description;
  final Widget? illustration;
  final String confirmLabel;
  final VoidCallback onConfirm;
  final String cancelLabel;
  final VoidCallback? onCancel;
  final bool isDestructive;
  final bool isLoading;

  const EmployeeConfirmationSheet({
    super.key,
    required this.title,
    required this.description,
    this.illustration,
    this.confirmLabel = 'Confirm',
    required this.onConfirm,
    this.cancelLabel = 'Cancel',
    this.onCancel,
    this.isDestructive = true,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (illustration != null) ...[
          illustration!,
          const SizedBox(height: AppSpacing.xl),
        ],
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppTypography.h2(
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 20,
            overflow: null,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          description,
          textAlign: TextAlign.center,
          style: AppTypography.body(
            color: isDark
                ? AppColors.textSecondaryDark
                : AppColors.textSecondaryLight,
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        if (isDestructive)
          EmployeeDangerButton(
            label: confirmLabel,
            isLoading: isLoading,
            onPressed: onConfirm,
          )
        else
          EmployeePrimaryButton(
            label: confirmLabel,
            isLoading: isLoading,
            onPressed: onConfirm,
          ),
        const SizedBox(height: AppSpacing.md),
        EmployeeSecondaryButton(
          label: cancelLabel,
          onPressed: onCancel ?? () => Navigator.of(context).pop(),
          borderColor: Colors.transparent,
          backgroundColor: Colors.transparent,
        ),
        const SizedBox(height: AppSpacing.sm),
      ],
    );
  }
}

/// Driver contact sheet body: masked call and in-app chat options.
class EmployeeDriverContactSheet extends StatelessWidget {
  final String driverName;
  final double rating;
  final String vehicleNumber;
  final String phone;
  final VoidCallback onCall;
  final VoidCallback onChat;

  const EmployeeDriverContactSheet({
    super.key,
    required this.driverName,
    this.rating = 4.8,
    required this.vehicleNumber,
    required this.phone,
    required this.onCall,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 34,
          backgroundColor: AppColors.primary.withAlpha(26),
          child: const Icon(Icons.person, color: AppColors.primary, size: 38),
        ),
        const SizedBox(height: AppSpacing.sm + 2),
        Text(driverName, style: AppTypography.h3(color: textPrimary)),
        const SizedBox(height: AppSpacing.xs),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.star_rounded, size: 16, color: AppColors.starAmber),
            const SizedBox(width: AppSpacing.xs),
            Text(
              rating.toStringAsFixed(1),
              style: AppTypography.small(
                color: textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 2,
              ),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.surfaceElevatedDark
                    : AppColors.surfaceElevatedLight,
                borderRadius: AppRadius.borderSm,
              ),
              child: Text(
                vehicleNumber,
                style: AppTypography.micro(
                  color: textSecondary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xxl),
        _ContactOption(
          icon: Icons.phone_rounded,
          iconColor: AppColors.success,
          iconBg: AppColors.successContainer,
          title: 'Call Driver',
          subtitle: 'Virtual masked call via AdhocX PBX',
          onTap: onCall,
        ),
        const SizedBox(height: AppSpacing.md),
        _ContactOption(
          icon: Icons.chat_bubble_outline_rounded,
          iconColor: AppColors.primary,
          iconBg: AppColors.primary.withAlpha(26),
          title: 'In-App Chat',
          subtitle: 'Quick messages & canned responses',
          onTap: onChat,
        ),
        const SizedBox(height: AppSpacing.lg),
      ],
    );
  }
}

class _ContactOption extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ContactOption({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    // Own Material so the ink ripple shows above the sheet's surface colour.
    return Material(
      color: Colors.transparent,
      child: ListTile(
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderLg,
        side: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 1.2,
        ),
      ),
      leading: Container(
        padding: const EdgeInsets.all(AppSpacing.sm + 2),
        decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title,
        style: AppTypography.bodyMedium(
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(subtitle, style: AppTypography.caption(color: textMuted)),
      trailing: Icon(Icons.chevron_right_rounded, color: textMuted),
      ),
    );
  }
}
