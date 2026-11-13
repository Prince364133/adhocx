import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Loads one section of the mock driver-assignment data.
Future<Map<String, dynamic>?> loadAssignmentSection(String key) async =>
    (await MockDataService.getDriverAssignment())[key] as Map<String, dynamic>?;

/// "Contact Support" outline button → live support chat (several driver
/// screens previously showed a "Connecting…" snackbar that went nowhere).
class ContactSupportButton extends StatelessWidget {
  const ContactSupportButton({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return EmployeeSecondaryButton(
      label: 'Contact Support',
      icon: Icons.headset_mic_rounded,
      textColor: p.accent,
      borderColor: p.accent,
      onPressed: () => context.push(AppRoutes.safetyLiveChat),
    );
  }
}

/// Amber notice pill ("Expected update in ~5 min").
class WarningNotice extends StatelessWidget {
  final IconData icon;
  final String text;

  const WarningNotice({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.md + 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.warningContainer,
        borderRadius: AppRadius.borderXxl,
        border: Border.all(color: AppColors.warning.withAlpha(90)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: AppColors.warning),
          const SizedBox(width: AppSpacing.sm + 2),
          Flexible(
            child: Text(
              text,
              style: AppTypography.small(
                color: AppColors.warningText,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small labelled panel ("Reason" / "Notes").
class LabelledPanel extends StatelessWidget {
  final String label;
  final String value;

  const LabelledPanel({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Container(
      width: double.infinity,
      padding: AppSpacing.paddingLg,
      decoration: BoxDecoration(
        color: p.surfaceElevated,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.caption(
              color: p.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: AppTypography.bodyMedium(
              color: p.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
