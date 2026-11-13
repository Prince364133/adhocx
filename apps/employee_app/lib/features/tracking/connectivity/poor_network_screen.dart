import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 11: Poor Network
class PoorNetworkScreen extends StatelessWidget {
  const PoorNetworkScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget assurance(String text) => Row(
          children: [
            const Icon(Icons.check_circle_rounded,
                size: 20, color: AppColors.success),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                text,
                style: AppTypography.bodyMedium(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );

    return ConnectivityIssueView(
      exceptionKey: 'poor_network',
      illustration: const PoorNetworkBadge(),
      fallbackTitle: 'Poor Network',
      fallbackMessage:
          'Your internet connection is weak. Live updates may be delayed.',
      content: AppCard(
        width: double.infinity,
        child: Column(
          children: [
            assurance('Trip is still active'),
            Divider(color: p.border, height: AppSpacing.xxl),
            assurance("We'll sync once your connection improves"),
          ],
        ),
      ),
    );
  }
}
