import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import 'employee_primary_button.dart';
import 'employee_secondary_button.dart';

/// Destructive action button (SOS, Cancel Trip, Logout, Delete Account).
/// Driver app design: AppPrimaryButton(variant: danger) when filled, and the
/// outlined secondary button in error colour when [isOutlined].
class EmployeeDangerButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final double height;
  final double? width;
  final IconData? icon;

  const EmployeeDangerButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.height = 48,
    this.width,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return EmployeeSecondaryButton(
        label: label,
        onPressed: onPressed,
        isLoading: isLoading,
        height: height,
        width: width,
        icon: icon,
        textColor: AppColors.error,
        borderColor: AppColors.error.withAlpha(110),
      );
    }
    return EmployeePrimaryButton(
      label: label,
      onPressed: onPressed,
      isLoading: isLoading,
      height: height,
      width: width,
      icon: icon,
      backgroundColor: AppColors.error,
    );
  }
}
