import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Shared body for the live-tracking connectivity states (GPS unavailable,
/// stale location, poor network, reconnecting).
class ConnectivityIssueView extends StatelessWidget {
  final String exceptionKey;
  final Widget illustration;
  final String fallbackTitle;
  final String fallbackMessage;
  final Widget? content;
  final List<Widget> actions;

  const ConnectivityIssueView({
    super.key,
    required this.exceptionKey,
    required this.illustration,
    required this.fallbackTitle,
    required this.fallbackMessage,
    this.content,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: illustration,
      illustrationGap: AppSpacing.xxl,
      title: fallbackTitle,
      message: fallbackMessage,
      content: content,
      actions: actions,
    );
  }
}
