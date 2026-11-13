import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/connectivity_issue_view.dart';

/// Screen 12: Reconnecting...
class ReconnectingScreen extends StatelessWidget {
  const ReconnectingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return ConnectivityIssueView(
      exceptionKey: 'reconnecting',
      illustration: const ReconnectingSpinnerGraphic(),
      fallbackTitle: 'Reconnecting...',
      fallbackMessage: 'Trying to restore live tracking for your trip.',
      content: ClipRRect(
        borderRadius: AppRadius.borderPill,
        child: LinearProgressIndicator(
          minHeight: 6,
          backgroundColor: p.border,
          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          semanticsLabel: 'Reconnecting',
        ),
      ),
    );
  }
}
